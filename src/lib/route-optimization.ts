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
export function estimateRoadDistance(straightLineDistance: number): number {
  return straightLineDistance * ROAD_FACTOR;
}

/**
 * Build a distance matrix for a set of points.
 * Returns distances in miles (road-estimated).
 */
export function buildDistanceMatrix(points: RoutePoint[]): number[][] {
  const n = points.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dist = estimateRoadDistance(
        haversineDistance(points[i].lat, points[i].lng, points[j].lat, points[j].lng)
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
        // Calculate distance change from reversing segment [i..j]
        const d1 = matrix[improved[i - 1]][improved[i]] + matrix[improved[j]][improved[(j + 1) % n] || improved[j]];
        const d2 = matrix[improved[i - 1]][improved[j]] + matrix[improved[i]][improved[(j + 1) % n] || improved[j]];

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
 * Optimize a route for a set of points.
 *
 * Uses nearest-neighbor heuristic with 2-opt improvement.
 * For small sets (<= 8 points), tries all starting points.
 * The first point can optionally be fixed as the start (e.g., office/depot).
 *
 * @param points Array of route points with coordinates
 * @param fixedStartIndex If set, the route will always start from this point
 */
export function optimizeRoute(
  points: RoutePoint[],
  fixedStartIndex?: number
): OptimizedRoute {
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

  const matrix = buildDistanceMatrix(points);

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

  const optimizedDistance = routeDistance(optimizedOrder, matrix);

  const milesSaved = Math.max(0, originalDistance - optimizedDistance);
  const originalTime = (originalDistance / AVG_CITY_SPEED_MPH) * 60;
  const optimizedTime = (optimizedDistance / AVG_CITY_SPEED_MPH) * 60;
  const timeSaved = Math.max(0, originalTime - optimizedTime);
  const fuelSaved = milesSaved * FUEL_COST_PER_MILE;
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
