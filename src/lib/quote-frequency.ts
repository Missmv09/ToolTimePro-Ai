// ---------------------------------------------------------------------------
// Quote billing frequency (label-only).
//
// A quote can describe a one-time job or a recurring service (weekly lawn
// mowing, monthly pool service, etc.). For now this is purely descriptive: it
// is shown on the quote and the customer-facing view. It does NOT yet drive
// recurring jobs or recurring invoices.
// ---------------------------------------------------------------------------

export type QuoteFrequency = 'one_time' | 'weekly' | 'biweekly' | 'monthly';

export const DEFAULT_QUOTE_FREQUENCY: QuoteFrequency = 'one_time';

export const QUOTE_FREQUENCIES: {
  value: QuoteFrequency;
  label: string;
  // Suffix appended after a price/total, e.g. "$45.00 / week". Empty for one-time.
  suffix: string;
}[] = [
  { value: 'one_time', label: 'One-time', suffix: '' },
  { value: 'weekly', label: 'Weekly', suffix: '/ week' },
  { value: 'biweekly', label: 'Every 2 weeks', suffix: '/ 2 weeks' },
  { value: 'monthly', label: 'Monthly', suffix: '/ month' },
];

export function normalizeFrequency(value: unknown): QuoteFrequency {
  const v = String(value ?? '').toLowerCase();
  return QUOTE_FREQUENCIES.some((f) => f.value === v)
    ? (v as QuoteFrequency)
    : DEFAULT_QUOTE_FREQUENCY;
}

export function frequencyLabel(value: unknown): string {
  const f = normalizeFrequency(value);
  return QUOTE_FREQUENCIES.find((o) => o.value === f)!.label;
}

// e.g. "/ week" — append after a formatted amount. Empty string for one-time.
export function frequencySuffix(value: unknown): string {
  const f = normalizeFrequency(value);
  return QUOTE_FREQUENCIES.find((o) => o.value === f)!.suffix;
}

export function isRecurringFrequency(value: unknown): boolean {
  return normalizeFrequency(value) !== 'one_time';
}
