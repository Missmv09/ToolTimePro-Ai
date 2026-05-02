#!/usr/bin/env node
/**
 * ToolTime Pro — Stripe price sync.
 *
 * Compares the price IDs in src/lib/stripe-prices.{live,test}.json against
 * the canonical catalog in scripts/stripe-products.js and reports drift.
 *
 * Stripe Price objects are immutable, so amount drift is fixed by creating
 * a new Price (reusing the existing Product when its tooltime_id metadata
 * matches) and rewriting the JSON file with the new IDs. The old prices
 * stay in Stripe and should be archived manually so they aren't re-used.
 *
 * Modes:
 *   (default)   Audit only — read-only Stripe API calls, prints a drift
 *               report, exits 0 if clean, 1 if drift found.
 *   --write     Audit + create new prices for any drifted/missing entries
 *               and rewrite the JSON file. Prints a list of stale price IDs
 *               to archive in the Stripe dashboard.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_xxx node scripts/sync-stripe-prices.js
 *   STRIPE_SECRET_KEY=sk_live_xxx node scripts/sync-stripe-prices.js --write
 *   STRIPE_SECRET_KEY=sk_test_xxx node scripts/sync-stripe-prices.js --write
 *
 * The mode (live vs test) is inferred from the secret key prefix.
 */

const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');
const { PRODUCTS } = require('./stripe-products');

const LIVE_JSON = path.join(__dirname, '..', 'src', 'lib', 'stripe-prices.live.json');
const TEST_JSON = path.join(__dirname, '..', 'src', 'lib', 'stripe-prices.test.json');

