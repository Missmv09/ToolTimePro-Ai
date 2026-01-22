'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Quote {
  id: string
  customer: {
    name: string
    email: string
    phone: string
  }
  title: string
  amount: number
  package: 'good' | 'better' | 'best'
  status: 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected' | 'expired'
  createdAt: string
  sentAt?: string
  viewedAt?: string
  respondedAt?: string
  expiresAt: string
  lineItemsCount: number
  createdVia: 'voice' | 'photo' | 'manual'
}

// Mock data - would come from Supabase in production
const mockQuotes: Quote[] = [
  {
    id: 'q-001',
    customer: { name: 'Sarah Johnson', email: 'sarah@email.com', phone: '(555) 123-4567' },
    title: 'Kitchen Remodel - Full Service',
    amount: 12500,
    package: 'best',
    status: 'approved',
    createdAt: '2024-01-18T10:30:00Z',
    sentAt: '2024-01-18T11:00:00Z',
    viewedAt: '2024-01-18T14:22:00Z',
    respondedAt: '2024-01-18T15:45:00Z',
    expiresAt: '2024-02-18T11:00:00Z',
    lineItemsCount: 8,
    createdVia: 'voice',
  },
  {
    id: 'q-002',
    customer: { name: 'Mike Chen', email: 'mike.chen@company.com', phone: '(555) 987-6543' },
    title: 'Bathroom Renovation',
    amount: 8750,
    package: 'better',
    status: 'viewed',
    createdAt: '2024-01-19T09:15:00Z',
    sentAt: '2024-01-19T09:30:00Z',
    viewedAt: '2024-01-20T08:45:00Z',
    expiresAt: '2024-02-19T09:30:00Z',
    lineItemsCount: 5,
    createdVia: 'photo',
  },
  {
    id: 'q-003',
    customer: { name: 'Emily Davis', email: 'emily.d@gmail.com', phone: '(555) 456-7890' },
    title: 'HVAC System Replacement',
    amount: 15200,
    package: 'best',
    status: 'sent',
    createdAt: '2024-01-20T14:00:00Z',
    sentAt: '2024-01-20T14:15:00Z',
    expiresAt: '2024-02-20T14:15:00Z',
    lineItemsCount: 4,
    createdVia: 'manual',
  },
  {
    id: 'q-004',
    customer: { name: 'Robert Wilson', email: 'rwilson@email.com', phone: '(555) 321-0987' },
    title: 'Deck Construction',
    amount: 6800,
    package: 'good',
    status: 'rejected',
    createdAt: '2024-01-15T11:30:00Z',
    sentAt: '2024-01-15T12:00:00Z',
    viewedAt: '2024-01-16T09:00:00Z',
    respondedAt: '2024-01-17T10:30:00Z',
    expiresAt: '2024-02-15T12:00:00Z',
    lineItemsCount: 6,
    createdVia: 'voice',
  },
  {
    id: 'q-005',
    customer: { name: 'Lisa Thompson', email: 'lisa.t@business.com', phone: '(555) 654-3210' },
    title: 'Plumbing Repair Bundle',
    amount: 2400,
    package: 'better',
    status: 'draft',
    createdAt: '2024-01-21T16:45:00Z',
    expiresAt: '2024-02-21T16:45:00Z',
    lineItemsCount: 3,
    createdVia: 'photo',
  },
  {
    id: 'q-006',
    customer: { name: 'James Miller', email: 'jmiller@email.com', phone: '(555) 789-0123' },
    title: 'Electrical Panel Upgrade',
    amount: 4500,
    package: 'good',
    status: 'expired',
    createdAt: '2024-01-01T08:00:00Z',
    sentAt: '2024-01-01T08:30:00Z',
    viewedAt: '2024-01-02T10:15:00Z',
    expiresAt: '2024-01-15T08:30:00Z',
    lineItemsCount: 2,
    createdVia: 'manual',
  },
]

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: '📝' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: '📤' },
  viewed: { label: 'Viewed', color: 'bg-purple-100 text-purple-700', icon: '👁️' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: '✅' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: '❌' },
  expired: { label: 'Expired', color: 'bg-orange-100 text-orange-700', icon: '⏰' },
}

const packageConfig = {
  good: { label: 'Good', color: 'text-blue-600' },
  better: { label: 'Better', color: 'text-purple-600' },
  best: { label: 'Best', color: 'text-amber-600' },
}

const createdViaConfig = {
  voice: { label: 'Voice', icon: '🎤' },
  photo: { label: 'Photo', icon: '📸' },
  manual: { label: 'Manual', icon: '✏️' },
}

