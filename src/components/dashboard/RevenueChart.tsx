'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TrendingUp } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface MonthData {
  month: string
  revenue: number
  jobs: number
}

interface RevenueChartProps {
  companyId: string
}

export default function RevenueChart({ companyId }: RevenueChartProps) {
  const [data, setData] = useState<MonthData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRevenueTrend() {
      if (!companyId) return

      // Get last 6 months of paid invoices
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
      sixMonthsAgo.setDate(1)

      const { data: invoices } = await supabase
        .from('invoices')
        .select('total, paid_at')
        .eq('company_id', companyId)
        .eq('status', 'paid')
        .gte('paid_at', sixMonthsAgo.toISOString())
        .order('paid_at')

      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, created_at, status')
        .eq('company_id', companyId)
        .eq('status', 'completed')
        .gte('created_at', sixMonthsAgo.toISOString())

      // Group by month
      const months: Record<string, MonthData> = {}
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const label = d.toLocaleDateString('en-US', { month: 'short' })
        months[key] = { month: label, revenue: 0, jobs: 0 }
      }

      for (const inv of invoices || []) {
        if (!inv.paid_at) continue
        const d = new Date(inv.paid_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (months[key]) {
          months[key].revenue += inv.total || 0
        }
      }

      for (const job of jobs || []) {
        const d = new Date(job.created_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (months[key]) {
          months[key].jobs += 1
        }
      }

      setData(Object.values(months))
      setLoading(false)
    }

    fetchRevenueTrend()
  }, [companyId])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="h-[220px] bg-gray-100 rounded-lg animate-pulse" />
      </div>
    )
  }

  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0)
  const totalJobs = data.reduce((sum, d) => sum + d.jobs, 0)
  const currentMonth = data[data.length - 1]
  const prevMonth = data[data.length - 2]
  const growthPct = prevMonth && prevMonth.revenue > 0
    ? Math.round(((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100)
    : 0

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Revenue Trend
          </h2>
          <p className="text-sm text-gray-500">Last 6 months</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">${totalRevenue.toLocaleString()}</p>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500">{totalJobs} jobs</span>
            {growthPct !== 0 && (
              <span className={`font-medium ${growthPct > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {growthPct > 0 ? '+' : ''}{growthPct}% vs last month
              </span>
            )}
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#revenueGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
