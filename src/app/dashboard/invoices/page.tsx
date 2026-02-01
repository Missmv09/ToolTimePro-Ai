'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface Invoice {
  id: string
  invoice_number: string
  customer_id: string
  customer: { id: string; name: string; email: string } | null
  status: string
  subtotal: number
  tax: number
  total: number
  notes: string
  due_date: string
  paid_at: string | null
  created_at: string
  items?: { id: string; description: string; quantity: number; unit_price: number; total: number }[]
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<{ id: string; name: string; email: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)

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
      fetchInvoices(companyId)
      fetchCustomers(companyId)
    } else {
      // No company_id yet, stop loading to avoid infinite loop
      setLoading(false)
    }
  }, [authLoading, user, companyId, router])

  const fetchInvoices = async (compId: string) => {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(id, name, email),
        items:invoice_items(*)
      `)
      .eq('company_id', compId)
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching invoices:', error)
    } else {
      setInvoices(data || [])
    }
    setLoading(false)
  }

  const fetchCustomers = async (compId: string) => {
    const { data } = await supabase
      .from('customers')
      .select('id, name, email')
      .eq('company_id', compId)
      .order('name')
    setCustomers(data || [])
  }

  useEffect(() => {
    if (companyId) {
      fetchInvoices(companyId)
    }
  }, [filter, companyId])

  const updateInvoiceStatus = async (invoiceId: string, newStatus: string) => {
    const updates: { status: string; updated_at: string; paid_at?: string } = {
      status: newStatus,
      updated_at: new Date().toISOString()
    }

    if (newStatus === 'paid') {
      updates.paid_at = new Date().toISOString()
    }

    await supabase.from('invoices').update(updates).eq('id', invoiceId)
    if (companyId) fetchInvoices(companyId)
  }

  const markAsPaid = async (invoice: Invoice) => {
    await updateInvoiceStatus(invoice.id, 'paid')

    // Record payment
    await supabase.from('payments').insert({
      company_id: companyId,
      invoice_id: invoice.id,
      customer_id: invoice.customer_id,
      amount: invoice.total,
      payment_method: 'manual',
      status: 'completed',
    })
  }

  const sendReminder = async (invoice: Invoice) => {
    // TODO: Integrate with email service
    alert(`Reminder would be sent to ${invoice.customer?.email}`)
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    viewed: 'bg-purple-100 text-purple-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
  }

  // Check for overdue invoices
  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === 'paid' || invoice.status === 'cancelled') return false
    if (!invoice.due_date) return false
    return new Date(invoice.due_date) < new Date()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const totalOutstanding = invoices
    .filter(i => ['sent', 'viewed', 'overdue'].includes(i.status) || isOverdue(i))
    .reduce((sum, i) => sum + i.total, 0)

  const totalOverdue = invoices
    .filter(i => isOverdue(i))
    .reduce((sum, i) => sum + i.total, 0)

  const totalPaidThisMonth = invoices
    .filter(i => i.status === 'paid' && i.paid_at && new Date(i.paid_at).getMonth() === new Date().getMonth())
    .reduce((sum, i) => sum + i.total, 0)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <button
          onClick={() => {
            setEditingInvoice(null)
            setShowModal(true)
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'draft', 'sent', 'paid', 'overdue'].map((status) => (
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-500">Total Invoices</p>
          <p className="text-2xl font-bold">{invoices.length}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-600">Outstanding</p>
          <p className="text-2xl font-bold text-yellow-700">${totalOutstanding.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-sm text-red-600">Overdue</p>
          <p className="text-2xl font-bold text-red-700">${totalOverdue.toLocaleString()}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-600">Paid This Month</p>
          <p className="text-2xl font-bold text-green-700">${totalPaidThisMonth.toLocaleString()}</p>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No invoices found. Create an invoice or convert an accepted quote.
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => {
                const overdue = isOverdue(invoice)
                return (
                  <tr key={invoice.id} className={`hover:bg-gray-50 ${overdue ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`}</p>
                      <p className="text-sm text-gray-500">{new Date(invoice.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{invoice.customer?.name || '-'}</p>
                      <p className="text-sm text-gray-500">{invoice.customer?.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">${invoice.total?.toLocaleString() || '0'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        overdue ? 'bg-red-100 text-red-700' : statusColors[invoice.status] || 'bg-gray-100'
                      }`}>
                        {overdue ? 'Overdue' : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingInvoice(invoice)
                            setShowModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        {invoice.status !== 'paid' && (
                          <>
                            <button
                              onClick={() => markAsPaid(invoice)}
                              className="text-green-600 hover:text-green-800 text-sm"
                            >
                              Mark Paid
                            </button>
                            {(invoice.status === 'sent' || overdue) && (
                              <button
                                onClick={() => sendReminder(invoice)}
                                className="text-orange-600 hover:text-orange-800 text-sm"
                              >
                                Remind
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <InvoiceModal
          invoice={editingInvoice}
          companyId={companyId!}
          customers={customers}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false)
            if (companyId) fetchInvoices(companyId)
          }}
        />
      )}
    </div>
  )
}

