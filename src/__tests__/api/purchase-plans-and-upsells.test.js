/**
 * @jest-environment node
 */

/**
 * Tests for every individual purchase plan, standalone option, add-on,
 * onboarding upsell, and realistic customer combo scenarios.
 *
 * Complements premium-purchase-all.test.js which tests buying everything at once.
 */

const mockSessionCreate = jest.fn();
const mockConstructEvent = jest.fn();
const mockSupabaseFrom = jest.fn();
const mockSendWelcomeEmail = jest.fn().mockResolvedValue(undefined);

jest.mock('stripe', () => {
  return jest.fn(() => ({
    checkout: {
      sessions: { create: mockSessionCreate },
    },
    webhooks: { constructEvent: mockConstructEvent },
  }));
});

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockSupabaseFrom })),
}));

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

const { GET: checkoutGET } = require('@/app/api/checkout/route');
const { POST: webhookPOST } = require('@/app/api/webhook/stripe/route');

// ── Helpers ──
function makeRequest(params) {
  const url = new URL('http://localhost/api/checkout');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString());
}

function makeWebhookRequest(body = '{}', signature = 'sig_test') {
  return {
    text: () => Promise.resolve(body),
    headers: { get: (name) => (name === 'stripe-signature' ? signature : null) },
  };
}

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

function getConfig() {
  return mockSessionCreate.mock.calls[0][0];
}

// ══════════════════════════════════════════════════════════════════
// 1. INDIVIDUAL BASE TIERS
// ══════════════════════════════════════════════════════════════════

describe('Base Tier Plans', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });
  });

  // ── Starter ──
  describe('Starter plan ($49/mo, $490/yr)', () => {
    it('creates monthly subscription with correct price', async () => {
      await checkoutGET(makeRequest({ tier: 'starter', billing: 'monthly' }));
      const config = getConfig();

      expect(config.mode).toBe('subscription');
      expect(config.line_items).toEqual([{ price: 'price_starter_m', quantity: 1 }]);
      expect(config.subscription_data.trial_period_days).toBe(14);
      expect(config.metadata.tier).toBe('starter');
      expect(config.metadata.plan).toBe('starter');
    });

    it('creates annual subscription with correct price', async () => {
      await checkoutGET(makeRequest({ tier: 'starter', billing: 'annual' }));
      expect(getConfig().line_items).toEqual([{ price: 'price_starter_a', quantity: 1 }]);
    });
  });

  // ── Pro ──
  describe('Pro plan ($79/mo, $790/yr)', () => {
    it('creates monthly subscription with correct price', async () => {
      await checkoutGET(makeRequest({ tier: 'pro', billing: 'monthly' }));
      const config = getConfig();

      expect(config.mode).toBe('subscription');
      expect(config.line_items).toEqual([{ price: 'price_pro_m', quantity: 1 }]);
      expect(config.metadata.tier).toBe('pro');
    });

    it('creates annual subscription with correct price', async () => {
      await checkoutGET(makeRequest({ tier: 'pro', billing: 'annual' }));
      expect(getConfig().line_items).toEqual([{ price: 'price_pro_a', quantity: 1 }]);
    });
  });

  // ── Elite ──
  describe('Elite plan ($129/mo, $1290/yr)', () => {
    it('creates monthly subscription with correct price', async () => {
      await checkoutGET(makeRequest({ tier: 'elite', billing: 'monthly' }));
      const config = getConfig();

      expect(config.mode).toBe('subscription');
      expect(config.line_items).toEqual([{ price: 'price_elite_m', quantity: 1 }]);
      expect(config.metadata.tier).toBe('elite');
    });

    it('creates annual subscription with correct price', async () => {
      await checkoutGET(makeRequest({ tier: 'elite', billing: 'annual' }));
      expect(getConfig().line_items).toEqual([{ price: 'price_elite_a', quantity: 1 }]);
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// 2. STANDALONE LITE OPTIONS
// ══════════════════════════════════════════════════════════════════

describe('Standalone Lite Options', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });
  });

  describe('Booking Only ($15/mo, $150/yr)', () => {
    it('creates monthly subscription', async () => {
      await checkoutGET(makeRequest({ standalone: 'booking_only', billing: 'monthly' }));
      const config = getConfig();

      expect(config.mode).toBe('subscription');
      expect(config.line_items).toEqual([{ price: 'price_booking_m', quantity: 1 }]);
      expect(config.metadata.standalone).toBe('booking_only');
      expect(config.metadata.plan).toBe('booking_only');
      expect(config.metadata.tier).toBe('');
    });

    it('creates annual subscription', async () => {
      await checkoutGET(makeRequest({ standalone: 'booking_only', billing: 'annual' }));
      expect(getConfig().line_items).toEqual([{ price: 'price_booking_a', quantity: 1 }]);
    });
  });

  describe('Invoicing Only ($15/mo, $150/yr)', () => {
    it('creates monthly subscription', async () => {
      await checkoutGET(makeRequest({ standalone: 'invoicing_only', billing: 'monthly' }));
      const config = getConfig();

      expect(config.mode).toBe('subscription');
      expect(config.line_items).toEqual([{ price: 'price_invoicing_m', quantity: 1 }]);
      expect(config.metadata.standalone).toBe('invoicing_only');
      expect(config.metadata.plan).toBe('invoicing_only');
    });

    it('creates annual subscription', async () => {
      await checkoutGET(makeRequest({ standalone: 'invoicing_only', billing: 'annual' }));
      expect(getConfig().line_items).toEqual([{ price: 'price_invoicing_a', quantity: 1 }]);
    });
  });

  it('standalone takes precedence when no tier is set', async () => {
    await checkoutGET(makeRequest({ standalone: 'booking_only', billing: 'monthly' }));
    expect(getConfig().line_items).toHaveLength(1);
    expect(getConfig().line_items[0].price).toBe('price_booking_m');
  });
});

