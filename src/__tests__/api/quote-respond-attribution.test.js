/**
 * @jest-environment node
 */

/**
 * POST /api/quote/respond — when a customer accepts shortly after a reminder,
 * the acceptance is logged to the Jenny feed as a follow-up win.
 */

const { createQueryMock } = require('@/__mocks__/supabase-query-mock');

jest.mock('@/lib/email', () => ({
  sendQuoteAcceptedEmail: jest.fn().mockResolvedValue({ id: 'em' }),
  sendQuoteCancellationEmail: jest.fn().mockResolvedValue({ id: 'em' }),
}));

let quoteRow;
let sb;
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: (...a) => sb.from(...a) })),
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

const { POST } = require('@/app/api/quote/respond/route');

const QUOTE_ID = '11111111-2222-4333-8444-555555555555';
const day = 86400000;

function makeRequest(body) {
  return new Request('http://localhost/api/quote/respond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  });
}

function logInserts() {
  return sb.calls.filter((c) => c.table === 'jenny_action_log' && c.op === 'insert').map((c) => c.payload);
}

beforeEach(() => {
  quoteRow = {
    id: QUOTE_ID, status: 'sent', notes: null, quote_number: 'Q-42', total: 1250, company_id: 'co1',
    reminder_count: 1, last_reminder_at: new Date(Date.now() - 2 * day).toISOString(),
    company: { id: 'co1', name: 'Acme', email: 'o@acme.com', phone: '555' },
    customer: { id: 'c1', name: 'Jane', email: 'jane@x.com', phone: null },
  };
  sb = createQueryMock(({ table }) => (table === 'quotes' ? { data: quoteRow, error: null } : { data: null, error: null }));
});

describe('quote acceptance attribution', () => {
  it('logs a follow-up win when the customer accepts within the window after a reminder', async () => {
    const res = await POST(makeRequest({ quoteId: QUOTE_ID, action: 'approve' }));
    expect(res.status).toBe(200);

    const update = sb.calls.find((c) => c.table === 'quotes' && c.op === 'update');
    expect(update.payload).toMatchObject({ status: 'approved' });
    expect(update.payload.approved_at).toEqual(expect.any(String));

    const logs = logInserts();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ company_id: 'co1', action_type: 'quote_follow_up', status: 'executed', target_id: QUOTE_ID });
    expect(logs[0].title).toContain('Q-42');
    expect(logs[0].title).toContain('accepted after a reminder');
    expect(logs[0].title).toContain('$1,250.00');
    expect(logs[0].metadata).toMatchObject({ outcome: 'won_after_reminder', reminder_count: 1 });
  });

  it('logs nothing when the quote was never reminded', async () => {
    quoteRow.reminder_count = 0;
    quoteRow.last_reminder_at = null;
    const res = await POST(makeRequest({ quoteId: QUOTE_ID, action: 'approve' }));
    expect(res.status).toBe(200);
    expect(logInserts()).toHaveLength(0);
  });

  it('logs nothing when the reminder was too long ago to take credit', async () => {
    quoteRow.last_reminder_at = new Date(Date.now() - 30 * day).toISOString();
    const res = await POST(makeRequest({ quoteId: QUOTE_ID, action: 'approve' }));
    expect(res.status).toBe(200);
    expect(logInserts()).toHaveLength(0);
  });

  it('logs nothing on a decline', async () => {
    const res = await POST(makeRequest({ quoteId: QUOTE_ID, action: 'reject', reason: 'Too pricey' }));
    expect(res.status).toBe(200);
    expect(logInserts()).toHaveLength(0);
  });
});
