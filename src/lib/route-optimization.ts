/**
 * Route optimization library with real distance calculations and TSP solving.
 *
 * Uses Haversine formula for distance calculation and a nearest-neighbor
 * heuristic with 2-opt improvement for route optimization.
 */

export interface RoutePoint {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  scheduledTime?: string | null;
  /** Earliest arrival time (ISO or HH:MM) for time-window constraints */
  earliestArrival?: string | null;
  /** Latest arrival time (ISO or HH:MM) for time-window constraints */
  latestArrival?: string | null;
}

/** Configurable optimization parameters (all optional — defaults to hardcoded constants) */
export interface RouteOptions {
  avgSpeedMph?: number;
  fuelCostPerMile?: number;
  roadFactor?: number;
  /** Route start time in minutes since midnight (e.g. 480 = 8:00 AM). Default: 480 */
  startTimeMinutes?: number;
  /** Whether to enforce time-window constraints. Default: false */
  enforceTimeWindows?: boolean;
}

/** Result for multi-worker optimization */
export interface MultiWorkerResult {
  /** One optimized route per worker */
  workerRoutes: OptimizedRoute[];
  /** Total miles across all workers */
  totalDistanceMiles: number;
  /** Total miles if routes were not optimized */
  originalDistanceMiles: number;
  /** Total miles saved across all workers */
  milesSaved: number;
  /** Overall percent improvement */
  percentImprovement: number;
}

export interface OptimizedRoute {
  /** Jobs in optimized order */
  orderedPoints: RoutePoint[];
  /** Total distance of optimized route in miles */
  totalDistanceMiles: number;
  /** Total distance of original (unoptimized) route in miles */
  originalDistanceMiles: number;
  /** Estimated total drive time in minutes (based on avg 30mph city driving) */
  totalDriveTimeMinutes: number;
  /** Estimated original drive time in minutes */
  originalDriveTimeMinutes: number;
  /** Miles saved vs original order */
  milesSaved: number;
  /** Minutes saved vs original order */
  timeSavedMinutes: number;
  /** Estimated fuel cost saved (at ~$0.40/mile avg) */
  fuelSaved: number;
  /** Percentage improvement */
  percentImprovement: number;
  /** Distance matrix (miles) between all points, for reference */
  distanceMatrix: number[][];
}

const EARTH_RADIUS_MILES = 3958.8;
const AVG_CITY_SPEED_MPH = 25; // conservative city driving average
const ROAD_FACTOR = 1.35; // straight-line to road distance multiplier
const FUEL_COST_PER_MILE = 0.40; // average fuel cost per mile

/**
 * Calculate the Haversine distance between two lat/lng points in miles.
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
}

/**
 * Estimate road distance from straight-line distance.
 */
export function estimateRoadDistance(straightLineDistance: number, roadFactor?: number): number {
  return straightLineDistance * (roadFactor ?? ROAD_FACTOR);
}

/**
 * Build a distance matrix for a set of points.
 * Returns distances in miles (road-estimated).
 */
export function buildDistanceMatrix(points: RoutePoint[], roadFactor?: number): number[][] {
  const n = points.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dist = estimateRoadDistance(
        haversineDistance(points[i].lat, points[i].lng, points[j].lat, points[j].lng),
        roadFactor
      );
      matrix[i][j] = dist;
      matrix[j][i] = dist;
    }
  }

  return matrix;
}

/**
 * Calculate total route distance given an order of indices and a distance matrix.
 */
function routeDistance(order: number[], matrix: number[][]): number {
  let total = 0;
  for (let i = 0; i < order.length - 1; i++) {
    total += matrix[order[i]][order[i + 1]];
  }
  return total;
}

/**
 * Nearest-neighbor heuristic for TSP.
 * Starts from the first point and greedily visits the nearest unvisited point.
 */
function nearestNeighborTSP(matrix: number[][], startIndex: number = 0): number[] {
  const n = matrix.length;
  const visited = new Set<number>();
  const order: number[] = [startIndex];
  visited.add(startIndex);

  while (order.length < n) {
    const current = order[order.length - 1];
    let nearestDist = Infinity;
    let nearestIdx = -1;

    for (let i = 0; i < n; i++) {
      if (!visited.has(i) && matrix[current][i] < nearestDist) {
        nearestDist = matrix[current][i];
        nearestIdx = i;
      }
    }

    if (nearestIdx === -1) break;
    order.push(nearestIdx);
    visited.add(nearestIdx);
  }

  return order;
}

/**
 * 2-opt improvement: repeatedly reverse segments to reduce total distance.
 * This is the standard local search improvement for TSP.
 */
