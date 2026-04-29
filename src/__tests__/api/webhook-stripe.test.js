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
const mockCustomersRetrieve = jest.fn().mockResolvedValue({ id: 'cus_test', metadata: {}, deleted: false });
const mockCustomersUpdate = jest.fn().mockResolvedValue({ id: 'cus_test' });

jest.mock('stripe', () => {
  return jest.fn(() => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
    customers: {
      retrieve: mockCustomersRetrieve,
      update: mockCustomersUpdate,
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

  it('handles checkout.session.completed when no user found', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

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
    expect(mockSupabaseFrom).toHaveBeenCalledWith('companies');
    expect(consoleSpy).toHaveBeenCalledWith(
      'No company found for checkout session — DB not updated',
      expect.objectContaining({
        customerEmail: 'test@example.com',
        lookupEmailUsed: 'test@example.com',
        stripeCustomerId: 'cus_123',
      })
    );

    consoleSpy.mockRestore();
  });

  it('falls back to companies.email lookup when users row is missing', async () => {
    // Regression test for silent-failure bug: webhook used to only look up
    // companies via the users table. If a checkout completed before the users
    // row existed (signup race) or with a different email, the webhook
    // returned 200 OK without ever updating the company. This test ensures
    // the companies.email fallback resolves the company and the update fires.
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          customer_email: 'orphan@example.com',
          customer: 'cus_orphan',
          subscription: 'sub_orphan',
          metadata: { plan: 'elite', tier: 'elite', billing: 'monthly', skipTrial: 'true' },
        },
      },
    });

    // First .single() call = users lookup, returns null (no users row).
    // Second .single() call = companies fallback, returns the company id.
    mockSingle
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
      .mockResolvedValueOnce({ data: { id: 'company-orphan' }, error: null });

    const request = makeWebhookRequest();
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSupabaseFrom).toHaveBeenCalledWith('users');
    expect(mockSupabaseFrom).toHaveBeenCalledWith('companies');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_customer_id: 'cus_orphan',
        plan: 'elite',
        subscription_status: 'active',
      })
    );
  });

  it('resolves company by client_reference_id before falling back to email lookups', async () => {
    // Regression test for the metadata-mismatch bug: when the user enters a
    // different billing email at Stripe Checkout, all email-based lookups
    // miss. client_reference_id carries the canonical company id straight
    // from /api/checkout, so the webhook should resolve it without ever
    // touching the users/companies email indices.
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          customer_email: 'different-billing@example.com',
          customer: 'cus_ref',
          subscription: 'sub_ref',
          client_reference_id: 'company-from-ref',
          metadata: { plan: 'elite', tier: 'elite', billing: 'monthly', skipTrial: 'true' },
        },
      },
    });

    mockSingle.mockResolvedValueOnce({ data: { id: 'company-from-ref' }, error: null });

    const request = makeWebhookRequest();
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_customer_id: 'cus_ref',
        plan: 'elite',
        subscription_status: 'active',
      })
    );
    // After resolving, we write the company id back to the Stripe customer so
    // future events on this customer can be traced even if local DB drifts.
    expect(mockCustomersUpdate).toHaveBeenCalledWith('cus_ref', {
      metadata: { companyId: 'company-from-ref' },
    });
  });

  it('falls back to Stripe customer metadata when local DB lookups all miss', async () => {
    // If a previous successful checkout wrote our company id onto the Stripe
    // Customer object, we can recover it from there even when local pointers
    // are stale or missing.
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          customer_email: 'unknown@example.com',
          customer: 'cus_remembered',
          subscription: 'sub_remembered',
          metadata: { plan: 'pro', tier: 'pro', billing: 'monthly' },
        },
      },
    });

    mockSingle
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // users
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // companies.email
      .mockResolvedValueOnce({ data: { id: 'company-remembered' }, error: null }); // companies.id from stripe metadata

    mockCustomersRetrieve.mockResolvedValueOnce({
      id: 'cus_remembered',
      metadata: { companyId: 'company-remembered' },
      deleted: false,
    });

    const request = makeWebhookRequest();
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockCustomersRetrieve).toHaveBeenCalledWith('cus_remembered');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_customer_id: 'cus_remembered',
        plan: 'pro',
      })
    );
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

    mockSingle.mockResolvedValue({ data: { id: 'user-123', company_id: 'company-456' }, error: null });

    const request = makeWebhookRequest();
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSupabaseFrom).toHaveBeenCalledWith('companies');
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
        object: { id: 'sub_123', customer: 'cus_123' },
      },
    });

    const request = makeWebhookRequest();
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSupabaseFrom).toHaveBeenCalledWith('companies');
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

    mockSingle.mockResolvedValue({ data: { id: 'company-789' }, error: null });

    const request = makeWebhookRequest();
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockSupabaseFrom).toHaveBeenCalledWith('companies');
    expect(mockSupabaseFrom).toHaveBeenCalledWith('payments');
    expect(mockInsert).toHaveBeenCalled();
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
