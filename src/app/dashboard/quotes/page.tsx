'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface QuoteItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface Quote {
  id: string
  quote_number: string
  customer_id: string
  customer: { id: string; name: string; email: string } | null
  status: string
  subtotal: number
  tax: number
  total: number
  notes: string
  valid_until: string
  created_at: string
  items?: QuoteItem[]
}

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}

function QuotesContent() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [customers, setCustomers] = useState<{ id: string; name: string; email: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const customerFilter = searchParams.get('customer')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (userData?.company_id) {
        setCompanyId(userData.company_id)
        fetchQuotes(userData.company_id)
        fetchCustomers(userData.company_id)
      }
    }
    init()
  }, [router])

  const fetchQuotes = async (compId: string) => {
    let query = supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(id, name, email),
        items:quote_items(*)
      `)
      .eq('company_id', compId)
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    if (customerFilter) {
      query = query.eq('customer_id', customerFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching quotes:', error)
    } else {
      setQuotes(data || [])
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
      fetchQuotes(companyId)
    }
  }, [filter, companyId, customerFilter])

  const updateQuoteStatus = async (quoteId: string, newStatus: string) => {
    await supabase
      .from('quotes')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', quoteId)

    if (companyId) fetchQuotes(companyId)
  }

  const convertToInvoice = async (quote: Quote) => {
    if (!companyId) return

    // Create invoice from quote
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        company_id: companyId,
        customer_id: quote.customer_id,
        quote_id: quote.id,
        subtotal: quote.subtotal,
        tax: quote.tax,
        total: quote.total,
        status: 'draft',
        notes: quote.notes,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating invoice:', error)
      alert('Error creating invoice')
      return
    }

    // Copy quote items to invoice items
    if (quote.items && quote.items.length > 0) {
      const invoiceItems = quote.items.map(item => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      }))

      await supabase.from('invoice_items').insert(invoiceItems)
    }

    // Update quote status
    await supabase
      .from('quotes')
      .update({ status: 'accepted' })
      .eq('id', quote.id)

    fetchQuotes(companyId)
    alert('Invoice created! Go to Invoices to send it.')
  }

  const duplicateQuote = async (quote: Quote) => {
    if (!companyId) return

    const { data: newQuote } = await supabase
      .from('quotes')
      .insert({
        company_id: companyId,
        customer_id: quote.customer_id,
        subtotal: quote.subtotal,
        tax: quote.tax,
        total: quote.total,
        notes: quote.notes,
        status: 'draft',
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      })
      .select()
      .single()

    if (newQuote && quote.items) {
      const newItems = quote.items.map(item => ({
        quote_id: newQuote.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      }))
      await supabase.from('quote_items').insert(newItems)
    }

    fetchQuotes(companyId)
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    viewed: 'bg-purple-100 text-purple-700',
    accepted: 'bg-green-100 text-green-700',
    declined: 'bg-red-100 text-red-700',
    expired: 'bg-yellow-100 text-yellow-700',
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
        <button
          onClick={() => {
            setEditingQuote(null)
            setShowModal(true)
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Quote
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'draft', 'sent', 'viewed', 'accepted', 'declined'].map((status) => (
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
          <p className="text-sm text-gray-500">Total Quotes</p>
          <p className="text-2xl font-bold">{quotes.length}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-600">Pending</p>
          <p className="text-2xl font-bold text-blue-700">
            ${quotes.filter(q => ['sent', 'viewed'].includes(q.status)).reduce((sum, q) => sum + q.total, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-600">Accepted</p>
          <p className="text-2xl font-bold text-green-700">
            ${quotes.filter(q => q.status === 'accepted').reduce((sum, q) => sum + q.total, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border">
          <p className="text-sm text-gray-500">Conversion Rate</p>
          <p className="text-2xl font-bold">
            {quotes.length > 0
              ? Math.round((quotes.filter(q => q.status === 'accepted').length / quotes.filter(q => q.status !== 'draft').length) * 100) || 0
              : 0}%
          </p>
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quote #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Until</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {quotes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No quotes found. Create your first quote to get started.
                </td>
              </tr>
            ) : (
              quotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{quote.quote_number || `Q-${quote.id.slice(0, 8)}`}</p>
                    <p className="text-sm text-gray-500">{new Date(quote.created_at).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{quote.customer?.name || '-'}</p>
                    <p className="text-sm text-gray-500">{quote.customer?.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">${quote.total?.toLocaleString() || '0'}</p>
                    <p className="text-sm text-gray-500">{quote.items?.length || 0} items</p>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={quote.status}
                      onChange={(e) => updateQuoteStatus(quote.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-full border-0 ${statusColors[quote.status] || 'bg-gray-100'}`}
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="viewed">Viewed</option>
                      <option value="accepted">Accepted</option>
                      <option value="declined">Declined</option>
                      <option value="expired">Expired</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingQuote(quote)
                          setShowModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => duplicateQuote(quote)}
                        className="text-gray-600 hover:text-gray-800 text-sm"
                      >
                        Copy
                      </button>
                      {quote.status === 'accepted' && (
                        <button
                          onClick={() => convertToInvoice(quote)}
                          className="text-green-600 hover:text-green-800 text-sm"
                        >
                          Invoice
                        </button>
                      )}
                      <Link
                        href={`/quote/${quote.id}`}
                        className="text-purple-600 hover:text-purple-800 text-sm"
                        target="_blank"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <QuoteModal
          quote={editingQuote}
          companyId={companyId!}
          customers={customers}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false)
            if (companyId) fetchQuotes(companyId)
          }}
        />
      )}
    </div>
  )
}

function QuoteModal({ quote, companyId, customers, onClose, onSave }: {
  quote: Quote | null
  companyId: string
  customers: { id: string; name: string; email: string }[]
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    customer_id: quote?.customer_id || '',
    notes: quote?.notes || '',
    valid_until: quote?.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  })
  const [items, setItems] = useState<{ description: string; quantity: number; unit_price: number }[]>(
    quote?.items?.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })) ||
    [{ description: '', quantity: 1, unit_price: 0 }]
  )
  const [saving, setSaving] = useState(false)

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
    const tax = subtotal * 0.0875 // CA sales tax estimate
    const total = subtotal + tax
    return { subtotal, tax, total }
  }

  const { subtotal, tax, total } = calculateTotals()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const quoteData = {
      company_id: companyId,
      customer_id: formData.customer_id || null,
      notes: formData.notes,
      valid_until: formData.valid_until,
      subtotal,
      tax,
      total,
      status: quote?.status || 'draft',
    }

    let quoteId = quote?.id

    if (quote) {
      await supabase.from('quotes').update(quoteData).eq('id', quote.id)
      // Delete existing items
      await supabase.from('quote_items').delete().eq('quote_id', quote.id)
    } else {
      const { data } = await supabase.from('quotes').insert(quoteData).select().single()
      quoteId = data?.id
    }

    // Insert items
    if (quoteId && items.length > 0) {
      const quoteItems = items.filter(i => i.description).map(item => ({
        quote_id: quoteId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
      }))

      if (quoteItems.length > 0) {
        await supabase.from('quote_items').insert(quoteItems)
      }
    }

    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{quote ? 'Edit Quote' : 'Create New Quote'}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
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
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              + Add line item
            </button>
          </div>

          {/* Totals */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax (8.75%)</span>
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
              placeholder="Payment terms, special conditions..."
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
              {saving ? 'Saving...' : 'Save Quote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function QuotesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <QuotesContent />
    </Suspense>
  )
}
