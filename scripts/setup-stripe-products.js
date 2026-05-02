#!/usr/bin/env node
/**
 * ToolTime Pro — Stripe Product & Price Setup Script
 *
 * Creates all products and prices in your Stripe account, then outputs
 * the NEXT_PUBLIC_STRIPE_PRICES JSON env var ready to paste into Netlify.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_xxx node scripts/setup-stripe-products.js
 *
 * Options:
 *   --live     Use this flag when ready for production (reminds you to use sk_live key)
 *   --dry-run  Print what would be created without calling Stripe
 */

const Stripe = require('stripe');
const { PRODUCTS: SHARED_PRODUCTS } = require('./stripe-products');

const PRODUCTS = SHARED_PRODUCTS;

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const isLive = process.argv.includes('--live');

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key && !dryRun) {
    console.error('Error: STRIPE_SECRET_KEY environment variable is required.');
    console.error('Usage: STRIPE_SECRET_KEY=sk_test_xxx node scripts/setup-stripe-products.js');
    process.exit(1);
  }

  if (isLive && key && !key.startsWith('sk_live_')) {
    console.error('Error: --live flag used but key is not a live key. Use sk_live_xxx.');
    process.exit(1);
  }

  if (!dryRun && key && key.startsWith('sk_live_')) {
    console.log('\n⚠️  LIVE MODE — Creating real products in your Stripe account!\n');
  }

  const stripe = dryRun ? null : new Stripe(key);
  const result = {};

  console.log(`\n🛠  ToolTime Pro — Stripe Setup (${dryRun ? 'DRY RUN' : key.startsWith('sk_live_') ? 'LIVE' : 'TEST'})\n`);
  console.log(`Creating ${PRODUCTS.length} products...\n`);

  for (const product of PRODUCTS) {
    if (dryRun) {
      console.log(`  [DRY RUN] Would create: ${product.name}`);
      for (const price of product.prices) {
        const display = price.interval
          ? `$${(price.amount / 100).toFixed(2)}/${price.interval}`
          : `$${(price.amount / 100).toFixed(2)} one-time`;
        console.log(`    └─ ${price.key}: ${display}`);
      }

      // Build placeholder result
      if (product.prices.length === 1 && !product.prices[0].interval) {
        result[product.id] = 'price_placeholder';
      } else {
        result[product.id] = {};
        for (const price of product.prices) {
          result[product.id][price.key] = 'price_placeholder';
        }
      }
      continue;
    }

    // Create Stripe product
    const stripeProduct = await stripe.products.create({
      name: product.name,
      description: product.description,
      metadata: { tooltime_id: product.id },
    });
    console.log(`  ✓ ${product.name} (${stripeProduct.id})`);

    // Create prices for this product
    const priceIds = {};
    for (const price of product.prices) {
      const priceParams = {
        product: stripeProduct.id,
        currency: 'usd',
        unit_amount: price.amount,
        metadata: { tooltime_id: product.id, tooltime_key: price.key },
      };

      if (price.interval) {
        priceParams.recurring = { interval: price.interval };
      }

      const stripePrice = await stripe.prices.create(priceParams);
      priceIds[price.key] = stripePrice.id;

      const display = price.interval
        ? `$${(price.amount / 100).toFixed(2)}/${price.interval}`
        : `$${(price.amount / 100).toFixed(2)} one-time`;
      console.log(`    └─ ${price.key}: ${display} → ${stripePrice.id}`);
    }

    // Build result object matching PRICE_IDS shape
    if (product.prices.length === 1 && !product.prices[0].interval) {
      // One-time products: flat string
      result[product.id] = priceIds.one_time;
    } else {
      result[product.id] = priceIds;
    }
  }

  // Output the env var
  const json = JSON.stringify(result, null, 2);

  console.log('\n' + '═'.repeat(60));
  console.log('\n✅ Done! Set this as your NEXT_PUBLIC_STRIPE_PRICES env var:\n');
  console.log(json);
  console.log('\n' + '═'.repeat(60));
  console.log('\nPaste the JSON above into:');
  console.log('  • Netlify → Site settings → Environment variables → NEXT_PUBLIC_STRIPE_PRICES');
  console.log('  • .env.local for local development\n');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}

module.exports = { PRODUCTS };
