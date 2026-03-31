/**
 * @jest-environment node
 */

/**
 * Tests for Netlify checkout function (netlify/functions/checkout.js)
 * Validates support for all plan types including booking_only, invoicing_only,
 * and onboarding services.
 */

const mockSessionCreate = jest.fn();

jest.mock('stripe', () => {
  return jest.fn(() => ({
    checkout: {
      sessions: {
        create: mockSessionCreate,
      },
    },
  }));
});

process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.NEXT_PUBLIC_SITE_URL = 'https://tooltimepro.com';
process.env.NEXT_PUBLIC_STRIPE_PRICES = JSON.stringify({
  starter: { monthly: 'price_starter_m', annual: 'price_starter_a' },
  pro: { monthly: 'price_pro_m', annual: 'price_pro_a' },
  elite: { monthly: 'price_elite_m', annual: 'price_elite_a' },
  booking_only: { monthly: 'price_booking_m', annual: 'price_booking_a' },
  invoicing_only: { monthly: 'price_invoicing_m', annual: 'price_invoicing_a' },
  jenny_pro: { monthly: 'price_jenny_pro_m' },
  website_builder: { monthly: 'price_wb_m' },
  keep_me_legal: { monthly: 'price_kml_m' },
  extra_page: { monthly: 'price_page_m' },
  extra_worker: { monthly: 'price_worker' },
  quickbooks_sync: { monthly: 'price_qb_m' },
  customer_portal_pro: { monthly: 'price_portal_m' },
  jenny_lite: { monthly: 'price_jl_m' },
  jenny_exec_admin: { monthly: 'price_je_m' },
  assisted_onboarding: 'price_onboard',
  white_glove: 'price_wg',
});

const { handler } = require('../../../netlify/functions/checkout');

function makeEvent(body) {
  return {
    httpMethod: 'POST',
    body: JSON.stringify(body),
  };
}

describe('Netlify checkout function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionCreate.mockResolvedValue({
      url: 'https://checkout.stripe.com/test-session',
    });
  });

  it('rejects non-POST requests', async () => {
    const result = await handler({ httpMethod: 'GET' }, {});
    expect(result.statusCode).toBe(405);
  });

  it('creates checkout for starter plan', async () => {
    const result = await handler(makeEvent({ plan: 'starter', billing: 'monthly', addOns: [] }), {});
    expect(result.statusCode).toBe(200);
    const config = mockSessionCreate.mock.calls[0][0];
    expect(config.line_items[0]).toEqual({ price: 'price_starter_m', quantity: 1 });
  });

  it('creates checkout for booking_only plan', async () => {
    const result = await handler(makeEvent({ plan: 'booking_only', billing: 'monthly', addOns: [] }), {});
    expect(result.statusCode).toBe(200);
    const config = mockSessionCreate.mock.calls[0][0];
    expect(config.line_items[0]).toEqual({ price: 'price_booking_m', quantity: 1 });
    expect(config.metadata.plan).toBe('booking_only');
  });

  it('creates checkout for invoicing_only plan', async () => {
    const result = await handler(makeEvent({ plan: 'invoicing_only', billing: 'monthly', addOns: [] }), {});
    expect(result.statusCode).toBe(200);
    const config = mockSessionCreate.mock.calls[0][0];
    expect(config.line_items[0]).toEqual({ price: 'price_invoicing_m', quantity: 1 });
    expect(config.metadata.plan).toBe('invoicing_only');
  });

  it('supports annual billing for standalone plans', async () => {
    const result = await handler(makeEvent({ plan: 'booking_only', billing: 'annual', addOns: [] }), {});
    expect(result.statusCode).toBe(200);
    const config = mockSessionCreate.mock.calls[0][0];
    expect(config.line_items[0]).toEqual({ price: 'price_booking_a', quantity: 1 });
  });

  it('adds add-ons to standalone plans', async () => {
    const result = await handler(makeEvent({
      plan: 'booking_only',
      billing: 'monthly',
      addOns: ['jenny_lite', 'website_builder'],
    }), {});
    expect(result.statusCode).toBe(200);
    const config = mockSessionCreate.mock.calls[0][0];
    expect(config.line_items).toHaveLength(3);
    expect(config.line_items[1]).toEqual({ price: 'price_jl_m', quantity: 1 });
    expect(config.line_items[2]).toEqual({ price: 'price_wb_m', quantity: 1 });
  });

  it('adds assisted_onboarding as one-time item', async () => {
    const result = await handler(makeEvent({
      plan: 'starter',
      billing: 'monthly',
      addOns: [],
      onboarding: 'assisted_onboarding',
    }), {});
    expect(result.statusCode).toBe(200);
    const config = mockSessionCreate.mock.calls[0][0];
    expect(config.line_items).toHaveLength(2);
    expect(config.line_items[1]).toEqual({ price: 'price_onboard', quantity: 1 });
    expect(config.metadata.onboarding).toBe('assisted_onboarding');
  });

  it('adds white_glove as one-time item', async () => {
    const result = await handler(makeEvent({
      plan: 'elite',
      billing: 'monthly',
      addOns: [],
      onboarding: 'white_glove',
    }), {});
    expect(result.statusCode).toBe(200);
    const config = mockSessionCreate.mock.calls[0][0];
    expect(config.line_items).toHaveLength(2);
    expect(config.line_items[1]).toEqual({ price: 'price_wg', quantity: 1 });
    expect(config.metadata.onboarding).toBe('white_glove');
  });

  it('returns 400 for unknown plan', async () => {
    const result = await handler(makeEvent({ plan: 'unknown', billing: 'monthly', addOns: [] }), {});
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error).toContain('Price ID not configured');
  });

  it('includes all add-ons in line items', async () => {
    const result = await handler(makeEvent({
      plan: 'pro',
      billing: 'monthly',
      addOns: ['keep_me_legal', 'quickbooks_sync', 'customer_portal_pro'],
    }), {});
    expect(result.statusCode).toBe(200);
    const config = mockSessionCreate.mock.calls[0][0];
    expect(config.line_items).toHaveLength(4);
  });

  it('sets 14-day trial period', async () => {
    await handler(makeEvent({ plan: 'starter', billing: 'monthly', addOns: [] }), {});
    const config = mockSessionCreate.mock.calls[0][0];
    expect(config.subscription_data.trial_period_days).toBe(14);
  });

  it('enables promotion codes', async () => {
    await handler(makeEvent({ plan: 'starter', billing: 'monthly', addOns: [] }), {});
    const config = mockSessionCreate.mock.calls[0][0];
    expect(config.allow_promotion_codes).toBe(true);
  });
});
