// Single source of truth for sales-tax defaults on quotes and invoices.
//
// Before this file existed the product carried THREE different answers to
// "what tax rate goes on this document":
//   - quotes:      a fixed 8.75% ("CA sales tax estimate") for every tenant
//   - invoices:    a table of state BASE rates (CA 7.25, TX 6.25, NY 4 …)
//   - smart quote: a table of state+local AVERAGE rates (CA 8.68, TX 8.20 …)
// so the same customer got a different rate on the quote, the invoice, and
// the smart quote, and an Oregon contractor's quotes carried California tax.
//
// Resolution order (see resolveDefaultTaxRate):
//   1. companies.default_tax_rate  — the contractor's own configured rate
//   2. STATE_TAX_RATES[customer state] — an ESTIMATE (state + average local)
//   3. 0
// The rate on the document is always editable; this only picks the default.

/**
 * Combined state + average local sales tax, in percent. These are estimates
 * (local rates vary by city/county) and are only used when the company has
 * not set its own default rate. Source: Tax Foundation state & local combined
 * averages. Keep alphabetical by code.
 */
export const STATE_TAX_RATES: Record<string, number> = {
  AK: 1.76, AL: 9.24, AR: 9.47, AZ: 8.40, CA: 8.68,
  CO: 7.77, CT: 6.35, DC: 6.00, DE: 0, FL: 7.02,
  GA: 7.37, HI: 4.44, IA: 6.94, ID: 6.02, IL: 8.82,
  IN: 7.00, KS: 8.70, KY: 6.00, LA: 9.55, MA: 6.25,
  MD: 6.00, ME: 5.50, MI: 6.00, MN: 7.49, MO: 8.30,
  MS: 7.07, MT: 0, NC: 6.99, ND: 6.96, NE: 6.94,
  NH: 0, NJ: 6.63, NM: 7.72, NV: 8.23, NY: 8.52,
  OH: 7.24, OK: 8.98, OR: 0, PA: 6.34, RI: 7.00,
  SC: 7.44, SD: 6.40, TN: 9.55, TX: 8.20, UT: 7.19,
  VA: 5.75, VT: 6.36, WA: 9.29, WI: 5.43, WV: 6.50,
  WY: 5.36,
};

export const STATE_ABBREVS: ReadonlySet<string> = new Set(Object.keys(STATE_TAX_RATES));

/** Full state names → two-letter codes, for address parsing. */
export const STATE_NAMES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO',
  montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH',
  oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  'district of columbia': 'DC',
};

/** Normalize "ca", "California", " CA " → "CA"; unknown → null. */
export function normalizeState(state: string | null | undefined): string | null {
  if (!state) return null;
  const trimmed = String(state).trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (STATE_ABBREVS.has(upper)) return upper;
  const byName = STATE_NAMES[trimmed.toLowerCase()];
  return byName || null;
}

/** Estimated combined rate for a state (percent), or null when unknown. */
export function getStateTaxRate(state: string | null | undefined): number | null {
  const code = normalizeState(state);
  if (!code) return null;
  const rate = STATE_TAX_RATES[code];
  return rate === undefined ? null : rate;
}

/** Best-effort state detection from a free-text address. */
export function detectStateFromAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const trimmed = address.trim();

  // ", ST 12345" or ", ST" at the end of the address
  const abbrMatch = trimmed.match(/,\s*([A-Za-z]{2})\s*\d{0,5}\s*$/);
  if (abbrMatch && STATE_ABBREVS.has(abbrMatch[1].toUpperCase())) {
    return abbrMatch[1].toUpperCase();
  }

  // Full state name anywhere in the address
  const lower = trimmed.toLowerCase();
  for (const [name, abbr] of Object.entries(STATE_NAMES)) {
    if (lower.includes(name)) return abbr;
  }

  return null;
}

/** A numeric, non-negative percent or null (handles DB numerics arriving as strings). */
export function parseTaxRate(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export interface TaxRateContext {
  /** companies.default_tax_rate — the contractor's configured rate. */
  companyDefault?: unknown;
  /** customers.state (or a detected state) — used only as an estimate. */
  customerState?: string | null;
  /** Free-text address to detect the state from when `customerState` is empty. */
  customerAddress?: string | null;
}

export interface ResolvedTaxRate {
  rate: number;
  source: 'company' | 'state' | 'none';
  state: string | null;
}

/**
 * Default tax rate (percent) for a new quote/invoice.
 * Company default wins; a state-based estimate is only a fallback.
 */
export function resolveDefaultTaxRate(ctx: TaxRateContext = {}): ResolvedTaxRate {
  const companyRate = parseTaxRate(ctx.companyDefault);
  const state = normalizeState(ctx.customerState) || detectStateFromAddress(ctx.customerAddress);
  if (companyRate !== null) return { rate: companyRate, source: 'company', state };
  const stateRate = getStateTaxRate(state);
  if (stateRate !== null) return { rate: stateRate, source: 'state', state };
  return { rate: 0, source: 'none', state };
}
