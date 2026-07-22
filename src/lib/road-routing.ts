/**
 * Real road-network distances/durations via an OSRM routing server.
 *
 * Replaces the straight-line-times-fudge-factor estimate with actual driving
 * distances and times when a routing server is reachable. Every call degrades
 * gracefully: on any error, timeout, or unreachable server it returns null and
 * the caller falls back to the Haversine estimate, so routing always works.
 *
 * The server is configurable via the OSRM_BASE_URL env var. The default is the
 * public OSRM demo server, which is rate-limited and best replaced with a
 * self-hosted instance (or a paid provider) in production.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RoadMatrix {
  /** distancesMiles[i][j] = driving miles from point i to point j */
  distancesMiles: number[][];
  /** durationsMin[i][j] = driving minutes from point i to point j */
  durationsMin: number[][];
}

const DEFAULT_OSRM_BASE = 'https://router.project-osrm.org';
// OSRM's table service caps the number of coordinates per request; stay well under.
const MAX_TABLE_POINTS = 100;

export function metersToMiles(meters: number): number {
  return meters / 1609.344;
}

export function secondsToMinutes(seconds: number): number {
  return seconds / 60;
}

/**
 * Build an OSRM /table request URL. Note OSRM expects `lng,lat` order.
 */
export function buildTableUrl(base: string, points: LatLng[]): string {
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');
  return `${base.replace(/\/$/, '')}/table/v1/driving/${coords}?annotations=distance,duration`;
}

/**
 * Parse an OSRM /table response into mile/minute matrices.
 * Returns null if the response is missing, errored, or malformed.
 */
export function parseTableResponse(json: unknown): RoadMatrix | null {
  const data = json as { code?: string; distances?: number[][]; durations?: number[][] } | null;
  if (!data || data.code !== 'Ok' || !Array.isArray(data.distances) || !Array.isArray(data.durations)) {
    return null;
  }
  // OSRM returns null entries for unreachable pairs — bail rather than guess.
  const hasNulls = (m: number[][]) => m.some((row) => row.some((v) => v == null));
  if (hasNulls(data.distances) || hasNulls(data.durations)) return null;

  return {
    distancesMiles: data.distances.map((row) => row.map(metersToMiles)),
    durationsMin: data.durations.map((row) => row.map(secondsToMinutes)),
  };
}

/**
 * Fetch a full pairwise road distance/duration matrix for the given points.
 * Returns null (caller should fall back) if the service is unavailable or the
 * point count exceeds what the table service supports.
 */
export async function getRoadMatrix(
  points: LatLng[],
  opts?: { baseUrl?: string; timeoutMs?: number }
): Promise<RoadMatrix | null> {
  if (points.length < 2 || points.length > MAX_TABLE_POINTS) return null;

  const base = opts?.baseUrl || process.env.OSRM_BASE_URL || DEFAULT_OSRM_BASE;
  const url = buildTableUrl(base, points);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 5000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'TaskIguana/1.0 (field-service-management)' },
    });
    if (!res.ok) return null;
    return parseTableResponse(await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Extract the sub-matrix for a subset of points, identified by their indices
 * in the master matrix and preserving the given order.
 */
export function extractSubMatrix(master: number[][], indices: number[]): number[][] {
  return indices.map((i) => indices.map((j) => master[i][j]));
}
