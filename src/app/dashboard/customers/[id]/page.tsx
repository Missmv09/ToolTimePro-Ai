'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  ArrowLeft,
  Briefcase,
  Receipt,
  FileText,
  MessageCircle,
  Star,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  ExternalLink,
  Plus,
} from 'lucide-react'

interface Customer {
  id: string
  company_id: string
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  notes: string
  created_at: string
}

interface TimelineEvent {
  id: string
  type: 'job_created' | 'job_completed' | 'invoice_sent' | 'invoice_paid' | 'quote_sent' | 'quote_accepted' | 'quote_rejected' | 'sms' | 'review_request' | 'review_received' | 'customer_created'
  title: string
  description: string
  date: string
  link?: string
  icon: 'briefcase' | 'receipt' | 'filetext' | 'message' | 'star' | 'userplus'
  color: string
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function getIcon(icon: TimelineEvent['icon']) {
  const size = 16
  switch (icon) {
    case 'briefcase': return <Briefcase size={size} />
    case 'receipt': return <Receipt size={size} />
    case 'filetext': return <FileText size={size} />
    case 'message': return <MessageCircle size={size} />
    case 'star': return <Star size={size} />
    case 'userplus': return <UserPlus size={size} />
  }
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  amber: 'bg-amber-100 text-amber-600',
  purple: 'bg-purple-100 text-purple-600',
  gray: 'bg-gray-100 text-gray-600',
  gold: 'bg-yellow-100 text-yellow-600',
}

export default function CustomerDetailPage() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalRevenue: 0,
    openInvoices: 0,
    lastActivity: '',
  })

  const router = useRouter()
  const params = useParams()
  const customerId = params.id as string
  const { user, dbUser, isLoading: authLoading } = useAuth()
  const companyId = dbUser?.company_id || null

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/auth/login')
      return
    }
    if (companyId && customerId) {
      fetchCustomerData()
    }
  }, [authLoading, user, companyId, customerId])

  const fetchCustomerData = async () => {
    setLoading(true)

    // Fetch customer
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .eq('company_id', companyId!)
      .single()

    if (customerError || !customerData) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setCustomer(customerData)

    // Fetch all related data in parallel
    const [jobsRes, invoicesRes, quotesRes, smsRes, reviewsRes] = await Promise.all([
      supabase
        .from('jobs')
        .select('id, title, status, scheduled_date, total_amount, created_at')
        .eq('company_id', companyId!)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false }),
      supabase
        .from('invoices')
        .select('id, invoice_number, status, total, created_at, paid_at')
        .eq('company_id', companyId!)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false }),
      supabase
        .from('quotes')
        .select('id, quote_number, title, status, total, created_at')
        .eq('company_id', companyId!)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false }),
      supabase
        .from('sms_logs')
        .select('id, to_phone, message, message_type, created_at')
        .eq('company_id', companyId!)
        .eq('to_phone', customerData.phone || '__no_match__')
        .order('created_at', { ascending: false }),
      supabase
        .from('review_requests')
        .select('id, status, created_at')
        .eq('company_id', companyId!)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false }),
    ])

    const jobs = jobsRes.data || []
    const invoices = invoicesRes.data || []
    const quotes = quotesRes.data || []
    const smsLogs = smsRes.data || []
    const reviews = reviewsRes.data || []

    // Calculate stats
    const paidInvoices = invoices.filter((i) => i.status === 'paid')
    const unpaidInvoices = invoices.filter((i) => i.status !== 'paid')
    const totalRevenue = paidInvoices.reduce((sum, i) => sum + (i.total || 0), 0)
    const openInvoiceAmount = unpaidInvoices.reduce((sum, i) => sum + (i.total || 0), 0)

    // Find last activity date
    const allDates = [
      ...jobs.map((j) => j.created_at),
      ...invoices.map((i) => i.created_at),
      ...quotes.map((q) => q.created_at),
      ...smsLogs.map((s) => s.created_at),
      ...reviews.map((r) => r.created_at),
    ].filter(Boolean)
    const lastActivity = allDates.length > 0
      ? allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      : customerData.created_at

    setStats({
      totalJobs: jobs.length,
      totalRevenue,
      openInvoices: openInvoiceAmount,
      lastActivity,
    })

    // Build timeline events
    const events: TimelineEvent[] = []

    // Jobs
    for (const job of jobs) {
      events.push({
        id: `job-created-${job.id}`,
        type: 'job_created',
        title: `Job created: ${job.title}`,
        description: job.total_amount ? `$${job.total_amount.toLocaleString()}` : '',
        date: job.created_at,
        link: '/dashboard/jobs',
        icon: 'briefcase',
        color: 'blue',
      })
      if (job.status === 'completed') {
        events.push({
          id: `job-completed-${job.id}`,
          type: 'job_completed',
          title: `Job completed: ${job.title}`,
          description: job.total_amount ? `$${job.total_amount.toLocaleString()}` : '',
          date: job.scheduled_date || job.created_at,
          link: '/dashboard/jobs',
          icon: 'briefcase',
          color: 'blue',
        })
      }
    }

    // Invoices
    for (const inv of invoices) {
      events.push({
        id: `invoice-sent-${inv.id}`,
        type: 'invoice_sent',
        title: `Invoice #${inv.invoice_number} sent`,
        description: `$${(inv.total || 0).toLocaleString()}`,
        date: inv.created_at,
        link: '/dashboard/invoices',
        icon: 'receipt',
        color: 'amber',
      })
      if (inv.status === 'paid' && inv.paid_at) {
        events.push({
          id: `invoice-paid-${inv.id}`,
          type: 'invoice_paid',
          title: `Invoice #${inv.invoice_number} paid`,
          description: `$${(inv.total || 0).toLocaleString()}`,
          date: inv.paid_at,
          link: '/dashboard/invoices',
          icon: 'receipt',
          color: 'green',
        })
      }
    }

    // Quotes
    for (const quote of quotes) {
      events.push({
        id: `quote-sent-${quote.id}`,
        type: 'quote_sent',
        title: `Quote #${quote.quote_number} sent`,
        description: `${quote.title ? quote.title + ' - ' : ''}$${(quote.total || 0).toLocaleString()}`,
        date: quote.created_at,
        link: '/dashboard/quotes',
        icon: 'filetext',
        color: 'purple',
      })
      if (quote.status === 'approved') {
        events.push({
          id: `quote-accepted-${quote.id}`,
          type: 'quote_accepted',
          title: `Quote #${quote.quote_number} approved`,
          description: `$${(quote.total || 0).toLocaleString()}`,
          date: quote.created_at,
          link: '/dashboard/quotes',
          icon: 'filetext',
          color: 'purple',
        })
      }
      if (quote.status === 'rejected') {
        events.push({
          id: `quote-rejected-${quote.id}`,
          type: 'quote_rejected',
          title: `Quote #${quote.quote_number} rejected`,
          description: `$${(quote.total || 0).toLocaleString()}`,
          date: quote.created_at,
          link: '/dashboard/quotes',
          icon: 'filetext',
          color: 'purple',
        })
      }
    }

    // SMS logs
    for (const sms of smsLogs) {
      const truncated = sms.message && sms.message.length > 60
        ? sms.message.substring(0, 60) + '...'
        : sms.message || ''
      events.push({
        id: `sms-${sms.id}`,
        type: 'sms',
        title: 'SMS sent',
        description: truncated,
        date: sms.created_at,
        icon: 'message',
        color: 'gray',
      })
    }

    // Reviews
    for (const review of reviews) {
      events.push({
        id: `review-${review.id}`,
        type: review.status === 'completed' ? 'review_received' : 'review_request',
        title: review.status === 'completed' ? 'Review received' : 'Review request sent',
        description: '',
        date: review.created_at,
        icon: 'star',
        color: 'gold',
      })
    }

    // Customer created event
    events.push({
      id: `customer-created-${customerData.id}`,
      type: 'customer_created',
      title: 'Customer added',
      description: '',
      date: customerData.created_at,
      icon: 'userplus',
      color: 'blue',
    })

    // Sort by date descending
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    setTimeline(events)
    setLoading(false)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-5xl mx-auto">
          {/* Loading skeleton */}
          <div className="animate-pulse">
            <div className="h-6 w-32 bg-gray-200 rounded mb-6"></div>
            <div className="bg-white rounded-xl border p-6 mb-6">
              <div className="h-8 w-64 bg-gray-200 rounded mb-3"></div>
              <div className="h-4 w-48 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-40 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-56 bg-gray-200 rounded"></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border p-4">
                  <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 w-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border p-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-4 mb-6">
                  <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 w-48 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 w-32 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (notFound) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-5xl mx-auto">
          <Link
            href="/dashboard/customers"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft size={16} />
            Back to Customers
          </Link>
          <div className="bg-white rounded-xl border p-12 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Customer Not Found</h2>
            <p className="text-gray-500">This customer doesn&apos;t exist or you don&apos;t have access to it.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Back button */}
        <Link
          href="/dashboard/customers"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={16} />
          Back to Customers
        </Link>

        {/* Customer Header */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{customer?.name}</h1>
              <div className="flex flex-col gap-1 text-sm text-gray-600">
                {customer?.email && (
                  <span className="flex items-center gap-2">
                    <Mail size={14} />
                    {customer.email}
                  </span>
                )}
                {customer?.phone && (
                  <span className="flex items-center gap-2">
                    <Phone size={14} />
                    {customer.phone}
                  </span>
                )}
                {customer?.address && (
                  <span className="flex items-center gap-2">
                    <MapPin size={14} />
                    {customer.address}{customer.city ? `, ${customer.city}` : ''} {customer.state} {customer.zip}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                  <Briefcase size={12} />
                  {stats.totalJobs} jobs
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                  <DollarSign size={12} />
                  ${stats.totalRevenue.toLocaleString()} spent
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                  <Calendar size={12} />
                  Member since {new Date(customer?.created_at || '').toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link
                href={`/dashboard/jobs?customer=${customerId}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={14} />
                Create Job
              </Link>
              <Link
                href={`/dashboard/quotes?customer=${customerId}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <FileText size={14} />
                Send Quote
              </Link>
              <Link
                href={`/dashboard/invoices?customer=${customerId}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Receipt size={14} />
                Send Invoice
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Total Jobs</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalJobs}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold text-green-600">${stats.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Open Invoices</p>
            <p className="text-2xl font-bold text-amber-600">${stats.openInvoices.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-sm text-gray-500">Last Activity</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.lastActivity ? timeAgo(stats.lastActivity) : 'N/A'}
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Activity Timeline</h2>

          {timeline.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No activity yet.</p>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

              <div className="space-y-6">
                {timeline.map((event) => (
                  <div key={event.id} className="relative flex items-start gap-4 pl-0">
                    {/* Icon */}
                    <div
                      className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${colorMap[event.color] || colorMap.gray}`}
                    >
                      {getIcon(event.icon)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">{event.title}</p>
                        {event.link && (
                          <Link
                            href={event.link}
                            className="text-gray-400 hover:text-blue-600"
                          >
                            <ExternalLink size={12} />
                          </Link>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-sm text-gray-500 mt-0.5">{event.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{timeAgo(event.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