function fmt(amount) {
  return `$${(amount / 100).toFixed(2)}`;
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function expectedPriceKeys(product) {
  return product.prices.map((p) => p.key);
}

function getStoredPriceId(stored, productId, key) {
  const entry = stored[productId];
  if (entry == null) return null;
  if (typeof entry === 'string') return key === 'one_time' ? entry : null;
  return entry[key] || null;
}

function setStoredPriceId(stored, product, key, newId) {
  if (product.prices.length === 1 && !product.prices[0].interval) {
    stored[product.id] = newId;
    return;
  }
  if (typeof stored[product.id] !== 'object' || stored[product.id] == null) {
    stored[product.id] = {};
  }
  stored[product.id][key] = newId;
}

async function fetchExistingProducts(stripe) {
  const byTooltimeId = {};
  let startingAfter;
  while (true) {
    const list = await stripe.products.list({ limit: 100, starting_after: startingAfter });
    for (const prod of list.data) {
      const ttId = prod.metadata?.tooltime_id;
      if (ttId && (!byTooltimeId[ttId] || prod.active)) {
        byTooltimeId[ttId] = prod;
      }
    }
    if (!list.has_more) break;
    startingAfter = list.data[list.data.length - 1].id;
  }
  return byTooltimeId;
}

async function ensureProduct(stripe, product, existing, writeMode) {
  if (existing[product.id]) return existing[product.id].id;
  if (!writeMode) return null;
  const created = await stripe.products.create({
    name: product.name,
    description: product.description,
    metadata: { tooltime_id: product.id },
  });
  console.log(`  + created product ${product.id} → ${created.id}`);
  existing[product.id] = created;
  return created.id;
}

async function createPrice(stripe, productId, product, price) {
  const params = {
    product: productId,
    currency: 'usd',
    unit_amount: price.amount,
    metadata: { tooltime_id: product.id, tooltime_key: price.key },
  };
  if (price.interval) params.recurring = { interval: price.interval };
  return stripe.prices.create(params);
}

async function main() {
  const writeMode = process.argv.includes('--write');
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error('Error: STRIPE_SECRET_KEY environment variable is required.');
    process.exit(1);
  }

  const isLive = key.startsWith('sk_live_');
  const isTest = key.startsWith('sk_test_');
  if (!isLive && !isTest) {
    console.error('Error: STRIPE_SECRET_KEY must start with sk_live_ or sk_test_.');
    process.exit(1);
  }

  const jsonFile = isLive ? LIVE_JSON : TEST_JSON;
  const mode = isLive ? 'LIVE' : 'TEST';
  const stored = loadJson(jsonFile);
  const stripe = new Stripe(key);

  console.log(`\nToolTime Pro — Stripe price sync (${mode}, ${writeMode ? 'WRITE' : 'AUDIT'})`);
  console.log(`Reading: ${path.relative(process.cwd(), jsonFile)}\n`);

  const existingProducts = await fetchExistingProducts(stripe);

  const drift = []; // { productId, key, expectedAmount, actualAmount, oldId }
  const missing = []; // { productId, key, expectedAmount }
  const stale = []; // { productId, key, oldId, reason }
  const updated = JSON.parse(JSON.stringify(stored));
  let createdCount = 0;

  for (const product of PRODUCTS) {
    for (const price of product.prices) {
      const storedId = getStoredPriceId(stored, product.id, price.key);

      if (!storedId) {
        missing.push({ productId: product.id, key: price.key, expectedAmount: price.amount });
        if (writeMode) {
          const productStripeId = await ensureProduct(stripe, product, existingProducts, true);
          const created = await createPrice(stripe, productStripeId, product, price);
          setStoredPriceId(updated, product, price.key, created.id);
          console.log(`  + created price ${product.id}.${price.key} ${fmt(price.amount)} → ${created.id}`);
          createdCount += 1;
        }
        continue;
      }

      let stripePrice;
      try {
        stripePrice = await stripe.prices.retrieve(storedId);
      } catch (err) {
        console.warn(`  ! could not fetch ${product.id}.${price.key} (${storedId}): ${err.message}`);
        missing.push({ productId: product.id, key: price.key, expectedAmount: price.amount });
        stale.push({ productId: product.id, key: price.key, oldId: storedId, reason: 'unfetchable' });
        if (writeMode) {
          const productStripeId = await ensureProduct(stripe, product, existingProducts, true);
          const created = await createPrice(stripe, productStripeId, product, price);
          setStoredPriceId(updated, product, price.key, created.id);
          console.log(`  + replaced ${product.id}.${price.key} → ${created.id}`);
          createdCount += 1;
        }
        continue;
      }

      const actualAmount = stripePrice.unit_amount;
      if (actualAmount !== price.amount) {
        drift.push({
          productId: product.id,
          key: price.key,
          expectedAmount: price.amount,
          actualAmount,
          oldId: storedId,
        });
        stale.push({ productId: product.id, key: price.key, oldId: storedId, reason: 'amount drift' });

        if (writeMode) {
          const productStripeId = stripePrice.product
            ? (typeof stripePrice.product === 'string' ? stripePrice.product : stripePrice.product.id)
            : await ensureProduct(stripe, product, existingProducts, true);
          const created = await createPrice(stripe, productStripeId, product, price);
          setStoredPriceId(updated, product, price.key, created.id);
          console.log(
            `  ~ ${product.id}.${price.key} ${fmt(actualAmount)} → ${fmt(price.amount)} (new ${created.id})`,
          );
          createdCount += 1;
        }
      }
    }
  }

  // Report
  console.log('\n— Drift report —');
  if (drift.length === 0 && missing.length === 0) {
    console.log('  ✓ All price IDs match the catalog. Nothing to do.');
  } else {
    if (drift.length > 0) {
      console.log(`  Drifted (${drift.length}):`);
      for (const d of drift) {
        console.log(
          `    - ${d.productId}.${d.key}: Stripe has ${fmt(d.actualAmount)}, catalog wants ${fmt(d.expectedAmount)} (was ${d.oldId})`,
        );
      }
    }
    if (missing.length > 0) {
      console.log(`  Missing in JSON (${missing.length}):`);
      for (const m of missing) {
        console.log(`    - ${m.productId}.${m.key}: expected ${fmt(m.expectedAmount)}`);
      }
    }
  }

  if (writeMode && createdCount > 0) {
    fs.writeFileSync(jsonFile, JSON.stringify(updated) + '\n');
    console.log(`\n  → wrote ${createdCount} new price ID(s) to ${path.relative(process.cwd(), jsonFile)}`);
  }

  if (stale.length > 0) {
    console.log('\n— Archive these in the Stripe dashboard —');
    for (const s of stale) {
      console.log(`    ${s.oldId}  (${s.productId}.${s.key}, ${s.reason})`);
    }
  }

  const dirty = drift.length > 0 || missing.length > 0;
  if (!writeMode && dirty) {
    console.log('\nRun again with --write to create the corrected prices.');
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
