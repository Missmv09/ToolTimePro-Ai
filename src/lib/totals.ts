// Single source of truth for quote & invoice money math.
//
// Historically these calculations were duplicated inline inside the quote and
// invoice modal components (each ~1,900-line files) with no unit tests, and the
// quote path hardcoded an 8.75% tax while the invoice path used a variable rate.
// That divergence is exactly the kind of thing that silently mis-charges a
// customer, so the math now lives here, is exported, and is unit-tested.
//
// NOTE: these functions intentionally do NOT round. The callers store raw values
// and format with `.toFixed(2)` only for display — matching the prior behavior.

/** A line item only needs a quantity and unit price to be totaled. */
export interface LineItemLike {
  quantity: number | string;
  unit_price: number | string;
}

export interface Totals {
  subtotal: number;
  tax_amount: number;
  total: number;
}

/**
 * Default sales-tax rate (percent) applied to quotes. Previously hardcoded as
 * the literal `0.0875` inside the quote modal ("CA sales tax estimate").
 */
export const QUOTE_TAX_RATE = 8.75;

/** Total for a single line item: quantity × unit price. */
export function computeLineItemTotal(item: LineItemLike): number {
  return Number(item.quantity) * Number(item.unit_price);
}

/** Sum of every line item's quantity × unit price. */
export function computeSubtotal(items: LineItemLike[]): number {
  return items.reduce((sum, item) => sum + computeLineItemTotal(item), 0);
}

/**
 * Compute subtotal / tax / total for a tax rate expressed in percent
 * (e.g. `8.75` for 8.75%). A non-numeric or missing rate is treated as 0.
 */
export function computeTotals(
  items: LineItemLike[],
  taxRatePercent: number | string,
): Totals {
  const subtotal = computeSubtotal(items);
  const rate = Number(taxRatePercent) || 0;
  const tax_amount = subtotal * (rate / 100);
  const total = subtotal + tax_amount;
  return { subtotal, tax_amount, total };
}

/** Quote totals — always uses the fixed {@link QUOTE_TAX_RATE}. */
export function computeQuoteTotals(items: LineItemLike[]): Totals {
  return computeTotals(items, QUOTE_TAX_RATE);
}

/** Invoice totals — uses a user-supplied tax rate (percent). */
export function computeInvoiceTotals(
  items: LineItemLike[],
  taxRatePercent: number | string,
): Totals {
  return computeTotals(items, taxRatePercent);
}

/** Remaining balance on an invoice after any partial payments. */
export function computeBalanceDue(
  total: number,
  amountPaid: number = 0,
): number {
  return total - (amountPaid || 0);
}

/**
 * Deposit due on a quote: a fixed amount when set, otherwise a percentage of the
 * total, otherwise 0. Mirrors the original expression
 * `deposit_amount || (deposit_percentage ? (deposit_percentage/100)*total : 0)`.
 */
export function computeDepositAmount(
  depositAmount: number | null | undefined,
  depositPercentage: number | null | undefined,
  total: number,
): number {
  return (
    (depositAmount as number) ||
    (depositPercentage ? (depositPercentage / 100) * (total || 0) : 0)
  );
}
