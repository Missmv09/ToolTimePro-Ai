'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { usePlanGating } from '@/hooks/usePlanGating'
import { FeatureKey, FEATURE_LABELS } from '@/lib/plan-features'

interface UpgradeGateProps {
  feature: FeatureKey
  children: ReactNode
}

export default function UpgradeGate({ feature, children }: UpgradeGateProps) {
  const { canAccess, upgradeMessage } = usePlanGating()

  if (canAccess(feature)) {
    return <>{children}</>
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-md text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {FEATURE_LABELS[feature]}
        </h2>
        <p className="text-gray-600 mb-6">
          {upgradeMessage(feature)}
        </p>
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          View Plans & Pricing
        </Link>
      </div>
    </div>
  )
}
