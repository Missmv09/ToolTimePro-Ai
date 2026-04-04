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

const PRODUCTS = [
  // === Core Plans ===
  {
    id: 'starter',
    name: 'ToolTime Pro — Starter',
    description: 'Owner + 2 workers. Website, booking, quoting, invoicing, GPS clock-in, ToolTime Shield, Jenny Lite included.',
    prices: [
      { key: 'monthly', amount: 4900, interval: 'month' },
      { key: 'annual', amount: 49000, interval: 'year' },
    ],
  },
  {
    id: 'pro',
    name: 'ToolTime Pro — Pro',
    description: 'Up to 15 workers. Everything in Starter + Review Machine, Jenny Lite, dispatch, QuickBooks sync, break tracking.',
    prices: [
      { key: 'monthly', amount: 7900, interval: 'month' },
      { key: 'annual', amount: 79000, interval: 'year' },
    ],
  },
  {
    id: 'elite',
    name: 'ToolTime Pro — Elite',
    description: 'Unlimited workers. Everything in Pro + Jenny Pro, Dispatch, Route Optimization, Customer Portal Pro, QuickBooks included.',
    prices: [
      { key: 'monthly', amount: 12900, interval: 'month' },
      { key: 'annual', amount: 129000, interval: 'year' },
    ],
  },

  // === Standalone Plans ===
  {
    id: 'booking_only',
    name: 'ToolTime Pro — Booking Only',
    description: 'Online booking page only. For businesses that just need scheduling.',
    prices: [
      { key: 'monthly', amount: 1500, interval: 'month' },
      { key: 'annual', amount: 15000, interval: 'year' },
    ],
  },
  {
    id: 'invoicing_only',
    name: 'ToolTime Pro — Invoicing Only',
    description: 'Invoicing and card payments only. For businesses that just need to get paid.',
    prices: [
      { key: 'monthly', amount: 1500, interval: 'month' },
      { key: 'annual', amount: 15000, interval: 'year' },
    ],
  },

  // === Jenny AI Tiers ===
  {
    id: 'jenny_lite',
    name: 'Jenny Lite — ToolTime Assistant',
    description: '24/7 website chatbot. Lead capture, FAQ answering, appointment booking. Bilingual English/Spanish. Included free with all plans.',
    prices: [
      { key: 'monthly', amount: 1900, interval: 'month' },
      { key: 'annual', amount: 19000, interval: 'year' },
    ],
  },
  {
    id: 'jenny_pro',
    name: 'Jenny Pro — AI Phone Receptionist',
    description: 'AI phone answering 24/7 with bilingual voice. SMS messaging, direct booking, emergency escalation. Included with Elite.',
    prices: [
      { key: 'monthly', amount: 4900, interval: 'month' },
      { key: 'annual', amount: 49000, interval: 'year' },
    ],
  },
  {
    id: 'jenny_exec_admin',
    name: 'Jenny Exec Admin — Business Intelligence',
    description: 'Compliance advisor, HR law monitoring, workforce analytics, proactive business insights.',
    prices: [
      { key: 'monthly', amount: 7900, interval: 'month' },
      { key: 'annual', amount: 79000, interval: 'year' },
    ],
  },

  // === Add-ons ===
  {
    id: 'website_builder',
    name: 'Website Builder Add-on',
    description: 'Custom landing page built for your business.',
    prices: [
      { key: 'monthly', amount: 2500, interval: 'month' },
      { key: 'annual', amount: 25000, interval: 'year' },
    ],
  },
  {
    id: 'keep_me_legal',
    name: 'Compliance Autopilot Add-on',
    description: 'Automated compliance monitoring, law-change alerts, and cert renewal reminders.',
    prices: [
      { key: 'monthly', amount: 2900, interval: 'month' },
      { key: 'annual', amount: 29000, interval: 'year' },
    ],
  },
  {
    id: 'extra_page',
    name: 'Extra Website Page Add-on',
    description: 'Add additional pages to your ToolTime Pro website.',
    prices: [
      { key: 'monthly', amount: 1000, interval: 'month' },
      { key: 'annual', amount: 10000, interval: 'year' },
    ],
  },
  {
    id: 'quickbooks_sync',
    name: 'QuickBooks Sync Add-on',
    description: 'Two-way sync with QuickBooks Online. Invoices, payments, and customers auto-sync.',
    prices: [
      { key: 'monthly', amount: 1200, interval: 'month' },
      { key: 'annual', amount: 12000, interval: 'year' },
    ],
  },
  {
    id: 'customer_portal_pro',
    name: 'Customer Portal Pro Add-on',
    description: 'Branded customer portal: job tracker, photo gallery, messaging, document vault, service history. Included with Elite.',
    prices: [
      { key: 'monthly', amount: 2400, interval: 'month' },
      { key: 'annual', amount: 24000, interval: 'year' },
    ],
  },
  {
    id: 'extra_worker',
    name: 'Extra Worker/Technician',
    description: 'Add additional workers beyond your plan limit. $7/user/month.',
    prices: [
      { key: 'monthly', amount: 700, interval: 'month' },
    ],
  },

  // === One-time Setup Services ===
  {
    id: 'assisted_onboarding',
    name: 'Assisted Onboarding',
    description: 'Guided setup with our team. Account setup, customer import, 30-minute training call.',
    prices: [
      { key: 'one_time', amount: 19900 },
    ],
  },
  {
    id: 'white_glove',
    name: 'White Glove Setup',
    description: 'Full done-for-you setup. Website design, data import, 1-hour training, 30-day priority support.',
    prices: [
      { key: 'one_time', amount: 49900 },
    ],
  },
];

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

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