// ══════════════════════════════════════════════════════════════════
// 3. INDIVIDUAL ADD-ONS (each one solo with a base plan)
// ══════════════════════════════════════════════════════════════════

describe('Individual Add-ons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });
  });

  const addonTests = [
    { id: 'jenny_lite', name: 'Jenny Lite ($19/mo)', monthlyPrice: 'price_jenny_lite_m', annualPrice: 'price_jenny_lite_a' },
    { id: 'jenny_pro', name: 'Jenny Pro ($49/mo)', monthlyPrice: 'price_jenny_pro_m', annualPrice: 'price_jenny_pro_a' },
    { id: 'jenny_exec_admin', name: 'Jenny Exec Admin ($79/mo)', monthlyPrice: 'price_jenny_exec_m', annualPrice: 'price_jenny_exec_a' },
    { id: 'website_builder', name: 'Website Builder ($15/mo)', monthlyPrice: 'price_wb_m', annualPrice: 'price_wb_a' },
    { id: 'extra_page', name: 'Extra Website Page ($10/mo)', monthlyPrice: 'price_page_m', annualPrice: 'price_page_a' },
    { id: 'keep_me_legal', name: 'Compliance Autopilot ($19/mo)', monthlyPrice: 'price_kml_m', annualPrice: 'price_kml_a' },
    { id: 'quickbooks_sync', name: 'QuickBooks Sync ($12/mo)', monthlyPrice: 'price_qb_m', annualPrice: 'price_qb_a' },
  ];

  addonTests.forEach(({ id, name, monthlyPrice, annualPrice }) => {
    describe(name, () => {
      it(`adds ${id} monthly to a Starter plan`, async () => {
        await checkoutGET(makeRequest({ tier: 'starter', billing: 'monthly', addons: id }));
        const config = getConfig();

        expect(config.line_items).toHaveLength(2);
        expect(config.line_items[0].price).toBe('price_starter_m');
        expect(config.line_items[1]).toEqual({ price: monthlyPrice, quantity: 1 });
        expect(config.metadata.addons).toBe(id);
      });

      it(`adds ${id} annual to a Starter plan`, async () => {
        await checkoutGET(makeRequest({ tier: 'starter', billing: 'annual', addons: id }));
        const config = getConfig();

        expect(config.line_items[1]).toEqual({ price: annualPrice, quantity: 1 });
      });
    });
  });

  describe('Extra Workers ($7/worker/mo)', () => {
    it('adds 1 extra worker', async () => {
      await checkoutGET(makeRequest({ tier: 'starter', billing: 'monthly', extraWorkers: '1' }));
      const config = getConfig();

      expect(config.line_items).toHaveLength(2);
      expect(config.line_items[1]).toEqual({ price: 'price_worker', quantity: 1 });
    });

    it('adds 10 extra workers', async () => {
      await checkoutGET(makeRequest({ tier: 'pro', billing: 'monthly', extraWorkers: '10' }));
      const config = getConfig();

      expect(config.line_items[1]).toEqual({ price: 'price_worker', quantity: 10 });
    });

    it('does not add workers when count is 0', async () => {
      await checkoutGET(makeRequest({ tier: 'starter', billing: 'monthly', extraWorkers: '0' }));
      expect(getConfig().line_items).toHaveLength(1);
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// 4. ONBOARDING UPSELLS
// ══════════════════════════════════════════════════════════════════

describe('Onboarding Upsells', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });
  });

  describe('Assisted Onboarding ($199 one-time)', () => {
    it('adds assisted onboarding to a tier plan', async () => {
      await checkoutGET(makeRequest({ tier: 'starter', billing: 'monthly', onboarding: 'assisted_onboarding' }));
      const config = getConfig();

      expect(config.line_items).toHaveLength(2);
      expect(config.line_items[1]).toEqual({ price: 'price_onboard', quantity: 1 });
      expect(config.metadata.onboarding).toBe('assisted_onboarding');
      // Still subscription mode because tier is recurring
      expect(config.mode).toBe('subscription');
    });

    it('works as payment-only when purchased alone', async () => {
      await checkoutGET(makeRequest({ onboarding: 'assisted_onboarding' }));
      const config = getConfig();

      expect(config.mode).toBe('payment');
      expect(config.line_items).toEqual([{ price: 'price_onboard', quantity: 1 }]);
    });
  });

  describe('White Glove Setup ($499 one-time)', () => {
    it('adds white glove to a tier plan', async () => {
      await checkoutGET(makeRequest({ tier: 'pro', billing: 'monthly', onboarding: 'white_glove' }));
      const config = getConfig();

      expect(config.line_items).toHaveLength(2);
      expect(config.line_items[1]).toEqual({ price: 'price_wg', quantity: 1 });
      expect(config.metadata.onboarding).toBe('white_glove');
      expect(config.mode).toBe('subscription');
    });

    it('works as payment-only when purchased alone', async () => {
      await checkoutGET(makeRequest({ onboarding: 'white_glove' }));
      const config = getConfig();

      expect(config.mode).toBe('payment');
      expect(config.line_items).toEqual([{ price: 'price_wg', quantity: 1 }]);
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// 5. REALISTIC CUSTOMER COMBO SCENARIOS
// ══════════════════════════════════════════════════════════════════

describe('Realistic Customer Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });
  });

  it('Solo contractor: Starter + Jenny Lite + assisted onboarding (monthly)', async () => {
    await checkoutGET(makeRequest({
      tier: 'starter',
      billing: 'monthly',
      addons: 'jenny_lite',
      onboarding: 'assisted_onboarding',
    }));
    const config = getConfig();

    expect(config.mode).toBe('subscription');
    expect(config.line_items).toHaveLength(3);
    expect(config.line_items[0]).toEqual({ price: 'price_starter_m', quantity: 1 });
    expect(config.line_items[1]).toEqual({ price: 'price_jenny_lite_m', quantity: 1 });
    expect(config.line_items[2]).toEqual({ price: 'price_onboard', quantity: 1 });
  });

  it('Growing HVAC team: Pro + Jenny Pro + 5 extra workers + QuickBooks (annual)', async () => {
    await checkoutGET(makeRequest({
      tier: 'pro',
      billing: 'annual',
      addons: 'jenny_pro,quickbooks_sync',
      extraWorkers: '5',
    }));
    const config = getConfig();

    expect(config.mode).toBe('subscription');
    expect(config.line_items).toHaveLength(4);
    expect(config.line_items[0]).toEqual({ price: 'price_pro_a', quantity: 1 });
    expect(config.line_items[1]).toEqual({ price: 'price_jenny_pro_a', quantity: 1 });
    expect(config.line_items[2]).toEqual({ price: 'price_qb_a', quantity: 1 });
    expect(config.line_items[3]).toEqual({ price: 'price_worker', quantity: 5 });

    expect(config.metadata.tier).toBe('pro');
    expect(config.metadata.addons).toBe('jenny_pro,quickbooks_sync');
    expect(config.metadata.extraWorkers).toBe('5');
    expect(config.metadata.billing).toBe('annual');
  });

  it('Large plumbing company: Elite + Jenny Pro + Jenny Exec + Website + Compliance Autopilot + 8 workers + white glove (monthly)', async () => {
    await checkoutGET(makeRequest({
      tier: 'elite',
      billing: 'monthly',
      addons: 'jenny_pro,jenny_exec_admin,website_builder,keep_me_legal',
      extraWorkers: '8',
      onboarding: 'white_glove',
    }));
    const config = getConfig();

    expect(config.mode).toBe('subscription');
    // 1 tier + 4 add-ons + 1 workers + 1 onboarding = 7 items
    expect(config.line_items).toHaveLength(7);
    expect(config.line_items[0]).toEqual({ price: 'price_elite_m', quantity: 1 });
    expect(config.line_items[1]).toEqual({ price: 'price_jenny_pro_m', quantity: 1 });
    expect(config.line_items[2]).toEqual({ price: 'price_jenny_exec_m', quantity: 1 });
    expect(config.line_items[3]).toEqual({ price: 'price_wb_m', quantity: 1 });
    expect(config.line_items[4]).toEqual({ price: 'price_kml_m', quantity: 1 });
    expect(config.line_items[5]).toEqual({ price: 'price_worker', quantity: 8 });
    expect(config.line_items[6]).toEqual({ price: 'price_wg', quantity: 1 });
  });

  it('Budget-conscious: Booking Only + Jenny Lite (monthly)', async () => {
    await checkoutGET(makeRequest({
      standalone: 'booking_only',
      billing: 'monthly',
      addons: 'jenny_lite',
    }));
    const config = getConfig();

    expect(config.mode).toBe('subscription');
    expect(config.line_items).toHaveLength(2);
    expect(config.line_items[0]).toEqual({ price: 'price_booking_m', quantity: 1 });
    expect(config.line_items[1]).toEqual({ price: 'price_jenny_lite_m', quantity: 1 });
    expect(config.metadata.standalone).toBe('booking_only');
  });

  it('Invoicing-focused: Invoicing Only + QuickBooks (annual)', async () => {
    await checkoutGET(makeRequest({
      standalone: 'invoicing_only',
      billing: 'annual',
      addons: 'quickbooks_sync',
    }));
    const config = getConfig();

    expect(config.line_items).toHaveLength(2);
    expect(config.line_items[0]).toEqual({ price: 'price_invoicing_a', quantity: 1 });
    expect(config.line_items[1]).toEqual({ price: 'price_qb_a', quantity: 1 });
  });

  it('Website-heavy: Pro + Website Builder + Extra Page + Jenny Lite (annual)', async () => {
    await checkoutGET(makeRequest({
      tier: 'pro',
      billing: 'annual',
      addons: 'website_builder,extra_page,jenny_lite',
    }));
    const config = getConfig();

    expect(config.line_items).toHaveLength(4);
    expect(config.line_items[0]).toEqual({ price: 'price_pro_a', quantity: 1 });
    expect(config.line_items[1]).toEqual({ price: 'price_wb_a', quantity: 1 });
    expect(config.line_items[2]).toEqual({ price: 'price_page_a', quantity: 1 });
    expect(config.line_items[3]).toEqual({ price: 'price_jenny_lite_a', quantity: 1 });
  });

  it('Compliance-focused: Starter + Compliance Autopilot + Jenny Exec Admin (monthly)', async () => {
    await checkoutGET(makeRequest({
      tier: 'starter',
      billing: 'monthly',
      addons: 'keep_me_legal,jenny_exec_admin',
    }));
    const config = getConfig();

    expect(config.line_items).toHaveLength(3);
    expect(config.line_items[0]).toEqual({ price: 'price_starter_m', quantity: 1 });
    expect(config.line_items[1]).toEqual({ price: 'price_kml_m', quantity: 1 });
    expect(config.line_items[2]).toEqual({ price: 'price_jenny_exec_m', quantity: 1 });
  });
});

// ══════════════════════════════════════════════════════════════════
// 6. WEBHOOK: PLAN-SPECIFIC checkout.session.completed
// ══════════════════════════════════════════════════════════════════

describe('Webhook — checkout.session.completed per plan type', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const planCases = [
    { plan: 'starter', tier: 'starter', standalone: '' },
    { plan: 'pro', tier: 'pro', standalone: '' },
    { plan: 'elite', tier: 'elite', standalone: '' },
    { plan: 'booking_only', tier: '', standalone: 'booking_only' },
    { plan: 'invoicing_only', tier: '', standalone: 'invoicing_only' },
  ];

  planCases.forEach(({ plan, tier, standalone }) => {
    it(`updates company plan to "${plan}" after checkout`, async () => {
      const { mockUpdate, mockSingle } = setupSupabaseMocks();

      mockSingle.mockResolvedValueOnce({
        data: { id: 'user-001', company_id: 'company-001' },
        error: null,
      });

      mockConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            customer_email: `${plan}@test.com`,
            customer: `cus_${plan}`,
            metadata: { plan, tier, standalone, addons: '', billing: 'monthly' },
          },
        },
      });

      const response = await webhookPOST(makeWebhookRequest());
      expect(response.status).toBe(200);

      expect(mockUpdate).toHaveBeenCalled();
      const updatePayload = mockUpdate.mock.calls[0][0];
      expect(updatePayload.plan).toBe(plan);
      expect(updatePayload.stripe_customer_id).toBe(`cus_${plan}`);
    });
  });

  it('merges jenny_pro addon with existing empty addons array', async () => {
    const { mockUpdate, mockSingle } = setupSupabaseMocks();

    mockSingle
      .mockResolvedValueOnce({ data: { id: 'user-001', company_id: 'company-001' }, error: null })
      .mockResolvedValueOnce({ data: { addons: [] }, error: null });

    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          customer_email: 'addons@test.com',
          customer: 'cus_addons',
          metadata: { plan: 'pro', tier: 'pro', standalone: '', addons: 'jenny_pro', billing: 'monthly' },
        },
      },
    });

    await webhookPOST(makeWebhookRequest());
    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.addons).toEqual(['jenny_pro']);
  });

  it('merges multiple new addons with existing addons without duplicates', async () => {
    const { mockUpdate, mockSingle } = setupSupabaseMocks();

    mockSingle
      .mockResolvedValueOnce({ data: { id: 'user-001', company_id: 'company-001' }, error: null })
      .mockResolvedValueOnce({ data: { addons: ['jenny_lite', 'website_builder'] }, error: null });

    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          customer_email: 'merge@test.com',
          customer: 'cus_merge',
          metadata: {
            plan: 'pro',
            tier: 'pro',
            standalone: '',
            addons: 'jenny_lite,jenny_pro,quickbooks_sync',
            billing: 'monthly',
          },
        },
      },
    });

    await webhookPOST(makeWebhookRequest());
    const updatePayload = mockUpdate.mock.calls[0][0];

    // jenny_lite should not be duplicated
    expect(updatePayload.addons).toEqual(
      expect.arrayContaining(['jenny_lite', 'website_builder', 'jenny_pro', 'quickbooks_sync'])
    );
    expect(updatePayload.addons.filter(a => a === 'jenny_lite')).toHaveLength(1);
  });

  it('sends welcome email for each plan type with correct billing info', async () => {
    setupSupabaseMocks({ singleResult: { data: null, error: null } });

    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          customer_email: 'annual@test.com',
          customer: 'cus_annual',
          metadata: { plan: 'pro', billing: 'annual' },
        },
      },
    });

    await webhookPOST(makeWebhookRequest());

    expect(mockSendWelcomeEmail).toHaveBeenCalledWith({
      to: 'annual@test.com',
      plan: 'pro',
      billing: 'annual',
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// 7. WEBHOOK: SUBSCRIPTION LIFECYCLE PER PLAN
// ══════════════════════════════════════════════════════════════════

describe('Webhook — subscription lifecycle events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('subscription.created with active status does not downgrade', async () => {
    const { mockUpdate } = setupSupabaseMocks();

    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.created',
      data: {
        object: { id: 'sub_new', customer: 'cus_new', status: 'active' },
      },
    });

    const response = await webhookPOST(makeWebhookRequest());
    expect(response.status).toBe(200);

    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.plan).toBeUndefined();
    expect(updatePayload.updated_at).toBeDefined();
  });

  it('subscription.updated with trialing status downgrades to starter', async () => {
    const { mockUpdate } = setupSupabaseMocks();

    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: { id: 'sub_trial', customer: 'cus_trial', status: 'trialing' },
      },
    });

    const response = await webhookPOST(makeWebhookRequest());
    expect(response.status).toBe(200);

    // trialing !== 'active', so plan gets set to starter
    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(updatePayload.plan).toBe('starter');
  });

  it('subscription.updated with incomplete status downgrades to starter', async () => {
    const { mockUpdate } = setupSupabaseMocks();

    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: {
        object: { id: 'sub_inc', customer: 'cus_inc', status: 'incomplete' },
      },
    });

    await webhookPOST(makeWebhookRequest());
    expect(mockUpdate.mock.calls[0][0].plan).toBe('starter');
  });

  it('subscription.deleted always downgrades regardless of previous plan', async () => {
    const { mockUpdate } = setupSupabaseMocks();

    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: {
        object: { id: 'sub_elite_del', customer: 'cus_elite_del' },
      },
    });

    await webhookPOST(makeWebhookRequest());
    expect(mockUpdate.mock.calls[0][0].plan).toBe('starter');
  });

  it('ignores subscription events with no customer ID', async () => {
    const { mockUpdate } = setupSupabaseMocks();

    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: {
        object: { id: 'sub_no_cust', customer: null },
      },
    });

    await webhookPOST(makeWebhookRequest());
    // Should not call update because customerId is falsy
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════
// 8. WEBHOOK: PAYMENT EVENTS PER PLAN
// ══════════════════════════════════════════════════════════════════

