import {
  metersToMiles,
  secondsToMinutes,
  buildTableUrl,
  parseTableResponse,
  extractSubMatrix,
} from '@/lib/road-routing';

describe('road-routing helpers', () => {
  describe('unit conversions', () => {
    it('converts meters to miles', () => {
      expect(metersToMiles(1609.344)).toBeCloseTo(1, 6);
      expect(metersToMiles(0)).toBe(0);
    });
    it('converts seconds to minutes', () => {
      expect(secondsToMinutes(120)).toBe(2);
    });
  });

  describe('buildTableUrl', () => {
    it('uses lng,lat order and the table/driving endpoint', () => {
      const url = buildTableUrl('https://osrm.example.com', [
        { lat: 37.4, lng: -122.1 },
        { lat: 37.5, lng: -122.2 },
      ]);
      expect(url).toBe(
        'https://osrm.example.com/table/v1/driving/-122.1,37.4;-122.2,37.5?annotations=distance,duration'
      );
    });
    it('strips a trailing slash on the base URL', () => {
      const url = buildTableUrl('https://osrm.example.com/', [
        { lat: 1, lng: 2 },
        { lat: 3, lng: 4 },
      ]);
      expect(url).toContain('https://osrm.example.com/table/v1/driving/');
      expect(url).not.toContain('com//table');
    });
  });

  describe('parseTableResponse', () => {
    it('parses a valid OSRM response into mile/minute matrices', () => {
      const result = parseTableResponse({
        code: 'Ok',
        distances: [
          [0, 1609.344],
          [1609.344, 0],
        ],
        durations: [
          [0, 120],
          [120, 0],
        ],
      });
      expect(result).not.toBeNull();
      expect(result!.distancesMiles[0][1]).toBeCloseTo(1, 6);
      expect(result!.durationsMin[1][0]).toBe(2);
    });

    it('returns null for a non-Ok code', () => {
      expect(parseTableResponse({ code: 'NoRoute', distances: [], durations: [] })).toBeNull();
    });

    it('returns null for malformed/missing matrices', () => {
      expect(parseTableResponse(null)).toBeNull();
      expect(parseTableResponse({ code: 'Ok' })).toBeNull();
    });

    it('returns null when any pair is unreachable (null entry)', () => {
      const result = parseTableResponse({
        code: 'Ok',
        distances: [
          [0, null],
          [1609, 0],
        ],
        durations: [
          [0, 60],
          [60, 0],
        ],
      });
      expect(result).toBeNull();
    });
  });

  describe('extractSubMatrix', () => {
    it('extracts a reordered sub-matrix by index', () => {
      const master = [
        [0, 1, 2],
        [10, 0, 12],
        [20, 21, 0],
      ];
      // Subset of points 2 and 0, in that order.
      expect(extractSubMatrix(master, [2, 0])).toEqual([
        [0, 20],
        [2, 0],
      ]);
    });
  });
});
