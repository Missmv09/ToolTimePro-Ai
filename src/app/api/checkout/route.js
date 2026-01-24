import Stripe from 'stripe';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      plan,
      billing,
      addOns,
      customerEmail,
      extraWorkers
    } = body;

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

    const lineItems = [];

    const planPrice = prices[plan]?.[billing];
    if (!planPrice) {
      return NextResponse.json(
        { error: 'Invalid plan or billing period' },
        { status: 400 }
      );
    }

    lineItems.push({
      price: planPrice,
      quantity: 1
    });

    const setupPrice = prices[plan]?.setup;
    if (setupPrice) {
      lineItems.push({
        price: setupPrice,
        quantity: 1
      });
    }

    if (addOns && Array.isArray(addOns)) {
      for (const addOn of addOns) {
        const addOnPrice = addOnPrices[addOn];
        if (addOnPrice) {
          lineItems.push({
            price: addOnPrice,
            quantity: 1
          });
        }
      }
    }

    if (extraWorkers && extraWorkers > 0) {
      lineItems.push({
        price: addOnPrices.extraWorker,
        quantity: extraWorkers
      });
    }

    const sessionConfig = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      metadata: {
        plan: plan,
        billing: billing,
        addOns: addOns ? addOns.join(',') : '',
        extraWorkers: extraWorkers || 0
      }
    };

    if (customerEmail) {
      sessionConfig.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