describe('Webhook — payment events per plan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const paymentCases = [
    { name: 'Starter monthly', amount: 4900, expected: 49 },
    { name: 'Pro monthly', amount: 7900, expected: 79 },
    { name: 'Elite monthly', amount: 12900, expected: 129 },
    { name: 'Booking Only monthly', amount: 1500, expected: 15 },
    { name: 'Starter annual', amount: 49000, expected: 490 },
    { name: 'Pro annual', amount: 79000, expected: 790 },
    { name: 'Elite annual', amount: 129000, expected: 1290 },
    { name: 'White Glove one-time', amount: 49900, expected: 499 },
    { name: 'Assisted Onboarding one-time', amount: 19900, expected: 199 },
  ];

  paymentCases.forEach(({ name, amount, expected }) => {
    it(`records ${name} payment ($${expected})`, async () => {
      const { mockInsert } = setupSupabaseMocks({
        singleResult: { data: { id: 'company-001' }, error: null },
      });

      mockConstructEvent.mockReturnValue({
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            customer: 'cus_pay',
            id: `inv_${name.replace(/\s/g, '_')}`,
            amount_paid: amount,
            currency: 'usd',
          },
        },
      });

      const response = await webhookPOST(makeWebhookRequest());
      expect(response.status).toBe(200);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 'company-001',
          amount: expected,
          payment_method: 'stripe',
          status: 'completed',
        })
      );
    });
  });

  it('records payment failure for Pro annual invoice', async () => {
    const { mockInsert } = setupSupabaseMocks({
      singleResult: { data: { id: 'company-002' }, error: null },
    });

    mockConstructEvent.mockReturnValue({
      type: 'invoice.payment_failed',
      data: {
        object: {
          customer: 'cus_fail',
          id: 'inv_pro_fail',
          amount_due: 79000,
          currency: 'usd',
        },
      },
    });

    await webhookPOST(makeWebhookRequest());
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: 'company-002',
        amount: 790,
        status: 'failed',
        notes: 'Failed: Stripe invoice inv_pro_fail',
      })
    );
  });

  it('skips payment recording when company not found', async () => {
    const { mockInsert } = setupSupabaseMocks({
      singleResult: { data: null, error: null },
    });

    mockConstructEvent.mockReturnValue({
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          customer: 'cus_unknown',
          id: 'inv_unknown',
          amount_paid: 4900,
          currency: 'usd',
        },
      },
    });

    await webhookPOST(makeWebhookRequest());
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════
// 9. EDGE CASES & VALIDATION
// ══════════════════════════════════════════════════════════════════

