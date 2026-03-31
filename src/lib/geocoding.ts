/**
 * Geocoding utility using OpenStreetMap Nominatim API (free, no API key required).
 * Includes in-memory caching to avoid redundant requests and respect rate limits.
 */

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

// In-memory cache to avoid re-geocoding the same address
const geocodeCache = new Map<string, GeoCoordinates | null>();

// Rate limiter: Nominatim requires max 1 request/second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 1100; // slightly over 1s to be safe

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

/**
 * Geocode a single address string to lat/lng coordinates.
 * Returns null if the address cannot be geocoded.
 */
export async function geocodeAddress(address: string): Promise<GeoCoordinates | null> {
  const key = normalizeAddress(address);

  if (geocodeCache.has(key)) {
    return geocodeCache.get(key) || null;
  }

  try {
    await throttle();

    const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
      q: address,
      format: 'json',
      limit: '1',
    })}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ToolTimePro/1.0 (field-service-management)',
      },
    });

    if (!response.ok) {
      console.warn(`Geocoding failed for "${address}": HTTP ${response.status}`);
      geocodeCache.set(key, null);
      return null;
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      console.warn(`No geocoding results for "${address}"`);
      geocodeCache.set(key, null);
      return null;
    }

    const result: GeoCoordinates = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };

    geocodeCache.set(key, result);
    return result;
  } catch (error) {
    console.error(`Geocoding error for "${address}":`, error);
    geocodeCache.set(key, null);
    return null;
  }
}

/**
 * Batch geocode multiple addresses. Respects Nominatim rate limits.
 * Returns a Map of address -> coordinates (null if geocoding failed).
 */
export async function batchGeocode(addresses: string[]): Promise<Map<string, GeoCoordinates | null>> {
  const results = new Map<string, GeoCoordinates | null>();

  for (const address of addresses) {
    const coords = await geocodeAddress(address);
    results.set(address, coords);
  }

  return results;
}

/**
 * Clear the geocode cache (useful for testing or when addresses change).
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
}

/**
 * Pre-populate the cache with known coordinates (e.g., from database).
 */
export function seedGeocodeCache(entries: Array<{ address: string; lat: number; lng: number }>): void {
  for (const entry of entries) {
    geocodeCache.set(normalizeAddress(entry.address), { lat: entry.lat, lng: entry.lng });
  }
}
