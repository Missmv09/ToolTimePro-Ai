/**
 * Tests for src/lib/plan-features.ts
 * Validates plan-based feature gating logic, page limits, and feature access
 */

const {
  hasFeatureAccess,
  getPlanFeatures,
  PLAN_PAGE_LIMITS,
  minimumPlanForFeature,
  FEATURE_LABELS,
} = require('@/lib/plan-features');

describe('plan-features', () => {
  describe('getPlanFeatures', () => {
    it('returns a Set of features for each plan tier', () => {
      const starterFeatures = getPlanFeatures('starter');
      expect(starterFeatures).toBeInstanceOf(Set);
      expect(starterFeatures.has('booking')).toBe(true);
      expect(starterFeatures.has('invoicing')).toBe(true);
      expect(starterFeatures.has('jenny_lite')).toBe(true);
    });

    it('starter does NOT include elite-only features', () => {
      const starterFeatures = getPlanFeatures('starter');
      expect(starterFeatures.has('dispatch_board')).toBe(false);
      expect(starterFeatures.has('route_optimizer')).toBe(false);
      expect(starterFeatures.has('customer_portal')).toBe(false);
    });

    it('pro includes worker app and time tracking', () => {
      const proFeatures = getPlanFeatures('pro');
      expect(proFeatures.has('worker_app')).toBe(true);
      expect(proFeatures.has('time_tracking')).toBe(true);
      expect(proFeatures.has('team_management')).toBe(true);
      expect(proFeatures.has('sms_notifications')).toBe(true);
    });

    it('elite includes all features', () => {
      const eliteFeatures = getPlanFeatures('elite');
      expect(eliteFeatures.has('dispatch_board')).toBe(true);
      expect(eliteFeatures.has('route_optimizer')).toBe(true);
      expect(eliteFeatures.has('customer_portal')).toBe(true);
      expect(eliteFeatures.has('compliance')).toBe(true);
      expect(eliteFeatures.has('hr_toolkit')).toBe(true);
    });

    it('booking_only only includes booking, customers, and jenny_lite', () => {
      const features = getPlanFeatures('booking_only');
      expect(features.has('booking')).toBe(true);
      expect(features.has('customers')).toBe(true);
      expect(features.has('jenny_lite')).toBe(true);
      expect(features.has('invoicing')).toBe(false);
      expect(features.has('quoting')).toBe(false);
      expect(features.has('dispatch_board')).toBe(false);
    });

    it('invoicing_only only includes invoicing, customers, and jenny_lite', () => {
      const features = getPlanFeatures('invoicing_only');
      expect(features.has('invoicing')).toBe(true);
      expect(features.has('customers')).toBe(true);
      expect(features.has('jenny_lite')).toBe(true);
      expect(features.has('booking')).toBe(false);
      expect(features.has('dispatch_board')).toBe(false);
    });

    it('falls back to starter for unknown plan', () => {
      const features = getPlanFeatures('unknown_plan');
      const starterFeatures = getPlanFeatures('starter');
      expect(features).toEqual(starterFeatures);
    });
  });

  describe('hasFeatureAccess', () => {
    it('grants access based on plan features', () => {
      expect(hasFeatureAccess('starter', [], false, 'booking')).toBe(true);
      expect(hasFeatureAccess('starter', [], false, 'dispatch_board')).toBe(false);
      expect(hasFeatureAccess('elite', [], false, 'dispatch_board')).toBe(true);
    });

    it('beta testers get access to everything', () => {
      expect(hasFeatureAccess('starter', [], true, 'dispatch_board')).toBe(true);
      expect(hasFeatureAccess('starter', [], true, 'compliance')).toBe(true);
      expect(hasFeatureAccess('starter', [], true, 'customer_portal')).toBe(true);
      expect(hasFeatureAccess('booking_only', [], true, 'invoicing')).toBe(true);
    });

    it('add-ons unlock features regardless of plan', () => {
      // Website builder add-on
      expect(hasFeatureAccess('booking_only', ['website_builder'], false, 'website_builder')).toBe(true);
      // QuickBooks sync add-on
      expect(hasFeatureAccess('starter', ['quickbooks_sync'], false, 'quickbooks_sync')).toBe(true);
      // Jenny Pro add-on
      expect(hasFeatureAccess('starter', ['jenny_pro'], false, 'jenny_pro')).toBe(true);
      // Jenny Exec Admin add-on
      expect(hasFeatureAccess('starter', ['jenny_exec_admin'], false, 'jenny_exec_admin')).toBe(true);
      // Portal Pro add-on
      expect(hasFeatureAccess('starter', ['portal_pro'], false, 'customer_portal')).toBe(true);
      // Compliance add-on
      expect(hasFeatureAccess('starter', ['keep_me_legal'], false, 'compliance')).toBe(true);
    });

    it('denies access without correct add-on', () => {
      expect(hasFeatureAccess('starter', [], false, 'quickbooks_sync')).toBe(false);
      expect(hasFeatureAccess('starter', [], false, 'jenny_pro')).toBe(false);
      expect(hasFeatureAccess('starter', ['website_builder'], false, 'quickbooks_sync')).toBe(false);
    });

    it('handles null/empty addons gracefully', () => {
      expect(hasFeatureAccess('starter', [], false, 'booking')).toBe(true);
      expect(hasFeatureAccess('starter', [], false, 'dispatch_board')).toBe(false);
    });
  });

  describe('PLAN_PAGE_LIMITS', () => {
    it('defines correct page limits per plan', () => {
      expect(PLAN_PAGE_LIMITS.booking_only).toBe(0);
      expect(PLAN_PAGE_LIMITS.invoicing_only).toBe(0);
      expect(PLAN_PAGE_LIMITS.starter).toBe(1);
      expect(PLAN_PAGE_LIMITS.pro).toBe(3);
      expect(PLAN_PAGE_LIMITS.elite).toBe(5);
    });
  });

  describe('minimumPlanForFeature', () => {
    it('returns starter for basic features', () => {
      expect(minimumPlanForFeature('booking')).toBe('starter');
      expect(minimumPlanForFeature('invoicing')).toBe('starter');
    });

    it('returns pro for worker features', () => {
      expect(minimumPlanForFeature('worker_app')).toBe('pro');
      expect(minimumPlanForFeature('time_tracking')).toBe('pro');
    });

    it('returns elite for advanced features', () => {
      expect(minimumPlanForFeature('dispatch_board')).toBe('elite');
      expect(minimumPlanForFeature('route_optimizer')).toBe('elite');
      expect(minimumPlanForFeature('customer_portal')).toBe('elite');
    });

    it('returns null for add-on-only features', () => {
      expect(minimumPlanForFeature('quickbooks_sync')).toBe(null);
      expect(minimumPlanForFeature('jenny_pro')).toBe(null);
      expect(minimumPlanForFeature('jenny_exec_admin')).toBe(null);
    });
  });

  describe('FEATURE_LABELS', () => {
    it('has human-readable labels for all features', () => {
      expect(FEATURE_LABELS.booking).toBe('Online Booking');
      expect(FEATURE_LABELS.invoicing).toBe('Invoicing');
      expect(FEATURE_LABELS.dispatch_board).toBe('Dispatch Board');
      expect(FEATURE_LABELS.jenny_pro).toBe('Jenny Pro');
      expect(FEATURE_LABELS.quickbooks_sync).toBe('QuickBooks Sync');
      expect(FEATURE_LABELS.customer_portal).toBe('Customer Portal Pro');
    });
  });
});
