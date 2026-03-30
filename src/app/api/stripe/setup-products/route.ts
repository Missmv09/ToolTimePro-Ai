import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

const PRODUCTS = [
  { id: 'starter', name: 'ToolTime Pro — Starter', description: 'Owner + 2 workers. Website, booking, quoting, invoicing, GPS, Shield, Jenny Lite.', prices: [{ key: 'monthly', amount: 3000, interval: 'month' }, { key: 'annual', amount: 30000, interval: 'year' }] },
  { id: 'pro', name: 'ToolTime Pro — Pro', description: 'Up to 15 workers. Everything in Starter + Reviews, Jenny Lite, dispatch, QuickBooks.', prices: [{ key: 'monthly', amount: 5900, interval: 'month' }, { key: 'annual', amount: 59000, interval: 'year' }] },
  { id: 'elite', name: 'ToolTime Pro — Elite', description: 'Up to 20 workers. Everything in Pro + Jenny Pro, Dispatch, Routes, Portal Pro, QB.', prices: [{ key: 'monthly', amount: 9900, interval: 'month' }, { key: 'annual', amount: 99000, interval: 'year' }] },
  { id: 'booking_only', name: 'ToolTime Pro — Booking Only', description: 'Online booking page only.', prices: [{ key: 'monthly', amount: 1500, interval: 'month' }, { key: 'annual', amount: 15000, interval: 'year' }] },
  { id: 'invoicing_only', name: 'ToolTime Pro — Invoicing Only', description: 'Invoicing and card payments only.', prices: [{ key: 'monthly', amount: 1500, interval: 'month' }, { key: 'annual', amount: 15000, interval: 'year' }] },
  { id: 'jenny_lite', name: 'Jenny Lite — AI Chatbot', description: '24/7 chatbot. Lead capture, FAQ, booking. Bilingual. Included free with all plans.', prices: [{ key: 'monthly', amount: 1900, interval: 'month' }, { key: 'annual', amount: 19000, interval: 'year' }] },
  { id: 'jenny_pro', name: 'Jenny Pro — AI Phone Receptionist', description: 'AI phone 24/7, bilingual voice, SMS, booking, emergencies. Included with Elite.', prices: [{ key: 'monthly', amount: 4900, interval: 'month' }, { key: 'annual', amount: 49000, interval: 'year' }] },
  { id: 'jenny_exec_admin', name: 'Jenny Exec Admin — Business Intelligence', description: 'Compliance advisor, HR law monitoring, workforce analytics.', prices: [{ key: 'monthly', amount: 7900, interval: 'month' }, { key: 'annual', amount: 79000, interval: 'year' }] },
  { id: 'website_builder', name: 'Website Builder Add-on', description: 'Custom landing page built for your business.', prices: [{ key: 'monthly', amount: 1500, interval: 'month' }, { key: 'annual', amount: 15000, interval: 'year' }] },
  { id: 'keep_me_legal', name: 'Keep Me Legal Add-on', description: 'Compliance monitoring and alerts.', prices: [{ key: 'monthly', amount: 1900, interval: 'month' }, { key: 'annual', amount: 19000, interval: 'year' }] },
  { id: 'extra_page', name: 'Extra Website Page Add-on', description: 'Add pages to your site.', prices: [{ key: 'monthly', amount: 1000, interval: 'month' }, { key: 'annual', amount: 10000, interval: 'year' }] },
  { id: 'quickbooks_sync', name: 'QuickBooks Sync Add-on', description: 'Two-way sync with QuickBooks Online.', prices: [{ key: 'monthly', amount: 1200, interval: 'month' }, { key: 'annual', amount: 12000, interval: 'year' }] },
  { id: 'customer_portal_pro', name: 'Customer Portal Pro Add-on', description: 'Job tracker, photos, messaging, docs, history. Included with Elite.', prices: [{ key: 'monthly', amount: 2400, interval: 'month' }, { key: 'annual', amount: 24000, interval: 'year' }] },
  { id: 'extra_worker', name: 'Extra Worker/Technician', description: '$7/user/month beyond plan limit.', prices: [{ key: 'monthly', amount: 700, interval: 'month' }] },
  { id: 'assisted_onboarding', name: 'Assisted Onboarding', description: 'Guided setup, customer import, 30-min training.', prices: [{ key: 'one_time', amount: 14900 }] },
  { id: 'white_glove', name: 'White Glove Setup', description: 'Full done-for-you setup, website, training, 30-day support.', prices: [{ key: 'one_time', amount: 34900 }] },
];

