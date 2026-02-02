'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface Job {
  id: string
  title: string
  description: string
  address: string
  city: string
  state: string
  zip: string
  scheduled_date: string
  scheduled_time_start: string
  scheduled_time_end: string
  status: string
  priority: string
  price: number
  quote_id: string | null
  customer: { id: string; name: string } | null
  assigned_users: { user: { id: string; full_name: string } }[]
}

interface Quote {
  id: string
  quote_number: string
  title: string
  total: number
  customer_id: string
  customer: { id: string; name: string; address: string; city: string; state: string; zip: string }[] | null
}

function JobsContent() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
  const [workers, setWorkers] = useState<{ id: string; full_name: string }[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const customerFilter = searchParams.get('customer')
  const { user, dbUser, isLoading: authLoading } = useAuth()

  // Get company_id from AuthContext
  const companyId = dbUser?.company_id || null

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return

    // Redirect if not authenticated
    if (!user) {
      router.push('/auth/login')
      return
    }

    // Fetch data once we have a company_id
    if (companyId) {
      fetchJobs(companyId)
      fetchCustomers(companyId)
      fetchWorkers(companyId)
      fetchQuotes(companyId)
    } else {
      // No company_id yet, stop loading to avoid infinite loop
      setLoading(false)
    }
  }, [authLoading, user, companyId, router])

  const fetchJobs = async (companyId: string) => {
    let query = supabase
      .from('jobs')
      .select(`
        *,
        customer:customers(id, name),
        assigned_users:job_assignments(user:users(id, full_name))
      `)
      .eq('company_id', companyId)
      .order('scheduled_date', { ascending: true })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    if (customerFilter) {
      query = query.eq('customer_id', customerFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching jobs:', error)
    } else {
      setJobs(data || [])
    }
    setLoading(false)
  }

  const fetchCustomers = async (companyId: string) => {
    const { data } = await supabase
      .from('customers')
      .select('id, name')
      .eq('company_id', companyId)
      .order('name')
    setCustomers(data || [])
  }

  const fetchWorkers = async (companyId: string) => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('company_id', companyId)
      .eq('is_active', true)
    setWorkers(data || [])
  }

  const fetchQuotes = async (companyId: string) => {
    const { data } = await supabase
      .from('quotes')
      .select('id, quote_number, title, total, customer_id, customer:customers(id, name, address, city, state, zip)')
      .eq('company_id', companyId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
    setQuotes(data || [])
  }

  useEffect(() => {
    if (companyId) {
      fetchJobs(companyId)
    }
  }, [filter, companyId, customerFilter])

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    const updates: Record<string, string> = { status: newStatus, updated_at: new Date().toISOString() }

    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString()
    }

    await supabase.from('jobs').update(updates).eq('id', jobId)
    if (companyId) fetchJobs(companyId)
  }

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-700',
  }

  const priorityColors: Record<string, string> = {
    low: 'text-gray-500',
    normal: 'text-blue-500',
    high: 'text-orange-500',
    urgent: 'text-red-500',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
        <button
          onClick={() => {
            setEditingJob(null)
            setShowModal(true)
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Job
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'scheduled', 'in_progress', 'completed', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
          </button>
        ))}
      </div>

      {/* Jobs List */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No jobs found. Create your first job to get started.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{job.title}</p>
                    <p className="text-sm text-gray-500 truncate max-w-xs">{job.address}</p>
                    {job.priority !== 'normal' && (
                      <span className={`text-xs ${priorityColors[job.priority]}`}>
                        {job.priority.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {job.customer?.name || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">
                      {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : 'Unscheduled'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {job.scheduled_time_start || ''} {job.scheduled_time_end ? `- ${job.scheduled_time_end}` : ''}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {job.assigned_users?.map(a => a.user?.full_name).filter(Boolean).join(', ') || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={job.status}
                      onChange={(e) => updateJobStatus(job.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-full border-0 ${statusColors[job.status] || 'bg-gray-100'}`}
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {job.price ? `$${job.price.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => {
                        setEditingJob(job)
                        setShowModal(true)
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <JobModal
          job={editingJob}
          companyId={companyId!}
          customers={customers}
          workers={workers}
          quotes={quotes}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false)
            if (companyId) fetchJobs(companyId)
          }}
        />
      )}
    </div>
  )
}

function JobModal({ job, companyId, customers, workers, quotes, onClose, onSave }: {
  job: Job | null
  companyId: string
  customers: { id: string; name: string }[]
  workers: { id: string; full_name: string }[]
  quotes: Quote[]
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    title: job?.title || '',
    description: job?.description || '',
    customer_id: job?.customer?.id || '',
    quote_id: job?.quote_id || '',
    address: job?.address || '',
    city: job?.city || '',
    state: job?.state || '',
    zip: job?.zip || '',
    scheduled_date: job?.scheduled_date || '',
    scheduled_time_start: job?.scheduled_time_start || '',
    scheduled_time_end: job?.scheduled_time_end || '',
    priority: job?.priority || 'normal',
    price: job?.price?.toString() || '',
    assigned_worker_id: job?.assigned_users?.[0]?.user?.id || '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ address?: string; scheduled_date?: string; scheduled_time_start?: string }>({})

  const validateForm = (): boolean => {
    const newErrors: { address?: string; scheduled_date?: string; scheduled_time_start?: string } = {}

    if (!formData.address.trim()) {
      newErrors.address = 'Service address is required'
    }
    if (!formData.scheduled_date) {
      newErrors.scheduled_date = 'Scheduled date is required'
    }
    if (!formData.scheduled_time_start) {
      newErrors.scheduled_time_start = 'Start time is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Auto-fill fields when quote is selected
  const handleQuoteChange = (quoteId: string) => {
    if (!quoteId) {
      setFormData({ ...formData, quote_id: '' })
      return
    }

    const quote = quotes.find(q => q.id === quoteId)
    if (quote) {
      const customer = quote.customer?.[0] // Supabase returns array for joins
      setFormData(prev => ({
        ...prev,
        quote_id: quoteId,
        title: quote.title || prev.title,
        price: quote.total?.toString() || prev.price,
        customer_id: quote.customer_id || prev.customer_id,
        address: customer?.address || prev.address,
        city: customer?.city || prev.city,
        state: customer?.state || prev.state,
        zip: customer?.zip || prev.zip,
      }))
    }
  }

  // Auto-fill address when customer is selected
  const handleCustomerChange = async (customerId: string) => {
    setFormData({ ...formData, customer_id: customerId })

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSaving(true)

    const jobData = {
      title: formData.title,
      description: formData.description,
      customer_id: formData.customer_id || null,
      quote_id: formData.quote_id || null,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zip: formData.zip,
      scheduled_date: formData.scheduled_date,
      scheduled_time_start: formData.scheduled_time_start,
      scheduled_time_end: formData.scheduled_time_end || null,
      priority: formData.priority,
      total_amount: formData.price ? Number(formData.price) : null,
      company_id: companyId,
      status: job?.status || 'scheduled',
    }

    let jobId = job?.id

    if (job) {
      await supabase.from('jobs').update(jobData).eq('id', job.id)
    } else {
      const { data } = await supabase.from('jobs').insert(jobData).select().single()
      jobId = data?.id
    }

    // Handle worker assignment
    if (jobId && formData.assigned_worker_id) {
      // Remove existing assignments
      await supabase.from('job_assignments').delete().eq('job_id', jobId)

      // Add new assignment
      await supabase.from('job_assignments').insert({
        job_id: jobId,
        user_id: formData.assigned_worker_id,
      })
    }

    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{job ? 'Edit Job' : 'Create New Job'}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Weekly pool cleaning"
            />
          </div>

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

          {quotes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Quote <span className="text-gray-400 font-normal">(auto-fills price)</span>
              </label>
              <select
                value={formData.quote_id}
                onChange={(e) => handleQuoteChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No quote linked</option>
                {quotes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.quote_number} - {q.customer?.[0]?.name || 'Unknown'} - ${q.total?.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => {
                setFormData({ ...formData, address: e.target.value })
                if (errors.address) setErrors({ ...errors, address: undefined })
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.address ? 'border-red-500' : ''}`}
              placeholder="123 Main St"
            />
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="CA"
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
                placeholder="12345"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={formData.scheduled_date}
                onChange={(e) => {
                  setFormData({ ...formData, scheduled_date: e.target.value })
                  if (errors.scheduled_date) setErrors({ ...errors, scheduled_date: undefined })
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.scheduled_date ? 'border-red-500' : ''}`}
              />
              {errors.scheduled_date && <p className="text-red-500 text-xs mt-1">{errors.scheduled_date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
              <select
                value={formData.assigned_worker_id}
                onChange={(e) => setFormData({ ...formData, assigned_worker_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Unassigned</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>{w.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
              <input
                type="time"
                required
                value={formData.scheduled_time_start}
                onChange={(e) => {
                  setFormData({ ...formData, scheduled_time_start: e.target.value })
                  if (errors.scheduled_time_start) setErrors({ ...errors, scheduled_time_start: undefined })
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.scheduled_time_start ? 'border-red-500' : ''}`}
              />
              {errors.scheduled_time_start && <p className="text-red-500 text-xs mt-1">{errors.scheduled_time_start}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={formData.scheduled_time_end}
                onChange={(e) => setFormData({ ...formData, scheduled_time_end: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price ($) {formData.quote_id && <span className="text-green-600 font-normal">(from quote)</span>}
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formData.quote_id ? 'bg-green-50' : ''}`}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Job details, special instructions..."
            />
          </div>

          <div className="flex gap-3 pt-4">
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
              {saving ? 'Saving...' : 'Save Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function JobsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <JobsContent />
    </Suspense>
  )
}
