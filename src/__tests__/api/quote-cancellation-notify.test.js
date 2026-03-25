/**
 * @jest-environment node
 */

/**
 * Tests for the quote cancellation/decline notification flow:
 *   POST /api/quote/notify-cancellation – notifies owners when a customer declines a quote
 *
 * This route is called from the customer-facing QuoteViewClient after a successful decline.
 * It looks up the quote, finds company owners/admins, and sends SMS + email alerts.
 */

// ── Supabase mock ──────────────────────────────────────────────────────────────

const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockIn = jest.fn();
const mockSingle = jest.fn();

const mockFrom = jest.fn(() => ({
  select: mockSelect,
}));

mockSelect.mockReturnValue({
  eq: mockEq,
  in: mockIn,
});

mockEq.mockReturnValue({
  single: mockSingle,
  in: mockIn,
});

mockIn.mockReturnValue({
  then: jest.fn(),
});

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

// ── Email mock ─────────────────────────────────────────────────────────────────

const mockSendQuoteCancellationEmail = jest.fn();

jest.mock('@/lib/email', () => ({
  sendQuoteCancellationEmail: (...args) => mockSendQuoteCancellationEmail(...args),
}));

// ── Twilio mock ────────────────────────────────────────────────────────────────

const mockSendSMS = jest.fn();
const mockFormatPhoneNumber = jest.fn((p) => p);

jest.mock('@/lib/twilio', () => ({
  sendSMS: (...args) => mockSendSMS(...args),
  formatPhoneNumber: (p) => mockFormatPhoneNumber(p),
}));

// ── Import route AFTER mocks ───────────────────────────────────────────────────