// GET /api/stripe/setup-products → shows what exists vs what's missing
// POST /api/stripe/setup-products → creates missing products and prices
export async function GET() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 500 });
  }

  const stripe = new Stripe(key);

  // Fetch existing products by metadata
  const existing = {};
  let hasMore = true;
  let startingAfter = undefined;

  while (hasMore) {
    const list = await stripe.products.list({ limit: 100, starting_after: startingAfter });
    for (const prod of list.data) {
      const ttId = prod.metadata?.tooltime_id;
      if (ttId) {
        existing[ttId] = { id: prod.id, name: prod.name, active: prod.active };
      }
    }
    hasMore = list.has_more;
    if (list.data.length > 0) startingAfter = list.data[list.data.length - 1].id;
  }

  // Check existing prices
  const existingPrices = {};
  hasMore = true;
  startingAfter = undefined;

  while (hasMore) {
    const list = await stripe.prices.list({ limit: 100, active: true, starting_after: startingAfter });
    for (const price of list.data) {
      const ttId = price.metadata?.tooltime_id;
      const ttKey = price.metadata?.tooltime_key;
      if (ttId && ttKey) {
        if (!existingPrices[ttId]) existingPrices[ttId] = {};
        existingPrices[ttId][ttKey] = price.id;
      }
    }
    hasMore = list.has_more;
    if (list.data.length > 0) startingAfter = list.data[list.data.length - 1].id;
  }

  const status = PRODUCTS.map((p) => ({
    id: p.id,
    name: p.name,
    product_exists: !!existing[p.id],
    stripe_product_id: existing[p.id]?.id || null,
    prices: p.prices.map((pr) => ({
      key: pr.key,
      amount: `$${(pr.amount / 100).toFixed(2)}`,
      interval: pr.interval || 'one_time',
      exists: !!existingPrices[p.id]?.[pr.key],
      stripe_price_id: existingPrices[p.id]?.[pr.key] || null,
    })),
  }));

  const missing = status.filter((s) => !s.product_exists || s.prices.some((pr) => !pr.exists));
  const complete = status.filter((s) => s.product_exists && s.prices.every((pr) => pr.exists));

  // Build current NEXT_PUBLIC_STRIPE_PRICES JSON from what exists
  const currentPriceIds = {};
  for (const p of PRODUCTS) {
    if (p.prices.length === 1 && !p.prices[0].interval) {
      currentPriceIds[p.id] = existingPrices[p.id]?.one_time || null;
    } else {
      currentPriceIds[p.id] = {};
      for (const pr of p.prices) {
        currentPriceIds[p.id][pr.key] = existingPrices[p.id]?.[pr.key] || null;
      }
    }
  }

  return NextResponse.json({
    summary: `${complete.length}/${PRODUCTS.length} products fully set up`,
    missing_count: missing.length,
    complete,
    missing,
    current_env_var: currentPriceIds,
    instructions: missing.length > 0
      ? 'POST to this same URL to create the missing products and prices.'
      : 'All products exist! Copy current_env_var into NEXT_PUBLIC_STRIPE_PRICES.',
  });
}

export async function POST() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 500 });
  }

  const stripe = new Stripe(key);
  const created = [];
  const skipped = [];

  // Check what already exists
  const existingProducts = {};
  let hasMore = true;
  let startingAfter = undefined;

  while (hasMore) {
    const list = await stripe.products.list({ limit: 100, starting_after: startingAfter });
    for (const prod of list.data) {
      const ttId = prod.metadata?.tooltime_id;
      if (ttId) existingProducts[ttId] = prod.id;
    }
    hasMore = list.has_more;
    if (list.data.length > 0) startingAfter = list.data[list.data.length - 1].id;
  }

  const existingPrices = {};
  hasMore = true;
  startingAfter = undefined;

  while (hasMore) {
    const list = await stripe.prices.list({ limit: 100, active: true, starting_after: startingAfter });
    for (const price of list.data) {
      const ttId = price.metadata?.tooltime_id;
      const ttKey = price.metadata?.tooltime_key;
      if (ttId && ttKey) {
        if (!existingPrices[ttId]) existingPrices[ttId] = {};
        existingPrices[ttId][ttKey] = price.id;
      }
    }
    hasMore = list.has_more;
    if (list.data.length > 0) startingAfter = list.data[list.data.length - 1].id;
  }

  // Create missing products and prices
  const result = {};

  for (const product of PRODUCTS) {
    let productId = existingProducts[product.id];

    if (!productId) {
      const stripeProduct = await stripe.products.create({
        name: product.name,
        description: product.description,
        metadata: { tooltime_id: product.id },
      });
      productId = stripeProduct.id;
      created.push({ type: 'product', id: product.id, stripe_id: productId });
    } else {
      skipped.push({ type: 'product', id: product.id, stripe_id: productId, reason: 'already exists' });
    }

    const priceIds = existingPrices[product.id] || {};

    for (const price of product.prices) {
      if (priceIds[price.key]) {
        skipped.push({ type: 'price', id: `${product.id}.${price.key}`, stripe_id: priceIds[price.key], reason: 'already exists' });
        continue;
      }

      const priceParams = {
        product: productId,
        currency: 'usd',
        unit_amount: price.amount,
        metadata: { tooltime_id: product.id, tooltime_key: price.key },
      };
      if (price.interval) {
        priceParams.recurring = { interval: price.interval };
      }

      const stripePrice = await stripe.prices.create(priceParams);
      priceIds[price.key] = stripePrice.id;
      created.push({ type: 'price', id: `${product.id}.${price.key}`, stripe_id: stripePrice.id });
    }

    // Build result
    if (product.prices.length === 1 && !product.prices[0].interval) {
      result[product.id] = priceIds.one_time;
    } else {
      result[product.id] = {};
      for (const price of product.prices) {
        result[product.id][price.key] = priceIds[price.key];
      }
    }
  }

  return NextResponse.json({
    success: true,
    created_count: created.length,
    skipped_count: skipped.length,
    created,
    skipped,
    NEXT_PUBLIC_STRIPE_PRICES: result,
    instructions: 'Copy the NEXT_PUBLIC_STRIPE_PRICES value into your Netlify environment variables.',
  });
}
