// ---------------------------------------------------------------------------
// Quote discount.
//
// The builder lets the contractor enter a discount either as a fixed dollar
// amount or as a percentage of the subtotal. Only the resolved dollar amount
// is stored (quotes.discount_amount), so everything downstream (customer
// quote view, emails, invoices) keeps working unchanged.
// ---------------------------------------------------------------------------

export type DiscountType = 'fixed' | 'percent';

export const DISCOUNT_TYPES: { value: DiscountType; label: string }[] = [
  { value: 'fixed', label: '$' },
  { value: 'percent', label: '%' },
];

export function normalizeDiscountType(value: unknown): DiscountType {
  return value === 'percent' ? 'percent' : 'fixed';
}

/**
 * Resolve the dollar discount for a quote.
 *
 * - `fixed`: the entered value is the discount, capped at the subtotal.
 * - `percent`: the entered value is a percentage (0-100) of the subtotal.
 *
 * Never returns a negative number or NaN, and rounds to cents.
 */
export function calcDiscountAmount(
  subtotal: number,
  discountValue: number,
  discountType: DiscountType,
): number {
  const sub = Math.max(0, Number(subtotal) || 0);
  const value = Math.max(0, Number(discountValue) || 0);

  const raw =
    discountType === 'percent'
      ? sub * (Math.min(100, value) / 100)
      : Math.min(sub, value);

  return Math.round(raw * 100) / 100;
}
