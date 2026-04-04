/**
 * Plan-based feature gating definitions.
 *
 * Each plan tier unlocks specific features. Add-ons can unlock features
 * independently of the plan tier. Beta testers get everything.
 */

export type PlanTier = 'starter' | 'pro' | 'elite' | 'booking_only' | 'invoicing_only';

export type FeatureKey =
  | 'booking'
  | 'invoicing'
  | 'quoting'
  | 'dispatch_board'
  | 'schedule'
  | 'route_optimizer'
  | 'worker_app'
  | 'time_tracking'
  | 'team_management'
  | 'customers'
  | 'leads'
  | 'reviews'
  | 'sms_notifications'
  | 'website_builder'
  | 'jenny_lite'
  | 'jenny_pro'
  | 'jenny_exec_admin'
  | 'compliance'
  | 'hr_toolkit'
  | 'quickbooks_sync'
  | 'customer_portal'
  | 'blog';

/** Features unlocked by each plan tier */
const PLAN_FEATURES: Record<PlanTier, FeatureKey[]> = {
  booking_only: [
    'booking',
    'customers',
    'jenny_lite',
  ],
  invoicing_only: [
    'invoicing',
    'customers',
    'jenny_lite',
  ],
  starter: [
    'booking',
    'invoicing',
    'quoting',
    'schedule',
    'customers',
    'leads',
    'reviews',
    'jenny_lite',
    'website_builder',
    'blog',
  ],
  pro: [
    'booking',
    'invoicing',
    'quoting',
    'schedule',
    'customers',
    'leads',
    'reviews',
    'sms_notifications',
    'worker_app',
    'time_tracking',
    'team_management',
    'jenny_lite',
    'website_builder',
    'blog',
  ],
  elite: [
    'booking',
    'invoicing',
    'quoting',
    'dispatch_board',
    'schedule',
    'route_optimizer',
    'worker_app',
    'time_tracking',
    'team_management',
    'customers',
    'leads',
    'reviews',
    'sms_notifications',
    'jenny_lite',
    'website_builder',
    'compliance',
    'hr_toolkit',
    'customer_portal',
    'blog',
  ],
};

/** Add-on IDs that unlock specific features */
const ADDON_FEATURE_MAP: Record<string, FeatureKey> = {
  website_builder: 'website_builder',
  jenny_pro: 'jenny_pro',
  jenny_exec_admin: 'jenny_exec_admin',
  keep_me_legal: 'compliance',
  quickbooks_sync: 'quickbooks_sync',
  portal_pro: 'customer_portal',
};

/** Max team members (including owner) per plan tier */
export const PLAN_WORKER_LIMITS: Record<PlanTier, number> = {
  booking_only: 1,
  invoicing_only: 1,
  starter: 3,
  pro: 15,
  elite: Infinity,
};

/** Returns the effective worker limit for a plan + any extra_worker add-ons */
export function getWorkerLimit(plan: PlanTier, addons: string[]): number {
  const base = PLAN_WORKER_LIMITS[plan] || 3;
  if (base === Infinity) return Infinity;
  const extraWorkers = addons.filter(a => a === 'extra_worker').length;
  return base + extraWorkers;
}

/** Max website pages per plan tier (base, before extra_page add-ons) */
export const PLAN_PAGE_LIMITS: Record<PlanTier, number> = {
  booking_only: 0,
  invoicing_only: 0,
  starter: 1,
  pro: 3,
  elite: 5,
};

export function getPlanFeatures(plan: PlanTier): Set<FeatureKey> {
  return new Set(PLAN_FEATURES[plan] || PLAN_FEATURES.starter);
}

export function hasFeatureAccess(
  plan: string,
  addons: string[],
  isBetaTester: boolean,
  feature: FeatureKey
): boolean {
  if (isBetaTester) return true;

  const tier = (plan || 'starter') as PlanTier;
  const planFeatures = getPlanFeatures(tier);
  if (planFeatures.has(feature)) return true;

  // Check if any purchased add-on unlocks this feature
  for (const addon of addons) {
    if (ADDON_FEATURE_MAP[addon] === feature) return true;
  }

  return false;
}

/** Human-readable name for upgrade prompts */
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  booking: 'Online Booking',
  invoicing: 'Invoicing',
  quoting: 'Quoting',
  dispatch_board: 'Dispatch Board',
  schedule: 'Schedule',
  route_optimizer: 'Route Optimizer',
  worker_app: 'Worker App',
  time_tracking: 'Time Tracking',
  team_management: 'Team Management',
  customers: 'Customers',
  leads: 'Leads',
  reviews: 'Reviews',
  sms_notifications: 'SMS Notifications',
  website_builder: 'Website Builder',
  jenny_lite: 'Jenny Lite',
  jenny_pro: 'Jenny Pro',
  jenny_exec_admin: 'Jenny Exec Admin',
  compliance: 'Compliance Autopilot',
  hr_toolkit: 'HR Toolkit',
  quickbooks_sync: 'QuickBooks Sync',
  customer_portal: 'Customer Portal Pro',
  blog: 'Blog',
};

/** Which plan is needed to unlock a feature (for upgrade prompts) */
export function minimumPlanForFeature(feature: FeatureKey): PlanTier | null {
  const tiers: PlanTier[] = ['starter', 'pro', 'elite'];
  for (const tier of tiers) {
    if (PLAN_FEATURES[tier].includes(feature)) return tier;
  }
  return null;
}