describe('Edge Cases & Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/test' });
  });

  it('returns 400 with no plan, standalone, addons, or onboarding', async () => {
    const response = await checkoutGET(makeRequest({}));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('No items selected');
  });

  it('ignores invalid addon IDs gracefully', async () => {
    await checkoutGET(makeRequest({
      tier: 'starter',
      billing: 'monthly',
      addons: 'nonexistent_addon,also_fake',
    }));
    const config = getConfig();
    // Only the tier should be in line items — invalid add-ons are skipped
    expect(config.line_items).toHaveLength(1);
    expect(config.line_items[0].price).toBe('price_starter_m');
  });

  it('ignores invalid tier gracefully and falls through to standalone', async () => {
    await checkoutGET(makeRequest({
      tier: 'nonexistent_tier',
      standalone: 'booking_only',
      billing: 'monthly',
    }));
    const config = getConfig();
    // Invalid tier is skipped, standalone is used
    expect(config.line_items[0].price).toBe('price_booking_m');
  });

  it('defaults billing to monthly when not specified', async () => {
    await checkoutGET(makeRequest({ tier: 'pro' }));
    const config = getConfig();
    expect(config.line_items[0].price).toBe('price_pro_m');
    expect(config.metadata.billing).toBe('monthly');
  });

  it('tier takes precedence over standalone when both are provided', async () => {
    await checkoutGET(makeRequest({
      tier: 'elite',
      standalone: 'booking_only',
      billing: 'monthly',
    }));
    const config = getConfig();
    // Only 1 base item — tier wins
    expect(config.line_items).toHaveLength(1);
    expect(config.line_items[0].price).toBe('price_elite_m');
  });

  it('handles empty addons param without error', async () => {
    await checkoutGET(makeRequest({ tier: 'starter', billing: 'monthly', addons: '' }));
    expect(getConfig().line_items).toHaveLength(1);
  });

  it('handles extraWorkers as non-numeric string (defaults to 0)', async () => {
    await checkoutGET(makeRequest({ tier: 'starter', billing: 'monthly', extraWorkers: 'abc' }));
    // NaN from parseInt → 0 > 0 is false, so no worker item
    expect(getConfig().line_items).toHaveLength(1);
  });

  it('webhook returns 400 on invalid signature', async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error('Invalid sig'); });
    const response = await webhookPOST(makeWebhookRequest('{}', 'bad'));
    expect(response.status).toBe(400);
  });

  it('webhook returns 200 for unrecognized event type', async () => {
    mockConstructEvent.mockReturnValue({ type: 'charge.refunded', data: { object: {} } });
    const response = await webhookPOST(makeWebhookRequest());
    expect(response.status).toBe(200);
  });
});
