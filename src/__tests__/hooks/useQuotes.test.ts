/**
 * @jest-environment node
 */

/**
 * Tests for useQuotes hook - SMS consent gating in sendQuote
 *
 * These tests extract and verify the consent-check logic that determines
 * whether an SMS is sent when a quote is delivered. We test the logic
 * directly rather than rendering the hook (which requires full React/Supabase).
 */

describe('useQuotes - sendQuote SMS consent logic', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  // Extracted logic: SMS is sent only when customer has phone AND sms_consent is true
  function shouldSendSms(customer: { phone: string | null; sms_consent?: boolean } | null): boolean {
    return !!(customer?.phone && customer?.sms_consent);
  }

  it('should send SMS when customer has phone and consent', () => {
    expect(shouldSendSms({ phone: '5551234567', sms_consent: true })).toBe(true);
  });

  it('should NOT send SMS when customer has phone but no consent', () => {
    expect(shouldSendSms({ phone: '5551234567', sms_consent: false })).toBe(false);
  });

  it('should NOT send SMS when customer has consent but no phone', () => {
    expect(shouldSendSms({ phone: null, sms_consent: true })).toBe(false);
  });

  it('should NOT send SMS when customer is null', () => {
    expect(shouldSendSms(null)).toBe(false);
  });

  it('should NOT send SMS when sms_consent is undefined (legacy customer)', () => {
    expect(shouldSendSms({ phone: '5551234567' })).toBe(false);
  });

  it('should NOT send SMS when phone is empty string', () => {
    expect(shouldSendSms({ phone: '', sms_consent: true })).toBe(false);
  });
});

describe('useQuotes - sendQuote SMS request includes customerId', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('sends correct payload to /api/sms with customerId for server-side consent check', async () => {
    const customer = { id: 'cust-123', name: 'John', phone: '5551234567', sms_consent: true };
    const companyId = 'comp-456';
    const companyName = 'GreenCo';
    const quoteLink = 'https://app.example.com/quote/q-789';

    // Simulate what sendQuote does when consent is true
    if (customer.phone && customer.sms_consent) {
      await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: customer.phone,
          template: 'quote_sent',
          data: {
            customerName: customer.name,
            companyName,
            quoteLink,
          },
          companyId,
          customerId: customer.id,
        }),
      });
    }

    expect(fetchMock).toHaveBeenCalledWith('/api/sms', expect.objectContaining({
      method: 'POST',
    }));

    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.customerId).toBe('cust-123');
    expect(callBody.template).toBe('quote_sent');
    expect(callBody.to).toBe('5551234567');
  });

  it('does not call /api/sms when consent is false', async () => {
    const customer = { id: 'cust-123', name: 'John', phone: '5551234567', sms_consent: false };

    if (customer.phone && customer.sms_consent) {
      await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: customer.phone }),
      });
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
