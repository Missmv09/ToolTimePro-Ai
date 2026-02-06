'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  notes: string
  source: string
  created_at: string
  jobs?: { id: string; status: string }[]
  invoices?: { id: string; status: string; total: number }[]
}

export default function ClientsPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

  const router = useRouter()
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
      fetchCustomers(companyId)
    } else {
      // No company_id yet, stop loading to avoid infinite loop
      setLoading(false)
    }
  }, [authLoading, user, companyId, router])

  const fetchCustomers = async (companyId: string) => {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        jobs:jobs(id, status),
        invoices:invoices(id, status, total)
      `)
      .eq('company_id', companyId)
      .order('name')

    if (error) {
      console.error('Error fetching customers:', error)
    } else {
      setCustomers(data || [])
    }
    setLoading(false)
  }

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  )

  const deleteCustomer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return

    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) {
      alert('Failed to delete client: ' + error.message)
      return
    }
    if (companyId) fetchCustomers(companyId)
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
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <button
          onClick={() => {
            setEditingCustomer(null)
            setShowModal(true)
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Client
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search clients by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-500">Total Clients</p>
          <p className="text-2xl font-bold">{customers.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-500">Active Jobs</p>
          <p className="text-2xl font-bold">
            {customers.reduce((sum, c) => sum + (c.jobs?.filter(j => j.status === 'scheduled' || j.status === 'in_progress').length || 0), 0)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-500">Unpaid Invoices</p>
          <p className="text-2xl font-bold">
            {customers.reduce((sum, c) => sum + (c.invoices?.filter(i => i.status !== 'paid').length || 0), 0)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold">
            ${customers.reduce((sum, c) => sum + (c.invoices?.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0) || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Clients Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-gray-500">No clients found. Add your first client or convert a lead.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <div key={customer.id} className="bg-white rounded-xl border p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                  <p className="text-sm text-gray-500">{customer.email}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditingCustomer(customer)
                      setShowModal(true)
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteCustomer(customer.id)}
                    className="p-2 text-gray-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {customer.phone && (
                <p className="text-sm text-gray-600 mb-2">Phone: {customer.phone}</p>
              )}

              {customer.address && (
                <p className="text-sm text-gray-600 mb-4">
                  {customer.address}, {customer.city} {customer.state} {customer.zip}
                </p>
              )}

              <div className="flex gap-4 text-sm border-t pt-4">
                <div>
                  <span className="text-gray-500">Jobs: </span>
                  <span className="font-medium">{customer.jobs?.length || 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">Invoices: </span>
                  <span className="font-medium">{customer.invoices?.length || 0}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Link
                  href={`/dashboard/jobs?customer=${customer.id}`}
                  className="flex-1 text-center py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  View Jobs
                </Link>
                <Link
                  href={`/dashboard/quotes?customer=${customer.id}`}
                  className="flex-1 text-center py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                >
                  New Quote
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <CustomerModal
          customer={editingCustomer}
          companyId={companyId!}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false)
            if (companyId) fetchCustomers(companyId)
          }}
        />
      )}
    </div>
  )
}

// Validation helpers
const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
}

const isValidEmail = (email: string): boolean => {
  if (!email) return true // Empty is valid (optional field)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const isValidPhone = (phone: string): boolean => {
  if (!phone) return true // Empty is valid (optional field)
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10
}

function CustomerModal({ customer, companyId, onClose, onSave }: {
  customer: Customer | null
  companyId: string
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    city: customer?.city || '',
    state: customer?.state || '',
    zip: customer?.zip || '',
    notes: customer?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; phone?: string }>({})

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value)
    setFormData({ ...formData, phone: formatted })
    if (formatted && !isValidPhone(formatted)) {
      setErrors({ ...errors, phone: 'Please enter a valid 10-digit phone number' })
    } else {
      setErrors({ ...errors, phone: undefined })
    }
  }

  const handleEmailChange = (value: string) => {
    setFormData({ ...formData, email: value })
    if (value && !isValidEmail(value)) {
      setErrors({ ...errors, email: 'Please enter a valid email address' })
    } else {
      setErrors({ ...errors, email: undefined })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate before submitting
    const newErrors: { email?: string; phone?: string } = {}
    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (formData.phone && !isValidPhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSaving(true)

    const data = { ...formData, company_id: companyId }

    if (customer) {
      const { error } = await supabase.from('customers').update(data).eq('id', customer.id)
      if (error) {
        alert('Failed to update client: ' + error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase.from('customers').insert(data)
      if (error) {
        alert('Failed to add client: ' + error.message)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{customer ? 'Edit Client' : 'Add New Client'}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : ''}`}
                placeholder="email@example.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.phone ? 'border-red-500' : ''}`}
                placeholder="(555) 123-4567"
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
              {saving ? 'Saving...' : 'Save Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
