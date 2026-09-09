import {
  STATE_TAX_RATES,
  normalizeState,
  getStateTaxRate,
  detectStateFromAddress,
  parseTaxRate,
  resolveDefaultTaxRate,
} from '@/lib/sales-tax';

describe('lib/sales-tax', () => {
  it('covers all 50 states plus DC', () => {
    expect(Object.keys(STATE_TAX_RATES)).toHaveLength(51);
    expect(STATE_TAX_RATES.AK).toBeDefined(); // was missing from the invoices table
  });

  it('normalizes codes and full names', () => {
    expect(normalizeState(' ca ')).toBe('CA');
    expect(normalizeState('Texas')).toBe('TX');
    expect(normalizeState('Narnia')).toBeNull();
    expect(normalizeState(null)).toBeNull();
  });

  it('getStateTaxRate returns null for unknown states, 0 for no-tax states', () => {
    expect(getStateTaxRate('OR')).toBe(0);
    expect(getStateTaxRate('ZZ')).toBeNull();
  });

  it('detects the state from an address suffix or a full name', () => {
    expect(detectStateFromAddress('123 Main St, Austin, TX 78701')).toBe('TX');
    expect(detectStateFromAddress('5 Elm, Portland, or')).toBe('OR');
    expect(detectStateFromAddress('Somewhere in New Mexico')).toBe('NM');
    expect(detectStateFromAddress('no state here')).toBeNull();
  });

  it('parseTaxRate handles DB numerics arriving as strings and rejects junk', () => {
    expect(parseTaxRate('8.25')).toBe(8.25);
    expect(parseTaxRate(0)).toBe(0);
    expect(parseTaxRate('')).toBeNull();
    expect(parseTaxRate(null)).toBeNull();
    expect(parseTaxRate(-1)).toBeNull();
    expect(parseTaxRate('abc')).toBeNull();
  });

  describe('resolveDefaultTaxRate', () => {
    it('company default wins over the customer state', () => {
      expect(resolveDefaultTaxRate({ companyDefault: '7.5', customerState: 'CA' })).toEqual({
        rate: 7.5,
        source: 'company',
        state: 'CA',
      });
    });

    it('a company default of 0 is respected (not treated as unset)', () => {
      expect(resolveDefaultTaxRate({ companyDefault: 0, customerState: 'CA' }).rate).toBe(0);
    });

    it('falls back to a state estimate, then to 0 — never a hidden California rate', () => {
      expect(resolveDefaultTaxRate({ customerState: 'TX' })).toEqual({ rate: 8.2, source: 'state', state: 'TX' });
      expect(resolveDefaultTaxRate({ customerAddress: '1 Pike Pl, Seattle, WA 98101' }).state).toBe('WA');
      expect(resolveDefaultTaxRate({})).toEqual({ rate: 0, source: 'none', state: null });
    });
  });
});
