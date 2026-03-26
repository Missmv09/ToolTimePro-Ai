/**
 * @jest-environment node
 */

/**
 * Tests for the quote approval flow:
 *   POST /api/quote/send         – sends quote email to customer
 *   POST /api/quote/notify-approval – notifies admin of customer approval
 *
 * These two routes sit at opposite ends of the quote lifecycle:
 *   Admin sends quote → Customer reviews → Customer approves → Admin notified
 */

// ── Email mock ─────────────────────────────────────────────────────────────────

const mockSendQuoteEmail = jest.fn();
const mockSendQuoteApprovalEmail = jest.fn();

jest.mock('@/lib/email', () => ({
  sendQuoteEmail: (...args) => mockSendQuoteEmail(...args),
  sendQuoteApprovalEmail: (...args) => mockSendQuoteApprovalEmail(...args),
}));

// Mock Supabase for auth validation in notify-approval
const mockGetUser = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { id: 'q-1', status: 'approved', company_id: 'c-1' } }),
          eq: () => ({
            single: () => Promise.resolve({ data: { id: 'q-1', status: 'approved', company_id: 'c-1' } }),
          }),
        }),
      }),
    }),
    auth: { getUser: (...args) => mockGetUser(...args) },
  }),
}));

// ── Import routes AFTER mocks ──────────────────────────────────────────────────

const { POST: sendQuote } = require('@/app/api/quote/send/route');
const { POST: notifyApproval } = require('@/app/api/quote/notify-approval/route');

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body) {
  return new Request('http://localhost/api/quote/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ── /api/quote/send ────────────────────────────────────────────────────────────

describe('/api/quote/send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendQuoteEmail.mockResolvedValue({ id: 'msg-123' });
  });

  it('sends a quote email and returns success', async () => {
    const request = makeRequest({
      to: 'customer@example.com',
      customerName: 'Jane Doe',
      quoteNumber: 'QT-2026-001',
      total: 303.10,
      quoteLink: 'https://tooltimepro.com/quote/abc-123',
      companyName: 'Green Valley Landscaping',
      items: [
        { description: 'Lawn mowing', quantity: 1, unit_price: 45, total: 45 },
      ],
      subtotal: 280,
      taxRate: 8.25,
      taxAmount: 23.10,
      validUntil: '2026-05-01',
      notes: 'Side gate access required',
    });

    const response = await sendQuote(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.messageId).toBe('msg-123');

    expect(mockSendQuoteEmail).toHaveBeenCalledTimes(1);
    const emailArgs = mockSendQuoteEmail.mock.calls[0][0];
    expect(emailArgs.to).toBe('customer@example.com');
    expect(emailArgs.quoteNumber).toBe('QT-2026-001');
    expect(emailArgs.quoteLink).toBe('https://tooltimepro.com/quote/abc-123');
    expect(emailArgs.companyName).toBe('Green Valley Landscaping');
  });

  it('returns 400 when recipient email is missing', async () => {
    const request = makeRequest({
      quoteNumber: 'QT-001',
      quoteLink: 'https://tooltimepro.com/quote/abc',
    });

    const response = await sendQuote(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Recipient email required');
  });

  it('returns 400 when quote link is missing', async () => {
    const request = makeRequest({
      to: 'customer@example.com',
      quoteNumber: 'QT-001',
    });

    const response = await sendQuote(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Quote link required');
  });

  it('returns 500 when email service fails', async () => {
    mockSendQuoteEmail.mockRejectedValue(new Error('Resend API down'));

    const request = makeRequest({
      to: 'customer@example.com',
      quoteLink: 'https://tooltimepro.com/quote/abc',
    });

    const response = await sendQuote(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Resend API down');
  });

  it('defaults customerName and quoteNumber when not provided', async () => {
    mockSendQuoteEmail.mockResolvedValue({ id: 'msg-456' });

    const request = makeRequest({
      to: 'customer@example.com',
      quoteLink: 'https://tooltimepro.com/quote/abc',
      total: 100,
    });

    const response = await sendQuote(request);
    expect(response.status).toBe(200);

    const emailArgs = mockSendQuoteEmail.mock.calls[0][0];
    expect(emailArgs.customerName).toBe('Customer');
    expect(emailArgs.quoteNumber).toBe('N/A');
  });
});

// ── /api/quote/notify-approval ─────────────────────────────────────────────────

describe('/api/quote/notify-approval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendQuoteApprovalEmail.mockResolvedValue({ id: 'msg-789' });
  });

  it('sends an approval notification to the admin', async () => {
    const request = makeRequest({
      quoteId: 'q-1',
      to: 'owner@company.com',
      ownerName: 'Mike',
      quoteNumber: 'QT-2026-001',
      customerName: 'Jane Doe',
      total: 303.10,
      itemCount: 3,
      submittedBy: 'Jane Doe',
      dashboardLink: 'https://tooltimepro.com/dashboard/quotes',
    });

    const response = await notifyApproval(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.messageId).toBe('msg-789');

    expect(mockSendQuoteApprovalEmail).toHaveBeenCalledTimes(1);
    const emailArgs = mockSendQuoteApprovalEmail.mock.calls[0][0];
    expect(emailArgs.to).toBe('owner@company.com');
    expect(emailArgs.ownerName).toBe('Mike');
    expect(emailArgs.customerName).toBe('Jane Doe');
    expect(emailArgs.total).toBe(303.10);
    expect(emailArgs.itemCount).toBe(3);
  });

  it('returns 400 when recipient email is missing', async () => {
    const request = makeRequest({
      ownerName: 'Mike',
      quoteNumber: 'QT-001',
    });

    const response = await notifyApproval(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Recipient email required');
  });

  it('returns 500 when email service fails', async () => {
    mockSendQuoteApprovalEmail.mockRejectedValue(new Error('Email service error'));

    const request = makeRequest({
      quoteId: 'q-1',
      to: 'owner@company.com',
    });

    const response = await notifyApproval(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Email service error');
  });

  it('uses default values when optional fields are omitted', async () => {
    mockSendQuoteApprovalEmail.mockResolvedValue({ id: 'msg-000' });

    const request = makeRequest({
      quoteId: 'q-1',
      to: 'owner@company.com',
    });

    const response = await notifyApproval(request);
    expect(response.status).toBe(200);

    const emailArgs = mockSendQuoteApprovalEmail.mock.calls[0][0];
    expect(emailArgs.ownerName).toBe('Boss');
    expect(emailArgs.quoteNumber).toBe('N/A');
    expect(emailArgs.customerName).toBe('Customer');
    expect(emailArgs.total).toBe(0);
    expect(emailArgs.itemCount).toBe(0);
  });

  it('returns 401 when no quoteId and no auth token provided', async () => {
    const request = makeRequest({
      to: 'owner@company.com',
    });

    const response = await notifyApproval(request);
    expect(response.status).toBe(401);
  });
});
