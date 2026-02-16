'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

interface QuoteItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
}

interface Quote {
  id: string
  quote_number: string
  customer_id: string
  customer: { id: string; name: string; email: string; phone: string | null } | null
  status: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  notes: string
  valid_until: string
  created_by: string | null
  sent_by: string | null
  created_at: string
  items?: QuoteItem[]
  creator?: { full_name: string } | null
  sender?: { full_name: string } | null
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
  const [filter, setFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null)
  const [showNewQuoteDropdown, setShowNewQuoteDropdown] = useState(false)
  const [sendingQuoteId, setSendingQuoteId] = useState<string | null>(null)
  const [deletingQuoteId, setDeletingQuoteId] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const customerFilter = searchParams.get('customer')
  const { user, dbUser, company, isLoading: authLoading } = useAuth()

  // Get company_id from AuthContext
  const companyId = dbUser?.company_id || null

  const fetchQuotes = useCallback(async (compId: string) => {
    let query = supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(id, name, email, phone),
        items:quote_items(*),
        creator:users!quotes_created_by_fkey(full_name),
        sender:users!quotes_sent_by_fkey(full_name)
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
  }, [filter, customerFilter])

  const fetchCustomers = async (compId: string) => {
    const { data } = await supabase
      .from('customers')
      .select('id, name, email')
      .eq('company_id', compId)
      .order('name')
    setCustomers(data || [])
  }

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
      fetchQuotes(companyId)
      fetchCustomers(companyId)
    } else {
      // No company_id yet, stop loading to avoid infinite loop
      setLoading(false)
    }
  }, [authLoading, user, companyId, router, fetchQuotes])

  useEffect(() => {
    if (companyId) {
      fetchQuotes(companyId)
    }
  }, [filter, companyId, customerFilter, fetchQuotes])

  const updateQuoteStatus = async (quoteId: string, newStatus: string) => {
    const { error } = await supabase
      .from('quotes')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', quoteId)

    if (error) {
      alert('Failed to update quote status: ' + error.message)
      return
    }

    if (companyId) fetchQuotes(companyId)
  }

  const sendQuote = async (quote: Quote) => {
    if (!companyId) return
    setSendingQuoteId(quote.id)

    // Update quote status to sent
    const { error } = await supabase
      .from('quotes')
      .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...(user ? { sent_by: user.id } : {}) })
      .eq('id', quote.id)

    if (error) {
      alert('Failed to send quote: ' + error.message)
      setSendingQuoteId(null)
      return
    }

    const quoteLink = `${window.location.origin}/quote/${quote.id}`

    // Send SMS if customer has phone
    if (quote.customer?.phone) {
      try {
        await fetch('/api/sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: quote.customer.phone,
            template: 'quote_sent',
            data: {
              customerName: quote.customer.name || 'Customer',
              companyName: company?.name || 'Our team',
              quoteLink,
            },
            companyId: companyId,
          }),
        })
      } catch {
        console.log('SMS notification skipped or failed for quote:', quote.id)
      }
    }

    // Send email if customer has email
    if (quote.customer?.email) {
      try {
        await fetch('/api/quote/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: quote.customer.email,
            customerName: quote.customer.name || 'Customer',
            quoteNumber: quote.quote_number || `Q-${quote.id.slice(0, 8)}`,
            items: quote.items?.map(i => ({
              description: i.description,
              quantity: i.quantity,
              unit_price: i.unit_price,
              total: i.total_price,
            })),
            subtotal: quote.subtotal,
            taxRate: quote.tax_rate,
            taxAmount: quote.tax_amount,
            total: quote.total,
            validUntil: quote.valid_until,
            notes: quote.notes,
            quoteLink,
            companyName: company?.name,
          }),
        })
      } catch {
        console.log('Email notification skipped or failed for quote:', quote.id)
      }
    }

    setSendingQuoteId(null)
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
        tax_rate: quote.tax_rate,
        tax_amount: quote.tax_amount,
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
        total_price: item.total_price,
      }))

      await supabase.from('invoice_items').insert(invoiceItems)
    }

    // Update quote status
    await supabase
      .from('quotes')
      .update({ status: 'approved' })
      .eq('id', quote.id)

    fetchQuotes(companyId)
    alert('Invoice created! Go to Invoices to send it.')
  }

  const duplicateQuote = async (quote: Quote) => {
    if (!companyId) return

    const { data: newQuote, error } = await supabase
      .from('quotes')
      .insert({
        company_id: companyId,
        customer_id: quote.customer_id,
        subtotal: quote.subtotal,
        tax_rate: quote.tax_rate,
        tax_amount: quote.tax_amount,
        total: quote.total,
        notes: quote.notes,
        status: 'draft',
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        ...(user ? { created_by: user.id } : {}),
      })
      .select()
      .single()

    if (error) {
      alert('Failed to duplicate quote: ' + error.message)
      return
    }

    if (newQuote && quote.items) {
      const newItems = quote.items.map(item => ({
        quote_id: newQuote.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }))
      await supabase.from('quote_items').insert(newItems)
    }

    fetchQuotes(companyId)
  }

  const isOwnerOrAdmin = dbUser?.role === 'owner' || dbUser?.role === 'admin'

  const submitForApproval = async (quote: Quote) => {
    if (!companyId) return
    setSendingQuoteId(quote.id)

    const { error } = await supabase
      .from('quotes')
      .update({ status: 'pending_approval', updated_at: new Date().toISOString() })
      .eq('id', quote.id)

    if (error) {
      alert('Failed to submit quote for approval: ' + error.message)
      setSendingQuoteId(null)
      return
    }

    // Notify owner(s) via SMS and email
    const quoteNum = quote.quote_number || `Q-${quote.id.slice(0, 8)}`
    const dashboardLink = `${window.location.origin}/dashboard/quotes?status=pending_approval`
    try {
      const { data: owners } = await supabase
        .from('users')
        .select('phone, full_name, email')
        .eq('company_id', companyId)
        .in('role', ['owner', 'admin'])

      if (owners) {
        for (const owner of owners) {
          // Send SMS
          if (owner.phone) {
            await fetch('/api/sms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: owner.phone,
                template: 'custom',
                data: {
                  message: `Quote ${quoteNum} for ${quote.customer?.name || 'a customer'} ($${quote.total?.toLocaleString()}) needs your approval. Open your dashboard to review.`,
                },
                companyId,
              }),
            })
          }
          // Send email
          if (owner.email) {
            await fetch('/api/quote/notify-approval', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: owner.email,
                ownerName: owner.full_name || 'Boss',
                quoteNumber: quoteNum,
                customerName: quote.customer?.name || 'Customer',
                total: quote.total,
                itemCount: quote.items?.length || 0,
                submittedBy: dbUser?.full_name,
                dashboardLink,
              }),
            })
          }
        }
      }
    } catch {
      console.log('Owner notification skipped or failed for quote:', quote.id)
    }

    setSendingQuoteId(null)
    if (companyId) fetchQuotes(companyId)
  }

  const approveAndSend = async (quote: Quote) => {
    if (!companyId) return
    // Use the existing sendQuote function which handles status update + notifications
    await sendQuote(quote)
  }

  const returnToDraft = async (quote: Quote) => {
    if (!companyId) return
    const { error } = await supabase
      .from('quotes')
      .update({ status: 'draft', updated_at: new Date().toISOString() })
      .eq('id', quote.id)

    if (error) {
      alert('Failed to return quote to draft: ' + error.message)
      return
    }
    if (companyId) fetchQuotes(companyId)
  }

  const deleteQuote = async (quote: Quote) => {
    if (!companyId) return
    const quoteLabel = quote.quote_number || `Q-${quote.id.slice(0, 8)}`
    if (!confirm(`Are you sure you want to delete quote ${quoteLabel}? This cannot be undone.`)) return

    setDeletingQuoteId(quote.id)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token

      if (!token) {
        alert('Your session has expired. Please refresh the page and log in again.')
        setDeletingQuoteId(null)
        return
      }

      const res = await fetch('/api/quote/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quoteId: quote.id }),
      })

      const result = await res.json()

      if (!res.ok) {
        alert(result.error || 'Failed to delete quote')
        setDeletingQuoteId(null)
        return
      }

      if (companyId) fetchQuotes(companyId)
    } catch {
      alert('Failed to delete quote. Please try again.')
    }

    setDeletingQuoteId(null)
  }

  const canDeleteQuote = (quote: Quote) => {
    // Only unsent quotes (draft or pending_approval) can be deleted
    if (!['draft', 'pending_approval'].includes(quote.status)) return false
    // Owner/Admin can delete any unsent quote
    if (isOwnerOrAdmin) return true
    // Workers can only delete their own drafts
    return quote.status === 'draft' && quote.created_by === user?.id
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending_approval: 'bg-orange-100 text-orange-700',
    sent: 'bg-blue-100 text-blue-700',
    viewed: 'bg-purple-100 text-purple-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    expired: 'bg-yellow-100 text-yellow-700',
  }

  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    sent: 'Sent',
    viewed: 'Viewed',
    approved: 'Accepted',
    rejected: 'Declined',
    expired: 'Expired',
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
        <div className="relative">
          <button
            onClick={() => setShowNewQuoteDropdown(!showNewQuoteDropdown)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            + New Quote
            <svg className={`w-4 h-4 transition-transform ${showNewQuoteDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showNewQuoteDropdown && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
              <Link
                href="/dashboard/smart-quote"
                className="block px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100"
                onClick={() => setShowNewQuoteDropdown(false)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📝</span>
                  <div>
                    <div className="font-semibold text-gray-900">Smart Quote</div>
                    <div className="text-xs text-gray-500">AI-powered with voice, photo & tiered pricing</div>
                  </div>
                </div>
              </Link>
              <button
                onClick={() => {
                  setEditingQuote(null)
                  setShowModal(true)
                  setShowNewQuoteDropdown(false)
                }}
                className="block w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <div className="font-semibold text-gray-900">Quick Quote</div>
                    <div className="text-xs text-gray-500">Simple manual entry for fast quotes</div>
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'draft', 'pending_approval', 'sent', 'viewed', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'All' : statusLabels[status] || status}
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
            ${quotes.filter(q => ['pending_approval', 'sent', 'viewed'].includes(q.status)).reduce((sum, q) => sum + q.total, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-600">Accepted</p>
          <p className="text-2xl font-bold text-green-700">
            ${quotes.filter(q => q.status === 'approved').reduce((sum, q) => sum + q.total, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border">
          <p className="text-sm text-gray-500">Conversion Rate</p>
          <p className="text-2xl font-bold">
            {quotes.length > 0
              ? Math.round((quotes.filter(q => q.status === 'approved').length / quotes.filter(q => !['draft', 'pending_approval'].includes(q.status)).length) * 100) || 0
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Until</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {quotes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
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
                      <option value="pending_approval">Pending Approval</option>
                      <option value="sent">Sent</option>
                      <option value="viewed">Viewed</option>
                      <option value="approved">Accepted</option>
                      <option value="rejected">Declined</option>
                      <option value="expired">Expired</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{quote.creator?.full_name || '-'}</p>
                    {quote.sender && quote.sender.full_name !== quote.creator?.full_name && (
                      <p className="text-xs text-gray-500">Sent by: {quote.sender.full_name}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 flex-wrap">
                      {/* Draft: Owner/Admin can Send directly, workers submit for approval */}
                      {quote.status === 'draft' && isOwnerOrAdmin && (
                        <button
                          onClick={() => sendQuote(quote)}
                          disabled={sendingQuoteId === quote.id}
                          className="text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50"
                        >
                          {sendingQuoteId === quote.id ? 'Sending...' : 'Send'}
                        </button>
                      )}
                      {quote.status === 'draft' && !isOwnerOrAdmin && (
                        <button
                          onClick={() => submitForApproval(quote)}
                          disabled={sendingQuoteId === quote.id}
                          className="text-orange-600 hover:text-orange-800 text-sm font-medium disabled:opacity-50"
                        >
                          {sendingQuoteId === quote.id ? 'Submitting...' : 'Submit for Approval'}
                        </button>
                      )}
                      {/* Pending Approval: Owner/Admin can approve & send, or return to draft */}
                      {quote.status === 'pending_approval' && isOwnerOrAdmin && (
                        <>
                          <button
                            onClick={() => approveAndSend(quote)}
                            disabled={sendingQuoteId === quote.id}
                            className="text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50"
                          >
                            {sendingQuoteId === quote.id ? 'Sending...' : 'Approve & Send'}
                          </button>
                          <button
                            onClick={() => returnToDraft(quote)}
                            className="text-orange-600 hover:text-orange-800 text-sm"
                          >
                            Return to Draft
                          </button>
                        </>
                      )}
                      {/* Edit available until customer accepts */}
                      {!['approved', 'rejected'].includes(quote.status) && (
                        <button
                          onClick={() => {
                            setEditingQuote(quote)
                            setShowModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => duplicateQuote(quote)}
                        className="text-gray-600 hover:text-gray-800 text-sm"
                      >
                        Copy
                      </button>
                      {quote.status === 'approved' && (
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
                      {canDeleteQuote(quote) && (
                        <button
                          onClick={() => deleteQuote(quote)}
                          disabled={deletingQuoteId === quote.id}
                          className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                        >
                          {deletingQuoteId === quote.id ? 'Deleting...' : 'Delete'}
                        </button>
                      )}
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
          key={editingQuote?.id || 'new'}
          quote={editingQuote}
          companyId={companyId!}
          userId={user?.id || null}
          customers={customers}
          onClose={() => {
            setShowModal(false)
            setEditingQuote(null)
          }}
          onSave={() => {
            setShowModal(false)
            setEditingQuote(null)
            if (companyId) fetchQuotes(companyId)
          }}
        />
      )}
    </div>
  )
}

function QuoteModal({ quote, companyId, userId, customers, onClose, onSave }: {
  quote: Quote | null
  companyId: string
  userId: string | null
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
    quote?.items && quote.items.length > 0
      ? quote.items.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price }))
      : [{ description: '', quantity: 1, unit_price: 0 }]
  )
  const [saving, setSaving] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)

  // Fetch items directly from database when editing an existing quote
  // This handles cases where the joined items data is missing or empty
  useEffect(() => {
    if (quote?.id && (!quote.items || quote.items.length === 0)) {
      setLoadingItems(true)
      supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quote.id)
        .order('sort_order', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            setItems(data.map(i => ({
              description: i.description,
              quantity: i.quantity,
              unit_price: i.unit_price,
            })))
          }
          setLoadingItems(false)
        })
    }
  }, [quote?.id, quote?.items])

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
    const tax_amount = subtotal * 0.0875 // CA sales tax estimate
    const total = subtotal + tax_amount
    return { subtotal, tax_amount, total }
  }

  const { subtotal, tax_amount, total } = calculateTotals()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    // Refresh session to ensure auth token is still valid
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !sessionData.session) {
      alert('Your session has expired. Please refresh the page and log in again.')
      setSaving(false)
      return
    }

    const quoteData: Record<string, unknown> = {
      company_id: companyId,
      customer_id: formData.customer_id || null,
      notes: formData.notes,
      valid_until: formData.valid_until,
      subtotal: Number(subtotal) || 0,
      tax_rate: 8.75,
      tax_amount: Number(tax_amount) || 0,
      total: Number(total) || 0,
      status: quote?.status || 'draft',
    }
    if (!quote && userId) {
      quoteData.created_by = userId
    }

    let quoteId = quote?.id

    if (quote) {
      const { error: updateError } = await supabase.from('quotes').update(quoteData).eq('id', quote.id)
      if (updateError) {
        alert('Failed to update quote: ' + updateError.message)
        setSaving(false)
        return
      }
      // Delete existing items
      await supabase.from('quote_items').delete().eq('quote_id', quote.id)
    } else {
      let { data, error: insertError } = await supabase.from('quotes').insert(quoteData).select().single()

      // If insert fails due to created_by column not existing, retry without it
      if (insertError && (insertError.message?.includes('created_by') || insertError.code === '42703')) {
        console.warn('Retrying quote creation without created_by field')
        delete quoteData.created_by
        const retry = await supabase.from('quotes').insert(quoteData).select().single()
        data = retry.data
        insertError = retry.error
      }

      if (insertError) {
        alert('Failed to create quote: ' + insertError.message)
        setSaving(false)
        return
      }
      quoteId = data?.id
    }

    // Insert items
    if (quoteId && items.length > 0) {
      const quoteItems = items.filter(i => i.description).map(item => ({
        quote_id: quoteId,
        description: item.description,
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        total_price: Number(item.quantity * item.unit_price) || 0,
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
            {loadingItems && (
              <p className="text-sm text-gray-500 mb-2">Loading line items...</p>
            )}
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
              <span>${tax_amount.toFixed(2)}</span>
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
