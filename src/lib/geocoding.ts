/**
 * Geocoding utility using OpenStreetMap Nominatim API (free, no API key required).
 * Includes in-memory caching to avoid redundant requests and respect rate limits.
 */

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

// In-memory cache to avoid re-geocoding the same address.
// Successful results are cached permanently; failures expire after 5 minutes
// so transient errors (network blips, rate limits) get retried.
const geocodeCache = new Map<string, GeoCoordinates | null>();
const failureCacheTimestamps = new Map<string, number>();
const FAILURE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Rate limiter: Nominatim requires max 1 request/second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 1100; // slightly over 1s to be safe

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Build a clean, geocodable address string from structured parts.
 * Trims each part, drops empty/whitespace-only parts, and collapses
 * internal whitespace so we never produce artifacts like
 * "1048 Farley Ave , mountain view" (note the stray space before the comma)
 * when a stored field has trailing/leading whitespace.
 */
export function buildAddressQuery(...parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => (p ?? '').trim().replace(/\s+/g, ' '))
    .filter((p) => p.length > 0)
    .join(', ');
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
    const cached = geocodeCache.get(key) ?? null;
    // Successful results are always returned from cache
    if (cached !== null) return cached;
    // Failed results expire after TTL so transient errors get retried
    const failedAt = failureCacheTimestamps.get(key);
    if (failedAt && Date.now() - failedAt < FAILURE_CACHE_TTL_MS) {
      return null;
    }
    // TTL expired — clear and retry
    geocodeCache.delete(key);
    failureCacheTimestamps.delete(key);
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
        'User-Agent': 'TaskIguana/1.0 (field-service-management)',
      },
    });

    if (!response.ok) {
      console.warn(`Geocoding failed for "${address}": HTTP ${response.status}`);
      geocodeCache.set(key, null);
      failureCacheTimestamps.set(key, Date.now());
      return null;
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      console.warn(`No geocoding results for "${address}"`);
      geocodeCache.set(key, null);
      failureCacheTimestamps.set(key, Date.now());
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
    failureCacheTimestamps.set(key, Date.now());
    return null;
  }
}

/**
 * Geocode a job from its structured address parts, degrading gracefully.
 *
 * Tries the most specific query first (street + city), then falls back to
 * progressively coarser queries (e.g. city only). This keeps the route
 * optimizer usable when a job has an incomplete address (missing state/zip),
 * placing it at the city center rather than dropping it entirely.
 *
 * Returns the coordinates plus the query that actually resolved, and whether
 * it was an approximate (fallback) match, so callers can surface a warning.
 */
export async function geocodeJobAddress(
  parts: { address?: string | null; city?: string | null; state?: string | null; zip?: string | null }
): Promise<{ coords: GeoCoordinates; query: string; approximate: boolean } | null> {
  const { address, city, state, zip } = parts;

  // Ordered from most to least specific. Later entries are approximate.
  const candidates: Array<{ query: string; approximate: boolean }> = [
    { query: buildAddressQuery(address, city, state, zip), approximate: false },
    { query: buildAddressQuery(address, city, state), approximate: false },
    { query: buildAddressQuery(city, state, zip), approximate: true },
    { query: buildAddressQuery(city, state), approximate: true },
    { query: buildAddressQuery(city), approximate: true },
  ];

  const tried = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate.query || tried.has(candidate.query)) continue;
    tried.add(candidate.query);

    const coords = await geocodeAddress(candidate.query);
    if (coords) {
      return { coords, query: candidate.query, approximate: candidate.approximate };
    }
  }

  return null;
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
  failureCacheTimestamps.clear();
}

/**
 * Pre-populate the cache with known coordinates (e.g., from database).
 */
export function seedGeocodeCache(entries: Array<{ address: string; lat: number; lng: number }>): void {
  for (const entry of entries) {
    geocodeCache.set(normalizeAddress(entry.address), { lat: entry.lat, lng: entry.lng });
  }
}
