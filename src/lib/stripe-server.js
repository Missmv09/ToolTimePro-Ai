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

// Stripe session/event IDs prefixed `cs_test_` belong to sandbox/test mode and
// can only be retrieved with a test secret. Calling retrieve() with the wrong
// mode's key fails with `resource_missing`, which silently breaks the
// success page when the deploy is configured for live but a tester pays in
// the sandbox.
export function getStripeForSession(sessionId) {
  const isTest =
    typeof sessionId === 'string' && sessionId.startsWith('cs_test_');
  const liveKey = process.env.STRIPE_SECRET_KEY;
  const testKey = process.env.STRIPE_SECRET_KEY_TEST;
  return clientFor(isTest ? testKey || liveKey : liveKey || testKey);
}

export function getStripe() {
  const mode = (process.env.STRIPE_MODE || '').toLowerCase();
  const liveKey = process.env.STRIPE_SECRET_KEY;
  const testKey = process.env.STRIPE_SECRET_KEY_TEST;
  return clientFor(mode === 'test' ? testKey || liveKey : liveKey || testKey);
}
