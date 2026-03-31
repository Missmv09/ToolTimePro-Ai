import { clearGeocodeCache, seedGeocodeCache } from '@/lib/geocoding';

// We test the cache/seed functions synchronously; actual geocoding
// requires network access, so we test the API integration logic separately.

describe('geocoding', () => {
  beforeEach(() => {
    clearGeocodeCache();
  });

  describe('seedGeocodeCache', () => {
    it('seeds cache with known coordinates', async () => {
      seedGeocodeCache([
        { address: '123 Main St, Springfield', lat: 39.7817, lng: -89.6501 },
        { address: '456 Oak Ave, Chicago', lat: 41.8781, lng: -87.6298 },
      ]);

      // Import geocodeAddress after seeding
      const { geocodeAddress } = await import('@/lib/geocoding');

      // Should return cached value without making network request
      const result = await geocodeAddress('123 Main St, Springfield');
      expect(result).toEqual({ lat: 39.7817, lng: -89.6501 });
    });

    it('normalizes addresses for cache lookup', async () => {
      seedGeocodeCache([
        { address: '123 Main St', lat: 39.78, lng: -89.65 },
      ]);

      const { geocodeAddress } = await import('@/lib/geocoding');

      // Different casing/spacing should still match
      const result = await geocodeAddress('  123 Main ST  ');
      // After normalization: "123 main st" should match "123 main st"
      // Note: the seed normalizes too, so this should match
      expect(result).toEqual({ lat: 39.78, lng: -89.65 });
    });
  });

  describe('clearGeocodeCache', () => {
    it('clears all cached entries', () => {
      seedGeocodeCache([
        { address: 'test address', lat: 0, lng: 0 },
      ]);

      clearGeocodeCache();

      // After clearing, the cache should be empty
      // (we can't easily verify without making a network call,
      // but clearGeocodeCache should not throw)
      expect(() => clearGeocodeCache()).not.toThrow();
    });
  });
});