function twoOptImprove(order: number[], matrix: number[][]): number[] {
  const improved = [...order];
  const n = improved.length;
  let betterFound = true;
  let iterations = 0;
  const maxIterations = n * n * 2; // safety limit

  while (betterFound && iterations < maxIterations) {
    betterFound = false;
    iterations++;

    for (let i = 1; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        // For open paths (not circular): when j is the last index, there is
        // no edge after j, so we only compare the edge entering the segment.
        const isLastJ = j === n - 1;

        // Current cost: edge into segment start + edge out of segment end
        const d1 = matrix[improved[i - 1]][improved[i]]
          + (isLastJ ? 0 : matrix[improved[j]][improved[j + 1]]);
        // Cost after reversing segment [i..j]
        const d2 = matrix[improved[i - 1]][improved[j]]
          + (isLastJ ? 0 : matrix[improved[i]][improved[j + 1]]);

        if (d2 < d1 - 0.001) { // small epsilon for floating point
          // Reverse the segment
          const segment = improved.slice(i, j + 1).reverse();
          improved.splice(i, segment.length, ...segment);
          betterFound = true;
        }
      }
    }
  }

  return improved;
}

/**
 * Try multiple starting points for nearest-neighbor and return the best route.
 */
function multiStartNearestNeighbor(matrix: number[][]): number[] {
  const n = matrix.length;
  let bestOrder: number[] = [];
  let bestDist = Infinity;

  // Try starting from each point (or up to 10 for large sets)
  const startCount = Math.min(n, 10);
  for (let s = 0; s < startCount; s++) {
    const order = nearestNeighborTSP(matrix, s);
    const dist = routeDistance(order, matrix);
    if (dist < bestDist) {
      bestDist = dist;
      bestOrder = order;
    }
  }

  return bestOrder;
}

/**
 * Parse a time string ("HH:MM", "H:MM", or ISO datetime) to minutes since midnight.
 * Returns null if the string cannot be parsed.
 */
function parseTimeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;

  // Try HH:MM format
  const hmMatch = time.match(/^(\d{1,2}):(\d{2})$/);
  if (hmMatch) {
    const h = parseInt(hmMatch[1], 10);
    const m = parseInt(hmMatch[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return h * 60 + m;
    }
  }

  // Try ISO datetime (extract time portion)
  const isoMatch = time.match(/T(\d{2}):(\d{2})/);
  if (isoMatch) {
    return parseInt(isoMatch[1], 10) * 60 + parseInt(isoMatch[2], 10);
  }

  return null;
}

/**
 * Enforce time-window constraints on an optimized route.
 *
 * After distance-based optimization, this pass reorders points that have
 * time windows to ensure workers arrive within the customer's requested window.
 * It uses an insertion-based approach: points with time windows are placed at
 * positions where their estimated arrival falls within [earliest, latest],
 * while minimizing the added distance.
 */
