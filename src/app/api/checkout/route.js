import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PRICE_IDS } from '@/lib/stripe-prices';

export const dynamic = 'force-dynamic';

// Lazy initialization to prevent build-time errors when env vars aren't available
let stripeClient = null;

function getStripe() {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

// Cached map of tooltime_id -> { tooltime_key -> active stripe price id }.
// setup-products writes these metadata fields on every price it creates, so
// we can recover when the configured PRICE_IDS env var points at a price
// that's been archived in the connected Stripe account (common on sandbox
// deploys that re-seed Stripe but don't update Netlify env vars).
let activePriceCache = null;
let activePriceCachedAt = 0;
const ACTIVE_PRICE_CACHE_TTL_MS = 5 * 60 * 1000;

function bustActivePriceCache() {
  activePriceCache = null;
  activePriceCachedAt = 0;
}

async function loadActivePricesByMetadata(stripe, { forceRefresh = false } = {}) {
  if (!forceRefresh && activePriceCache && Date.now() - activePriceCachedAt < ACTIVE_PRICE_CACHE_TTL_MS) {
    return activePriceCache;
  }
  const map = {};
  let hasMore = true;
  let startingAfter;
  // expand=data.product so we can filter out prices whose product has been
  // archived. Stripe rejects those with the same "price is inactive" error
  // even though the price row itself is still active.
  while (hasMore) {
    const list = await stripe.prices.list({
      limit: 100,
      active: true,
      starting_after: startingAfter,
      expand: ['data.product'],
    });
    for (const price of list.data) {
      const ttId = price.metadata?.tooltime_id;
      const ttKey = price.metadata?.tooltime_key;
      if (!ttId || !ttKey) continue;
      const product = price.product;
      if (product && typeof product === 'object' && product.active === false) continue;
      if (!map[ttId]) map[ttId] = {};
      map[ttId][ttKey] = price.id;
    }
    hasMore = list.has_more;
    if (list.data.length > 0) startingAfter = list.data[list.data.length - 1].id;
  }
  activePriceCache = map;
  activePriceCachedAt = Date.now();
  return map;
}

function isInactivePriceError(err) {
  const msg = String(err?.message || '');
  return /inactive/i.test(msg) || err?.code === 'resource_missing';
}

// Each line item carries the (tooltime_id, tooltime_key) it was built from
// so we can look up an active replacement if Stripe rejects the configured
// price as inactive. Returns the new line_items array and a list of swaps
// that happened (for logging).
async function resolveLineItemsByMetadata(stripe, lineItems, { forceRefresh = false } = {}) {
  const map = await loadActivePricesByMetadata(stripe, { forceRefresh });
  const swaps = [];
  const resolved = lineItems.map((item) => {
    const ctx = item._context;
    const replacement = ctx ? map[ctx.tooltimeId]?.[ctx.tooltimeKey] : null;
    if (!replacement) return item;
    if (replacement !== item.price) {
      swaps.push({ tooltimeId: ctx.tooltimeId, tooltimeKey: ctx.tooltimeKey, from: item.price, to: replacement });
    }
    return { ...item, price: replacement };
  });
  return { resolved, swaps };
}

function stripContext(lineItems) {
  return lineItems.map(({ _context, ...rest }) => rest);
}


export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const tier = searchParams.get('tier');
    const standalone = searchParams.get('standalone');
    const addonsParam = searchParams.get('addons') || '';
    const onboarding = searchParams.get('onboarding');
    const extraWorkers = parseInt(searchParams.get('extraWorkers') || '0', 10);
    const billing = searchParams.get('billing') || 'monthly';
    const skipTrial = searchParams.get('skipTrial') === 'true';
    // Identity hints from the logged-in user. Stored in metadata so the
    // webhook can find the right company even if the customer types a
    // different email at checkout.
    const userEmail = searchParams.get('userEmail') || '';
    const companyId = searchParams.get('companyId') || '';

    const addons = addonsParam ? addonsParam.split(',').filter(Boolean) : [];
    const lineItems = [];

    if (tier && PRICE_IDS[tier]) {
      const key = PRICE_IDS[tier][billing] ? billing : 'monthly';
      const priceId = PRICE_IDS[tier][key];
      lineItems.push({ price: priceId, quantity: 1, _context: { tooltimeId: tier, tooltimeKey: key } });
    } else if (standalone && PRICE_IDS[standalone]) {
      const key = PRICE_IDS[standalone][billing] ? billing : 'monthly';
      const priceId = PRICE_IDS[standalone][key];
      lineItems.push({ price: priceId, quantity: 1, _context: { tooltimeId: standalone, tooltimeKey: key } });
    }

    for (const addonId of addons) {
      if (PRICE_IDS[addonId]) {
        const key = billing === 'annual' && PRICE_IDS[addonId].annual ? 'annual' : 'monthly';
        const priceId = PRICE_IDS[addonId][key];
        if (priceId) lineItems.push({ price: priceId, quantity: 1, _context: { tooltimeId: addonId, tooltimeKey: key } });
      }
    }

    if (extraWorkers > 0 && PRICE_IDS.extra_worker?.monthly) {
      lineItems.push({
        price: PRICE_IDS.extra_worker.monthly,
        quantity: extraWorkers,
        _context: { tooltimeId: 'extra_worker', tooltimeKey: 'monthly' },
      });
    }

    if (onboarding && PRICE_IDS[onboarding]) {
      lineItems.push({
        price: PRICE_IDS[onboarding],
        quantity: 1,
        _context: { tooltimeId: onboarding, tooltimeKey: 'one_time' },
      });
    }

    if (lineItems.length === 0) {
      return NextResponse.json({ error: 'No items selected' }, { status: 400 });
    }

    const hasRecurring = tier || standalone || addons.length > 0 || extraWorkers > 0;

    // Derive base URL: env var wins, otherwise use the request's own origin so
    // sandbox deploys redirect back to themselves instead of prod.
    const requestOrigin = (() => {
      try { return new URL(request.url).origin; } catch { return null; }
    })();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || requestOrigin || 'https://tooltimepro.com';

    const baseMetadata = {
      plan: tier || standalone || '',
      tier: tier || '',
      standalone: standalone || '',
      addons: addons.join(','),
      onboarding: onboarding || '',
      extraWorkers: extraWorkers.toString(),
      billing,
      skipTrial: skipTrial ? 'true' : 'false',
      userEmail,
      companyId,
    };

    let sessionConfig = {
      payment_method_types: ['card'],
      line_items: stripContext(lineItems),
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      metadata: baseMetadata,
    };

    // Stripe's standard idiom for "this checkout belongs to record X in my
    // app." Redundant with metadata.companyId on purpose — gives the webhook
    // a second, structured channel that doesn't depend on metadata format.
    if (companyId) {
      sessionConfig.client_reference_id = companyId;
    }

    // Pre-fill the email field on Stripe Checkout when we know who the user
    // is. Locks the form to that email so the customer can't accidentally
    // pay under a different identity than the one they're logged in with.
    if (userEmail) {
      sessionConfig.customer_email = userEmail;
    }

    if (hasRecurring) {
      sessionConfig.mode = 'subscription';
      sessionConfig.subscription_data = {
        metadata: baseMetadata,
      };
      if (!skipTrial) {
        sessionConfig.subscription_data.trial_period_days = 14;
      }
    } else {
      sessionConfig.mode = 'payment';
    }

    const stripe = getStripe();

    let session;
    try {
      session = await stripe.checkout.sessions.create(sessionConfig);
    } catch (firstErr) {
      if (!isInactivePriceError(firstErr)) throw firstErr;

      // The configured PRICE_IDS env var is pointing at archived prices.
      // Resolve fresh active price IDs by metadata and retry. We make up to
      // two retries: the first uses the cached metadata→price map, the
      // second forces a fresh Stripe lookup in case the cache is stale.
      let attemptSwaps;
      let lastRetryErr;
      let resolvedLineItems = lineItems;
      for (const forceRefresh of [false, true]) {
        const { resolved, swaps } = await resolveLineItemsByMetadata(stripe, lineItems, { forceRefresh });
        if (swaps.length === 0) {
          if (forceRefresh) break;
          continue;
        }
        attemptSwaps = swaps;
        resolvedLineItems = resolved;
        const retryConfig = { ...sessionConfig, line_items: stripContext(resolved) };
        try {
          console.warn('Stripe price(s) inactive — retrying with metadata-resolved active prices:', { swaps, forceRefresh });
          session = await stripe.checkout.sessions.create(retryConfig);
          lastRetryErr = null;
          break;
        } catch (retryErr) {
          lastRetryErr = retryErr;
          if (!isInactivePriceError(retryErr)) break;
          // Inactive again — bust the cache and try one more time with fresh data.
          bustActivePriceCache();
        }
      }

      if (!session) {
        const attempted = (resolvedLineItems || lineItems).map((it) => ({
          tooltimeId: it._context?.tooltimeId,
          tooltimeKey: it._context?.tooltimeKey,
          priceId: it.price,
        }));
        const baseDetails = lastRetryErr?.message || firstErr.message;
        const noSwapHint = 'No active replacement price found in Stripe. POST /api/stripe/setup-products to (re)create the catalog, then update NEXT_PUBLIC_STRIPE_PRICES.';
        const swapFailedHint = 'Found active replacement price(s) by metadata, but Stripe still rejected them as inactive. The replacement price\'s product may be archived. POST /api/stripe/setup-products to (re)create the catalog with active products, then copy the returned NEXT_PUBLIC_STRIPE_PRICES into Netlify env vars.';
        return NextResponse.json({
          error: 'Failed to create checkout session',
          details: baseDetails,
          hint: attemptSwaps?.length ? swapFailedHint : noSwapHint,
          attempted,
          swaps: attemptSwaps || [],
        }, { status: 500 });
      }
    }

    return NextResponse.redirect(session.url, 303);

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session', details: error.message }, { status: 500 });
  }
}
