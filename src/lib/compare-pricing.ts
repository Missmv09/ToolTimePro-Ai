// Task Iguana's side of the /compare pages, derived from plan-features.ts.
//
// The comparison data used to retype prices, seat limits and "All plans"
// labels by hand, and they drifted: features gated to Elite were advertised on
// every plan and cost examples matched no plan at all. Everything here is
// computed, so a pricing or gating change reaches the compare pages without
// an edit.

import {
  ADDON_FEATURE_MAP,
  ADDON_MONTHLY_PRICE,
  PLAN_MONTHLY_PRICE,
  PLAN_WORKER_LIMITS,
  getPlanFeatures,
  type FeatureKey,
} from './plan-features';

export type MainTier = 'starter' | 'pro' | 'elite';
export const MAIN_TIERS: MainTier[] = ['starter', 'pro', 'elite'];

const TIER_NAMES: Record<MainTier, string> = { starter: 'Starter', pro: 'Pro', elite: 'Elite' };

const usd = (n: number) => `$${n.toLocaleString('en-US')}`;

/** e.g. "$79/mo (15 users)", "$129/mo (unlimited users)" */
export function planLabel(tier: MainTier): string {
  const seats = PLAN_WORKER_LIMITS[tier];
  const users = seats === Infinity ? 'unlimited users' : `${seats} users`;
  return `${usd(PLAN_MONTHLY_PRICE[tier])}/mo (${users})`;
}

/** List price for a year of the plan, billed monthly. */
export function yearlyCost(tier: MainTier): number {
  return PLAN_MONTHLY_PRICE[tier] * 12;
}

/** e.g. "$49/mo" */
export function addonPrice(addonId: string): string {
  const price = ADDON_MONTHLY_PRICE[addonId];
  if (price == null) throw new Error(`No list price for add-on "${addonId}"`);
  return `${usd(price)}/mo`;
}

export const EXTRA_USER_LABEL = `${usd(ADDON_MONTHLY_PRICE.extra_worker)}/user/mo`;

/** Main tiers whose plan includes the feature, cheapest first. */
export function tiersWithFeature(feature: FeatureKey): MainTier[] {
  return MAIN_TIERS.filter((tier) => getPlanFeatures(tier).has(feature));
}

/**
 * Where a feature is available, as shown in a comparison row:
 * "All plans", "Pro and Elite", "Elite plan", "Elite, or $24/mo add-on",
 * "$12/mo add-on".
 */
export function availability(feature: FeatureKey): string {
  const tiers = tiersWithFeature(feature);
  if (tiers.length === MAIN_TIERS.length) return 'All plans';

  const addonId = Object.keys(ADDON_FEATURE_MAP).find(
    (id) => ADDON_FEATURE_MAP[id] === feature && ADDON_MONTHLY_PRICE[id] != null
  );
  const names = tiers.map((tier) => TIER_NAMES[tier]);

  if (names.length === 0) {
    if (!addonId) throw new Error(`Feature "${feature}" is in no plan and no priced add-on`);
    return `${addonPrice(addonId)} add-on`;
  }
  if (addonId) return `${names.join(' and ')}, or ${addonPrice(addonId)} add-on`;
  return names.length === 1 ? `${names[0]} plan` : names.join(' and ');
}

/** "All plans (dispatch board on Elite)": scheduling vs the gated dispatch board. */
export function schedulingLabel(): string {
  const schedule = availability('schedule');
  const dispatch = tiersWithFeature('dispatch_board');
  if (dispatch.length === 0 || dispatch.length === MAIN_TIERS.length) return schedule;
  const suffix = dispatch.length > 1 ? '+' : '';
  return `${schedule} (dispatch board on ${TIER_NAMES[dispatch[0]]}${suffix})`;
}

/** e.g. "$480-$2,040/year", from the scenarios where Task Iguana is cheaper. */
export function savingsRange(examples: { tooltime: number; competitor: number }[]): string {
  const savings = examples.map((e) => e.competitor - e.tooltime).filter((n) => n > 0);
  if (savings.length === 0) throw new Error('No cost example shows a saving');
  const min = Math.min(...savings);
  const max = Math.max(...savings);
  return min === max ? `${usd(max)}/year` : `${usd(min)}-${usd(max)}/year`;
}