function enforceTimeWindows(
  order: number[],
  points: RoutePoint[],
  matrix: number[][],
  speedMph: number,
  routeStartMinutes: number
): number[] {
  // Separate constrained and unconstrained points (keep fixed start at index 0)
  const hasFixedStart = order.length > 0 && points[order[0]]?.id === 'start';
  const startIdx = hasFixedStart ? 1 : 0;

  const constrained: Array<{ orderIdx: number; earliest: number; latest: number }> = [];
  const unconstrained: number[] = [];

  for (let i = startIdx; i < order.length; i++) {
    const pt = points[order[i]];
    const earliest = parseTimeToMinutes(pt.earliestArrival);
    const latest = parseTimeToMinutes(pt.latestArrival);
    if (earliest !== null || latest !== null) {
      constrained.push({
        orderIdx: order[i],
        earliest: earliest ?? 0,
        latest: latest ?? 24 * 60,
      });
    } else {
      unconstrained.push(order[i]);
    }
  }

  // If no constrained points, nothing to do
  if (constrained.length === 0) return order;

  // Sort constrained points by their earliest arrival time
  constrained.sort((a, b) => a.earliest - b.earliest);

  // Build the route greedily: place constrained jobs at their required times,
  // fill gaps with unconstrained jobs optimized for distance.
  const result: number[] = hasFixedStart ? [order[0]] : [];
  const usedUnconstrained = new Set<number>();

  let currentTime = routeStartMinutes;
  let currentPointIdx = hasFixedStart ? order[0] : -1;

  for (const cJob of constrained) {
    // Fill gap before this constrained job with unconstrained jobs
    // that can fit in the time before the constrained job's window
    let inserted = true;
    while (inserted && usedUnconstrained.size < unconstrained.length) {
      inserted = false;
      let bestIdx = -1;
      let bestDist = Infinity;

      for (const uIdx of unconstrained) {
        if (usedUnconstrained.has(uIdx)) continue;
        const dist = currentPointIdx >= 0 ? matrix[currentPointIdx][uIdx] : 0;
        const travelTime = (dist / speedMph) * 60;
        const arrivalAfterU = currentTime + travelTime;
        // Only insert if we still have time to reach the constrained job after
        const distToConstrained = matrix[uIdx][cJob.orderIdx];
        const travelToConstrained = (distToConstrained / speedMph) * 60;
        if (arrivalAfterU + travelToConstrained <= cJob.latest && dist < bestDist) {
          bestDist = dist;
          bestIdx = uIdx;
        }
      }

      if (bestIdx >= 0) {
        const travelTime = (bestDist / speedMph) * 60;
        const arrival = currentTime + travelTime;
        // Also check that inserting this unconstrained job doesn't make us late
        const distToConstrained = matrix[bestIdx][cJob.orderIdx];
        const timeToConstrained = (distToConstrained / speedMph) * 60;
        if (arrival + timeToConstrained <= cJob.latest) {
          result.push(bestIdx);
          usedUnconstrained.add(bestIdx);
          currentTime = arrival;
          currentPointIdx = bestIdx;
          inserted = true;
        }
      }
    }

    // Now insert the constrained job
    const distToJob = currentPointIdx >= 0 ? matrix[currentPointIdx][cJob.orderIdx] : 0;
    const travelTime = (distToJob / speedMph) * 60;
    let arrival = currentTime + travelTime;

    // If we arrive early, wait until the earliest time
    if (arrival < cJob.earliest) {
      arrival = cJob.earliest;
    }

    result.push(cJob.orderIdx);
    currentTime = arrival;
    currentPointIdx = cJob.orderIdx;
  }

  // Append remaining unconstrained jobs in nearest-neighbor order
  const remaining = unconstrained.filter((idx) => !usedUnconstrained.has(idx));
  while (remaining.length > 0) {
    let bestI = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const dist = currentPointIdx >= 0 ? matrix[currentPointIdx][remaining[i]] : 0;
      if (dist < bestDist) {
        bestDist = dist;
        bestI = i;
      }
    }
    const next = remaining.splice(bestI, 1)[0];
    result.push(next);
    currentPointIdx = next;
  }

  return result;
}

/**
 * Optimize a route for a set of points.
 *
 * Uses nearest-neighbor heuristic with 2-opt improvement.
 * For small sets (<= 8 points), tries all starting points.
 * The first point can optionally be fixed as the start (e.g., office/depot).
 *
 * @param points Array of route points with coordinates
 * @param fixedStartIndex If set, the route will always start from this point
 * @param options Optional configuration for speed, fuel cost, road factor
 */
export function optimizeRoute(
  points: RoutePoint[],
  fixedStartIndex?: number,
  options?: RouteOptions
): OptimizedRoute {
  const speedMph = options?.avgSpeedMph ?? AVG_CITY_SPEED_MPH;
  const fuelCost = options?.fuelCostPerMile ?? FUEL_COST_PER_MILE;
  const roadFactor = options?.roadFactor ?? ROAD_FACTOR;
  if (points.length <= 1) {
    return {
      orderedPoints: points,
      totalDistanceMiles: 0,
      originalDistanceMiles: 0,
      totalDriveTimeMinutes: 0,
      originalDriveTimeMinutes: 0,
      milesSaved: 0,
      timeSavedMinutes: 0,
      fuelSaved: 0,
      percentImprovement: 0,
      distanceMatrix: points.length === 1 ? [[0]] : [],
    };
  }

  const matrix = buildDistanceMatrix(points, roadFactor);

  // Calculate original route distance (as-is order)
  const originalOrder = points.map((_, i) => i);
  const originalDistance = routeDistance(originalOrder, matrix);

  // Run optimization
  let optimizedOrder: number[];

  if (fixedStartIndex !== undefined) {
    // Start from fixed point, nearest-neighbor from there
    optimizedOrder = nearestNeighborTSP(matrix, fixedStartIndex);
  } else {
    // Try multiple starting points
    optimizedOrder = multiStartNearestNeighbor(matrix);
  }

  // Apply 2-opt improvement
  optimizedOrder = twoOptImprove(optimizedOrder, matrix);

  // Apply time-window enforcement if enabled
  if (options?.enforceTimeWindows) {
    const startTime = options.startTimeMinutes ?? 480; // default 8:00 AM
    optimizedOrder = enforceTimeWindows(optimizedOrder, points, matrix, speedMph, startTime);
  }

  const optimizedDistance = routeDistance(optimizedOrder, matrix);

  const milesSaved = Math.max(0, originalDistance - optimizedDistance);
  const originalTime = (originalDistance / speedMph) * 60;
  const optimizedTime = (optimizedDistance / speedMph) * 60;
  const timeSaved = Math.max(0, originalTime - optimizedTime);
  const fuelSaved = milesSaved * fuelCost;
  const percentImprovement = originalDistance > 0
    ? Math.round((milesSaved / originalDistance) * 100)
    : 0;

  return {
    orderedPoints: optimizedOrder.map((i) => points[i]),
    totalDistanceMiles: Math.round(optimizedDistance * 10) / 10,
    originalDistanceMiles: Math.round(originalDistance * 10) / 10,
    totalDriveTimeMinutes: Math.round(optimizedTime),
    originalDriveTimeMinutes: Math.round(originalTime),
    milesSaved: Math.round(milesSaved * 10) / 10,
    timeSavedMinutes: Math.round(timeSaved),
    fuelSaved: Math.round(fuelSaved * 100) / 100,
    percentImprovement,
    distanceMatrix: matrix.map((row) => row.map((d) => Math.round(d * 10) / 10)),
  };
}

