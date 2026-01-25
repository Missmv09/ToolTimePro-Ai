'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Eye,
  RefreshCw,
  Download,
} from 'lucide-react';
import { useInvoices } from '@/hooks/useInvoices';
import { useAuth } from '@/contexts/AuthContext';

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: FileText },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: Send },
  viewed: { label: 'Viewed', color: 'bg-purple-100 text-purple-700', icon: Eye },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  partial: { label: 'Partial', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function isOverdue(invoice: { status: string; due_date: string | null }): boolean {
  if (!invoice.due_date) return false;
  if (['paid', 'draft'].includes(invoice.status)) return false;
  return new Date(invoice.due_date) < new Date();
}

export default function InvoicesPage() {
  const { company } = useAuth();
  const { invoices, stats, isLoading, error, refetch, sendInvoice, markPaid } = useInvoices();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleSend = async (id: string) => {
    await sendInvoice(id);
  };

  const handleMarkPaid = async (id: string) => {
    await markPaid(id);
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const customerName = invoice.customer?.name || '';
    const matchesSearch =
      customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (invoice.invoice_number || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'overdue') return matchesSearch && isOverdue(invoice);
    return matchesSearch && invoice.status === statusFilter;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-24 animate-pulse bg-gray-100" />
          ))}
        </div>
        <div className="card h-96 animate-pulse bg-gray-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-navy-500 mb-2">Error Loading Invoices</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={handleRefresh} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-500">Invoices</h1>
          <p className="text-gray-500">Track payments and manage billing</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-ghost"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button className="btn-outline">
            <Download size={18} className="mr-2" />
            Export
          </button>
          <button className="btn-secondary">
            <Plus size={18} className="mr-2" />
            New Invoice
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Invoices</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{formatCurrency(stats.totalOutstanding)}</p>
              <p className="text-sm text-gray-500">Outstanding</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{stats.overdue}</p>
              <p className="text-sm text-gray-500">Overdue</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{formatCurrency(stats.totalPaid)}</p>
              <p className="text-sm text-gray-500">Collected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by customer or invoice number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'draft', 'sent', 'paid', 'overdue'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-navy-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                {status !== 'all' && (
                  <span className="ml-2 opacity-70">
                    {status === 'overdue'
                      ? stats.overdue
                      : invoices.filter((i) => i.status === status).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header">Invoice</th>
                <th className="table-header">Customer</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Status</th>
                <th className="table-header">Due Date</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => {
                const overdue = isOverdue(invoice);
                const status = overdue
                  ? statusConfig.overdue
                  : statusConfig[invoice.status as keyof typeof statusConfig] || statusConfig.draft;
                const StatusIcon = status.icon;

                return (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-navy-500">
                          {invoice.invoice_number || `INV-${invoice.id.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(invoice.created_at)}</p>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-navy-500">
                          {invoice.customer?.name || 'Unknown'}
                        </p>
                        {invoice.job && (
                          <p className="text-xs text-gray-500">{invoice.job.title}</p>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div>
                        <p className="font-semibold text-navy-500">{formatCurrency(invoice.total)}</p>
                        {invoice.amount_paid > 0 && invoice.amount_paid < invoice.total && (
                          <p className="text-xs text-green-600">
                            {formatCurrency(invoice.amount_paid)} paid
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}
                      >
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={overdue ? 'text-red-600 font-medium' : 'text-gray-600'}>
                        {formatDate(invoice.due_date)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Invoice"
                        >
                          <Eye size={16} />
                        </button>
                        {invoice.status === 'draft' && (
                          <button
                            onClick={() => handleSend(invoice.id)}
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Send Invoice"
                          >
                            <Send size={16} />
                          </button>
                        )}
                        {['sent', 'viewed', 'partial'].includes(invoice.status) && (
                          <button
                            onClick={() => handleMarkPaid(invoice.id)}
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Mark as Paid"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600">No invoices found</h3>
            <p className="text-gray-400 mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first invoice to get started'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button className="btn-secondary mt-4">
                <Plus size={18} className="mr-2" />
                Create First Invoice
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
