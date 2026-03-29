const Stripe = require('stripe');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // Parse consolidated Stripe prices from single env var
  let allPrices = {};
  try {
    allPrices = JSON.parse(process.env.NEXT_PUBLIC_STRIPE_PRICES || '{}');
  } catch (e) {
    console.error('Failed to parse NEXT_PUBLIC_STRIPE_PRICES:', e);
  }

  try {
    const { plan, billing, addOns } = JSON.parse(event.body);

    const prices = {
      starter: allPrices.starter || {},
      pro: allPrices.pro || {},
      elite: allPrices.elite || {},
    };

    const addOnPrices = {
      keepMeLegal: allPrices.keep_me_legal?.monthly,
      jennyLite: allPrices.jenny_lite?.monthly,
      jennyPro: allPrices.jenny_pro?.monthly,
      jennyExecAdmin: allPrices.jenny_exec_admin?.monthly,
      extraPage: allPrices.extra_page?.monthly,
      extraWorker: allPrices.extra_worker?.monthly,
      websiteBuilder: allPrices.website_builder?.monthly,
      quickbooksSync: allPrices.quickbooks_sync?.monthly,
    };

    const lineItems = [];

    const planPrice = prices[plan]?.[billing];
    
    // Debug: return what we're seeing
    if (!planPrice) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ 
          error: 'Price ID not configured for this plan',
          debug: {
            plan,
            billing,
            planPrice,
            allPrices: prices
          }
        }) 
      };
    }

    lineItems.push({ price: planPrice, quantity: 1 });

    if (addOns && Array.isArray(addOns)) {
      for (const addOn of addOns) {
        if (addOnPrices[addOn]) {
          lineItems.push({ price: addOnPrices[addOn], quantity: 1 });
        }
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      subscription_data: {
        trial_period_days: 14
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/#pricing`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      metadata: {
        plan,
        billing,
        addOns: addOns ? addOns.join(',') : ''
      }
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url })
    };

  } catch (error) {
    console.error('Stripe checkout error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
