import { NextResponse } from 'next/server';
import Stripe from 'stripe';

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

const PRICE_IDS = {
  // Base Tiers
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    annual: process.env.STRIPE_PRICE_STARTER_ANNUAL,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
  },
  elite: {
    monthly: process.env.STRIPE_PRICE_ELITE_MONTHLY,
    annual: process.env.STRIPE_PRICE_ELITE_ANNUAL,
  },
  // Standalone
  booking_only: {
    monthly: process.env.STRIPE_PRICE_BOOKING_ONLY_MONTHLY,
    annual: process.env.STRIPE_PRICE_BOOKING_ONLY_ANNUAL,
  },
  invoicing_only: {
    monthly: process.env.STRIPE_PRICE_INVOICING_ONLY_MONTHLY,
    annual: process.env.STRIPE_PRICE_INVOICING_ONLY_ANNUAL,
  },
  // Jenny AI Tiers
  jenny_lite: {
    monthly: process.env.STRIPE_PRICE_JENNY_LITE_MONTHLY,
    annual: process.env.STRIPE_PRICE_JENNY_LITE_ANNUAL,
  },
  jenny_pro: {
    monthly: process.env.STRIPE_PRICE_JENNY_PRO_MONTHLY,
    annual: process.env.STRIPE_PRICE_JENNY_PRO_ANNUAL,
  },
  jenny_exec_admin: {
    monthly: process.env.STRIPE_PRICE_JENNY_EXEC_ADMIN_MONTHLY,
    annual: process.env.STRIPE_PRICE_JENNY_EXEC_ADMIN_ANNUAL,
  },
  // Other Add-ons
  website_builder: {
    monthly: process.env.STRIPE_PRICE_WEBSITE_BUILDER_MONTHLY,
    annual: process.env.STRIPE_PRICE_WEBSITE_BUILDER_ANNUAL,
  },
  keep_me_legal: {
    monthly: process.env.STRIPE_PRICE_KEEP_ME_LEGAL_MONTHLY,
    annual: process.env.STRIPE_PRICE_KEEP_ME_LEGAL_ANNUAL,
  },
  extra_page: {
    monthly: process.env.STRIPE_PRICE_EXTRA_PAGE_MONTHLY,
    annual: process.env.STRIPE_PRICE_EXTRA_PAGE_ANNUAL,
  },
  extra_worker: {
    monthly: process.env.STRIPE_PRICE_EXTRA_WORKER,
  },
  quickbooks_sync: {
    monthly: process.env.STRIPE_PRICE_QUICKBOOKS_SYNC_MONTHLY,
    annual: process.env.STRIPE_PRICE_QUICKBOOKS_SYNC_ANNUAL,
  },
  // Onboarding
  assisted_onboarding: process.env.STRIPE_PRICE_ASSISTED_ONBOARDING,
  white_glove: process.env.STRIPE_PRICE_WHITE_GLOVE,
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const tier = searchParams.get('tier');
    const standalone = searchParams.get('standalone');
    const addonsParam = searchParams.get('addons') || '';
    const onboarding = searchParams.get('onboarding');
    const extraWorkers = parseInt(searchParams.get('extraWorkers') || '0', 10);
    const billing = searchParams.get('billing') || 'monthly';

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

    let sessionConfig = {
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tooltimepro.com'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tooltimepro.com'}/pricing`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      metadata: { plan: tier || standalone || '', tier: tier || '', standalone: standalone || '', addons: addons.join(','), onboarding: onboarding || '', extraWorkers: extraWorkers.toString(), billing },
    };

    if (hasRecurring) {
      sessionConfig.mode = 'subscription';
      sessionConfig.subscription_data = {
        trial_period_days: 14,
        metadata: { plan: tier || standalone || '', tier: tier || '', standalone: standalone || '', addons: addons.join(','), extraWorkers: extraWorkers.toString(), billing },
      };
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
