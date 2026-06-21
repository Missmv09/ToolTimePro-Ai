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
const mockAutoCreate = jest.fn().mockResolvedValue({ companyId: null, error: 'mocked' });

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

jest.mock('@/lib/auto-provision', () => ({
  autoCreateCompanyForCheckout: mockAutoCreate,
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
  let mockSelect, mockEq, mockSingle, mockUpdate, mockInsert, mockLimit;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    // The orphan-detection check queries users by company_id with .limit(1).
    // Default to a non-empty result: a real resolved customer always has a
    // users row, so they're NOT treated as an orphan and follow the normal
    // update path. Orphan-heal tests override this to return [].
    mockLimit = jest.fn().mockResolvedValue({ data: [{ id: 'user-existing' }], error: null });
    mockEq = jest.fn().mockReturnThis();
    mockEq.mockReturnValue({ single: mockSingle, eq: mockEq, limit: mockLimit });
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

  it('auto-provisions a company when no user matches and skips the duplicate welcome email', async () => {
    // Regression test: customers who pay via Stripe Checkout without first
    // signing up would previously get a 200 OK from the webhook with no
    // company row created (a "ghost subscription"). The webhook should now
    // call autoCreateCompanyForCheckout, which creates the account and sends
    // a magic-link login email — replacing the regular welcome email.
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_live_autoprov',
          customer_email: 'fresh@example.com',
          customer_details: { email: 'fresh@example.com', name: 'Fresh Buyer' },
          customer: 'cus_autoprov',
          metadata: { plan: 'pro', tier: 'pro', billing: 'monthly', skipTrial: 'true' },
        },
      },
    });

    // All five lookup paths return null so the auto-provision branch runs.
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    mockAutoCreate.mockResolvedValueOnce({
      companyId: 'company-auto-created',
      error: null,
    });

    const request = makeWebhookRequest();
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockAutoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'fresh@example.com',
        fullName: 'Fresh Buyer',
        plan: 'pro',
        stripeCustomerId: 'cus_autoprov',
        skipTrial: true,
      })
    );
    // Welcome email is suppressed because auto-provision already sent the
    // magic-link login email.
    expect(mockSendWelcomeEmail).not.toHaveBeenCalled();
    // The new company id is written back to the Stripe customer.
    expect(mockCustomersUpdate).toHaveBeenCalledWith('cus_autoprov', {
      metadata: { companyId: 'company-auto-created' },
    });
  });

  it('heals an orphaned company (no users row) via auto-provision instead of the plain welcome email', async () => {
    // Regression test: if a company row exists but its auth login was deleted
    // or never finished (no users row), the customer cannot sign in. The plain
    // "Go to Dashboard" welcome email would dead-end them on the login page.
    // The webhook must instead route through autoCreateCompanyForCheckout,
    // which recreates the auth user + users link and sends a magic-link
    // set-password email — and must NOT send the plain welcome email.
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_orphan_heal',
          customer_email: 'reused@example.com',
          customer_details: { email: 'reused@example.com', name: 'Reused Buyer' },
          customer: 'cus_orphan_heal',
          metadata: { plan: 'pro', tier: 'pro', billing: 'monthly', skipTrial: 'true' },
        },
      },
    });

    // users.email lookup misses, companies.email resolves the leftover company.
    mockSingle
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
      .mockResolvedValueOnce({ data: { id: 'company-orphan' }, error: null });
    // No users row exists for that company → it's an orphan.
    mockLimit.mockResolvedValue({ data: [], error: null });
    mockAutoCreate.mockResolvedValueOnce({ companyId: 'company-orphan', error: null });

    const request = makeWebhookRequest();
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockAutoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'reused@example.com',
        fullName: 'Reused Buyer',
        plan: 'pro',
        stripeCustomerId: 'cus_orphan_heal',
        skipTrial: true,
      })
    );
    // The dead-end plain welcome email must be suppressed.
    expect(mockSendWelcomeEmail).not.toHaveBeenCalled();
    expect(mockCustomersUpdate).toHaveBeenCalledWith('cus_orphan_heal', {
      metadata: { companyId: 'company-orphan' },
    });
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

  it('does not downgrade plan on customer.subscription.updated for trialing status', async () => {
    // Regression test: trial subscriptions arrive with status='trialing', not
    // 'active'. The handler used to reset plan to 'starter' for any non-active
    // status, clobbering 'elite'/'pro' set moments earlier by
    // checkout.session.completed.
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: { id: 'sub_123', customer: 'cus_123', status: 'trialing' },
      },
    });

    const request = makeWebhookRequest();
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.not.objectContaining({ plan: expect.anything() })
    );
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_status: 'trialing' })
    );
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
