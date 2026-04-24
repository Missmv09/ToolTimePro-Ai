/**
 * @jest-environment node
 */

/**
 * Tests for /api/checkout route
 * Validates Stripe checkout session creation, parameter handling, and error cases
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

// Set env vars before import
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.NEXT_PUBLIC_STRIPE_PRICES = JSON.stringify({
  starter: { monthly: 'price_starter_m', annual: 'price_starter_a' },
  pro: { monthly: 'price_pro_m', annual: 'price_pro_a' },
  elite: { monthly: 'price_elite_m' },
  extra_worker: { monthly: 'price_worker' },
  website_builder: { monthly: 'price_wb_m', annual: 'price_wb_a' },
  assisted_onboarding: 'price_onboard',
  white_glove: 'price_wg',
});

const { GET } = require('@/app/api/checkout/route');

function makeRequest(params) {
  const url = new URL('http://localhost/api/checkout');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString());
}

describe('/api/checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionCreate.mockResolvedValue({
      url: 'https://checkout.stripe.com/test-session',
    });
  });

  it('creates a subscription session for a tier plan', async () => {
    const request = makeRequest({ tier: 'starter', billing: 'monthly' });
    const response = await GET(request);

    expect(mockSessionCreate).toHaveBeenCalledTimes(1);
    const config = mockSessionCreate.mock.calls[0][0];
    expect(config.mode).toBe('subscription');
    expect(config.line_items).toEqual([{ price: 'price_starter_m', quantity: 1 }]);
    expect(config.subscription_data.trial_period_days).toBe(14);
    // redirect response
    expect(response.status).toBe(303);
  });

  it('uses annual pricing when billing=annual', async () => {
    const request = makeRequest({ tier: 'starter', billing: 'annual' });
    await GET(request);

    const config = mockSessionCreate.mock.calls[0][0];
    expect(config.line_items[0].price).toBe('price_starter_a');
  });

  it('adds extra workers to line items', async () => {
    const request = makeRequest({ tier: 'pro', billing: 'monthly', extraWorkers: '3' });
    await GET(request);

    const config = mockSessionCreate.mock.calls[0][0];
    expect(config.line_items).toHaveLength(2);
    expect(config.line_items[1]).toEqual({ price: 'price_worker', quantity: 3 });
  });

  it('adds add-ons to line items', async () => {
    const request = makeRequest({
      tier: 'starter',
      billing: 'monthly',
      addons: 'website_builder',
    });
    await GET(request);

    const config = mockSessionCreate.mock.calls[0][0];
    expect(config.line_items).toHaveLength(2);
    expect(config.line_items[1].price).toBe('price_wb_m');
  });

  it('adds onboarding as a one-time item', async () => {
    const request = makeRequest({
      tier: 'starter',
      billing: 'monthly',
      onboarding: 'assisted_onboarding',
    });
    await GET(request);

    const config = mockSessionCreate.mock.calls[0][0];
    expect(config.line_items).toHaveLength(2);
    expect(config.line_items[1]).toEqual({ price: 'price_onboard', quantity: 1 });
  });

  it('returns 400 when no items selected', async () => {
    const request = makeRequest({});
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('No items selected');
  });

  it('returns 500 when Stripe throws', async () => {
    mockSessionCreate.mockRejectedValue(new Error('Stripe API error'));
    const request = makeRequest({ tier: 'starter', billing: 'monthly' });
    const response = await GET(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to create checkout session');
  });

  it('includes metadata with plan details', async () => {
    const request = makeRequest({
      tier: 'elite',
      billing: 'annual',
      addons: 'website_builder',
      extraWorkers: '2',
    });
    await GET(request);

    const config = mockSessionCreate.mock.calls[0][0];
    expect(config.metadata.tier).toBe('elite');
    expect(config.metadata.billing).toBe('annual');
    expect(config.metadata.addons).toBe('website_builder');
    expect(config.metadata.extraWorkers).toBe('2');
  });

  it('enables promotion codes and requires billing address', async () => {
    const request = makeRequest({ tier: 'starter', billing: 'monthly' });
    await GET(request);

    const config = mockSessionCreate.mock.calls[0][0];
    expect(config.allow_promotion_codes).toBe(true);
    expect(config.billing_address_collection).toBe('required');
  });

  it('omits trial_period_days when skipTrial=true (Subscribe Now path)', async () => {
    const request = makeRequest({ tier: 'starter', billing: 'monthly', skipTrial: 'true' });
    await GET(request);

    const config = mockSessionCreate.mock.calls[0][0];
    expect(config.mode).toBe('subscription');
    expect(config.subscription_data.trial_period_days).toBeUndefined();
    expect(config.metadata.skipTrial).toBe('true');
  });

  it('keeps the 14-day trial when skipTrial is absent or false', async () => {
    const request = makeRequest({ tier: 'pro', billing: 'monthly', skipTrial: 'false' });
    await GET(request);

    const config = mockSessionCreate.mock.calls[0][0];
    expect(config.subscription_data.trial_period_days).toBe(14);
    expect(config.metadata.skipTrial).toBe('false');
  });
});
