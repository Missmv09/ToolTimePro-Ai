'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  Loader2,
  RefreshCw,
  AlertCircle,
  Send,
  Eye,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { useInvoices, Invoice } from '@/hooks/useInvoices';
import { useClients } from '@/hooks/useClients';

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: FileText },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: Send },
  viewed: { label: 'Viewed', color: 'bg-purple-100 text-purple-700', icon: Eye },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  partial: { label: 'Partial', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function InvoicesPage() {
  const { invoices, stats, isLoading, error, refetch, createInvoice, updateInvoice, deleteInvoice, markAsPaid, markAsSent } = useInvoices();
  const { clients } = useClients();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Filter invoices
  const filteredInvoices = invoices.filter((invoice) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      invoice.invoice_number?.toLowerCase().includes(searchLower) ||
      invoice.customer?.name?.toLowerCase().includes(searchLower) ||
      invoice.customer?.email?.toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle add form submission
  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    const formData = new FormData(e.currentTarget);
    const customerId = formData.get('customer_id') as string;
    const subtotal = parseFloat(formData.get('subtotal') as string) || 0;
    const taxRate = parseFloat(formData.get('tax_rate') as string) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    const newInvoice: Partial<Invoice> = {
      customer_id: customerId || null,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      amount_paid: 0,
      status: 'draft',
      due_date: (formData.get('due_date') as string) || null,
      notes: (formData.get('notes') as string) || null,
    };

    const { error } = await createInvoice(newInvoice);

    if (error) {
      setFormError(error.message);
      setIsSubmitting(false);
      return;
    }

    setShowAddModal(false);
    setIsSubmitting(false);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedInvoice) return;

    setIsSubmitting(true);
    const { error } = await deleteInvoice(selectedInvoice.id);

    if (error) {
      setFormError(error.message);
      setIsSubmitting(false);
      return;
    }

    setShowDeleteModal(false);
    setSelectedInvoice(null);
    setIsSubmitting(false);
  };

  // Handle mark as paid
  const handleMarkAsPaid = async (invoice: Invoice) => {
    setActiveDropdown(null);
    await markAsPaid(invoice.id);
  };

  // Handle mark as sent
  const handleMarkAsSent = async (invoice: Invoice) => {
    setActiveDropdown(null);
    await markAsSent(invoice.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-navy-500 mb-2">Error Loading Invoices</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={() => refetch()} className="btn-primary">
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
          <p className="text-gray-500">Manage billing and track payments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-ghost">
            <RefreshCw size={18} />
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-secondary">
            <Plus size={18} className="mr-2" />
            Create Invoice
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{formatCurrency(stats.totalPaid)}</p>
              <p className="text-sm text-gray-500">Collected</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{stats.overdue}</p>
              <p className="text-sm text-gray-500">Overdue</p>
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
              placeholder="Search by invoice number or customer..."
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
                {status === 'all' ? 'All' : statusConfig[status as keyof typeof statusConfig]?.label || status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      {filteredInvoices.length > 0 ? (
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
                  <th className="table-header">Created</th>
                  <th className="table-header"></th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => {
                  const status = statusConfig[invoice.status] || statusConfig.draft;
                  const StatusIcon = status.icon;
                  const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.status !== 'paid';

                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50 group">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-navy-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-navy-500" />
                          </div>
                          <div>
                            <p className="font-medium text-navy-500">
                              {invoice.invoice_number || 'Draft'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        {invoice.customer ? (
                          <div>
                            <p className="font-medium text-gray-900">{invoice.customer.name}</p>
                            {invoice.customer.email && (
                              <p className="text-sm text-gray-500">{invoice.customer.email}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">No customer</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div>
                          <p className="font-semibold text-navy-500">{formatCurrency(invoice.total)}</p>
                          {invoice.amount_paid > 0 && invoice.amount_paid < invoice.total && (
                            <p className="text-sm text-green-600">
                              Paid: {formatCurrency(invoice.amount_paid)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${isOverdue ? 'bg-red-100 text-red-700' : status.color} inline-flex items-center gap-1`}>
                          <StatusIcon size={12} />
                          {isOverdue ? 'Overdue' : status.label}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}>
                          {formatDate(invoice.due_date)}
                        </span>
                      </td>
                      <td className="table-cell text-gray-500">{formatDate(invoice.created_at)}</td>
                      <td className="table-cell">
                        <div className="relative">
                          <button
                            onClick={() => setActiveDropdown(activeDropdown === invoice.id ? null : invoice.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical size={16} className="text-gray-400" />
                          </button>

                          {activeDropdown === invoice.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[160px]">
                              {invoice.status === 'draft' && (
                                <button
                                  onClick={() => handleMarkAsSent(invoice)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Send size={14} />
                                  Mark as Sent
                                </button>
                              )}
                              {invoice.status !== 'paid' && (
                                <button
                                  onClick={() => handleMarkAsPaid(invoice)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <CheckCircle size={14} />
                                  Mark as Paid
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setShowDeleteModal(true);
                                  setActiveDropdown(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">
            {invoices.length === 0 ? 'No invoices yet' : 'No invoices found'}
          </h3>
          <p className="text-gray-400 mt-1">
            {invoices.length === 0
              ? 'Create your first invoice to start billing customers'
              : 'Try adjusting your search or filters'}
          </p>
          {invoices.length === 0 && (
            <button onClick={() => setShowAddModal(true)} className="btn-secondary mt-4">
              <Plus size={18} className="mr-2" />
              Create First Invoice
            </button>
          )}
        </div>
      )}

      {/* Add Invoice Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-navy-500">Create Invoice</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-4 space-y-4">
              <div>
                <label className="input-label">Customer</label>
                <select name="customer_id" className="input">
                  <option value="">Select a customer</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Subtotal *</label>
                  <input
                    type="number"
                    name="subtotal"
                    required
                    min="0"
                    step="0.01"
                    className="input"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="input-label">Tax Rate (%)</label>
                  <input
                    type="number"
                    name="tax_rate"
                    min="0"
                    max="100"
                    step="0.01"
                    className="input"
                    placeholder="0"
                    defaultValue="0"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Due Date</label>
                <input
                  type="date"
                  name="due_date"
                  className="input"
                />
              </div>

              <div>
                <label className="input-label">Notes</label>
                <textarea
                  name="notes"
                  className="input min-h-[80px]"
                  placeholder="Additional notes for this invoice..."
                />
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-secondary flex-1"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    'Create Invoice'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-navy-500 text-center mb-2">
                Delete Invoice?
              </h2>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete invoice{' '}
                <strong>{selectedInvoice.invoice_number || 'Draft'}</strong>? This action cannot be undone.
              </p>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
                  {formError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedInvoice(null);
                  }}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {activeDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActiveDropdown(null)}
        />
      )}
    </div>
  );
}
