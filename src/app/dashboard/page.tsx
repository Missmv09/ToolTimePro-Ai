'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface DashboardStats {
  todayJobs: number
  newLeads: number
  pendingQuotes: number
  unpaidInvoices: number
  monthRevenue: number
}

interface RecentLead {
  id: string
  name: string
  email: string
  phone: string
  service_requested: string
  status: string
  created_at: string
}

interface TodayJob {
  id: string
  title: string
  scheduled_time_start: string
  status: string
  customer: { name: string } | { name: string }[] | null
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todayJobs: 0,
    newLeads: 0,
    pendingQuotes: 0,
    unpaidInvoices: 0,
    monthRevenue: 0,
  })
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([])
  const [todayJobs, setTodayJobs] = useState<TodayJob[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchDashboardDataLocal = async (companyId: string) => {
      const today = new Date().toISOString().split('T')[0]
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      // Fetch all stats in parallel
      const [
        todayJobsResult,
        newLeadsResult,
        pendingQuotesResult,
        unpaidInvoicesResult,
        revenueResult,
        recentLeadsResult,
        todayJobsListResult,
      ] = await Promise.all([
        // Today's jobs count
        supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('scheduled_date', today),

        // New leads count
        supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'new'),

        // Pending quotes count
        supabase
          .from('quotes')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'sent'),

        // Unpaid invoices count
        supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .in('status', ['sent', 'overdue']),

        // Month revenue
        supabase
          .from('invoices')
          .select('total')
          .eq('company_id', companyId)
          .eq('status', 'paid')
          .gte('paid_at', startOfMonth),

        // Recent leads (last 5)
        supabase
          .from('leads')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(5),

        // Today's jobs list
        supabase
          .from('jobs')
          .select('id, title, scheduled_time_start, status, customer:customers(name)')
          .eq('company_id', companyId)
          .eq('scheduled_date', today)
          .order('scheduled_time_start'),
      ])

      // Calculate month revenue
      const monthRevenue = revenueResult.data?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0

      setStats({
        todayJobs: todayJobsResult.count || 0,
        newLeads: newLeadsResult.count || 0,
        pendingQuotes: pendingQuotesResult.count || 0,
        unpaidInvoices: unpaidInvoicesResult.count || 0,
        monthRevenue,
      })

      setRecentLeads(recentLeadsResult.data || [])
      setTodayJobs(todayJobsListResult.data || [])
      setLoading(false)
    }

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      setUser(user)

      // Get user's company
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (userData?.company_id) {
        setCompanyId(userData.company_id)
        fetchDashboardDataLocal(userData.company_id)
      } else {
        setLoading(false)
      }
    }

    getUser()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Today's Jobs"
          value={stats.todayJobs}
          icon="📋"
          href="/dashboard/jobs"
          color="blue"
        />
        <StatCard
          title="New Leads"
          value={stats.newLeads}
          icon="👥"
          href="/dashboard/leads"
          color="green"
        />
        <StatCard
          title="Pending Quotes"
          value={stats.pendingQuotes}
          icon="📝"
          href="/dashboard/quotes"
          color="yellow"
        />
        <StatCard
          title="Unpaid Invoices"
          value={stats.unpaidInvoices}
          icon="💰"
          href="/dashboard/invoices"
          color="red"
        />
      </div>

      {/* Revenue Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white mb-8">
        <p className="text-blue-100 text-sm">Revenue This Month</p>
        <p className="text-3xl font-bold">${stats.monthRevenue.toLocaleString()}</p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Schedule</h2>
            <Link href="/dashboard/schedule" className="text-blue-600 hover:text-blue-700 text-sm">
              View all →
            </Link>
          </div>

          {todayJobs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No jobs scheduled for today</p>
          ) : (
            <div className="space-y-3">
              {todayJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{job.title}</p>
                    <p className="text-sm text-gray-500">
                      {job.customer
                        ? (Array.isArray(job.customer) ? job.customer[0]?.name : job.customer.name) || 'No customer'
                        : 'No customer'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {job.scheduled_time_start || 'TBD'}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      job.status === 'completed' ? 'bg-green-100 text-green-700' :
                      job.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Leads */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Leads</h2>
            <Link href="/dashboard/leads" className="text-blue-600 hover:text-blue-700 text-sm">
              View all →
            </Link>
          </div>

          {recentLeads.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No leads yet</p>
          ) : (
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{lead.name}</p>
                    <p className="text-sm text-gray-500">{lead.service_requested || 'General inquiry'}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      lead.status === 'new' ? 'bg-green-100 text-green-700' :
                      lead.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {lead.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, href, color }: {
  title: string
  value: number
  icon: string
  href: string
  color: 'blue' | 'green' | 'yellow' | 'red'
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  }

  return (
    <Link href={href}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-full ${colors[color]} flex items-center justify-center text-2xl`}>
            {icon}
          </div>
        </div>
      </div>
    </Link>
  )
}
