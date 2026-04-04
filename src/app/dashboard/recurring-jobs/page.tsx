'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  Plus,
  Repeat,
  Calendar,
  Pause,
  Play,
  Pencil,
  Trash2,
  X,
  Clock,
  DollarSign,
  AlertCircle,
} from 'lucide-react'

interface RecurringJob {
  id: string
  company_id: string
  title: string
  description: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  customer_id: string | null
  assigned_worker_ids: string[]
  total_amount: number | null
  priority: string
  frequency: string
  interval_days: number | null
  day_of_week: number | null
  day_of_month: number | null
  preferred_time_start: string
  preferred_time_end: string
  is_active: boolean
  next_scheduled_date: string | null
  last_generated_date: string | null
  starts_at: string
  ends_at: string | null
  max_occurrences: number | null
  occurrences_generated: number
  auto_invoice: boolean
  notes: string | null
  created_at: string
  updated_at: string
  customer?: { id: string; name: string } | null
}

interface Customer {
  id: string
  name: string
}

interface Worker {
  id: string
  full_name: string
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatFrequency(job: RecurringJob): string {
  switch (job.frequency) {
    case 'weekly':
      return `Weekly on ${job.day_of_week !== null ? DAYS_OF_WEEK[job.day_of_week] : '—'}`
    case 'biweekly':
      return `Every 2 weeks on ${job.day_of_week !== null ? DAYS_OF_WEEK[job.day_of_week] : '—'}`
    case 'monthly':
      return `Monthly on the ${job.day_of_month ? ordinal(job.day_of_month) : '—'}`
    case 'custom':
      return `Every ${job.interval_days} days`
    default:
      return job.frequency
  }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function calculateNextDate(
  frequency: string,
  startsAt: string,
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  intervalDays: number | null,
): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(startsAt + 'T00:00:00')

  // If start is in the future, use it as base
  let base = start > today ? start : today

  switch (frequency) {
    case 'weekly':
    case 'biweekly': {
      if (dayOfWeek === null) return startsAt
      const target = dayOfWeek
      const current = base.getDay()
      let daysUntil = (target - current + 7) % 7
      if (daysUntil === 0 && base <= today) daysUntil = frequency === 'biweekly' ? 14 : 7
      if (daysUntil === 0) daysUntil = 0 // start date is the target day and in future
      const next = new Date(base)
      next.setDate(next.getDate() + daysUntil)
      return next.toISOString().split('T')[0]
    }
    case 'monthly': {
      if (dayOfMonth === null) return startsAt
      let year = base.getFullYear()
      let month = base.getMonth()
      let candidate = new Date(year, month, dayOfMonth)
      if (candidate <= today) {
        month++
        if (month > 11) { month = 0; year++ }
        candidate = new Date(year, month, dayOfMonth)
      }
      return candidate.toISOString().split('T')[0]
    }
    case 'custom': {
      if (!intervalDays) return startsAt
      let next = new Date(start)
      while (next <= today) {
        next.setDate(next.getDate() + intervalDays)
      }
      return next.toISOString().split('T')[0]
    }
    default:
      return startsAt
  }
}

export default function RecurringJobsPage() {
  const [recurringJobs, setRecurringJobs] = useState<RecurringJob[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingJob, setEditingJob] = useState<RecurringJob | null>(null)
  const router = useRouter()
  const { user, dbUser, isLoading: authLoading } = useAuth()

  const companyId = dbUser?.company_id || null

  const fetchRecurringJobs = useCallback(async (compId: string) => {
    const { data, error } = await supabase
      .from('recurring_jobs')
      .select('*, customer:customers(id, name)')
      .eq('company_id', compId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching recurring jobs:', error)
    } else {
      setRecurringJobs(data || [])
    }
    setLoading(false)
  }, [])

  const fetchCustomers = useCallback(async (compId: string) => {
    const { data } = await supabase
      .from('customers')
      .select('id, name')
      .eq('company_id', compId)
      .order('name')
    setCustomers(data || [])
  }, [])

  const fetchWorkers = useCallback(async (compId: string) => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('company_id', compId)
      .eq('is_active', true)
    setWorkers(data || [])
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/auth/login')
      return
    }
    if (companyId) {
      fetchRecurringJobs(companyId)
      fetchCustomers(companyId)
      fetchWorkers(companyId)
    } else {
      setLoading(false)
    }
  }, [authLoading, user, companyId, router, fetchRecurringJobs, fetchCustomers, fetchWorkers])

  const toggleActive = async (job: RecurringJob) => {
    const { error } = await supabase
      .from('recurring_jobs')
      .update({ is_active: !job.is_active, updated_at: new Date().toISOString() })
      .eq('id', job.id)
    if (error) {
      alert('Failed to update status.')
      return
    }
    if (companyId) fetchRecurringJobs(companyId)
  }

  const deleteRecurringJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this recurring job? This cannot be undone.')) return
    const { error } = await supabase.from('recurring_jobs').delete().eq('id', jobId)
    if (error) {
      alert('Failed to delete recurring job.')
      return
    }
    if (companyId) fetchRecurringJobs(companyId)
  }

  // Stats
  const activeCount = recurringJobs.filter(j => j.is_active).length
  const pausedCount = recurringJobs.filter(j => !j.is_active).length

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const jobsThisMonth = recurringJobs.filter(j =>
    j.is_active && j.next_scheduled_date && j.next_scheduled_date >= startOfMonth && j.next_scheduled_date <= endOfMonth
  ).length

  const nextUpJob = recurringJobs
    .filter(j => j.is_active && j.next_scheduled_date)
    .sort((a, b) => (a.next_scheduled_date || '').localeCompare(b.next_scheduled_date || ''))[0]

  const nextUpDate = nextUpJob?.next_scheduled_date
    ? new Date(nextUpJob.next_scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—'

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Repeat className="text-blue-600" size={28} />
            <h1 className="text-2xl font-bold text-gray-900">Recurring Jobs</h1>
          </div>
          <button
            onClick={() => {
              setEditingJob(null)
              setShowModal(true)
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={18} />
            Create Recurring Job
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Repeat size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Schedules</p>
                <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Jobs This Month</p>
                <p className="text-2xl font-bold text-gray-900">{jobsThisMonth}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Next Up</p>
                <p className="text-2xl font-bold text-gray-900">{nextUpDate}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Pause size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Paused</p>
                <p className="text-2xl font-bold text-gray-900">{pausedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recurringJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Repeat size={40} className="text-gray-300" />
                      <p>No recurring jobs yet. Create one to automate your scheduling.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                recurringJobs.map((job) => (
                  <tr key={job.id} className={`hover:bg-gray-50 ${!job.is_active ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{job.title}</p>
                      {job.address && (
                        <p className="text-sm text-gray-500 truncate max-w-xs">{job.address}</p>
                      )}
                      {job.priority !== 'normal' && (
                        <span className={`text-xs font-medium ${
                          job.priority === 'urgent' ? 'text-red-500' :
                          job.priority === 'high' ? 'text-orange-500' :
                          'text-gray-500'
                        }`}>
                          {job.priority.toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {job.customer?.name || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {formatFrequency(job)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {job.next_scheduled_date
                        ? new Date(job.next_scheduled_date + 'T00:00:00').toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {job.total_amount ? `$${Number(job.total_amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActive(job)}
                        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                          job.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        }`}
                      >
                        {job.is_active ? (
                          <>
                            <Play size={12} />
                            Active
                          </>
                        ) : (
                          <>
                            <Pause size={12} />
                            Paused
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingJob(job)
                            setShowModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => toggleActive(job)}
                          className="text-yellow-600 hover:text-yellow-800 p-1"
                          title={job.is_active ? 'Pause' : 'Resume'}
                        >
                          {job.is_active ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                        <button
                          onClick={() => deleteRecurringJob(job.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showModal && (
          <RecurringJobModal
            job={editingJob}
            companyId={companyId!}
            customers={customers}
            workers={workers}
            onClose={() => setShowModal(false)}
            onSave={() => {
              setShowModal(false)
              if (companyId) fetchRecurringJobs(companyId)
            }}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

function RecurringJobModal({
  job,
  companyId,
  customers,
  workers,
  onClose,
  onSave,
}: {
  job: RecurringJob | null
  companyId: string
  customers: Customer[]
  workers: Worker[]
  onClose: () => void
  onSave: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: job?.title || '',
    description: job?.description || '',
    customer_id: job?.customer_id || '',
    address: job?.address || '',
    city: job?.city || '',
    state: job?.state || '',
    zip: job?.zip || '',
    frequency: job?.frequency || 'weekly',
    interval_days: job?.interval_days?.toString() || '14',
    day_of_week: job?.day_of_week?.toString() || '1',
    day_of_month: job?.day_of_month?.toString() || '1',
    preferred_time_start: job?.preferred_time_start?.slice(0, 5) || '09:00',
    preferred_time_end: job?.preferred_time_end?.slice(0, 5) || '10:00',
    starts_at: job?.starts_at || new Date().toISOString().split('T')[0],
    ends_at: job?.ends_at || '',
    max_occurrences: job?.max_occurrences?.toString() || '',
    assigned_worker_ids: job?.assigned_worker_ids || [],
    total_amount: job?.total_amount?.toString() || '',
    priority: job?.priority || 'normal',
    auto_invoice: job?.auto_invoice || false,
    notes: job?.notes || '',
  })

  const handleCustomerChange = async (customerId: string) => {
    setFormData(prev => ({ ...prev, customer_id: customerId }))
    if (customerId) {
      const { data: customer } = await supabase
        .from('customers')
        .select('address, city, state, zip')
        .eq('id', customerId)
        .single()
      if (customer) {
        setFormData(prev => ({
          ...prev,
          customer_id: customerId,
          address: customer.address || prev.address,
          city: customer.city || prev.city,
          state: customer.state || prev.state,
          zip: customer.zip || prev.zip,
        }))
      }
    }
  }

  const toggleWorker = (workerId: string) => {
    setFormData(prev => {
      const ids = prev.assigned_worker_ids.includes(workerId)
        ? prev.assigned_worker_ids.filter(id => id !== workerId)
        : [...prev.assigned_worker_ids, workerId]
      return { ...prev, assigned_worker_ids: ids }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      alert('Title is required.')
      return
    }

    setSaving(true)

    const dayOfWeek = (formData.frequency === 'weekly' || formData.frequency === 'biweekly')
      ? parseInt(formData.day_of_week)
      : null
    const dayOfMonth = formData.frequency === 'monthly'
      ? parseInt(formData.day_of_month)
      : null
    const intervalDays = formData.frequency === 'custom'
      ? parseInt(formData.interval_days) || 14
      : null

    const nextDate = calculateNextDate(
      formData.frequency,
      formData.starts_at,
      dayOfWeek,
      dayOfMonth,
      intervalDays,
    )

    const payload = {
      company_id: companyId,
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      address: formData.address.trim() || null,
      city: formData.city.trim() || null,
      state: formData.state.trim() || null,
      zip: formData.zip.trim() || null,
      customer_id: formData.customer_id || null,
      assigned_worker_ids: formData.assigned_worker_ids,
      total_amount: formData.total_amount ? parseFloat(formData.total_amount) : null,
      priority: formData.priority,
      frequency: formData.frequency,
      interval_days: intervalDays,
      day_of_week: dayOfWeek,
      day_of_month: dayOfMonth,
      preferred_time_start: formData.preferred_time_start,
      preferred_time_end: formData.preferred_time_end,
      starts_at: formData.starts_at,
      ends_at: formData.ends_at || null,
      max_occurrences: formData.max_occurrences ? parseInt(formData.max_occurrences) : null,
      auto_invoice: formData.auto_invoice,
      notes: formData.notes.trim() || null,
      next_scheduled_date: nextDate,
      updated_at: new Date().toISOString(),
    }

    if (job) {
      const { error } = await supabase
        .from('recurring_jobs')
        .update(payload)
        .eq('id', job.id)
      if (error) {
        alert('Failed to update recurring job: ' + error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase
        .from('recurring_jobs')
        .insert(payload)
      if (error) {
        alert('Failed to create recurring job: ' + error.message)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {job ? 'Edit Recurring Job' : 'Create Recurring Job'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Weekly Lawn Mowing"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Job details, special instructions..."
            />
          </div>

          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              value={formData.customer_id}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="123 Main St"
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                maxLength={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
              <input
                type="text"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Frequency */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Repeat size={16} />
              Recurrence Schedule
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency *</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 Weeks</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom Interval</option>
              </select>
            </div>

            {/* Day of Week (weekly / biweekly) */}
            {(formData.frequency === 'weekly' || formData.frequency === 'biweekly') && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData({ ...formData, day_of_week: idx.toString() })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        formData.day_of_week === idx.toString()
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Day of Month (monthly) */}
            {formData.frequency === 'monthly' && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Day of Month (1-28)</label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={formData.day_of_month}
                  onChange={(e) => setFormData({ ...formData, day_of_month: e.target.value })}
                  className="w-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Custom interval */}
            {formData.frequency === 'custom' && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Repeat every (days)</label>
                <input
                  type="number"
                  min={1}
                  value={formData.interval_days}
                  onChange={(e) => setFormData({ ...formData, interval_days: e.target.value })}
                  className="w-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Time Window */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Start Time</label>
              <input
                type="time"
                value={formData.preferred_time_start}
                onChange={(e) => setFormData({ ...formData, preferred_time_start: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred End Time</label>
              <input
                type="time"
                value={formData.preferred_time_end}
                onChange={(e) => setFormData({ ...formData, preferred_time_end: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={formData.starts_at}
                onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={formData.ends_at}
                onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Max Occurrences */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Occurrences <span className="text-gray-400 font-normal">(optional, leave blank for unlimited)</span>
            </label>
            <input
              type="number"
              min={1}
              value={formData.max_occurrences}
              onChange={(e) => setFormData({ ...formData, max_occurrences: e.target.value })}
              className="w-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Unlimited"
            />
          </div>

          {/* Assigned Workers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Workers</label>
            <div className="flex flex-wrap gap-2">
              {workers.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => toggleWorker(w.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    formData.assigned_worker_ids.includes(w.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {w.full_name}
                </button>
              ))}
              {workers.length === 0 && (
                <p className="text-sm text-gray-400">No team members found.</p>
              )}
            </div>
          </div>

          {/* Price & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Auto-Invoice Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, auto_invoice: !formData.auto_invoice })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.auto_invoice ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.auto_invoice ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <label className="text-sm font-medium text-gray-700">Auto-generate invoice</label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Internal notes about this recurring schedule..."
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : job ? 'Update Recurring Job' : 'Create Recurring Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
