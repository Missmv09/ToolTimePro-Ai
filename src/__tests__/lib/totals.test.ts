import {
  QUOTE_TAX_RATE,
  computeLineItemTotal,
  computeSubtotal,
  computeTotals,
  computeQuoteTotals,
  computeInvoiceTotals,
  computeBalanceDue,
  computeDepositAmount,
} from '@/lib/totals';

describe('lib/totals — money math', () => {
  describe('computeLineItemTotal', () => {
    it('multiplies quantity by unit price', () => {
      expect(computeLineItemTotal({ quantity: 3, unit_price: 25 })).toBe(75);
    });

    it('coerces numeric strings (form inputs arrive as strings)', () => {
      expect(computeLineItemTotal({ quantity: '2', unit_price: '10.5' })).toBe(21);
    });
  });

  describe('computeSubtotal', () => {
    it('is 0 for no items', () => {
      expect(computeSubtotal([])).toBe(0);
    });

    it('sums quantity × unit price across items', () => {
      expect(
        computeSubtotal([
          { quantity: 2, unit_price: 50 }, // 100
          { quantity: 1, unit_price: 30 }, // 30
          { quantity: 3, unit_price: 10 }, // 30
        ]),
      ).toBe(160);
    });
  });

  describe('computeTotals', () => {
    it('applies a percentage tax rate', () => {
      expect(computeTotals([{ quantity: 1, unit_price: 100 }], 10)).toEqual({
        subtotal: 100,
        tax_amount: 10,
        total: 110,
      });
    });

    it('treats a 0 / missing / non-numeric rate as no tax', () => {
      const items = [{ quantity: 1, unit_price: 100 }];
      expect(computeTotals(items, 0)).toEqual({ subtotal: 100, tax_amount: 0, total: 100 });
      // @ts-expect-error — exercising the runtime guard for bad input
      expect(computeTotals(items, undefined)).toEqual({ subtotal: 100, tax_amount: 0, total: 100 });
      expect(computeTotals(items, 'not-a-number')).toEqual({ subtotal: 100, tax_amount: 0, total: 100 });
    });

    it('accepts a numeric-string rate (matches parseFloat form values)', () => {
      expect(computeTotals([{ quantity: 1, unit_price: 200 }], '7.5')).toEqual({
        subtotal: 200,
        tax_amount: 15,
        total: 215,
      });
    });
  });

  describe('computeQuoteTotals (fixed 8.75% CA estimate)', () => {
    it('exposes the historical tax rate as a constant', () => {
      expect(QUOTE_TAX_RATE).toBe(8.75);
    });

    it('applies exactly 8.75% — identical to the old inline `subtotal * 0.0875`', () => {
      const items = [
        { quantity: 2, unit_price: 100 }, // 200
        { quantity: 1, unit_price: 50 }, // 50
      ];
      const subtotal = 250;
      const { tax_amount, total } = computeQuoteTotals(items);
      // Regression guard: must equal the literal the quote modal used to compute.
      expect(tax_amount).toBe(subtotal * 0.0875);
      expect(tax_amount).toBeCloseTo(21.875, 10);
      expect(total).toBe(subtotal + subtotal * 0.0875);
    });
  });

  describe('computeInvoiceTotals (variable rate)', () => {
    it('uses the supplied rate rather than the quote default', () => {
      const items = [{ quantity: 1, unit_price: 400 }];
      expect(computeInvoiceTotals(items, 5)).toEqual({
        subtotal: 400,
        tax_amount: 20,
        total: 420,
      });
    });

    it('differs from the quote path for the same items (documents the intended divergence)', () => {
      const items = [{ quantity: 1, unit_price: 1000 }];
      const quote = computeQuoteTotals(items); // 8.75%
      const invoiceNoTax = computeInvoiceTotals(items, 0); // 0%
      expect(quote.total).toBe(1087.5);
      expect(invoiceNoTax.total).toBe(1000);
    });
  });

  describe('computeBalanceDue', () => {
    it('equals the total when nothing is paid', () => {
      expect(computeBalanceDue(500)).toBe(500);
      expect(computeBalanceDue(500, 0)).toBe(500);
    });

    it('subtracts partial payments', () => {
      expect(computeBalanceDue(500, 200)).toBe(300);
    });

    it('can go negative on an overpayment (mirrors prior behavior — no clamping)', () => {
      expect(computeBalanceDue(100, 150)).toBe(-50);
    });
  });

  describe('computeDepositAmount', () => {
    it('uses a fixed deposit amount when present', () => {
      expect(computeDepositAmount(100, null, 1000)).toBe(100);
    });

    it('falls back to a percentage of the total', () => {
      expect(computeDepositAmount(null, 25, 1000)).toBe(250);
    });

    it('prefers the fixed amount over the percentage when both are set', () => {
      expect(computeDepositAmount(100, 50, 1000)).toBe(100);
    });

    it('is 0 when neither is provided', () => {
      expect(computeDepositAmount(null, null, 1000)).toBe(0);
      expect(computeDepositAmount(undefined, undefined, 1000)).toBe(0);
    });
  });
});
