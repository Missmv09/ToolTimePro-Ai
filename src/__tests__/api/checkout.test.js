/**
 * @jest-environment node
 */

/**
 * Tests for /api/checkout route
 * Validates Stripe checkout session creation, parameter handling, and error cases
 */

const mockSessionCreate = jest.fn();
const mockPricesList = jest.fn();

jest.mock('stripe', () => {
  return jest.fn(() => ({
    checkout: {
      sessions: {
        create: mockSessionCreate,
      },
    },
    prices: {
      list: mockPricesList,
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
    mockPricesList.mockResolvedValue({ data: [], has_more: false });
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

  describe('inactive-price self-heal', () => {
    // The route caches the active-prices map at module scope. Reset modules
    // between tests so each test starts with an empty cache.
    let isolatedGET;
    beforeEach(() => {
      jest.resetModules();
      isolatedGET = require('@/app/api/checkout/route').GET;
    });

    it('retries with a metadata-resolved active price when Stripe rejects the configured price as inactive', async () => {
      mockSessionCreate
        .mockRejectedValueOnce(Object.assign(new Error('The price specified is inactive. This field only accepts active prices.'), { type: 'StripeInvalidRequestError' }))
        .mockResolvedValueOnce({ url: 'https://checkout.stripe.com/recovered-session' });

      mockPricesList.mockResolvedValueOnce({
        data: [
          { id: 'price_elite_m_NEW', metadata: { tooltime_id: 'elite', tooltime_key: 'monthly' } },
        ],
        has_more: false,
      });

      const request = makeRequest({ tier: 'elite', billing: 'monthly', skipTrial: 'true' });
      const response = await isolatedGET(request);

      expect(mockSessionCreate).toHaveBeenCalledTimes(2);
      expect(mockPricesList).toHaveBeenCalled();

      const firstCall = mockSessionCreate.mock.calls[0][0];
      expect(firstCall.line_items[0].price).toBe('price_elite_m');

      const secondCall = mockSessionCreate.mock.calls[1][0];
      expect(secondCall.line_items[0].price).toBe('price_elite_m_NEW');

      expect(response.status).toBe(303);
    });

    it('returns a clear error with attempted price details when no active replacement exists', async () => {
      mockSessionCreate.mockRejectedValueOnce(
        Object.assign(new Error('The price specified is inactive. This field only accepts active prices.'), { type: 'StripeInvalidRequestError' })
      );
      mockPricesList.mockResolvedValueOnce({ data: [], has_more: false });

      const request = makeRequest({ tier: 'elite', billing: 'monthly' });
      const response = await isolatedGET(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to create checkout session');
      expect(body.details).toMatch(/inactive/i);
      expect(body.attempted).toEqual([
        { tooltimeId: 'elite', tooltimeKey: 'monthly', priceId: 'price_elite_m' },
      ]);
      expect(body.hint).toMatch(/setup-products/);
    });

    it('does not retry when the error is unrelated to inactive prices', async () => {
      mockSessionCreate.mockRejectedValueOnce(new Error('Network down'));
      const request = makeRequest({ tier: 'pro', billing: 'monthly' });
      const response = await isolatedGET(request);

      expect(mockSessionCreate).toHaveBeenCalledTimes(1);
      expect(mockPricesList).not.toHaveBeenCalled();
      expect(response.status).toBe(500);
    });
  });

  it('forwards userEmail and companyId so the webhook can match an existing trial user', async () => {
    const request = makeRequest({
      tier: 'pro',
      billing: 'monthly',
      userEmail: 'owner@example.com',
      companyId: 'cmp-123',
    });
    await GET(request);

    const config = mockSessionCreate.mock.calls[0][0];
    expect(config.customer_email).toBe('owner@example.com');
    expect(config.metadata.userEmail).toBe('owner@example.com');
    expect(config.metadata.companyId).toBe('cmp-123');
    expect(config.subscription_data.metadata.companyId).toBe('cmp-123');
  });
});
