'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Clock, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function TrialBanner() {
  const { company } = useAuth()

  if (!company?.trial_ends_at) return null

  // Don't show if they have a paid subscription (stripe_customer_id set)
  if (company.stripe_customer_id) return null

  // Don't show trial countdown for beta testers
  if (company.is_beta_tester) return null

  const trialEnd = new Date(company.trial_ends_at)
  const now = new Date()
  const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  const isExpired = daysLeft === 0

  if (isExpired) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock size={18} className="text-red-500" />
          <p className="text-sm text-red-700">
            Your free trial has ended. Subscribe to a plan to keep using ToolTime Pro.
          </p>
        </div>
        <Link
          href="/pricing"
          className="px-4 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 whitespace-nowrap"
        >
          Choose a plan
        </Link>
      </div>
    )
  }

  // Urgent styling when 3 or fewer days left
  const isUrgent = daysLeft <= 3

  return (
    <div
      className={`rounded-lg px-4 py-3 mb-6 flex items-center justify-between ${
        isUrgent
          ? 'bg-amber-50 border border-amber-200'
          : 'bg-blue-50 border border-blue-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <Sparkles size={18} className={isUrgent ? 'text-amber-500' : 'text-blue-500'} />
        <p className={`text-sm ${isUrgent ? 'text-amber-700' : 'text-blue-700'}`}>
          <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong> left in your Pro trial.
          {isUrgent && ' Subscribe now to avoid losing access.'}
        </p>
      </div>
      <Link
        href="/pricing"
        className={`px-4 py-1.5 text-white text-sm font-medium rounded-lg whitespace-nowrap ${
          isUrgent
            ? 'bg-amber-600 hover:bg-amber-700'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        View plans
      </Link>
    </div>
  )
}
