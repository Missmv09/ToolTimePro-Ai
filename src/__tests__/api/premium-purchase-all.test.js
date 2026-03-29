/**
 * @jest-environment node
 */

/**
 * End-to-end test: Customer purchases ALL premiums
 *
 * Simulates a customer selecting the Elite tier (highest plan),
 * every available add-on, extra workers, and white-glove onboarding,
 * then verifies the full flow: checkout → Stripe session → webhook → DB update → success page.
 */

const mockSessionCreate = jest.fn();
const mockSessionRetrieve = jest.fn();
const mockConstructEvent = jest.fn();
const mockSupabaseFrom = jest.fn();
const mockSendWelcomeEmail = jest.fn().mockResolvedValue(undefined);

// ── Stripe mock ──
jest.mock('stripe', () => {
  return jest.fn(() => ({
    checkout: {
      sessions: {
        create: mockSessionCreate,
        retrieve: mockSessionRetrieve,
      },
    },
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  }));
});

// ── Supabase mock ──
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockSupabaseFrom,
  })),
}));

// ── Email mock ──
jest.mock('@/lib/email', () => ({
  sendWelcomeEmail: mockSendWelcomeEmail,
}));

// ── Env vars ──
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

process.env.NEXT_PUBLIC_STRIPE_PRICES = JSON.stringify({
  starter: { monthly: 'price_starter_m', annual: 'price_starter_a' },
  pro: { monthly: 'price_pro_m', annual: 'price_pro_a' },
  elite: { monthly: 'price_elite_m', annual: 'price_elite_a' },
  booking_only: { monthly: 'price_booking_m', annual: 'price_booking_a' },
  invoicing_only: { monthly: 'price_invoicing_m', annual: 'price_invoicing_a' },
  jenny_lite: { monthly: 'price_jenny_lite_m', annual: 'price_jenny_lite_a' },
  jenny_pro: { monthly: 'price_jenny_pro_m', annual: 'price_jenny_pro_a' },
  jenny_exec_admin: { monthly: 'price_jenny_exec_m', annual: 'price_jenny_exec_a' },
  website_builder: { monthly: 'price_wb_m', annual: 'price_wb_a' },
  keep_me_legal: { monthly: 'price_kml_m', annual: 'price_kml_a' },
  extra_page: { monthly: 'price_page_m', annual: 'price_page_a' },
  extra_worker: { monthly: 'price_worker' },
  quickbooks_sync: { monthly: 'price_qb_m', annual: 'price_qb_a' },
  assisted_onboarding: 'price_onboard',
  white_glove: 'price_wg',
});

// ── Import route handlers ──
const { GET: checkoutGET } = require('@/app/api/checkout/route');
const { GET: sessionGET } = require('@/app/api/checkout/session/route');
const { POST: webhookPOST } = require('@/app/api/webhook/stripe/route');

// ── Helpers ──
function makeCheckoutRequest(params) {
  const url = new URL('http://localhost/api/checkout');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString());
}

function makeSessionRequest(sessionId) {
  return new Request(`http://localhost/api/checkout/session?session_id=${sessionId}`);
}

function makeWebhookRequest(body = '{}', signature = 'sig_test') {
  return {
    text: () => Promise.resolve(body),
    headers: {
      get: (name) => (name === 'stripe-signature' ? signature : null),
    },
  };
}

// All add-ons a customer can select
const ALL_ADDONS = [
  'jenny_pro',
  'jenny_exec_admin',
  'website_builder',
  'keep_me_legal',
  'extra_page',
  'quickbooks_sync',
];

const ALL_ADDONS_CSV = ALL_ADDONS.join(',');

// ── Supabase chain helpers ──
function setupSupabaseMocks(overrides = {}) {
  const mockSingle = jest.fn().mockResolvedValue(overrides.singleResult || { data: null, error: null });
  const mockEq = jest.fn().mockReturnThis();
  mockEq.mockReturnValue({ single: mockSingle, eq: mockEq });
  const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
  const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
  const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });

  mockSupabaseFrom.mockReturnValue({
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
  });

  return { mockSingle, mockEq, mockSelect, mockUpdate, mockInsert };
}

// ══════════════════════════════════════════════════
// TEST SUITE: Customer buys ALL premiums
// ══════════════════════════════════════════════════

