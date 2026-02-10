/**
 * @jest-environment node
 */

/**
 * Tests for /api/webhook/stripe route
 * Validates webhook signature verification, event handling, and DB updates
 */

const mockConstructEvent = jest.fn();
const mockSupabaseFrom = jest.fn();
const mockSendWelcomeEmail = jest.fn().mockResolvedValue(undefined);

jest.mock('stripe', () => {
  return jest.fn(() => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  }));
});

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockSupabaseFrom,
  })),
}));

jest.mock('@/lib/email', () => ({
  sendWelcomeEmail: mockSendWelcomeEmail,
}));

process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

const { POST } = require('@/app/api/webhook/stripe/route');

function makeWebhookRequest(body = '{}', signature = 'sig_test') {
  return {
    text: () => Promise.resolve(body),
    headers: {
      get: (name) => (name === 'stripe-signature' ? signature : null),
    },
  };
}

describe('/api/webhook/stripe', () => {
  let mockSelect, mockEq, mockSingle, mockUpdate, mockInsert;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    mockEq = jest.fn().mockReturnThis();
    mockEq.mockReturnValue({ single: mockSingle, eq: mockEq });
    mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
    mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });

    mockSupabaseFrom.mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
      insert: mockInsert,
    });
  });

  it('returns 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const request = makeWebhookRequest('{}', 'bad_sig');
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Webhook signature verification failed');
  });

  it('handles checkout.session.completed for new users', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          customer_email: 'test@example.com',
          customer_details: { email: 'test@example.com' },
          customer: 'cus_123',
          subscription: 'sub_123',
          metadata: { plan: 'starter', tier: 'starter', standalone: '', addons: '', billing: 'monthly' },
        },
      },
    });

    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

    const request = makeWebhookRequest();
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSupabaseFrom).toHaveBeenCalledWith('users');
    expect(mockInsert).toHaveBeenCalled();
  });

  it('handles checkout.session.completed for existing users', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          customer_email: 'test@example.com',
          customer: 'cus_123',
          subscription: 'sub_123',
          metadata: { plan: 'pro', tier: 'pro', standalone: '', addons: '', billing: 'annual' },
        },
      },
    });

    mockSingle.mockResolvedValue({ data: { id: 'user-123' }, error: null });

    const request = makeWebhookRequest();
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('sends welcome email on checkout completion', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          customer_email: 'test@example.com',
          customer: 'cus_123',
          subscription: 'sub_123',
          metadata: { plan: 'starter', billing: 'monthly' },
        },
      },
    });
    mockSingle.mockResolvedValue({ data: null, error: null });

    const request = makeWebhookRequest();
    await POST(request);

    expect(mockSendWelcomeEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      plan: 'starter',
      billing: 'monthly',
    });
  });

  it('handles subscription canceled', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: {
        object: { id: 'sub_123' },
      },
    });

    const request = makeWebhookRequest();
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('handles payment failed and records it', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'invoice.payment_failed',
      data: {
        object: {
          customer: 'cus_123',
          id: 'inv_123',
          amount_due: 2999,
          currency: 'usd',
        },
      },
    });

    const request = makeWebhookRequest();
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockInsert).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('returns 200 for unknown event types', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'some.unknown.event',
      data: { object: {} },
    });

    const request = makeWebhookRequest();
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.received).toBe(true);
  });
});
