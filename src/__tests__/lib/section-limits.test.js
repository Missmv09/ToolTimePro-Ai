/**
 * Tests for website builder section/page limit enforcement
 * Validates that PLAN_PAGE_LIMITS correctly restrict sections per plan
 */

const { PLAN_PAGE_LIMITS, hasFeatureAccess } = require('@/lib/plan-features');

describe('Website Builder section limits', () => {
  describe('PLAN_PAGE_LIMITS', () => {
    it('booking_only plan has 0 sections (no website)', () => {
      expect(PLAN_PAGE_LIMITS.booking_only).toBe(0);
    });

    it('invoicing_only plan has 0 sections (no website)', () => {
      expect(PLAN_PAGE_LIMITS.invoicing_only).toBe(0);
    });

    it('starter plan has 1 section', () => {
      expect(PLAN_PAGE_LIMITS.starter).toBe(1);
    });

    it('pro plan has 3 sections', () => {
      expect(PLAN_PAGE_LIMITS.pro).toBe(3);
    });

    it('elite plan has 5 sections', () => {
      expect(PLAN_PAGE_LIMITS.elite).toBe(5);
    });
  });

  describe('extra_page add-on calculation', () => {
    it('extra_page add-ons increase the limit', () => {
      const plan = 'starter';
      const baseLimit = PLAN_PAGE_LIMITS[plan];
      const addons = ['extra_page', 'extra_page'];
      const extraPages = addons.filter(a => a === 'extra_page').length;
      expect(baseLimit + extraPages).toBe(3);
    });

    it('zero extra_page add-ons means base limit only', () => {
      const plan = 'pro';
      const addons = ['website_builder', 'quickbooks_sync'];
      const extraPages = addons.filter(a => a === 'extra_page').length;
      expect(PLAN_PAGE_LIMITS[plan] + extraPages).toBe(3);
    });
  });

  describe('website_builder feature access', () => {
    it('starter plan includes website_builder', () => {
      expect(hasFeatureAccess('starter', [], false, 'website_builder')).toBe(true);
    });

    it('booking_only plan does NOT include website_builder by default', () => {
      expect(hasFeatureAccess('booking_only', [], false, 'website_builder')).toBe(false);
    });

    it('booking_only WITH website_builder add-on gets access', () => {
      expect(hasFeatureAccess('booking_only', ['website_builder'], false, 'website_builder')).toBe(true);
    });
  });
});