export default function QuotesDashboard() {
  const [filter, setFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date')
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([])

  // Filter quotes
  const filteredQuotes = mockQuotes.filter(quote => {
    const matchesFilter = filter === 'all' || quote.status === filter
    const matchesSearch =
      quote.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.customer.email.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  // Sort quotes
  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
    if (sortBy === 'date') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (sortBy === 'amount') return b.amount - a.amount
    return 0
  })

  // Stats
  const stats = {
    total: mockQuotes.length,
    pending: mockQuotes.filter(q => ['sent', 'viewed'].includes(q.status)).length,
    approved: mockQuotes.filter(q => q.status === 'approved').length,
    conversionRate: Math.round(
      (mockQuotes.filter(q => q.status === 'approved').length /
       mockQuotes.filter(q => ['approved', 'rejected'].includes(q.status)).length) * 100
    ) || 0,
    totalValue: mockQuotes.filter(q => q.status === 'approved').reduce((sum, q) => sum + q.amount, 0),
    avgResponseTime: '1.2 days',
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const toggleSelectAll = () => {
    if (selectedQuotes.length === sortedQuotes.length) {
      setSelectedQuotes([])
    } else {
      setSelectedQuotes(sortedQuotes.map(q => q.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedQuotes(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Smart Quotes</h1>
              <p className="text-gray-500 mt-1">Manage and track your customer quotes</p>
            </div>
            <Link
              href="/demo/quoting"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
            >
              <span className="text-xl">+</span>
              Create Quote
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Quotes</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="text-2xl font-bold text-purple-600">{stats.pending}</div>
            <div className="text-sm text-gray-500">Awaiting Response</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-gray-500">Approved</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="text-2xl font-bold text-blue-600">{stats.conversionRate}%</div>
            <div className="text-sm text-gray-500">Win Rate</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="text-2xl font-bold text-amber-600">${stats.totalValue.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Won Revenue</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="text-2xl font-bold text-gray-700">{stats.avgResponseTime}</div>
            <div className="text-sm text-gray-500">Avg Response</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border mb-6">
          <div className="p-4 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Status Filters */}
            <div className="flex flex-wrap gap-2">
              {['all', 'draft', 'sent', 'viewed', 'approved', 'rejected', 'expired'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'All' : statusConfig[status as keyof typeof statusConfig].label}
                  {status !== 'all' && (
                    <span className="ml-2 opacity-70">
                      {mockQuotes.filter(q => q.status === status).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search and Sort */}
            <div className="flex gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-64">
                <input
                  type="text"
                  placeholder="Search quotes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'status')}
                className="px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Sort by Date</option>
                <option value="amount">Sort by Amount</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedQuotes.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-center justify-between">
            <span className="text-blue-700 font-medium">
              {selectedQuotes.length} quote{selectedQuotes.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 text-sm font-medium">
                Send Reminder
              </button>
              <button className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 text-sm font-medium">
                Export
              </button>
              <button className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 text-sm font-medium">
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Quotes Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedQuotes.length === sortedQuotes.length && sortedQuotes.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Customer / Quote
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Package
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedQuotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedQuotes.includes(quote.id)}
                      onChange={() => toggleSelect(quote.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg">
                        {quote.customer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{quote.customer.name}</div>
                        <div className="text-sm text-gray-500">{quote.title}</div>
                        <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                          <span>{createdViaConfig[quote.createdVia].icon} {createdViaConfig[quote.createdVia].label}</span>
                          <span>•</span>
                          <span>{quote.lineItemsCount} items</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[quote.status].color}`}>
                        {statusConfig[quote.status].icon} {statusConfig[quote.status].label}
                      </span>
                      {quote.viewedAt && quote.status !== 'draft' && (
                        <span className="text-xs text-gray-400">
                          Viewed {formatDate(quote.viewedAt)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`font-medium ${packageConfig[quote.package].color}`}>
                      {packageConfig[quote.package].label}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-gray-900">
                      ${quote.amount.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-600">{formatDate(quote.createdAt)}</div>
                    <div className="text-xs text-gray-400">{formatTime(quote.createdAt)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/quote/${quote.id}`}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Quote"
                      >
                        👁️
                      </Link>
                      <button
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Quote"
                      >
                        ✏️
                      </button>
                      {quote.status === 'draft' && (
                        <button
                          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Send Quote"
                        >
                          📤
                        </button>
                      )}
                      {['sent', 'viewed'].includes(quote.status) && (
                        <button
                          className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Send Reminder"
                        >
                          🔔
                        </button>
                      )}
                      <button
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="More Actions"
                      >
                        ⋮
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {sortedQuotes.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No quotes found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'Try adjusting your search' : 'Create your first quote to get started'}
              </p>
              <Link
                href="/demo/quoting"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                <span className="text-xl">+</span>
                Create Quote
              </Link>
            </div>
          )}
        </div>

        {/* Quick Tips */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Tips for Higher Win Rates</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎤</span>
              <div>
                <div className="font-medium text-gray-900">Use Voice Quotes</div>
                <div className="text-sm text-gray-600">Create quotes 3x faster while on-site</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">💎</span>
              <div>
                <div className="font-medium text-gray-900">Offer Good/Better/Best</div>
                <div className="text-sm text-gray-600">Customers choose mid-tier 65% of the time</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <div className="font-medium text-gray-900">Send Within 1 Hour</div>
                <div className="text-sm text-gray-600">Quotes sent quickly close 40% more often</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
