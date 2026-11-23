/**
 * Guards the /compare pages against drifting from the product.
 *
 * They drifted once already. Task Iguana's side of every comparison was typed
 * by hand, so the pages advertised the customer portal, QuickBooks sync and
 * route optimization on "All plans" while plan-features.ts gated them to Elite
 * or a paid add-on, listed Elite as 20 users when it is unlimited, and showed
 * yearly costs ($360 / $780 / $1,440) that matched no plan on sale.
 *
 * Those values are now derived (src/lib/compare-pricing.ts). These tests keep
 * it that way: a new comparison row has to say where its availability comes
 * from, and any hand-typed price has to be a price that exists.
 *
 * The competitor's side is NOT checked here; that needs a person reading
 * their site, and is refreshed by a scheduled review instead.
 */

import { COMPETITORS } from '@/lib/competitor-data';
import {
  MAIN_TIERS,
  availability,
  planLabel,
  savingsRange,
  schedulingLabel,
  tiersWithFeature,
  yearlyCost,
} from '@/lib/compare-pricing';
import {
  ADDON_MONTHLY_PRICE,
  PLAN_MONTHLY_PRICE,
  PLAN_WORKER_LIMITS,
} from '@/lib/plan-features';

const { PRODUCTS } = require('../../../scripts/stripe-products');

/**
 * Where each comparison row's Task Iguana label comes from.
 *  - a FeatureKey: the label must contain availability(<key>)
 *  - 'scheduling': the label must equal schedulingLabel()
 *  - 'ungated':    the app does not plan-gate it, so the label is free text
 *  - 'manual':     a claim about the business (contracts, pricing policy)
 *
 * Adding a row to competitor-data.ts without adding it here fails the suite
 * on purpose: decide which of the four it is before it goes live.
 */
const ROW_SOURCES = {
  'Scheduling & Dispatch': 'scheduling',
  'Invoicing & Payments': 'invoicing',
  'Online Booking': 'booking',
  'Quoting / Estimates': 'quoting',
  'Estimates / Proposals': 'quoting',
  'CRM / Client Management': 'customers',
  'Lead Management': 'leads',
  'SMS Notifications': 'sms_notifications',
  'Automated Review Requests': 'reviews',
  'Worker Mobile App': 'worker_app',
  'Offline Mode (PWA)': 'worker_app',
  'Customer Portal': 'customer_portal',
  'QuickBooks Integration': 'quickbooks_sync',
  'Route Optimization': 'route_optimizer',

  'AI Smart Quoting': 'ungated',
  'Jenny AI (Autonomous Actions)': 'ungated',
  'Automated Follow-Ups': 'ungated',
  'Blended Workforce (W-2 + 1099)': 'ungated',
  'Material Estimator (21 trades)': 'ungated',
  '21 Trade Categories': 'ungated',
  'Flat-Rate Pricing Book': 'ungated',
  'Bilingual (English/Spanish)': 'ungated',

  'Compliance Tools (Shield)': 'manual',
  'Multi-State Compliance': 'manual',
  'Business Phone / Call Answering': 'manual',
  'Unlimited Users': 'manual',
  'No Contracts': 'manual',
  'Transparent Pricing': 'manual',
  'Same-Day Setup': 'manual',
};

const competitors = Object.values(COMPETITORS);
const monthly = (id) => PRODUCTS.find((p) => p.id === id)?.prices.find((x) => x.key === 'monthly');

describe('list prices match what Stripe charges', () => {
  it.each(Object.entries(PLAN_MONTHLY_PRICE))('plan %s', (id, dollars) => {
    expect(monthly(id)?.amount).toBe(dollars * 100);
  });

  it.each(Object.entries(ADDON_MONTHLY_PRICE))('add-on %s', (id, dollars) => {
    expect(monthly(id)?.amount).toBe(dollars * 100);
  });
});

describe('availability labels follow plan-features', () => {
  it('says "All plans" only for a feature in every main tier', () => {
    expect(tiersWithFeature('booking')).toEqual(MAIN_TIERS);
    expect(availability('booking')).toBe('All plans');

    for (const key of Object.values(ROW_SOURCES)) {
      if (['scheduling', 'ungated', 'manual'].includes(key)) continue;
      const everywhere = tiersWithFeature(key).length === MAIN_TIERS.length;
      expect([key, availability(key) === 'All plans']).toEqual([key, everywhere]);
    }
  });

  it('prints the seat limit the app enforces', () => {
    for (const tier of MAIN_TIERS) {
      const seats = PLAN_WORKER_LIMITS[tier];
      expect(planLabel(tier)).toContain(seats === Infinity ? 'unlimited users' : `${seats} users`);
      expect(planLabel(tier)).toContain(`$${PLAN_MONTHLY_PRICE[tier]}/mo`);
    }
  });
});

describe.each(competitors)('compare page: $name', (data) => {
  it('every feature row declares where its Task Iguana label comes from', () => {
    const unknown = data.features.map((f) => f.name).filter((name) => !(name in ROW_SOURCES));
    expect(unknown).toEqual([]);
  });

  it('plan-gated rows show the availability the app enforces', () => {
    for (const row of data.features) {
      const source = ROW_SOURCES[row.name];
      if (source === 'ungated' || source === 'manual') continue;
      const expected = source === 'scheduling' ? schedulingLabel() : availability(source);
      expect(`${row.name}: ${row.tooltime}`).toContain(expected);
    }
  });

  it('quotes only prices that are on sale', () => {
    const onSale = new Set([
      ...Object.values(PLAN_MONTHLY_PRICE),
      ...Object.values(ADDON_MONTHLY_PRICE),
    ]);
    const quoted = [...data.plans.map((p) => p.tooltime), ...data.features.map((f) => f.tooltime)]
      .flatMap((text) => [...text.matchAll(/\$(\d+)/g)].map((m) => Number(m[1])));
    expect(quoted.filter((n) => !onSale.has(n))).toEqual([]);

    // "$129/mo (20 users)" has a valid price and a wrong seat count: a plan
    // label must be exactly what planLabel() prints for that tier.
    for (const { tooltime } of data.plans) {
      const match = tooltime.match(/^\$(\d+)\/mo \(/);
      if (!match) continue;
      const tier = MAIN_TIERS.find((t) => PLAN_MONTHLY_PRICE[t] === Number(match[1]));
      expect(tooltime).toBe(tier ? planLabel(tier) : 'a main plan price');
    }

    // Prose such as "$49/mo starter, $79/mo pro, $129/mo elite".
    const prose = JSON.stringify([data.switchReasons, data.faqs, data.painPoints]);
    for (const [, dollars, tier] of prose.matchAll(/\$(\d+)\/mo (starter|pro|elite)\b/gi)) {
      expect(`${tier} $${dollars}`).toBe(`${tier} $${PLAN_MONTHLY_PRICE[tier.toLowerCase()]}`);
    }
  });

  it('cost examples are a real plan for a year, and the savings banner matches them', () => {
    const yearly = MAIN_TIERS.map(yearlyCost);
    for (const example of data.costExamples) {
      expect(yearly).toContain(example.tooltime);
    }
    expect(data.savingsRange).toBe(savingsRange(data.costExamples));
  });

  it('lastVerified, when set, is a past or current YYYY-MM', () => {
    if (data.lastVerified === undefined) return;
    expect(data.lastVerified).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    expect(data.lastVerified <= new Date().toISOString().slice(0, 7)).toBe(true);
  });
});
