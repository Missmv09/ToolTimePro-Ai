'use client'

import { useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  FeatureKey,
  PlanTier,
  hasFeatureAccess,
  PLAN_PAGE_LIMITS,
  PLAN_WORKER_LIMITS,
  getWorkerLimit,
  minimumPlanForFeature,
  FEATURE_LABELS,
} from '@/lib/plan-features'

export function usePlanGating() {
  const { company } = useAuth()

  const plan = (company?.plan || 'starter') as PlanTier
  const addons = useMemo(() => (company?.addons || []) as string[], [company?.addons])
  const isBetaTester = !!company?.is_beta_tester

  const canAccess = useMemo(() => {
    return (feature: FeatureKey): boolean =>
      hasFeatureAccess(plan, addons, isBetaTester, feature)
  }, [plan, addons, isBetaTester])

  const websitePageLimit = useMemo(() => {
    if (isBetaTester) return 99;
    const baseLimit = PLAN_PAGE_LIMITS[plan] || 1;
    const extraPages = addons.filter(a => a === 'extra_page').length;
    return baseLimit + extraPages;
  }, [plan, addons, isBetaTester])

  const workerLimit = useMemo(() => {
    if (isBetaTester) return Infinity;
    return getWorkerLimit(plan, addons);
  }, [plan, addons, isBetaTester])

  const upgradeMessage = (feature: FeatureKey): string => {
    const minPlan = minimumPlanForFeature(feature)
    const label = FEATURE_LABELS[feature]
    if (minPlan) {
      return `${label} requires the ${minPlan.charAt(0).toUpperCase() + minPlan.slice(1)} plan or higher.`
    }
    return `${label} is available as an add-on. Visit Settings to upgrade.`
  }

  return { plan, addons, isBetaTester, canAccess, websitePageLimit, workerLimit, upgradeMessage }
}