describe('Premium Purchase Flow — Buy Everything', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionCreate.mockResolvedValue({
      url: 'https://checkout.stripe.com/test-all-premiums',
    });
  });

  // ─── CHECKOUT: Elite + all add-ons + extra workers + white-glove ───

  describe('Step 1: Checkout API — Elite plan with ALL add-ons (monthly)', () => {
    it('creates a subscription session with every possible line item', async () => {
      const request = makeCheckoutRequest({
        tier: 'elite',
        billing: 'monthly',
        addons: ALL_ADDONS_CSV,
        extraWorkers: '5',
        onboarding: 'white_glove',
      });

      const response = await checkoutGET(request);

      expect(mockSessionCreate).toHaveBeenCalledTimes(1);
      const config = mockSessionCreate.mock.calls[0][0];

      // Mode must be subscription (recurring items present)
      expect(config.mode).toBe('subscription');

      // 14-day free trial
      expect(config.subscription_data.trial_period_days).toBe(14);

      // Line items: 1 tier + 6 add-ons + 1 extra workers + 1 onboarding = 9 items
      expect(config.line_items).toHaveLength(9);

      // Elite tier
      expect(config.line_items[0]).toEqual({ price: 'price_elite_m', quantity: 1 });

      // Add-ons (in order)
      expect(config.line_items[1]).toEqual({ price: 'price_jenny_pro_m', quantity: 1 });
      expect(config.line_items[2]).toEqual({ price: 'price_jenny_exec_m', quantity: 1 });
      expect(config.line_items[3]).toEqual({ price: 'price_wb_m', quantity: 1 });
      expect(config.line_items[4]).toEqual({ price: 'price_kml_m', quantity: 1 });
      expect(config.line_items[5]).toEqual({ price: 'price_page_m', quantity: 1 });
      expect(config.line_items[6]).toEqual({ price: 'price_qb_m', quantity: 1 });

      // Extra workers
      expect(config.line_items[7]).toEqual({ price: 'price_worker', quantity: 5 });

      // White-glove onboarding (one-time)
      expect(config.line_items[8]).toEqual({ price: 'price_wg', quantity: 1 });

      // Redirect to Stripe
      expect(response.status).toBe(303);
    });

    it('stores correct metadata for the full purchase', async () => {
      const request = makeCheckoutRequest({
        tier: 'elite',
        billing: 'monthly',
        addons: ALL_ADDONS_CSV,
        extraWorkers: '5',
        onboarding: 'white_glove',
      });

      await checkoutGET(request);
      const config = mockSessionCreate.mock.calls[0][0];

      expect(config.metadata.tier).toBe('elite');
      expect(config.metadata.plan).toBe('elite');
      expect(config.metadata.billing).toBe('monthly');
      expect(config.metadata.addons).toBe(ALL_ADDONS_CSV);
      expect(config.metadata.extraWorkers).toBe('5');
      expect(config.metadata.onboarding).toBe('white_glove');
    });

    it('enables promotion codes and requires billing address', async () => {
      const request = makeCheckoutRequest({
        tier: 'elite',
        billing: 'monthly',
        addons: ALL_ADDONS_CSV,
        extraWorkers: '5',
        onboarding: 'white_glove',
      });

      await checkoutGET(request);
      const config = mockSessionCreate.mock.calls[0][0];

      expect(config.allow_promotion_codes).toBe(true);
      expect(config.billing_address_collection).toBe('required');
      expect(config.payment_method_types).toEqual(['card']);
    });
  });

  describe('Step 1b: Checkout API — Elite plan with ALL add-ons (annual)', () => {
    it('uses annual price IDs for every item that supports annual billing', async () => {
      const request = makeCheckoutRequest({
        tier: 'elite',
        billing: 'annual',
        addons: ALL_ADDONS_CSV,
        extraWorkers: '3',
        onboarding: 'white_glove',
      });

      await checkoutGET(request);
      const config = mockSessionCreate.mock.calls[0][0];

      // Elite annual
      expect(config.line_items[0]).toEqual({ price: 'price_elite_a', quantity: 1 });

      // Add-ons annual
      expect(config.line_items[1]).toEqual({ price: 'price_jenny_pro_a', quantity: 1 });
      expect(config.line_items[2]).toEqual({ price: 'price_jenny_exec_a', quantity: 1 });
      expect(config.line_items[3]).toEqual({ price: 'price_wb_a', quantity: 1 });
      expect(config.line_items[4]).toEqual({ price: 'price_kml_a', quantity: 1 });
      expect(config.line_items[5]).toEqual({ price: 'price_page_a', quantity: 1 });
      expect(config.line_items[6]).toEqual({ price: 'price_qb_a', quantity: 1 });

      // Extra workers (monthly only — no annual variant)
      expect(config.line_items[7]).toEqual({ price: 'price_worker', quantity: 3 });

      // White-glove onboarding is one-time (no billing variant)
      expect(config.line_items[8]).toEqual({ price: 'price_wg', quantity: 1 });

      expect(config.metadata.billing).toBe('annual');
    });
  });

  // ─── WEBHOOK: Simulate Stripe completing the checkout ───

  describe('Step 2: Webhook — checkout.session.completed with all premiums', () => {
    it('updates company plan to elite and merges all add-ons', async () => {
      const { mockUpdate, mockSingle } = setupSupabaseMocks();

      // First call: find user by email
      mockSingle
        .mockResolvedValueOnce({ data: { id: 'user-001', company_id: 'company-001' }, error: null })
        // Second call: get existing addons
        .mockResolvedValueOnce({ data: { addons: ['jenny_lite'] }, error: null });

      mockConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            customer_email: 'boss@allpremiums.com',
            customer: 'cus_all_premiums',
            subscription: 'sub_all_premiums',
            metadata: {
              plan: 'elite',
              tier: 'elite',
              standalone: '',
              addons: ALL_ADDONS_CSV,
              onboarding: 'white_glove',
              extraWorkers: '5',
              billing: 'monthly',
            },
          },
        },
      });

      const request = makeWebhookRequest();
      const response = await webhookPOST(request);

      expect(response.status).toBe(200);

      // Should look up user by email
      expect(mockSupabaseFrom).toHaveBeenCalledWith('users');

      // Should update company
      expect(mockSupabaseFrom).toHaveBeenCalledWith('companies');
      expect(mockUpdate).toHaveBeenCalled();

      const updatePayload = mockUpdate.mock.calls[0][0];
      expect(updatePayload.stripe_customer_id).toBe('cus_all_premiums');
      expect(updatePayload.plan).toBe('elite');

      // Addons should be merged: existing jenny_lite + all new add-ons
      expect(updatePayload.addons).toEqual(
        expect.arrayContaining([
          'jenny_lite',
          'jenny_pro',
          'jenny_exec_admin',
          'website_builder',
          'keep_me_legal',
          'extra_page',
          'quickbooks_sync',
        ])
      );
      // No duplicates
      const uniqueAddons = [...new Set(updatePayload.addons)];
      expect(updatePayload.addons).toHaveLength(uniqueAddons.length);
    });

    it('sends welcome email with elite plan details', async () => {
      setupSupabaseMocks({
        singleResult: { data: null, error: null },
      });

      mockConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            customer_email: 'boss@allpremiums.com',
            customer: 'cus_all_premiums',
            metadata: {
              plan: 'elite',
              tier: 'elite',
              addons: ALL_ADDONS_CSV,
              billing: 'monthly',
            },
          },
        },
      });

      const request = makeWebhookRequest();
      await webhookPOST(request);

      expect(mockSendWelcomeEmail).toHaveBeenCalledWith({
        to: 'boss@allpremiums.com',
        plan: 'elite',
        billing: 'monthly',
      });
    });
  });

  // ─── WEBHOOK: invoice.payment_succeeded for the full-premium invoice ───

  describe('Step 3: Webhook — invoice.payment_succeeded for all premiums', () => {
    it('records the full payment amount in the payments table', async () => {
      const { mockSingle, mockInsert } = setupSupabaseMocks({
        singleResult: { data: { id: 'company-001' }, error: null },
      });

      // Total: Elite $99 + Jenny Pro $49 + Jenny Exec $79 + Website $15 + Legal $19
      //        + Extra Page $10 + QB $12 + 5 workers * $7 = $318 + onboarding $349 = $667
      // In cents: 66700
      mockConstructEvent.mockReturnValue({
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            customer: 'cus_all_premiums',
            id: 'inv_all_premiums_001',
            amount_paid: 66700,
            currency: 'usd',
          },
        },
      });

      const request = makeWebhookRequest();
      const response = await webhookPOST(request);

      expect(response.status).toBe(200);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('payments');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 'company-001',
          amount: 667,
          payment_method: 'stripe',
          status: 'completed',
          notes: 'Stripe invoice inv_all_premiums_001',
        })
      );
    });
  });

  // ─── SESSION: Verify success page can retrieve session details ───

  describe('Step 4: Success page — fetch session details', () => {
    it('returns full session data including all-premium metadata', async () => {
      mockSessionRetrieve.mockResolvedValue({
        id: 'cs_all_premiums_session',
        customer_email: 'boss@allpremiums.com',
        customer_details: { email: 'boss@allpremiums.com' },
        payment_status: 'paid',
        status: 'complete',
        metadata: {
          plan: 'elite',
          tier: 'elite',
          standalone: '',
          addons: ALL_ADDONS_CSV,
          onboarding: 'white_glove',
          extraWorkers: '5',
          billing: 'monthly',
        },
        amount_total: 66700,
        currency: 'usd',
      });

      const request = makeSessionRequest('cs_all_premiums_session');
      const response = await sessionGET(request);

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.id).toBe('cs_all_premiums_session');
      expect(body.customer_email).toBe('boss@allpremiums.com');
      expect(body.payment_status).toBe('paid');
      expect(body.status).toBe('complete');
      expect(body.amount_total).toBe(66700);
      expect(body.currency).toBe('usd');

      // Metadata carries all premium selections
      expect(body.metadata.plan).toBe('elite');
      expect(body.metadata.addons).toBe(ALL_ADDONS_CSV);
      expect(body.metadata.onboarding).toBe('white_glove');
      expect(body.metadata.extraWorkers).toBe('5');
    });

    it('returns 400 when no session_id provided', async () => {
      const request = new Request('http://localhost/api/checkout/session');
      const response = await sessionGET(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Session ID required');
    });
  });

  // ─── LIFECYCLE: subscription update and cancellation ───

  describe('Step 5: Subscription lifecycle for all-premium customer', () => {
    it('keeps plan on active subscription update', async () => {
      const { mockUpdate } = setupSupabaseMocks();

      mockConstructEvent.mockReturnValue({
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_all_premiums',
            customer: 'cus_all_premiums',
            status: 'active',
          },
        },
      });

      const request = makeWebhookRequest();
      const response = await webhookPOST(request);

      expect(response.status).toBe(200);
      // When active, no plan downgrade — update payload should NOT contain plan: 'starter'
      const updatePayload = mockUpdate.mock.calls[0][0];
      expect(updatePayload.plan).toBeUndefined();
    });

    it('downgrades to starter when subscription is canceled', async () => {
      const { mockUpdate } = setupSupabaseMocks();

      mockConstructEvent.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_all_premiums',
            customer: 'cus_all_premiums',
          },
        },
      });

      const request = makeWebhookRequest();
      const response = await webhookPOST(request);

      expect(response.status).toBe(200);
      const updatePayload = mockUpdate.mock.calls[0][0];
      expect(updatePayload.plan).toBe('starter');
    });

    it('downgrades to starter when subscription becomes past_due', async () => {
      const { mockUpdate } = setupSupabaseMocks();

      mockConstructEvent.mockReturnValue({
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_all_premiums',
            customer: 'cus_all_premiums',
            status: 'past_due',
          },
        },
      });

      const request = makeWebhookRequest();
      const response = await webhookPOST(request);

      expect(response.status).toBe(200);
      const updatePayload = mockUpdate.mock.calls[0][0];
      expect(updatePayload.plan).toBe('starter');
    });
  });

  // ─── EDGE CASE: payment failure on all-premium invoice ───

  describe('Step 6: Payment failure for all-premium customer', () => {
    it('records failed payment with correct amount', async () => {
      const { mockInsert, mockSingle } = setupSupabaseMocks({
        singleResult: { data: { id: 'company-001' }, error: null },
      });

      mockConstructEvent.mockReturnValue({
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer: 'cus_all_premiums',
            id: 'inv_failed_001',
            amount_due: 66700,
            currency: 'usd',
          },
        },
      });

      const request = makeWebhookRequest();
      const response = await webhookPOST(request);

      expect(response.status).toBe(200);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 'company-001',
          amount: 667,
          payment_method: 'stripe',
          status: 'failed',
          notes: 'Failed: Stripe invoice inv_failed_001',
        })
      );
    });
  });

  // ─── ERROR: Stripe fails during checkout with all premiums ───

  describe('Error handling', () => {
    it('returns 500 when Stripe fails during full-premium checkout', async () => {
      mockSessionCreate.mockRejectedValue(new Error('Card network unavailable'));

      const request = makeCheckoutRequest({
        tier: 'elite',
        billing: 'monthly',
        addons: ALL_ADDONS_CSV,
        extraWorkers: '5',
        onboarding: 'white_glove',
      });

      const response = await checkoutGET(request);
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe('Failed to create checkout session');
      expect(body.details).toBe('Card network unavailable');
    });
  });
});
