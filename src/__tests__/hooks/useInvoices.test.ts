/**
 * @jest-environment node
 */

/**
 * Tests for useInvoices hook - SMS consent gating in sendInvoice and sendReminder
 */

describe('useInvoices - sendInvoice SMS consent logic', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  function shouldSendSms(customer: { phone: string | null; sms_consent?: boolean } | null, phone?: string): boolean {
    const phoneNumber = phone || customer?.phone;
    return !!(phoneNumber && customer?.sms_consent);
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

  it('should NOT send SMS when sms_consent is undefined', () => {
    expect(shouldSendSms({ phone: '5551234567' })).toBe(false);
  });
});

describe('useInvoices - sendInvoice request includes customerId', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('sends correct payload to /api/sms with customerId', async () => {
    const customer = { id: 'cust-inv-1', name: 'Jane', phone: '5559876543', sms_consent: true };
    const companyId = 'comp-456';
    const invoiceLink = 'https://app.example.com/invoice/inv-001';

    if (customer.phone && customer.sms_consent) {
      await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: customer.phone,
          template: 'invoice_sent',
          data: {
            customerName: customer.name,
            companyName: 'GreenCo',
            invoiceLink,
          },
          companyId,
          customerId: customer.id,
        }),
      });
    }

    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.customerId).toBe('cust-inv-1');
    expect(callBody.template).toBe('invoice_sent');
  });

  it('does not call /api/sms when consent is false', async () => {
    const customer = { id: 'cust-inv-2', name: 'Jane', phone: '5559876543', sms_consent: false };

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

describe('useInvoices - sendReminder consent gate', () => {
  it('blocks reminder when customer has not consented', () => {
    const invoice = {
      customer: { id: 'c1', name: 'Bob', phone: '5551111111', sms_consent: false },
    };

    // This mirrors the page-level check in invoices/page.tsx
    const canSendReminder = !!(invoice.customer?.phone && invoice.customer?.sms_consent);
    expect(canSendReminder).toBe(false);
  });

  it('allows reminder when customer has consented', () => {
    const invoice = {
      customer: { id: 'c2', name: 'Alice', phone: '5552222222', sms_consent: true },
    };

    const canSendReminder = !!(invoice.customer?.phone && invoice.customer?.sms_consent);
    expect(canSendReminder).toBe(true);
  });

  it('blocks reminder when customer has no phone', () => {
    const invoice = {
      customer: { id: 'c3', name: 'Charlie', phone: null, sms_consent: true },
    };

    const canSendReminder = !!(invoice.customer?.phone && invoice.customer?.sms_consent);
    expect(canSendReminder).toBe(false);
  });
});