const { POST: notifyCancellation } = require('@/app/api/quote/notify-cancellation/route');

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body) {
  return new Request('http://localhost/api/quote/notify-cancellation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const sampleQuote = {
  id: 'q-123',
  quote_number: 'QT-2026-050',
  total: 550,
  company_id: 'comp-1',
  customer: { name: 'Alice Johnson' },
};

const sampleOwners = [
  { phone: '(555) 111-2222', full_name: 'Mike Owner', email: 'mike@acme.com' },
  { phone: null, full_name: 'Sarah Admin', email: 'sarah@acme.com' },
];

function setupMocks(quote = sampleQuote, owners = sampleOwners) {
  // Reset call tracking
  mockFrom.mockClear();
  mockSelect.mockClear();
  mockEq.mockClear();
  mockIn.mockClear();
  mockSingle.mockClear();

  // Quote lookup chain: from('quotes').select(...).eq('id', ...).single()
  mockSingle.mockResolvedValue({ data: quote, error: null });

  // Owners lookup chain: from('users').select(...).eq('company_id', ...).in('role', [...])
  mockIn.mockResolvedValue({ data: owners });

  // Re-wire the chain for each from() call
  let callCount = 0;
  mockFrom.mockImplementation((table) => {
    callCount++;
    return {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue(
          table === 'quotes'
            ? { single: () => Promise.resolve({ data: quote, error: null }) }
            : { in: () => Promise.resolve({ data: owners }) }
        ),
      }),
    };
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('/api/quote/notify-cancellation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendQuoteCancellationEmail.mockResolvedValue({ id: 'email-123' });
    mockSendSMS.mockResolvedValue({ success: true, messageId: 'sms-123' });
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'test-key',
      NEXT_PUBLIC_APP_URL: 'https://tooltimepro.com',
    };
    setupMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns 400 when quoteId is missing', async () => {
    const request = makeRequest({});
    const response = await notifyCancellation(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Missing quoteId');
  });

  it('returns 500 when database is not configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const request = makeRequest({ quoteId: 'q-123' });
    const response = await notifyCancellation(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Database not configured');
  });

  it('returns 404 when quote is not found', async () => {
    mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: () => Promise.resolve({ data: null, error: { message: 'not found' } }),
          in: () => Promise.resolve({ data: [] }),
        }),
      }),
    }));

    const request = makeRequest({ quoteId: 'nonexistent' });
    const response = await notifyCancellation(request);

    expect(response.status).toBe(404);
  });

  it('sends SMS and email to owners when quote is declined', async () => {
    const request = makeRequest({ quoteId: 'q-123', reason: 'Price too high' });
    const response = await notifyCancellation(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.notified).toBe(2);

    // SMS sent to first owner (has phone)
    expect(mockSendSMS).toHaveBeenCalledTimes(1);
    const smsCall = mockSendSMS.mock.calls[0][0];
    expect(smsCall.body).toContain('QT-2026-050');
    expect(smsCall.body).toContain('Alice Johnson');
    expect(smsCall.body).toContain('declined');
    expect(smsCall.body).toContain('Price too high');

    // Email sent to both owners
    expect(mockSendQuoteCancellationEmail).toHaveBeenCalledTimes(2);

    const emailCall1 = mockSendQuoteCancellationEmail.mock.calls[0][0];
    expect(emailCall1.to).toBe('mike@acme.com');
    expect(emailCall1.ownerName).toBe('Mike Owner');
    expect(emailCall1.quoteNumber).toBe('QT-2026-050');
    expect(emailCall1.customerName).toBe('Alice Johnson');
    expect(emailCall1.total).toBe(550);
    expect(emailCall1.reason).toBe('Price too high');
    expect(emailCall1.dashboardLink).toBe('https://tooltimepro.com/dashboard/quotes');

    const emailCall2 = mockSendQuoteCancellationEmail.mock.calls[1][0];
    expect(emailCall2.to).toBe('sarah@acme.com');
    expect(emailCall2.ownerName).toBe('Sarah Admin');
  });

  it('sends notification without reason when none provided', async () => {
    const request = makeRequest({ quoteId: 'q-123' });
    const response = await notifyCancellation(request);

    expect(response.status).toBe(200);

    // SMS should not contain "Reason:"
    if (mockSendSMS.mock.calls.length > 0) {
      const smsBody = mockSendSMS.mock.calls[0][0].body;
      expect(smsBody).not.toContain('Reason:');
      expect(smsBody).toContain('declined by the customer');
    }

    // Email reason should be undefined
    if (mockSendQuoteCancellationEmail.mock.calls.length > 0) {
      const emailArgs = mockSendQuoteCancellationEmail.mock.calls[0][0];
      expect(emailArgs.reason).toBeUndefined();
    }
  });

  it('returns success even when no owners are found', async () => {
    setupMocks(sampleQuote, []);

    // Override to return empty owners
    mockFrom.mockImplementation((table) => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue(
          table === 'quotes'
            ? { single: () => Promise.resolve({ data: sampleQuote, error: null }) }
            : { in: () => Promise.resolve({ data: [] }) }
        ),
      }),
    }));

    const request = makeRequest({ quoteId: 'q-123' });
    const response = await notifyCancellation(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.notified).toBe(0);
  });

  it('continues sending to other owners if SMS fails for one', async () => {
    mockSendSMS.mockRejectedValue(new Error('Twilio error'));

    const request = makeRequest({ quoteId: 'q-123', reason: 'Found another provider' });
    const response = await notifyCancellation(request);

    // Should still succeed - SMS failure doesn't block emails
    expect(response.status).toBe(200);
    expect(mockSendQuoteCancellationEmail).toHaveBeenCalledTimes(2);
  });

  it('continues sending to other owners if email fails for one', async () => {
    mockSendQuoteCancellationEmail
      .mockRejectedValueOnce(new Error('Resend error'))
      .mockResolvedValueOnce({ id: 'email-456' });

    const request = makeRequest({ quoteId: 'q-123' });
    const response = await notifyCancellation(request);

    // Should still succeed
    expect(response.status).toBe(200);
    expect(mockSendQuoteCancellationEmail).toHaveBeenCalledTimes(2);
  });

  it('does not send SMS to owners without phone numbers', async () => {
    setupMocks(sampleQuote, [
      { phone: null, full_name: 'No Phone Owner', email: 'nophone@acme.com' },
    ]);

    mockFrom.mockImplementation((table) => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue(
          table === 'quotes'
            ? { single: () => Promise.resolve({ data: sampleQuote, error: null }) }
            : { in: () => Promise.resolve({ data: [{ phone: null, full_name: 'No Phone Owner', email: 'nophone@acme.com' }] }) }
        ),
      }),
    }));

    const request = makeRequest({ quoteId: 'q-123' });
    const response = await notifyCancellation(request);

    expect(response.status).toBe(200);
    expect(mockSendSMS).not.toHaveBeenCalled();
    expect(mockSendQuoteCancellationEmail).toHaveBeenCalledTimes(1);
  });
});
