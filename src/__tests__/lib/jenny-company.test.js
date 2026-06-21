/**
 * @jest-environment node
 */

const { resolveCompanyByNumber } = require('@/lib/jenny-company');

// Configurable Supabase stub.
function makeSupabase({ numberMatch = null, firstCompanyId = 'first-co', companyRow } = {}) {
  return {
    from(table) {
      const obj = {};
      obj.select = jest.fn(() => obj);
      obj.eq = jest.fn(() => obj);
      obj.ilike = jest.fn(() => obj);
      obj.limit = jest.fn(() => {
        // companies.select('id').limit(1) is awaited directly
        if (table === 'companies') {
          return Promise.resolve({ data: firstCompanyId ? [{ id: firstCompanyId }] : [] });
        }
        return obj;
      });
      obj.maybeSingle = jest.fn(() => {
        if (table === 'company_phone_numbers') {
          return Promise.resolve({ data: numberMatch ? { company_id: numberMatch } : null });
        }
        if (table === 'companies') {
          return Promise.resolve({
            data: companyRow || { id: 'first-co', name: 'First Co', business_type: 'landscaping' },
          });
        }
        return Promise.resolve({ data: null });
      });
      return obj;
    },
  };
}

describe('resolveCompanyByNumber', () => {
  const OLD_ENV = process.env.JENNY_COMPANY_ID;
  afterEach(() => {
    if (OLD_ENV === undefined) delete process.env.JENNY_COMPANY_ID;
    else process.env.JENNY_COMPANY_ID = OLD_ENV;
  });

  it('routes by the company_phone_numbers mapping when the number matches', async () => {
    delete process.env.JENNY_COMPANY_ID;
    const supabase = makeSupabase({
      numberMatch: 'roofco-123',
      companyRow: { id: 'roofco-123', name: 'Roof Co', business_type: 'roofing' },
    });
    const company = await resolveCompanyByNumber(supabase, '+17657895752');
    expect(company.id).toBe('roofco-123');
    expect(company.name).toBe('Roof Co');
  });

  it('falls back to JENNY_COMPANY_ID when no number mapping exists', async () => {
    process.env.JENNY_COMPANY_ID = 'pinned-co';
    const supabase = makeSupabase({
      numberMatch: null,
      companyRow: { id: 'pinned-co', name: 'Pinned Co', business_type: 'pool' },
    });
    const company = await resolveCompanyByNumber(supabase, '+17657895752');
    expect(company.id).toBe('pinned-co');
  });

  it('falls back to the first company when neither mapping nor pin is set', async () => {
    delete process.env.JENNY_COMPANY_ID;
    const supabase = makeSupabase({ numberMatch: null, firstCompanyId: 'first-co' });
    const company = await resolveCompanyByNumber(supabase, '+17657895752');
    expect(company.id).toBe('first-co');
  });

  it('returns null when there are no companies at all', async () => {
    delete process.env.JENNY_COMPANY_ID;
    const supabase = makeSupabase({ numberMatch: null, firstCompanyId: null });
    const company = await resolveCompanyByNumber(supabase, '+17657895752');
    expect(company).toBeNull();
  });

  it('skips the number lookup for an empty/short number', async () => {
    process.env.JENNY_COMPANY_ID = 'pinned-co';
    const supabase = makeSupabase({ companyRow: { id: 'pinned-co', name: 'Pinned Co' } });
    const company = await resolveCompanyByNumber(supabase, '');
    expect(company.id).toBe('pinned-co');
  });
});
