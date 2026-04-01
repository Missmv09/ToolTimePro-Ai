const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

/**
 * Stripe Price Management — Admin-only Netlify Function
 *
 * Actions:
 *   list_products   — List all ToolTime products and prices from Stripe
 *   create_product  — Create a new Stripe product with prices
 *   update_product  — Update product name/description/active status
 *   create_price    — Create a new price for an existing product
 *   update_price    — Deactivate old price and create replacement
 */

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function verifyAdmin(supabase, token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  // Check platform_admins table (service-role only)
  const { data: admin } = await supabase
    .from('platform_admins')
    .select('id, role')
    .eq('user_id', user.id)
    .single();

  if (!admin) return null;

  return { userId: user.id, email: user.email, adminRole: admin.role };
}

async function auditLog(supabase, { admin, action, target_type, target_id, details }) {
  try {
    await supabase.from('stripe_audit_logs').insert({
      admin_user_id: admin.userId,
      admin_email: admin.email,
      action,
      target_type,
      target_id: target_id || null,
      details: details || {},
    });
  } catch (err) {
    // Never let audit logging failure block the operation
    console.error('[stripe-price-management] Audit log write failed:', err);
  }
}

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // --- Auth ---
  const authHeader = event.headers.authorization || event.headers.Authorization;
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing authorization token' }) };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  const admin = await verifyAdmin(supabase, token);
  if (!admin) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden — platform admin access required' }) };
  }

  // --- Stripe init ---
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'STRIPE_SECRET_KEY not configured' }) };
  }
  const stripe = new Stripe(stripeKey);

  // --- Parse body ---
  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { action } = body;

  try {
    switch (action) {
      case 'list_products':
        return await handleListProducts(stripe);

      case 'create_product':
        return await handleCreateProduct(stripe, supabase, admin, body);

      case 'update_product':
        return await handleUpdateProduct(stripe, supabase, admin, body);

      case 'create_price':
        return await handleCreatePrice(stripe, supabase, admin, body);

      case 'update_price':
        return await handleUpdatePrice(stripe, supabase, admin, body);

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid action',
            valid_actions: ['list_products', 'create_product', 'update_product', 'create_price', 'update_price'],
          }),
        };
    }
  } catch (err) {
    console.error('[stripe-price-management] Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

// ─── Action handlers ────────────────────────────────────────────────────────

async function handleListProducts(stripe) {
  const products = [];
  let hasMore = true;
  let startingAfter;

  while (hasMore) {
    const list = await stripe.products.list({
      limit: 100,
      ...(startingAfter && { starting_after: startingAfter }),
    });
    for (const prod of list.data) {
      if (prod.metadata?.tooltime_id) {
        products.push({
          stripe_id: prod.id,
          tooltime_id: prod.metadata.tooltime_id,
          name: prod.name,
          description: prod.description,
          active: prod.active,
        });
      }
    }
    hasMore = list.has_more;
    if (list.data.length > 0) startingAfter = list.data[list.data.length - 1].id;
  }

  // Fetch prices for each product
  const prices = [];
  hasMore = true;
  startingAfter = undefined;

  while (hasMore) {
    const list = await stripe.prices.list({
      limit: 100,
      ...(startingAfter && { starting_after: startingAfter }),
    });
    for (const price of list.data) {
      if (price.metadata?.tooltime_id) {
        prices.push({
          stripe_id: price.id,
          tooltime_id: price.metadata.tooltime_id,
          tooltime_key: price.metadata.tooltime_key,
          product_id: price.product,
          active: price.active,
          unit_amount: price.unit_amount,
          currency: price.currency,
          recurring: price.recurring
            ? { interval: price.recurring.interval, interval_count: price.recurring.interval_count }
            : null,
        });
      }
    }
    hasMore = list.has_more;
    if (list.data.length > 0) startingAfter = list.data[list.data.length - 1].id;
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ products, prices }),
  };
}

