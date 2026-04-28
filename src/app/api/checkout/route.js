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
      const priceId = PRICE_IDS[tier][billing] || PRICE_IDS[tier].monthly;
      lineItems.push({ price: priceId, quantity: 1 });
    } else if (standalone && PRICE_IDS[standalone]) {
      const priceId = PRICE_IDS[standalone][billing] || PRICE_IDS[standalone].monthly;
      lineItems.push({ price: priceId, quantity: 1 });
    }

    for (const addonId of addons) {
      if (PRICE_IDS[addonId]) {
        const priceId = billing === 'annual' && PRICE_IDS[addonId].annual
          ? PRICE_IDS[addonId].annual
          : PRICE_IDS[addonId].monthly;
        if (priceId) lineItems.push({ price: priceId, quantity: 1 });
      }
    }

    if (extraWorkers > 0 && PRICE_IDS.extra_worker?.monthly) {
      lineItems.push({ price: PRICE_IDS.extra_worker.monthly, quantity: extraWorkers });
    }

    if (onboarding && PRICE_IDS[onboarding]) {
      lineItems.push({ price: PRICE_IDS[onboarding], quantity: 1 });
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
      line_items: lineItems,
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
    const session = await stripe.checkout.sessions.create(sessionConfig);
    return NextResponse.redirect(session.url, 303);

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session', details: error.message }, { status: 500 });
  }
}
