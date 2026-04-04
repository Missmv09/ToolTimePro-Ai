import {
  haversineDistance,
  estimateRoadDistance,
  buildDistanceMatrix,
  optimizeRoute,
  optimizeMultiWorkerRoutes,
  RoutePoint,
} from '@/lib/route-optimization';

describe('route-optimization', () => {
  describe('haversineDistance', () => {
    it('returns 0 for same point', () => {
      const dist = haversineDistance(34.05, -118.25, 34.05, -118.25);
      expect(dist).toBe(0);
    });

    it('calculates distance between LA and San Francisco correctly', () => {
      // LA: 34.0522, -118.2437
      // SF: 37.7749, -122.4194
      const dist = haversineDistance(34.0522, -118.2437, 37.7749, -122.4194);
      // Should be roughly 347 miles straight-line
      expect(dist).toBeGreaterThan(300);
      expect(dist).toBeLessThan(400);
    });

    it('calculates distance between NYC and Chicago correctly', () => {
      // NYC: 40.7128, -74.0060
      // Chicago: 41.8781, -87.6298
      const dist = haversineDistance(40.7128, -74.006, 41.8781, -87.6298);
      // Should be roughly 713 miles straight-line
      expect(dist).toBeGreaterThan(650);
      expect(dist).toBeLessThan(800);
    });

    it('calculates short distances correctly', () => {
      // Two points in the same city (~2 miles apart)
      const dist = haversineDistance(34.0522, -118.2437, 34.0722, -118.2237);
      expect(dist).toBeGreaterThan(0.5);
      expect(dist).toBeLessThan(5);
    });
  });

  describe('estimateRoadDistance', () => {
    it('applies road factor multiplier', () => {
      const straight = 10;
      const road = estimateRoadDistance(straight);
      // Road factor is 1.35
      expect(road).toBe(13.5);
    });

    it('returns 0 for 0 distance', () => {
      expect(estimateRoadDistance(0)).toBe(0);
    });
  });

  describe('buildDistanceMatrix', () => {
    it('builds symmetric matrix', () => {
      const points: RoutePoint[] = [
        { id: '1', lat: 34.05, lng: -118.24 },
        { id: '2', lat: 34.07, lng: -118.22 },
        { id: '3', lat: 34.03, lng: -118.20 },
      ];

      const matrix = buildDistanceMatrix(points);
      expect(matrix.length).toBe(3);
      expect(matrix[0].length).toBe(3);

      // Diagonal should be 0
      expect(matrix[0][0]).toBe(0);
      expect(matrix[1][1]).toBe(0);
      expect(matrix[2][2]).toBe(0);

      // Symmetric
      expect(matrix[0][1]).toBe(matrix[1][0]);
      expect(matrix[0][2]).toBe(matrix[2][0]);
      expect(matrix[1][2]).toBe(matrix[2][1]);

      // All distances should be positive
      expect(matrix[0][1]).toBeGreaterThan(0);
      expect(matrix[0][2]).toBeGreaterThan(0);
      expect(matrix[1][2]).toBeGreaterThan(0);
    });

    it('handles single point', () => {
      const points: RoutePoint[] = [{ id: '1', lat: 34.05, lng: -118.24 }];
      const matrix = buildDistanceMatrix(points);
      expect(matrix).toEqual([[0]]);
    });
  });

  describe('optimizeRoute', () => {
    it('handles empty input', () => {
      const result = optimizeRoute([]);
      expect(result.orderedPoints).toEqual([]);
      expect(result.totalDistanceMiles).toBe(0);
      expect(result.milesSaved).toBe(0);
    });

    it('handles single point', () => {
      const points: RoutePoint[] = [{ id: '1', lat: 34.05, lng: -118.24 }];
      const result = optimizeRoute(points);
      expect(result.orderedPoints).toEqual(points);
      expect(result.totalDistanceMiles).toBe(0);
    });

    it('handles two points', () => {
      const points: RoutePoint[] = [
        { id: '1', lat: 34.05, lng: -118.24 },
        { id: '2', lat: 34.07, lng: -118.22 },
      ];
      const result = optimizeRoute(points);
      expect(result.orderedPoints.length).toBe(2);
      expect(result.totalDistanceMiles).toBeGreaterThan(0);
    });

    it('optimizes a route with multiple points and reduces or maintains distance', () => {
      // Create points in a deliberately bad order (zigzag pattern)
      const points: RoutePoint[] = [
        { id: 'A', lat: 34.05, lng: -118.30 },  // far west
        { id: 'B', lat: 34.05, lng: -118.10 },  // far east
        { id: 'C', lat: 34.05, lng: -118.28 },  // near A
        { id: 'D', lat: 34.05, lng: -118.12 },  // near B
        { id: 'E', lat: 34.05, lng: -118.20 },  // middle
      ];

      const result = optimizeRoute(points);

      expect(result.orderedPoints.length).toBe(5);
      // Optimized should be less than or equal to original
      expect(result.totalDistanceMiles).toBeLessThanOrEqual(result.originalDistanceMiles);
      expect(result.milesSaved).toBeGreaterThanOrEqual(0);
      expect(result.percentImprovement).toBeGreaterThanOrEqual(0);
    });

    it('produces significant savings on a clearly suboptimal route', () => {
      // Points arranged in a circle but ordered to zigzag across
      const points: RoutePoint[] = [
        { id: '1', lat: 34.10, lng: -118.30 },  // NW
        { id: '2', lat: 33.95, lng: -118.10 },  // SE
        { id: '3', lat: 34.10, lng: -118.10 },  // NE
        { id: '4', lat: 33.95, lng: -118.30 },  // SW
        { id: '5', lat: 34.02, lng: -118.20 },  // center
      ];

      const result = optimizeRoute(points);

      // This zigzag pattern should produce meaningful savings
      expect(result.milesSaved).toBeGreaterThan(0);
      expect(result.timeSavedMinutes).toBeGreaterThanOrEqual(0);
      expect(result.fuelSaved).toBeGreaterThanOrEqual(0);
    });

    it('respects fixed start index', () => {
      const points: RoutePoint[] = [
        { id: 'A', lat: 34.05, lng: -118.30 },
        { id: 'B', lat: 34.05, lng: -118.20 },
        { id: 'C', lat: 34.05, lng: -118.10 },
      ];

      const result = optimizeRoute(points, 0);
      expect(result.orderedPoints[0].id).toBe('A');
    });

    it('returns proper data structure', () => {
      const points: RoutePoint[] = [
        { id: '1', lat: 34.05, lng: -118.24, label: 'Job 1' },
        { id: '2', lat: 34.07, lng: -118.22, label: 'Job 2' },
        { id: '3', lat: 34.03, lng: -118.20, label: 'Job 3' },
      ];

      const result = optimizeRoute(points);

      expect(result).toHaveProperty('orderedPoints');
      expect(result).toHaveProperty('totalDistanceMiles');
      expect(result).toHaveProperty('originalDistanceMiles');
      expect(result).toHaveProperty('totalDriveTimeMinutes');
      expect(result).toHaveProperty('originalDriveTimeMinutes');
      expect(result).toHaveProperty('milesSaved');
      expect(result).toHaveProperty('timeSavedMinutes');
      expect(result).toHaveProperty('fuelSaved');
      expect(result).toHaveProperty('percentImprovement');
      expect(result).toHaveProperty('distanceMatrix');

      // Types
      expect(typeof result.totalDistanceMiles).toBe('number');
      expect(typeof result.percentImprovement).toBe('number');
      expect(Array.isArray(result.distanceMatrix)).toBe(true);
    });

    it('preserves all points in output', () => {
      const points: RoutePoint[] = [
        { id: 'X', lat: 34.05, lng: -118.24 },
        { id: 'Y', lat: 34.07, lng: -118.22 },
        { id: 'Z', lat: 34.03, lng: -118.20 },
        { id: 'W', lat: 34.09, lng: -118.26 },
      ];

      const result = optimizeRoute(points);
      const outputIds = result.orderedPoints.map((p) => p.id).sort();
      const inputIds = points.map((p) => p.id).sort();
      expect(outputIds).toEqual(inputIds);
    });
  });

  describe('configurable RouteOptions', () => {
    const points: RoutePoint[] = [
      { id: 'A', lat: 34.05, lng: -118.30 },
      { id: 'B', lat: 34.05, lng: -118.10 },
      { id: 'C', lat: 34.05, lng: -118.20 },
    ];

    it('uses default options when none provided', () => {
      const withDefaults = optimizeRoute(points);
      const withExplicitDefaults = optimizeRoute(points, undefined, {
        avgSpeedMph: 25,
        fuelCostPerMile: 0.40,
        roadFactor: 1.35,
      });
      expect(withDefaults.totalDistanceMiles).toBe(withExplicitDefaults.totalDistanceMiles);
      expect(withDefaults.totalDriveTimeMinutes).toBe(withExplicitDefaults.totalDriveTimeMinutes);
      expect(withDefaults.fuelSaved).toBe(withExplicitDefaults.fuelSaved);
    });

    it('custom speed changes drive time but not distance', () => {
      const slow = optimizeRoute(points, undefined, { avgSpeedMph: 15 });
      const fast = optimizeRoute(points, undefined, { avgSpeedMph: 50 });
      expect(slow.totalDistanceMiles).toBe(fast.totalDistanceMiles);
      expect(slow.totalDriveTimeMinutes).toBeGreaterThan(fast.totalDriveTimeMinutes);
    });

    it('custom fuel cost changes fuel savings', () => {
      const cheap = optimizeRoute(points, undefined, { fuelCostPerMile: 0.20 });
      const expensive = optimizeRoute(points, undefined, { fuelCostPerMile: 0.80 });
      // Same miles saved, but different dollar amounts
      expect(cheap.milesSaved).toBe(expensive.milesSaved);
      if (cheap.milesSaved > 0) {
        expect(expensive.fuelSaved).toBeGreaterThan(cheap.fuelSaved);
      }
    });

    it('custom road factor changes distances', () => {
      const low = optimizeRoute(points, undefined, { roadFactor: 1.0 });
      const high = optimizeRoute(points, undefined, { roadFactor: 2.0 });
      expect(high.totalDistanceMiles).toBeGreaterThan(low.totalDistanceMiles);
    });

    it('preserves time window fields in output', () => {
      const twPoints: RoutePoint[] = [
        { id: 'A', lat: 34.05, lng: -118.30, earliestArrival: '08:00', latestArrival: '10:00' },
        { id: 'B', lat: 34.05, lng: -118.10, earliestArrival: '14:00', latestArrival: '16:00' },
        { id: 'C', lat: 34.05, lng: -118.20 },
      ];
      const result = optimizeRoute(twPoints);
      const pointA = result.orderedPoints.find((p) => p.id === 'A');
      expect(pointA?.earliestArrival).toBe('08:00');
      expect(pointA?.latestArrival).toBe('10:00');
    });
  });

  describe('optimizeMultiWorkerRoutes', () => {
    const points: RoutePoint[] = [
      { id: '1', lat: 34.10, lng: -118.30 },
      { id: '2', lat: 34.10, lng: -118.28 },
      { id: '3', lat: 34.10, lng: -118.26 },
      { id: '4', lat: 33.95, lng: -118.10 },
      { id: '5', lat: 33.95, lng: -118.08 },
      { id: '6', lat: 33.95, lng: -118.06 },
    ];

    it('handles empty input', () => {
      const result = optimizeMultiWorkerRoutes([], 2);
      expect(result.workerRoutes).toEqual([]);
      expect(result.totalDistanceMiles).toBe(0);
    });

    it('handles zero workers', () => {
      const result = optimizeMultiWorkerRoutes(points, 0);
      expect(result.workerRoutes).toEqual([]);
    });

    it('1 worker returns single route with all points', () => {
      const result = optimizeMultiWorkerRoutes(points, 1);
      expect(result.workerRoutes.length).toBe(1);
      const allIds = result.workerRoutes[0].orderedPoints.map((p) => p.id).sort();
      expect(allIds).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    it('splits points across multiple workers', () => {
      const result = optimizeMultiWorkerRoutes(points, 2);
      expect(result.workerRoutes.length).toBe(2);
      // Each worker should have at least 1 point
      result.workerRoutes.forEach((route) => {
        expect(route.orderedPoints.length).toBeGreaterThan(0);
      });
      // All points should be covered
      const allIds = result.workerRoutes
        .flatMap((r) => r.orderedPoints.map((p) => p.id))
        .sort();
      expect(allIds).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    it('handles more workers than points', () => {
      const result = optimizeMultiWorkerRoutes(points, 10);
      // Should have at most as many routes as points
      expect(result.workerRoutes.length).toBeLessThanOrEqual(points.length);
      const allIds = result.workerRoutes
        .flatMap((r) => r.orderedPoints.map((p) => p.id))
        .sort();
      expect(allIds).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    it('accepts RouteOptions', () => {
      const result = optimizeMultiWorkerRoutes(points, 2, { avgSpeedMph: 35 });
      expect(result.workerRoutes.length).toBeGreaterThan(0);
      expect(result.totalDistanceMiles).toBeGreaterThan(0);
    });

    it('reports aggregate metrics', () => {
      const result = optimizeMultiWorkerRoutes(points, 2);
      expect(result.totalDistanceMiles).toBeGreaterThan(0);
      expect(result.originalDistanceMiles).toBeGreaterThan(0);
      expect(result.milesSaved).toBeGreaterThanOrEqual(0);
      expect(result.percentImprovement).toBeGreaterThanOrEqual(0);
    });
  });
});
