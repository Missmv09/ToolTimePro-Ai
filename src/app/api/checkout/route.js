import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_IDS = {
  starter: {
    monthly: 'price_1Sszh2IHDYuF9ge1wsfpRNgy',
    annual: 'price_1SszomIHDYuF9ge1i71Vrn8t',
  },
  pro: {
    monthly: 'price_1Sszh1IHDYuF9ge1sa2DjGn7',
    annual: 'price_1SszomIHDYuF9ge1qWIV422P',
  },
  elite: {
    monthly: 'price_1SszgzIHDYuF9ge1JA7CcQo7',
    annual: 'price_1SszolIHDYuF9ge143xTS5E7',
  },
  booking_only: {
    monthly: 'price_1StH2cIHDYuF9ge1h81OPRBX',
    annual: 'price_1StH2tIHDYuF9ge1YIiXgVf5',
  },
  invoicing_only: {
    monthly: 'price_1StH3WIHDYuF9ge1nAXWNpkc',
    annual: 'price_1StH3pIHDYuF9ge1CEgkwTvx',
  },
  website_builder: {
    monthly: 'price_1StH4XIHDYuF9ge1Noqho85C',
    annual: 'price_1StH4iIHDYuF9ge1OsTIAIAq',
  },
  ai_chatbot: {
    monthly: 'price_1Sszh0IHDYuF9ge1XYGFnXah',
  },
  keep_me_legal: {
    monthly: 'price_1Sszh0IHDYuF9ge1gAIKMReh',
  },
  extra_page: {
    monthly: 'price_1Sszh0IHDYuF9ge1Mhm0zoxl',
  },
  extra_worker: {
    monthly: 'price_1St0PdIHDYuF9ge1QBfP015G',
  },
  assisted_onboarding: 'price_1Sszh1IHDYuF9ge1Vg3o4EJA',
  white_glove: 'price_1Sszh1IHDYuF9ge1Rvjgf1QX',
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
      metadata: { tier: tier || '', standalone: standalone || '', addons: addons.join(','), onboarding: onboarding || '', extraWorkers: extraWorkers.toString(), billing },
    };

    if (hasRecurring) {
      sessionConfig.mode = 'subscription';
      sessionConfig.subscription_data = {
        trial_period_days: 14,
        metadata: { tier: tier || '', standalone: standalone || '', addons: addons.join(','), extraWorkers: extraWorkers.toString(), billing },
      };
    } else {
      sessionConfig.mode = 'payment';
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    return NextResponse.redirect(session.url, 303);

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session', details: error.message }, { status: 500 });
  }
}
