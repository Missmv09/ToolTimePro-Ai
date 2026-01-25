'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RefreshCw, AlertCircle, Plus, Search, FileText, Eye, Send, Bell } from 'lucide-react';
import { useQuotes } from '@/hooks/useQuotes';
import { useAuth } from '@/contexts/AuthContext';

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700' },
  viewed: { label: 'Viewed', color: 'bg-purple-100 text-purple-700' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  expired: { label: 'Expired', color: 'bg-orange-100 text-orange-700' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function QuotesDashboard() {
  const { company } = useAuth();
  const { quotes, stats, isLoading, error, refetch, sendQuote } = useQuotes();
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleSendQuote = async (id: string) => {
    await sendQuote(id);
  };

  // Filter quotes
  const filteredQuotes = quotes.filter((quote) => {
    const matchesFilter = filter === 'all' || quote.status === filter;
    const customerName = quote.customer?.name || '';
    const matchesSearch =
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quote.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Sort quotes
  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
    if (sortBy === 'date') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === 'amount') return (b.total || 0) - (a.total || 0);
    return 0;
  });

  const toggleSelectAll = () => {
    if (selectedQuotes.length === sortedQuotes.length) {
      setSelectedQuotes([]);
    } else {
      setSelectedQuotes(sortedQuotes.map((q) => q.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedQuotes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm border h-20 animate-pulse" />
            ))}
          </div>
          <div className="bg-white rounded-xl shadow-sm border h-96 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-navy-500 mb-2">Error Loading Quotes</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={handleRefresh} className="btn-primary">
          Try Again
        </button>
      </div>
    );
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
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href="/demo/quoting"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
              >
                <Plus size={20} />
                Create Quote
              </Link>
            </div>
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
            <div className="text-2xl font-bold text-purple-600">{stats.sent + stats.viewed}</div>
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
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(stats.approvedValue)}</div>
            <div className="text-sm text-gray-500">Won Revenue</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="text-2xl font-bold text-gray-700">{stats.draft}</div>
            <div className="text-sm text-gray-500">Drafts</div>
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
                      {quotes.filter((q) => q.status === status).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search and Sort */}
            <div className="flex gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search quotes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}
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
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Valid Until
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
                        {(quote.customer?.name || 'U').charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{quote.customer?.name || 'Unknown'}</div>
                        <div className="text-sm text-gray-500">{quote.title || 'Untitled Quote'}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {quote.quote_number && <span>#{quote.quote_number}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          statusConfig[quote.status].color
                        }`}
                      >
                        {statusConfig[quote.status].label}
                      </span>
                      {quote.viewed_at && quote.status !== 'draft' && (
                        <span className="text-xs text-gray-400">Viewed {formatDate(quote.viewed_at)}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-gray-900">{formatCurrency(quote.total || 0)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-600">{formatDate(quote.created_at)}</div>
                    <div className="text-xs text-gray-400">{formatTime(quote.created_at)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-600">{formatDate(quote.valid_until)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/quote/${quote.id}`}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Quote"
                      >
                        <Eye size={16} />
                      </Link>
                      <button
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Quote"
                      >
                        <FileText size={16} />
                      </button>
                      {quote.status === 'draft' && (
                        <button
                          onClick={() => handleSendQuote(quote.id)}
                          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Send Quote"
                        >
                          <Send size={16} />
                        </button>
                      )}
                      {['sent', 'viewed'].includes(quote.status) && (
                        <button
                          className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Send Reminder"
                        >
                          <Bell size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {sortedQuotes.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No quotes found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'Try adjusting your search' : 'Create your first quote to get started'}
              </p>
              <Link
                href="/demo/quoting"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
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
  );
}
