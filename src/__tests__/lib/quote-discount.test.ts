import {
  calcDiscountAmount,
  normalizeDiscountType,
} from '@/lib/quote-discount';

describe('calcDiscountAmount', () => {
  it('uses the entered value as a dollar amount for fixed discounts', () => {
    expect(calcDiscountAmount(2500, 200, 'fixed')).toBe(200);
  });

  it('computes a percentage of the subtotal for percent discounts', () => {
    expect(calcDiscountAmount(2500, 10, 'percent')).toBe(250);
    expect(calcDiscountAmount(2500, 8.68, 'percent')).toBe(217);
  });

  it('rounds percent discounts to cents', () => {
    expect(calcDiscountAmount(99.99, 33.333, 'percent')).toBe(33.33);
  });

  it('caps a fixed discount at the subtotal', () => {
    expect(calcDiscountAmount(100, 500, 'fixed')).toBe(100);
  });

  it('caps a percent discount at 100%', () => {
    expect(calcDiscountAmount(100, 250, 'percent')).toBe(100);
  });

  it('never returns a negative or NaN amount', () => {
    expect(calcDiscountAmount(100, -20, 'fixed')).toBe(0);
    expect(calcDiscountAmount(100, -20, 'percent')).toBe(0);
    expect(calcDiscountAmount(NaN, 10, 'percent')).toBe(0);
    expect(calcDiscountAmount(100, NaN, 'fixed')).toBe(0);
    expect(calcDiscountAmount(-50, 10, 'percent')).toBe(0);
  });

  it('returns zero when there is no subtotal', () => {
    expect(calcDiscountAmount(0, 50, 'percent')).toBe(0);
    expect(calcDiscountAmount(0, 50, 'fixed')).toBe(0);
  });
});

describe('normalizeDiscountType', () => {
  it('accepts percent and falls back to fixed for anything else', () => {
    expect(normalizeDiscountType('percent')).toBe('percent');
    expect(normalizeDiscountType('fixed')).toBe('fixed');
    expect(normalizeDiscountType(undefined)).toBe('fixed');
    expect(normalizeDiscountType('bogus')).toBe('fixed');
  });
});
