'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

// Routes that remain accessible after a trial expires so the user can still
// add a payment method or contact support.
const ALLOWED_PATHS = ['/dashboard/settings', '/pricing']

function isAllowed(pathname: string) {
  return ALLOWED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export default function TrialExpiredGate({ children }: { children: ReactNode }) {
  const { company } = useAuth()
  const pathname = usePathname() || ''

  // Beta testers and paying customers always pass through.
  if (!company || company.is_beta_tester || company.stripe_customer_id) {
    return <>{children}</>
  }

  // If the dashboard hasn't loaded enough data to make a decision yet, default
  // to letting the children render — TrialBanner already shows countdown.
  if (!company.trial_ends_at) {
    return <>{children}</>
  }

  const trialEnd = new Date(company.trial_ends_at).getTime()
  const expired = company.subscription_status === 'expired' || trialEnd <= Date.now()

  if (!expired) return <>{children}</>
  if (isAllowed(pathname)) return <>{children}</>

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="bg-white border border-red-200 rounded-xl shadow-sm p-8 text-center">
        <div className="mx-auto w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <Lock size={22} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Your free trial has ended
        </h2>
        <p className="text-gray-600 mb-6">
          Add a payment method to keep using ToolTime Pro. Your data is safe —
          everything will be right where you left it once you subscribe.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/pricing"
            className="px-5 py-2.5 bg-[#f5a623] hover:bg-[#e6991a] text-[#1a1a2e] font-semibold rounded-lg"
          >
            Choose a plan
          </Link>
          <Link
            href="/dashboard/settings?tab=subscription"
            className="px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg"
          >
            Manage subscription
          </Link>
        </div>
      </div>
    </div>
  )
}
