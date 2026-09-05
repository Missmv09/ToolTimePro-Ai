/**
 * @jest-environment node
 */

/**
 * Tests for /api/quote/public — the sent → viewed transition.
 *
 * A customer opening the link marks a sent quote as viewed. The sender
 * previewing their own quote from the dashboard (?preview=1) must NOT, or a
 * freshly sent quote leaves the Sent tab before the customer has opened it.
 */

const mockUpdate = jest.fn();
let quoteRow;

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table) => {
      if (table === 'quotes') {
        const chain = {};
        chain.select = jest.fn(() => chain);
        chain.eq = jest.fn(() => chain);
        chain.single = jest.fn(async () => ({ data: quoteRow, error: null }));
        chain.update = jest.fn((payload) => {
          mockUpdate(payload);
          return { eq: jest.fn(async () => ({ error: null })) };
        });
        return chain;
      }
      // quote_items
      const chain = {};
      chain.select = jest.fn(() => chain);
      chain.eq = jest.fn(() => chain);
      chain.order = jest.fn(async () => ({ data: [], error: null }));
      return chain;
    }),
  })),
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

const { GET } = require('@/app/api/quote/public/route');

const QUOTE_ID = '11111111-2222-4333-8444-555555555555';

function makeRequest(query) {
  return new Request(`http://localhost/api/quote/public?${query}`, { method: 'GET' });
}

beforeEach(() => {
  mockUpdate.mockClear();
  quoteRow = { id: QUOTE_ID, status: 'sent', company: {}, customer: {} };
});

describe('GET /api/quote/public — viewed tracking', () => {
  it('marks a sent quote as viewed when the customer opens it', async () => {
    const res = await GET(makeRequest(`id=${QUOTE_ID}`));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0][0]).toMatchObject({ status: 'viewed' });
    expect(mockUpdate.mock.calls[0][0].viewed_at).toEqual(expect.any(String));
  });

  it('does not mark a sent quote as viewed when the sender previews it', async () => {
    const res = await GET(makeRequest(`id=${QUOTE_ID}&preview=1`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quote.status).toBe('sent');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('leaves an already-viewed quote alone either way', async () => {
    quoteRow.status = 'viewed';
    await GET(makeRequest(`id=${QUOTE_ID}`));
    await GET(makeRequest(`id=${QUOTE_ID}&preview=1`));
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('still hides drafts and pending-approval quotes in preview mode', async () => {
    quoteRow.status = 'draft';
    const res = await GET(makeRequest(`id=${QUOTE_ID}&preview=1`));
    expect(res.status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
