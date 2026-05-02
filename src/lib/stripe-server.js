import Stripe from 'stripe';

const clientsByKey = new Map();

function clientFor(key) {
  if (!key) {
    throw new Error('Stripe secret key is not configured');
  }
  if (!clientsByKey.has(key)) {
    clientsByKey.set(key, new Stripe(key));
  }
  return clientsByKey.get(key);
}

// Stripe session IDs prefixed `cs_test_` belong to sandbox mode; `cs_live_`
// are live. Calling retrieve() with the wrong mode's key fails with
// `resource_missing`, which surfaces as a confusing 500 on the success page.
// Pick a key whose mode matches the session, and refuse to fall back to a
// wrong-mode key — surface a clear config error instead.
export function getStripeForSession(sessionId) {
  const id = typeof sessionId === 'string' ? sessionId : '';
  const isTest = id.startsWith('cs_test_');
  const isLive = id.startsWith('cs_live_');
  const liveKey = process.env.STRIPE_SECRET_KEY;
  const testKey = process.env.STRIPE_SECRET_KEY_TEST;

  // Unrecognized prefix (test fixtures, future formats): fall back to whatever
  // is configured rather than blocking. Prefer live, then test.
  if (!isTest && !isLive) {
    return clientFor(liveKey || testKey);
  }

  const expectedPrefix = isTest ? 'sk_test_' : 'sk_live_';
  const candidates = isTest ? [testKey, liveKey] : [liveKey, testKey];
  const matched = candidates.find(
    (k) => typeof k === 'string' && k.startsWith(expectedPrefix)
  );
  if (!matched) {
    throw new Error(
      `No Stripe ${isTest ? 'test' : 'live'} secret key configured for session ` +
        `${id.slice(0, 12)}…. Set ` +
        `${isTest ? 'STRIPE_SECRET_KEY_TEST (or STRIPE_SECRET_KEY=sk_test_…)' : 'STRIPE_SECRET_KEY=sk_live_…'} in your environment.`
    );
  }
  return clientFor(matched);
}

export function getStripe() {
  const mode = (process.env.STRIPE_MODE || '').toLowerCase();
  const liveKey = process.env.STRIPE_SECRET_KEY;
  const testKey = process.env.STRIPE_SECRET_KEY_TEST;
  return clientFor(mode === 'test' ? testKey || liveKey : liveKey || testKey);
}
