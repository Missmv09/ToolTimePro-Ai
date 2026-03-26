/**
 * @jest-environment node
 */

/**
 * Tests for /api/invoice/send route
 * Validates the invoice email delivery flow — the final step in the customer
 * payment lifecycle: admin sends invoice → customer receives email with pay link.
 */

// ── Email mock ─────────────────────────────────────────────────────────────────

const mockSendInvoiceEmail = jest.fn();

jest.mock('@/lib/email', () => ({
  sendInvoiceEmail: (...args) => mockSendInvoiceEmail(...args),
}));

// ── Supabase mock ─────────────────────────────────────────────────────────────

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
  })),
}));

// ── Env vars ──────────────────────────────────────────────────────────────────

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

// ── Import route AFTER mocks ──────────────────────────────────────────────────

const { POST } = require('@/app/api/invoice/send/route');

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body) {
  return new Request('http://localhost/api/invoice/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token',
    },
    body: JSON.stringify(body),
  });
}

const fullInvoicePayload = {
  to: 'customer@example.com',
  customerName: 'Jane Doe',
  invoiceNumber: 'INV-2026-042',
  items: [
    { description: 'Lawn mowing', quantity: 1, unit_price: 45, total: 45 },
    { description: 'Hedge trimming', quantity: 2, unit_price: 65, total: 130 },
  ],
  subtotal: 175,
  taxRate: 8.25,
  taxAmount: 14.44,
  discountAmount: 0,
  total: 189.44,
  dueDate: '2026-04-30',
  notes: 'Payment due within 30 days',
  invoiceLink: 'https://tooltimepro.com/invoice/inv-abc-123',
  companyName: 'Green Valley Landscaping',
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('/api/invoice/send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendInvoiceEmail.mockResolvedValue({ id: 'msg-inv-001' });
  });

  // ── Successful send ───────────────────────────────────────────────────────

  it('sends an invoice email with all fields and returns success', async () => {
    const request = makeRequest(fullInvoicePayload);
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.messageId).toBe('msg-inv-001');

    expect(mockSendInvoiceEmail).toHaveBeenCalledTimes(1);
    const emailArgs = mockSendInvoiceEmail.mock.calls[0][0];
    expect(emailArgs.to).toBe('customer@example.com');
    expect(emailArgs.customerName).toBe('Jane Doe');
    expect(emailArgs.invoiceNumber).toBe('INV-2026-042');
    expect(emailArgs.total).toBe(189.44);
    expect(emailArgs.invoiceLink).toBe('https://tooltimepro.com/invoice/inv-abc-123');
    expect(emailArgs.companyName).toBe('Green Valley Landscaping');
    expect(emailArgs.dueDate).toBe('2026-04-30');
  });

  it('passes line items to the email service', async () => {
    const request = makeRequest(fullInvoicePayload);
    await POST(request);

    const emailArgs = mockSendInvoiceEmail.mock.calls[0][0];
    expect(emailArgs.items).toHaveLength(2);
    expect(emailArgs.items[0].description).toBe('Lawn mowing');
    expect(emailArgs.subtotal).toBe(175);
    expect(emailArgs.taxRate).toBe(8.25);
    expect(emailArgs.taxAmount).toBe(14.44);
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('returns 400 when recipient email is missing', async () => {
    const { to, ...noRecipient } = fullInvoicePayload;
    const request = makeRequest(noRecipient);
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Recipient email required');
  });

  it('returns 400 when invoice link is missing', async () => {
    const { invoiceLink, ...noLink } = fullInvoicePayload;
    const request = makeRequest(noLink);
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invoice link required');
  });

  // ── Default values ────────────────────────────────────────────────────────

  it('defaults customerName to "Customer" when not provided', async () => {
    const request = makeRequest({
      to: 'customer@example.com',
      invoiceLink: 'https://tooltimepro.com/invoice/abc',
      total: 100,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const emailArgs = mockSendInvoiceEmail.mock.calls[0][0];
    expect(emailArgs.customerName).toBe('Customer');
  });

  // ── Email service errors ──────────────────────────────────────────────────

  it('returns 500 when email service throws', async () => {
    mockSendInvoiceEmail.mockRejectedValue(new Error('Resend rate limit exceeded'));

    const request = makeRequest({
      to: 'customer@example.com',
      invoiceLink: 'https://tooltimepro.com/invoice/abc',
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Resend rate limit exceeded');
  });

  it('returns generic error message for non-Error exceptions', async () => {
    mockSendInvoiceEmail.mockRejectedValue('string error');

    const request = makeRequest({
      to: 'customer@example.com',
      invoiceLink: 'https://tooltimepro.com/invoice/abc',
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to send invoice email');
  });

  // ── Optional fields ───────────────────────────────────────────────────────

  it('sends invoice without optional notes, items, and discount', async () => {
    const minimalPayload = {
      to: 'customer@example.com',
      invoiceNumber: 'INV-001',
      total: 50,
      invoiceLink: 'https://tooltimepro.com/invoice/abc',
    };

    const request = makeRequest(minimalPayload);
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);

    const emailArgs = mockSendInvoiceEmail.mock.calls[0][0];
    expect(emailArgs.notes).toBeUndefined();
    expect(emailArgs.items).toBeUndefined();
    expect(emailArgs.discountAmount).toBeUndefined();
  });
});
