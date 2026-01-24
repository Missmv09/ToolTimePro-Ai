'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  Phone,
  Mail,
  DollarSign,
  MoreVertical,
  User,
  MessageSquare,
  Star,
  X,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useLeads, Lead } from '@/hooks/useLeads';

const statusConfig = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700' },
  contacted: { label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
  quoted: { label: 'Quoted', color: 'bg-purple-100 text-purple-700' },
  won: { label: 'Won', color: 'bg-green-100 text-green-700' },
  lost: { label: 'Lost', color: 'bg-gray-100 text-gray-700' },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function LeadsPage() {
  const { leads, stats, isLoading, error, refetch, createLead, updateLead } = useLeads();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.service_requested?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    const formData = new FormData(e.currentTarget);
    const newLead: Partial<Lead> = {
      name: formData.get('name') as string,
      email: formData.get('email') as string || null,
      phone: formData.get('phone') as string || null,
      service_requested: formData.get('service') as string || null,
      source: formData.get('source') as string || 'manual',
      status: 'new',
      estimated_value: formData.get('value') ? parseFloat(formData.get('value') as string) : null,
      message: formData.get('notes') as string || null,
    };

    const { error } = await createLead(newLead);

    if (error) {
      setFormError(error.message);
      setIsSubmitting(false);
      return;
    }

    setShowAddModal(false);
    setIsSubmitting(false);
  };

  // Handle status change
  const handleStatusChange = async (leadId: string, newStatus: Lead['status']) => {
    await updateLead(leadId, { status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-navy-500 mb-2">Error Loading Leads</h2>
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
          <h1 className="text-2xl font-bold text-navy-500">Leads</h1>
          <p className="text-gray-500">Track and convert potential customers</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-ghost">
            <RefreshCw size={18} />
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-secondary">
            <Plus size={18} className="mr-2" />
            Add Lead
          </button>
        </div>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{stats.new}</p>
              <p className="text-sm text-gray-500">New Leads</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{stats.contacted}</p>
              <p className="text-sm text-gray-500">Contacted</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{stats.quoted}</p>
              <p className="text-sm text-gray-500">Quoted</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">
                ${stats.totalValue.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">Pipeline Value</p>
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
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'new', 'contacted', 'quoted', 'won', 'lost'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-navy-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : statusConfig[status as keyof typeof statusConfig].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leads Table */}
      {filteredLeads.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header">Lead</th>
                  <th className="table-header">Service</th>
                  <th className="table-header">Source</th>
                  <th className="table-header">Value</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Created</th>
                  <th className="table-header"></th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => {
                  const status = statusConfig[lead.status];
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50 group">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-navy-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-navy-500">
                              {lead.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .substring(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-navy-500">{lead.name}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              {lead.email && (
                                <span className="flex items-center gap-1">
                                  <Mail size={12} />
                                  {lead.email}
                                </span>
                              )}
                              {lead.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone size={12} />
                                  {lead.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">{lead.service_requested || '-'}</td>
                      <td className="table-cell">
                        <span className="badge bg-gray-100 text-gray-600">{lead.source}</span>
                      </td>
                      <td className="table-cell font-medium text-navy-500">
                        {lead.estimated_value ? `$${lead.estimated_value.toLocaleString()}` : '-'}
                      </td>
                      <td className="table-cell">
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value as Lead['status'])}
                          className={`badge ${status.color} cursor-pointer border-0 appearance-none pr-6 bg-no-repeat bg-right`}
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                            backgroundPosition: 'right 4px center',
                          }}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="quoted">Quoted</option>
                          <option value="won">Won</option>
                          <option value="lost">Lost</option>
                        </select>
                      </td>
                      <td className="table-cell text-gray-500">{formatDate(lead.created_at)}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
                              className="p-2 hover:bg-green-50 rounded-lg text-green-600"
                            >
                              <Phone size={16} />
                            </a>
                          )}
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}`}
                              className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                            >
                              <Mail size={16} />
                            </a>
                          )}
                          <button className="p-2 hover:bg-gray-100 rounded-lg">
                            <MoreVertical size={16} className="text-gray-400" />
                          </button>
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
          <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">
            {leads.length === 0 ? 'No leads yet' : 'No leads found'}
          </h3>
          <p className="text-gray-400 mt-1">
            {leads.length === 0
              ? 'Add your first lead to start tracking potential customers'
              : 'Try adjusting your search or filters'}
          </p>
          {leads.length === 0 && (
            <button onClick={() => setShowAddModal(true)} className="btn-secondary mt-4">
              <Plus size={18} className="mr-2" />
              Add First Lead
            </button>
          )}
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-navy-500">Add New Lead</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="input-label">Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="input"
                  placeholder="John Smith"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="input"
                    placeholder="john@email.com"
                  />
                </div>
                <div>
                  <label className="input-label">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    className="input"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Service Requested</label>
                <input
                  type="text"
                  name="service"
                  className="input"
                  placeholder="Weekly lawn maintenance"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Source</label>
                  <select name="source" className="input">
                    <option value="website">Website</option>
                    <option value="referral">Referral</option>
                    <option value="google">Google</option>
                    <option value="facebook">Facebook</option>
                    <option value="yelp">Yelp</option>
                    <option value="phone">Phone Call</option>
                    <option value="chatbot">AI Chatbot</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Estimated Value</label>
                  <input
                    type="number"
                    name="value"
                    className="input"
                    placeholder="500"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Notes</label>
                <textarea
                  name="notes"
                  className="input min-h-[80px]"
                  placeholder="Additional details about this lead..."
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
                    'Add Lead'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