/**
 * Cluster points geographically using a simple k-means-like approach.
 * Returns an array of point-index arrays, one per cluster.
 */
function clusterPoints(points: RoutePoint[], k: number): number[][] {
  if (k <= 1) return [points.map((_, i) => i)];
  if (k >= points.length) return points.map((_, i) => [i]);

  // Initialize centroids by spreading evenly across sorted-by-lat points
  const sorted = points.map((p, i) => ({ i, lat: p.lat, lng: p.lng }))
    .sort((a, b) => a.lat - b.lat || a.lng - b.lng);
  const centroids: { lat: number; lng: number }[] = [];
  for (let c = 0; c < k; c++) {
    const idx = Math.floor((c / k) * sorted.length);
    centroids.push({ lat: sorted[idx].lat, lng: sorted[idx].lng });
  }

  let assignments = new Array(points.length).fill(0);
  const maxIter = 20;

  for (let iter = 0; iter < maxIter; iter++) {
    // Assign each point to nearest centroid
    const newAssignments = points.map((p) => {
      let bestCluster = 0;
      let bestDist = Infinity;
      for (let c = 0; c < k; c++) {
        const d = haversineDistance(p.lat, p.lng, centroids[c].lat, centroids[c].lng);
        if (d < bestDist) {
          bestDist = d;
          bestCluster = c;
        }
      }
      return bestCluster;
    });

    // Check convergence
    const changed = newAssignments.some((a, i) => a !== assignments[i]);
    assignments = newAssignments;
    if (!changed) break;

    // Update centroids
    for (let c = 0; c < k; c++) {
      const members = points.filter((_, i) => assignments[i] === c);
      if (members.length > 0) {
        centroids[c] = {
          lat: members.reduce((s, p) => s + p.lat, 0) / members.length,
          lng: members.reduce((s, p) => s + p.lng, 0) / members.length,
        };
      }
    }
  }

  // Build clusters
  const clusters: number[][] = Array.from({ length: k }, () => []);
  assignments.forEach((c, i) => clusters[c].push(i));

  // Remove empty clusters
  return clusters.filter((c) => c.length > 0);
}

/**
 * Optimize routes for multiple workers by clustering jobs geographically
 * and optimizing each cluster independently.
 *
 * @param points All jobs to be distributed
 * @param workerCount Number of workers to split across
 * @param options Optional configuration
 */
export function optimizeMultiWorkerRoutes(
  points: RoutePoint[],
  workerCount: number,
  options?: RouteOptions
): MultiWorkerResult {
  if (points.length === 0 || workerCount <= 0) {
    return {
      workerRoutes: [],
      totalDistanceMiles: 0,
      originalDistanceMiles: 0,
      milesSaved: 0,
      percentImprovement: 0,
    };
  }

  const effectiveWorkers = Math.min(workerCount, points.length);
  const clusters = clusterPoints(points, effectiveWorkers);

  const workerRoutes = clusters.map((clusterIndices) => {
    const clusterPoints_ = clusterIndices.map((i) => points[i]);
    return optimizeRoute(clusterPoints_, undefined, options);
  });

  const totalDist = workerRoutes.reduce((s, r) => s + r.totalDistanceMiles, 0);
  const origDist = workerRoutes.reduce((s, r) => s + r.originalDistanceMiles, 0);
  const saved = workerRoutes.reduce((s, r) => s + r.milesSaved, 0);

  return {
    workerRoutes,
    totalDistanceMiles: Math.round(totalDist * 10) / 10,
    originalDistanceMiles: Math.round(origDist * 10) / 10,
    milesSaved: Math.round(saved * 10) / 10,
    percentImprovement: origDist > 0 ? Math.round((saved / origDist) * 100) : 0,
  };
}
