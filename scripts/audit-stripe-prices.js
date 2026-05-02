#!/usr/bin/env node
/**
 * ToolTime Pro — Stripe Price Audit
 *
 * Reads every price ID from src/lib/stripe-prices.{live,test}.json, fetches
 * the matching Stripe price object, and prints the actual unit_amount and
 * recurring interval so you can compare against the homepage / pricing page
 * and spot the stale entries.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_xxx node scripts/audit-stripe-prices.js
 *   STRIPE_SECRET_KEY=sk_test_xxx node scripts/audit-stripe-prices.js
 */

const Stripe = require('stripe');
const path = require('path');

function fmt(cents) {
  if (cents == null) return 'n/a';
  return `$${(cents / 100).toFixed(2)}`;
}

async function auditPrice(stripe, slug, key, priceId) {
  try {
    const price = await stripe.prices.retrieve(priceId);
    const interval = price.recurring?.interval || 'one_time';
    const status = price.active ? 'active' : 'ARCHIVED';
    console.log(
      `  ${slug}.${key.padEnd(8)}  ${priceId}  ${fmt(price.unit_amount).padStart(8)}/${interval.padEnd(8)}  ${status}`
    );
  } catch (err) {
    console.log(`  ${slug}.${key.padEnd(8)}  ${priceId}  ERROR: ${err.message}`);
  }
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error('Error: STRIPE_SECRET_KEY environment variable is required.');
    process.exit(1);
  }

  const useTest =
    process.argv.includes('--test') || key.startsWith('sk_test_');
  const file = useTest
    ? '../src/lib/stripe-prices.test.json'
    : '../src/lib/stripe-prices.live.json';
  const prices = require(path.resolve(__dirname, file));
  const stripe = new Stripe(key);

  console.log(
    `\nAuditing ${useTest ? 'TEST' : 'LIVE'} prices from ${file}\n`
  );
  console.log('  slug.key      price_id                              amount/interval     status');
  console.log('  ─────────────────────────────────────────────────────────────────────────────');

  for (const [slug, entry] of Object.entries(prices)) {
    if (typeof entry === 'string') {
      await auditPrice(stripe, slug, 'one_time', entry);
    } else {
      for (const [k, priceId] of Object.entries(entry)) {
        await auditPrice(stripe, slug, k, priceId);
      }
    }
  }

  console.log('\nCompare each amount above to what your home page shows.');
  console.log('Any row whose amount is wrong → create a new Stripe price with the correct amount,');
  console.log('then update src/lib/stripe-prices.live.json with the new price_… ID.\n');
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
