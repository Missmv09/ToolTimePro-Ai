/**
 * @jest-environment node
 */

// /api/webhook/stripe-connect and /api/stripe/checkout/confirm both hand a
// Checkout Session to the shared pipeline; these tests pin the wiring.

const mockConstructEvent = jest.fn();
const mockSessionRetrieve = jest.fn();
jest.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mockConstructEvent },
    checkout: { sessions: { retrieve: mockSessionRetrieve } },
  }),
}));

const mockProcess = jest.fn();
jest.mock('@/lib/after-payment', () => ({
  processCheckoutSession: (...a) => mockProcess(...a),
}));

const { createQueryMock } = require('@/__mocks__/supabase-query-mock');
let sb;
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => sb),
}));

process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_CONNECT_WEBHOOK_SECRET = 'whsec_connect';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

const { POST: webhook } = require('@/app/api/webhook/stripe-connect/route');
const { POST: confirm } = require('@/app/api/stripe/checkout/confirm/route');

function webhookRequest(body = '{}', signature = 'sig') {
  return { text: () => Promise.resolve(body), headers: { get: (n) => (n === 'stripe-signature' ? signature : null) } };
}
function confirmRequest(body) {
  return new Request('http://localhost/api/stripe/checkout/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

beforeEach(() => {
  jest.clearAllMocks();
  sb = createQueryMock(() => ({ data: null, error: null }));
  mockProcess.mockResolvedValue({ handled: true, type: 'invoice_payment', invoiceId: 'inv-1', record: { status: 'recorded' }, hooks: { receipt: { email: true, sms: false }, reviewScheduled: true } });
});

describe('/api/webhook/stripe-connect', () => {
  it('rejects a missing signature', async () => {
    const res = await webhook(webhookRequest('{}', null));
    expect(res.status).toBe(400);
    expect(mockProcess).not.toHaveBeenCalled();
  });

  it('rejects a bad signature', async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error('bad sig'); });
    const res = await webhook(webhookRequest());
    expect(res.status).toBe(400);
    expect(mockProcess).not.toHaveBeenCalled();
  });

  it('hands checkout.session.completed to the after-payment pipeline', async () => {
    const session = { id: 'cs_1', payment_intent: 'pi_1', amount_total: 20000, metadata: { type: 'invoice_payment', invoice_id: 'inv-1' } };
    mockConstructEvent.mockReturnValue({ type: 'checkout.session.completed', data: { object: session } });
    const res = await webhook(webhookRequest());
    expect(res.status).toBe(200);
    expect(mockProcess).toHaveBeenCalledWith(sb, session);
  });

  it('updates Connect onboarding on account.updated and checks the write error', async () => {
    mockConstructEvent.mockReturnValue({ type: 'account.updated', data: { object: { id: 'acct_1', charges_enabled: true, details_submitted: true } } });
    const res = await webhook(webhookRequest());
    expect(res.status).toBe(200);
    const upd = sb.calls.find((c) => c.table === 'companies' && c.op === 'update');
    expect(upd.payload).toEqual({ stripe_connect_onboarded: true });
    expect(mockProcess).not.toHaveBeenCalled();
  });

  it('still returns 200 when processing throws, so Stripe does not retry forever', async () => {
    mockConstructEvent.mockReturnValue({ type: 'checkout.session.completed', data: { object: { metadata: {} } } });
    mockProcess.mockRejectedValue(new Error('boom'));
    const res = await webhook(webhookRequest());
    expect(res.status).toBe(200);
  });
});

describe('/api/stripe/checkout/confirm', () => {
  it('rejects anything that is not a Checkout Session id', async () => {
    const res = await confirm(confirmRequest({ sessionId: 'inv-1; drop table' }));
    expect(res.status).toBe(400);
    expect(mockSessionRetrieve).not.toHaveBeenCalled();
  });

  it('does not apply an unpaid session', async () => {
    mockSessionRetrieve.mockResolvedValue({ id: 'cs_1', payment_status: 'unpaid', metadata: { type: 'invoice_payment', invoice_id: 'inv-1' } });
    const res = await confirm(confirmRequest({ sessionId: 'cs_test_abc' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ confirmed: false, paymentStatus: 'unpaid' });
    expect(mockProcess).not.toHaveBeenCalled();
  });

  it('applies a paid session through the same pipeline as the webhook', async () => {
    const session = { id: 'cs_test_abc', payment_status: 'paid', payment_intent: 'pi_1', amount_total: 20000, metadata: { type: 'invoice_payment', invoice_id: 'inv-1' } };
    mockSessionRetrieve.mockResolvedValue(session);
    const res = await confirm(confirmRequest({ sessionId: 'cs_test_abc' }));
    const body = await res.json();
    expect(mockSessionRetrieve).toHaveBeenCalledWith('cs_test_abc');
    expect(mockProcess).toHaveBeenCalledWith(sb, session);
    expect(body).toMatchObject({ confirmed: true, type: 'invoice_payment', invoiceId: 'inv-1', status: 'recorded', receipt: { email: true, sms: false } });
  });

  it('reports a duplicate when the webhook already ran', async () => {
    mockSessionRetrieve.mockResolvedValue({ id: 'cs_1', payment_status: 'paid', metadata: { type: 'invoice_payment', invoice_id: 'inv-1' } });
    mockProcess.mockResolvedValue({ handled: true, type: 'invoice_payment', invoiceId: 'inv-1', record: { status: 'duplicate' } });
    const res = await confirm(confirmRequest({ sessionId: 'cs_1' }));
    const body = await res.json();
    expect(body).toMatchObject({ confirmed: true, status: 'duplicate', receipt: null });
  });

  it('returns 400 for a session type the pipeline does not own', async () => {
    mockSessionRetrieve.mockResolvedValue({ id: 'cs_1', payment_status: 'paid', metadata: { type: 'subscription' } });
    mockProcess.mockResolvedValue({ handled: false, reason: 'unhandled' });
    const res = await confirm(confirmRequest({ sessionId: 'cs_1' }));
    expect(res.status).toBe(400);
  });
});
