/**
 * @jest-environment node
 */

/**
 * Tests for POST /api/quote/remind — the "Send Reminder" button.
 * Auth, company ownership, status gating, and that it delegates to the
 * shared reminder sender with the owner's saved settings.
 */

const mockAuthenticate = jest.fn();
jest.mock('@/lib/server-auth', () => ({ authenticateRequest: (...a) => mockAuthenticate(...a) }));

const mockSendQuoteReminder = jest.fn();
jest.mock('@/lib/quote-reminder', () => {
  const actual = jest.requireActual('@/lib/quote-reminder');
  return { ...actual, sendQuoteReminder: (...a) => mockSendQuoteReminder(...a) };
});

let rows = {};
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table) => {
      const chain = {};
      ['select', 'eq'].forEach((m) => { chain[m] = jest.fn(() => chain); });
      chain.single = jest.fn(async () => ({ data: rows[table] ?? null, error: null }));
      chain.maybeSingle = jest.fn(async () => ({ data: rows[table] ?? null, error: null }));
      return chain;
    }),
  })),
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

const { POST } = require('@/app/api/quote/remind/route');

const QUOTE_ID = '11111111-2222-4333-8444-555555555555';

function makeRequest(body, headers = {}) {
  return new Request('http://localhost/api/quote/remind', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok', ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthenticate.mockResolvedValue({ user: { id: 'u1' } });
  mockSendQuoteReminder.mockResolvedValue({ ok: true, sms: 'sent', email: 'sent', reminderNumber: 1 });
  rows = {
    users: { id: 'u1', company_id: 'co1' },
    quotes: { id: QUOTE_ID, status: 'sent', total: 300, company_id: 'co1', customer: { id: 'c1', name: 'Jane', phone: '+15550001111', email: 'j@x.com', sms_consent: true } },
    companies: { id: 'co1', name: 'Acme', phone: '555', timezone: 'America/Chicago' },
    jenny_action_configs: { config: { first_reminder_days: 2, reminder_interval_days: 5, max_reminders: 3, channel: 'email', sms_template: 'custom {quote_link}' } },
  };
});

describe('POST /api/quote/remind', () => {
  it('requires a quoteId', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated callers', async () => {
    mockAuthenticate.mockResolvedValue({ user: null });
    const res = await POST(makeRequest({ quoteId: QUOTE_ID }));
    expect(res.status).toBe(401);
    expect(mockSendQuoteReminder).not.toHaveBeenCalled();
  });

  it("refuses a quote from another company", async () => {
    rows.quotes.company_id = 'someone-else';
    const res = await POST(makeRequest({ quoteId: QUOTE_ID }));
    expect(res.status).toBe(403);
    expect(mockSendQuoteReminder).not.toHaveBeenCalled();
  });

  it('only reminds quotes that are still unanswered', async () => {
    rows.quotes.status = 'approved';
    const res = await POST(makeRequest({ quoteId: QUOTE_ID }));
    expect(res.status).toBe(400);
    expect(mockSendQuoteReminder).not.toHaveBeenCalled();
  });

  it('sends with the owner saved settings and the request origin for the link', async () => {
    const res = await POST(makeRequest({ quoteId: QUOTE_ID }, { origin: 'https://sandbox.example.com' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result).toMatchObject({ sms: 'sent', email: 'sent' });

    expect(mockSendQuoteReminder).toHaveBeenCalledTimes(1);
    const args = mockSendQuoteReminder.mock.calls[0][0];
    expect(args.source).toBe('manual');
    expect(args.baseUrl).toBe('https://sandbox.example.com');
    expect(args.company).toMatchObject({ id: 'co1', name: 'Acme' });
    expect(args.config).toMatchObject({ first_reminder_days: 2, reminder_interval_days: 5, max_reminders: 3, channel: 'email', sms_template: 'custom {quote_link}' });
  });

  it('falls back to defaults when the owner has never saved settings', async () => {
    rows.jenny_action_configs = null;
    await POST(makeRequest({ quoteId: QUOTE_ID }));
    const args = mockSendQuoteReminder.mock.calls[0][0];
    expect(args.config).toMatchObject({ first_reminder_days: 3, reminder_interval_days: 4, max_reminders: 2, channel: 'both' });
  });

  it('reports a delivery failure as an error', async () => {
    mockSendQuoteReminder.mockResolvedValue({ ok: false, sms: 'failed', email: 'skipped', reminderNumber: 1, error: 'SMS: Twilio down' });
    const res = await POST(makeRequest({ quoteId: QUOTE_ID }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Twilio down');
  });
});
