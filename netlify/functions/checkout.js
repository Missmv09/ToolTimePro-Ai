// Netlify Function for Stripe Checkout with 14-day trial
// Handles subscription checkout for different plans and add-ons

const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Price IDs from environment variables
const PRICES = {
  starter: {
    monthly: process.env.PRICE_STARTER_MONTHLY,
    annual: process.env.PRICE_STARTER_ANNUAL,
    setup: null
  },
  pro: {
    monthly: process.env.PRICE_PRO_MONTHLY,
    annual: process.env.PRICE_PRO_ANNUAL,
    setup: process.env.PRICE_PRO_SETUP
  },
  elite: {
    monthly: process.env.PRICE_ELITE_MONTHLY,
    annual: process.env.PRICE_ELITE_ANNUAL,
    setup: process.env.PRICE_ELITE_SETUP
  }
};

const ADD_ON_PRICES = {
  keepMeLegal: process.env.PRICE_KEEP_ME_LEGAL,
  aiChatbot: process.env.PRICE_AI_CHATBOT,
  extraPage: process.env.PRICE_EXTRA_PAGE,
  extraWorker: process.env.PRICE_EXTRA_WORKER
};

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { plan, billing, addOns, customerEmail, extraWorkers } = body;

    // Validate required fields
    if (!plan || !billing) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: plan and billing are required' })
      };
    }

    // Validate plan
    if (!PRICES[plan]) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Invalid plan: ${plan}. Must be one of: starter, pro, elite` })
      };
    }

    // Validate billing period
    if (!['monthly', 'annual'].includes(billing)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid billing period. Must be monthly or annual' })
      };
    }

    // Build line items
    const lineItems = [];

    // Add main plan subscription
    const planPrice = PRICES[plan][billing];
    if (!planPrice) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Price ID not configured for this plan' })
      };
    }

    lineItems.push({
      price: planPrice,
      quantity: 1
    });

    // Add setup fee if applicable (one-time charge, not included in trial)
    const setupPrice = PRICES[plan].setup;
    if (setupPrice) {
      lineItems.push({
        price: setupPrice,
        quantity: 1
      });
    }

    // Add selected add-ons
    if (addOns && Array.isArray(addOns)) {
      for (const addOn of addOns) {
        const addOnPrice = ADD_ON_PRICES[addOn];
        if (addOnPrice) {
          lineItems.push({
            price: addOnPrice,
            quantity: 1
          });
        }
      }
    }

    // Add extra workers if specified
    if (extraWorkers && extraWorkers > 0 && ADD_ON_PRICES.extraWorker) {
      lineItems.push({
        price: ADD_ON_PRICES.extraWorker,
        quantity: extraWorkers
      });
    }

    // Get site URL for redirects
    const siteUrl = process.env.URL || process.env.SITE_URL || 'http://localhost:8888';

    // Create Stripe checkout session with 14-day trial
    const sessionConfig = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          plan: plan,
          billing: billing,
          addOns: addOns ? addOns.join(',') : '',
          extraWorkers: String(extraWorkers || 0)
        }
      },
      metadata: {
        plan: plan,
        billing: billing,
        addOns: addOns ? addOns.join(',') : '',
        extraWorkers: String(extraWorkers || 0)
      }
    };

    // Add customer email if provided
    if (customerEmail) {
      sessionConfig.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sessionId: session.id,
        url: session.url
      })
    };

  } catch (error) {
    console.error('Stripe checkout error:', error);

    // Handle Stripe-specific errors
    if (error.type === 'StripeCardError') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    if (error.type === 'StripeInvalidRequestError') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid request to payment processor' })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to create checkout session' })
    };
  }
};
