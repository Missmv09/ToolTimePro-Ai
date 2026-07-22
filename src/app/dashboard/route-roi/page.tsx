'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { summarizeRoutes, RoiSummary, SavedRouteRecord } from '@/lib/route-roi'
import { TrendingDown, Fuel, Clock, Leaf, Route as RouteIcon, ArrowLeft } from 'lucide-react'

export default function RouteRoiPage() {
  const [summary, setSummary] = useState<RoiSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { user, dbUser, isLoading: authLoading } = useAuth()
  const companyId = dbUser?.company_id || null

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/auth/login')
      return
    }
    if (!companyId) {
      setLoading(false)
      return
    }
    supabase
      .from('saved_routes')
      .select('route_date, route_data')
      .eq('company_id', companyId)
      .then(({ data }) => {
        setSummary(summarizeRoutes((data || []) as SavedRouteRecord[]))
        setLoading(false)
      })
  }, [authLoading, user, companyId, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A0C11]" />
      </div>
    )
  }

  const cards = summary
    ? [
        { icon: TrendingDown, color: 'green', label: 'Miles saved', value: `${summary.totalMilesSaved.toLocaleString()} mi` },
        { icon: Clock, color: 'purple', label: 'Hours saved', value: `${summary.totalHoursSaved.toLocaleString()} h` },
        { icon: Fuel, color: 'orange', label: 'Fuel saved', value: `$${summary.totalFuelSaved.toLocaleString()}` },
        { icon: Leaf, color: 'emerald', label: 'CO₂ avoided', value: `${summary.totalCo2KgSaved.toLocaleString()} kg` },
      ]
    : []

  const colorMap: Record<string, string> = {
    green: 'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  }

  const maxMonthMiles = summary ? Math.max(1, ...summary.byMonth.map((m) => m.milesSaved)) : 1

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link href="/dashboard/route-optimizer" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Route Optimizer
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0A0C11]">Route Savings Report</h1>
        <p className="text-gray-500 mt-1">
          The cumulative impact of optimizing your routes — based on {summary?.routeCount ?? 0} saved route
          {summary?.routeCount === 1 ? '' : 's'}.
        </p>
      </div>

      {!summary || summary.routeCount === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <RouteIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No saved routes yet</h3>
          <p className="text-gray-500 mb-4">
            Optimize a route and click <strong>Save Route</strong> to start tracking your savings here.
          </p>
          <Link href="/dashboard/route-optimizer" className="inline-block px-5 py-2 bg-[#0A0C11] text-white rounded-lg text-sm font-medium hover:bg-[#2d2d44]">
            Go to Route Optimizer
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {cards.map((c) => {
              const Icon = c.icon
              return (
                <div key={c.label} className={`rounded-xl border p-4 text-center ${colorMap[c.color]}`}>
                  <Icon className="w-6 h-6 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{c.value}</p>
                  <p className="text-xs">{c.label}</p>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Routes optimized</p>
              <p className="text-2xl font-bold text-[#0A0C11]">{summary.routeCount}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Avg. improvement</p>
              <p className="text-2xl font-bold text-[#0A0C11]">{summary.avgPercentImprovement}%</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total miles driven</p>
              <p className="text-2xl font-bold text-[#0A0C11]">{summary.totalMilesDriven.toLocaleString()} mi</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Miles saved by month</h2>
            <div className="space-y-3">
              {summary.byMonth.map((m) => (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="w-20 text-sm text-gray-600">{m.month}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-5 bg-green-500 rounded-full"
                      style={{ width: `${Math.max(4, (m.milesSaved / maxMonthMiles) * 100)}%` }}
                    />
                  </div>
                  <span className="w-28 text-right text-sm text-gray-700">
                    {m.milesSaved} mi · {m.hoursSaved} h
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