function InvoiceModal({ invoice, companyId, customers, onClose, onSave }: {
  invoice: Invoice | null
  companyId: string
  customers: { id: string; name: string; email: string }[]
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    customer_id: invoice?.customer_id || '',
    notes: invoice?.notes || '',
    due_date: invoice?.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    tax_rate: invoice?.tax ? ((invoice.tax / (invoice.subtotal || 1)) * 100).toFixed(2) : '0',
  })
  const [items, setItems] = useState<{ description: string; quantity: number; unit_price: number }[]>(
    invoice?.items?.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })) ||
    [{ description: '', quantity: 1, unit_price: 0 }]
  )
  const [saving, setSaving] = useState(false)
  const [customerError, setCustomerError] = useState<string | null>(null)

  const addItem = () => setItems([...items, { description: '', quantity: 1, unit_price: 0 }])
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index))
  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  const taxRate = parseFloat(formData.tax_rate) || 0
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate customer is selected
    if (!formData.customer_id) {
      setCustomerError('Please select a customer')
      return
    }

    setSaving(true)

    const invoiceData = {
      company_id: companyId,
      customer_id: formData.customer_id,
      notes: formData.notes,
      due_date: formData.due_date,
      subtotal,
      tax,
      total,
      status: invoice?.status || 'draft',
    }

    let invoiceId = invoice?.id

    if (invoice) {
      await supabase.from('invoices').update(invoiceData).eq('id', invoice.id)
      await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id)
    } else {
      const { data } = await supabase.from('invoices').insert(invoiceData).select().single()
      invoiceId = data?.id
    }

    if (invoiceId && items.length > 0) {
      const invoiceItems = items.filter(i => i.description).map(item => ({
        invoice_id: invoiceId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
      }))

      if (invoiceItems.length > 0) {
        await supabase.from('invoice_items').insert(invoiceItems)
      }
    }

    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{invoice ? 'Edit Invoice' : 'Create New Invoice'}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
              <select
                value={formData.customer_id}
                onChange={(e) => {
                  setFormData({ ...formData, customer_id: e.target.value })
                  setCustomerError(null)
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${customerError ? 'border-red-500' : ''}`}
                required
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {customerError && <p className="text-red-500 text-xs mt-1">{customerError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Line Items</label>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                    className="w-20 px-3 py-2 border rounded-lg text-sm"
                    min="1"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                    className="w-28 px-3 py-2 border rounded-lg text-sm"
                    step="0.01"
                  />
                  <span className="w-24 py-2 text-sm text-right font-medium">
                    ${(item.quantity * item.unit_price).toFixed(2)}
                  </span>
                  <button type="button" onClick={() => removeItem(index)} className="p-2 text-red-500">✕</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem} className="mt-2 text-sm text-blue-600 hover:text-blue-800">
              + Add line item
            </button>
          </div>

          {/* Totals */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Tax Rate</span>
                <input
                  type="number"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                  className="w-16 px-2 py-1 border rounded text-sm text-right"
                  step="0.01"
                  min="0"
                  max="100"
                />
                <span className="text-gray-600">%</span>
              </div>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Payment terms, thank you message..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
