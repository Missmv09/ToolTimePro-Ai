import Stripe from 'stripe';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const body = await request.json();
    const { plan, billing, addOns, customerEmail, extraWorkers } = body;

    const prices = {
      starter: {
        monthly: process.env.NEXT_PUBLIC_PRICE_STARTER_MONTHLY,
        annual: process.env.NEXT_PUBLIC_PRICE_STARTER_ANNUAL,
        setup: null
      },
      pro: {
        monthly: process.env.NEXT_PUBLIC_PRICE_PRO_MONTHLY,
        annual: process.env.NEXT_PUBLIC_PRICE_PRO_ANNUAL,
        setup: process.env.NEXT_PUBLIC_PRICE_PRO_SETUP
      },
      elite: {
        monthly: process.env.NEXT_PUBLIC_PRICE_ELITE_MONTHLY,
        annual: process.env.NEXT_PUBLIC_PRICE_ELITE_ANNUAL,
        setup: process.env.NEXT_PUBLIC_PRICE_ELITE_SETUP
      }
    };

    const addOnPrices = {
      keepMeLegal: process.env.NEXT_PUBLIC_PRICE_KEEP_ME_LEGAL,
      aiChatbot: process.env.NEXT_PUBLIC_PRICE_AI_CHATBOT,
      extraPage: process.env.NEXT_PUBLIC_PRICE_EXTRA_PAGE,
      extraWorker: process.env.NEXT_PUBLIC_PRICE_EXTRA_WORKER
    };

    // Subscription items (these get the free trial)
    const subscriptionItems = [];

    // One-time items (charged immediately, no trial)
    const oneTimeItems = [];

    const planPrice = prices[plan]?.[billing];
    if (!planPrice) {
      return NextResponse.json({ error: 'Invalid plan or billing period' }, { status: 400 });
    }

    // Add base plan to subscription items
    subscriptionItems.push({ price: planPrice, quantity: 1 });

    // Add setup fee to one-time items (charged immediately)
    if (prices[plan]?.setup) {
      oneTimeItems.push({ price: prices[plan].setup, quantity: 1 });
    }

    // Add add-ons to subscription items
    if (addOns && Array.isArray(addOns)) {
      for (const addOn of addOns) {
        if (addOnPrices[addOn]) {
          subscriptionItems.push({ price: addOnPrices[addOn], quantity: 1 });
        }
      }
    }

    // Add extra workers to subscription items
    if (extraWorkers && extraWorkers > 0) {
      subscriptionItems.push({ price: addOnPrices.extraWorker, quantity: extraWorkers });
    }

    // If there's a setup fee, we need to handle it differently
    // Setup fee is charged immediately, subscription starts with trial
    if (oneTimeItems.length > 0) {
      // Create checkout with both one-time and subscription
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          ...subscriptionItems,
          ...oneTimeItems
        ],
        subscription_data: {
          trial_period_days: 14
        },
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        customer_email: customerEmail || undefined,
        metadata: {
          plan,
          billing,
          addOns: addOns ? addOns.join(',') : '',
          extraWorkers: extraWorkers || 0
        }
      });

      return NextResponse.json({ sessionId: session.id, url: session.url });
    }

    // No setup fee - just subscription with trial
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: subscriptionItems,
      subscription_data: {
        trial_period_days: 14
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_email: customerEmail || undefined,
      metadata: {
        plan,
        billing,
        addOns: addOns ? addOns.join(',') : '',
        extraWorkers: extraWorkers || 0
      }
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });

  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