async function handleCreateProduct(stripe, supabase, admin, body) {
  const { tooltime_id, name, description, prices: priceDefs } = body;

  if (!tooltime_id || !name || !priceDefs || !Array.isArray(priceDefs) || priceDefs.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Required: tooltime_id, name, prices (array of { key, amount_cents, interval? })' }),
    };
  }

  // Check for duplicate tooltime_id
  const existing = await stripe.products.search({ query: `metadata["tooltime_id"]:"${tooltime_id}"` });
  if (existing.data.length > 0) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({ error: `Product with tooltime_id "${tooltime_id}" already exists`, stripe_id: existing.data[0].id }),
    };
  }

  const product = await stripe.products.create({
    name,
    description: description || '',
    metadata: { tooltime_id },
  });

  const createdPrices = [];
  for (const priceDef of priceDefs) {
    if (!priceDef.key || !priceDef.amount_cents) {
      continue;
    }
    const priceParams = {
      product: product.id,
      currency: 'usd',
      unit_amount: priceDef.amount_cents,
      metadata: { tooltime_id, tooltime_key: priceDef.key },
    };
    if (priceDef.interval) {
      priceParams.recurring = { interval: priceDef.interval };
    }
    const price = await stripe.prices.create(priceParams);
    createdPrices.push({ key: priceDef.key, stripe_id: price.id, amount_cents: priceDef.amount_cents });
  }

  await auditLog(supabase, {
    admin,
    action: 'create_product',
    target_type: 'product',
    target_id: product.id,
    details: { tooltime_id, name, prices_created: createdPrices.length },
  });

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({ product_id: product.id, tooltime_id, prices: createdPrices }),
  };
}

async function handleUpdateProduct(stripe, supabase, admin, body) {
  const { product_id, name, description, active } = body;

  if (!product_id) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Required: product_id' }) };
  }

  const updateParams = {};
  if (name !== undefined) updateParams.name = name;
  if (description !== undefined) updateParams.description = description;
  if (active !== undefined) updateParams.active = active;

  if (Object.keys(updateParams).length === 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'No fields to update (name, description, active)' }) };
  }

  const product = await stripe.products.update(product_id, updateParams);

  await auditLog(supabase, {
    admin,
    action: 'update_product',
    target_type: 'product',
    target_id: product_id,
    details: { fields_updated: Object.keys(updateParams), new_values: updateParams },
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      product_id: product.id,
      name: product.name,
      description: product.description,
      active: product.active,
    }),
  };
}

async function handleCreatePrice(stripe, supabase, admin, body) {
  const { product_id, tooltime_id, key, amount_cents, interval } = body;

  if (!product_id || !tooltime_id || !key || !amount_cents) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Required: product_id, tooltime_id, key, amount_cents. Optional: interval (month|year)' }),
    };
  }

  const priceParams = {
    product: product_id,
    currency: 'usd',
    unit_amount: amount_cents,
    metadata: { tooltime_id, tooltime_key: key },
  };
  if (interval) {
    priceParams.recurring = { interval };
  }

  const price = await stripe.prices.create(priceParams);

  await auditLog(supabase, {
    admin,
    action: 'create_price',
    target_type: 'price',
    target_id: price.id,
    details: { product_id, tooltime_id, key, amount_cents, interval: interval || 'one_time' },
  });

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({ price_id: price.id, product_id, amount_cents, key }),
  };
}

async function handleUpdatePrice(stripe, supabase, admin, body) {
  const { old_price_id, product_id, tooltime_id, key, new_amount_cents, interval } = body;

  if (!old_price_id || !product_id || !tooltime_id || !key || !new_amount_cents) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Required: old_price_id, product_id, tooltime_id, key, new_amount_cents. Optional: interval (month|year)',
      }),
    };
  }

  // Stripe prices are immutable — deactivate old, create new
  await stripe.prices.update(old_price_id, { active: false });

  const priceParams = {
    product: product_id,
    currency: 'usd',
    unit_amount: new_amount_cents,
    metadata: { tooltime_id, tooltime_key: key },
  };
  if (interval) {
    priceParams.recurring = { interval };
  }

  const newPrice = await stripe.prices.create(priceParams);

  await auditLog(supabase, {
    admin,
    action: 'update_price',
    target_type: 'price',
    target_id: newPrice.id,
    details: {
      old_price_id,
      new_price_id: newPrice.id,
      product_id,
      tooltime_id,
      key,
      new_amount_cents,
      interval: interval || 'one_time',
    },
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      old_price_id,
      new_price_id: newPrice.id,
      product_id,
      amount_cents: new_amount_cents,
      key,
    }),
  };
}
