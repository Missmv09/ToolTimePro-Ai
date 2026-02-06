'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  service_requested: string
  message: string
  source: string
  status: string
  estimated_value: number | null
  created_at: string
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)

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
      fetchLeads(companyId)
    } else {
      // No company_id yet, stop loading to avoid infinite loop
      setLoading(false)
    }
  }, [authLoading, user, companyId, router])

  const fetchLeads = async (companyId: string) => {
    let query = supabase
      .from('leads')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching leads:', error)
    } else {
      setLeads(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (companyId) {
      fetchLeads(companyId)
    }
  }, [filter, companyId])

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    const { error } = await supabase
      .from('leads')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', leadId)

    if (!error && companyId) {
      fetchLeads(companyId)
    }
  }

  const deleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId)

      if (error) {
        console.error('Error deleting lead:', error)
        alert('Failed to delete lead: ' + error.message)
        return
      }

      if (companyId) {
        fetchLeads(companyId)
      }
    } catch (err: any) {
      console.error('Error deleting lead:', err)
      alert('Failed to delete lead: ' + (err.message || 'Unknown error'))
    }
  }

  const convertToCustomer = async (lead: Lead) => {
    if (!companyId) return

    // Create customer from lead
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        company_id: companyId,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        notes: lead.message,
      })
      .select()
      .single()

    if (customerError) {
      console.error('Error creating customer:', customerError)
      return
    }

    // Update lead status and link to customer
    await supabase
      .from('leads')
      .update({
        status: 'won',
        customer_id: customer.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.id)

    fetchLeads(companyId)
    alert('Lead converted to customer!')
  }

  const statusColors: Record<string, string> = {
    new: 'bg-green-100 text-green-700',
    contacted: 'bg-blue-100 text-blue-700',
    quoted: 'bg-yellow-100 text-yellow-700',
    won: 'bg-purple-100 text-purple-700',
    lost: 'bg-gray-100 text-gray-700',
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
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <button
          onClick={() => {
            setEditingLead(null)
            setShowModal(true)
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Lead
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['all', 'new', 'contacted', 'quoted', 'won', 'lost'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold">{leads.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-600">New</p>
          <p className="text-2xl font-bold text-green-700">
            {leads.filter(l => l.status === 'new').length}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-600">Contacted</p>
          <p className="text-2xl font-bold text-blue-700">
            {leads.filter(l => l.status === 'contacted').length}
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-600">Quoted</p>
          <p className="text-2xl font-bold text-yellow-700">
            {leads.filter(l => l.status === 'quoted').length}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-600">Won</p>
          <p className="text-2xl font-bold text-purple-700">
            {leads.filter(l => l.status === 'won').length}
          </p>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No leads found. Leads from your website form will appear here.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{lead.name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{lead.email}</p>
                    <p className="text-sm text-gray-500">{lead.phone}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {lead.service_requested || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {lead.source || 'website'}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={lead.status}
                      onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-full border-0 ${statusColors[lead.status] || 'bg-gray-100'}`}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="quoted">Quoted</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {lead.phone && (
                        <a
                          href={`tel:${lead.phone}`}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Call
                        </a>
                      )}
                      {lead.status !== 'won' && (
                        <button
                          onClick={() => convertToCustomer(lead)}
                          className="text-green-600 hover:text-green-800 text-sm"
                        >
                          Convert
                        </button>
                      )}
                      <button
                        onClick={() => deleteLead(lead.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Lead Modal */}
      {showModal && (
        <LeadModal
          lead={editingLead}
          companyId={companyId!}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false)
            if (companyId) fetchLeads(companyId)
          }}
        />
      )}
    </div>
  )
}

function LeadModal({ lead, companyId, onClose, onSave }: {
  lead: Lead | null
  companyId: string
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    name: lead?.name || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    service_requested: lead?.service_requested || '',
    message: lead?.message || '',
    source: lead?.source || 'manual',
    estimated_value: lead?.estimated_value?.toString() || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const data = {
      ...formData,
      company_id: companyId,
      estimated_value: formData.estimated_value ? Number(formData.estimated_value) : null,
      status: lead ? lead.status : 'new',
    }

    try {
      if (lead) {
        const { error } = await supabase.from('leads').update(data).eq('id', lead.id)
        if (error) {
          console.error('Error updating lead:', error)
          alert('Failed to update lead: ' + error.message)
          setSaving(false)
          return
        }
      } else {
        const { error } = await supabase.from('leads').insert(data)
        if (error) {
          console.error('Error creating lead:', error)
          alert('Failed to create lead: ' + error.message)
          setSaving(false)
          return
        }
      }
    } catch (err: any) {
      console.error('Error saving lead:', err)
      alert('Failed to save lead: ' + (err.message || 'Unknown error'))
      setSaving(false)
      return
    }

    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">{lead ? 'Edit Lead' : 'Add New Lead'}</h2>

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Requested</label>
            <input
              type="text"
              value={formData.service_requested}
              onChange={(e) => setFormData({ ...formData, service_requested: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Pool cleaning, Lawn care"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Value ($)</label>
            <input
              type="number"
              value={formData.estimated_value}
              onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
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
              {saving ? 'Saving...' : 'Save Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
