/**
 * Regression tests for getStripeForSession key selection.
 *
 * Bug this guards against: checkout sessions are CREATED with STRIPE_SECRET_KEY
 * (api/checkout/route.js), but the success page RETRIEVED them preferring
 * STRIPE_SECRET_KEY_TEST. When that test key pointed at a *different* Stripe
 * account than STRIPE_SECRET_KEY, retrieval hit the wrong account and 500'd
 * with "No such checkout.session". The fix: always prefer STRIPE_SECRET_KEY
 * (the create key) when its mode matches the session.
 */

describe('getStripeForSession key selection', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  // Load the module with `stripe` mocked so the returned client just exposes
  // the secret key it was constructed with.
  function loadWithMockedStripe() {
    jest.doMock('stripe', () =>
      jest.fn().mockImplementation((key) => ({ key }))
    );
    return require('@/lib/stripe-server');
  }

  it('uses STRIPE_SECRET_KEY for a test session even when STRIPE_SECRET_KEY_TEST is a different account (the sandbox bug)', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_PRIMARYaccount';
    process.env.STRIPE_SECRET_KEY_TEST = 'sk_test_OTHERaccount';
    const { getStripeForSession } = loadWithMockedStripe();
    expect(getStripeForSession('cs_test_abc123').key).toBe('sk_test_PRIMARYaccount');
  });

  it('falls back to STRIPE_SECRET_KEY_TEST for a test session when STRIPE_SECRET_KEY is live', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_PRODaccount';
    process.env.STRIPE_SECRET_KEY_TEST = 'sk_test_FORtest';
    const { getStripeForSession } = loadWithMockedStripe();
    expect(getStripeForSession('cs_test_abc123').key).toBe('sk_test_FORtest');
  });

  it('uses STRIPE_SECRET_KEY for a live session', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_PRODaccount';
    process.env.STRIPE_SECRET_KEY_TEST = 'sk_test_FORtest';
    const { getStripeForSession } = loadWithMockedStripe();
    expect(getStripeForSession('cs_live_abc123').key).toBe('sk_live_PRODaccount');
  });

  it('throws a clear config error when no key matches the session mode', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_PRODaccount';
    delete process.env.STRIPE_SECRET_KEY_TEST;
    const { getStripeForSession } = loadWithMockedStripe();
    expect(() => getStripeForSession('cs_test_abc123')).toThrow(/No Stripe test secret key/);
  });
});
