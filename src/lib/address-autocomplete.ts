/**
 * Address autocomplete via Mapbox Geocoding — validates and canonicalizes
 * addresses at entry so they're geocodable downstream.
 *
 * Pure, provider-specific helpers (URL building + response parsing) live here
 * so they can be unit-tested. The React component uses them. When no token is
 * configured, autocomplete is disabled and callers fall back to a plain text
 * input — nothing breaks.
 *
 * Configure with NEXT_PUBLIC_MAPBOX_TOKEN.
 */

export interface AddressSuggestion {
  id: string;
  label: string; // full human-readable address
  address: string; // street line (house number + street)
  city: string;
  state: string; // 2-letter where available
  zip: string;
  lat: number;
  lng: number;
}

export function getMapboxToken(): string | undefined {
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN || undefined;
}

export function isAutocompleteEnabled(): boolean {
  return !!getMapboxToken();
}

export function buildSuggestUrl(query: string, token: string): string {
  const q = encodeURIComponent(query.trim());
  const params = new URLSearchParams({
    access_token: token,
    autocomplete: 'true',
    country: 'us',
    types: 'address',
    limit: '5',
  });
  return `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?${params}`;
}

interface MapboxContextEntry {
  id?: string;
  text?: string;
  short_code?: string;
}

interface MapboxFeature {
  id?: string;
  place_name?: string;
  text?: string;
  address?: string;
  center?: [number, number]; // [lng, lat]
  context?: MapboxContextEntry[];
}

function contextValue(context: MapboxContextEntry[] | undefined, prefix: string): MapboxContextEntry | undefined {
  return context?.find((c) => (c.id || '').startsWith(prefix));
}

/**
 * Parse a Mapbox geocoding response into normalized address suggestions.
 * Skips any feature lacking coordinates.
 */
export function parseSuggestions(json: unknown): AddressSuggestion[] {
  const features = (json as { features?: MapboxFeature[] } | null)?.features;
  if (!Array.isArray(features)) return [];

  const out: AddressSuggestion[] = [];
  for (const f of features) {
    if (!Array.isArray(f.center) || f.center.length < 2) continue;
    const [lng, lat] = f.center;

    const street = f.text || '';
    const address = f.address ? `${f.address} ${street}`.trim() : street;
    const city = contextValue(f.context, 'place')?.text || '';
    const regionEntry = contextValue(f.context, 'region');
    // short_code like "US-CA" -> "CA"
    const state = regionEntry?.short_code?.split('-')[1]?.toUpperCase() || regionEntry?.text || '';
    const zip = contextValue(f.context, 'postcode')?.text || '';

    out.push({
      id: f.id || `${lat},${lng}`,
      label: f.place_name || address,
      address,
      city,
      state,
      zip,
      lat,
      lng,
    });
  }
  return out;
}

/**
 * Fetch address suggestions. Returns [] on any failure or when disabled.
 */
export async function fetchAddressSuggestions(query: string, opts?: { signal?: AbortSignal }): Promise<AddressSuggestion[]> {
  const token = getMapboxToken();
  if (!token || query.trim().length < 3) return [];
  try {
    const res = await fetch(buildSuggestUrl(query, token), { signal: opts?.signal });
    if (!res.ok) return [];
    return parseSuggestions(await res.json());
  } catch {
    return [];
  }
}
