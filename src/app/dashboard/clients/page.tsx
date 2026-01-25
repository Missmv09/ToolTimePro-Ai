'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Users,
  UserPlus,
  X,
  Loader2,
  RefreshCw,
  AlertCircle,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useClients, Client } from '@/hooks/useClients';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ClientsPage() {
  const { clients, stats, isLoading, error, refetch, createClient, updateClient, deleteClient } = useClients();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Filter clients
  const filteredClients = clients.filter((client) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      client.name.toLowerCase().includes(searchLower) ||
      (client.email?.toLowerCase().includes(searchLower) ?? false) ||
      (client.phone?.includes(searchQuery) ?? false) ||
      (client.city?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  // Handle add form submission
  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    const formData = new FormData(e.currentTarget);
    const newClient: Partial<Client> = {
      name: formData.get('name') as string,
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      address: (formData.get('address') as string) || null,
      city: (formData.get('city') as string) || null,
      state: (formData.get('state') as string) || 'CA',
      zip: (formData.get('zip') as string) || null,
      notes: (formData.get('notes') as string) || null,
      source: (formData.get('source') as string) || 'manual',
    };

    const { error } = await createClient(newClient);

    if (error) {
      setFormError(error.message);
      setIsSubmitting(false);
      return;
    }

    setShowAddModal(false);
    setIsSubmitting(false);
  };

  // Handle edit form submission
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClient) return;

    setIsSubmitting(true);
    setFormError('');

    const formData = new FormData(e.currentTarget);
    const updates: Partial<Client> = {
      name: formData.get('name') as string,
      email: (formData.get('email') as string) || null,
      phone: (formData.get('phone') as string) || null,
      address: (formData.get('address') as string) || null,
      city: (formData.get('city') as string) || null,
      state: (formData.get('state') as string) || 'CA',
      zip: (formData.get('zip') as string) || null,
      notes: (formData.get('notes') as string) || null,
    };

    const { error } = await updateClient(selectedClient.id, updates);

    if (error) {
      setFormError(error.message);
      setIsSubmitting(false);
      return;
    }

    setShowEditModal(false);
    setSelectedClient(null);
    setIsSubmitting(false);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedClient) return;

    setIsSubmitting(true);
    const { error } = await deleteClient(selectedClient.id);

    if (error) {
      setFormError(error.message);
      setIsSubmitting(false);
      return;
    }

    setShowDeleteModal(false);
    setSelectedClient(null);
    setIsSubmitting(false);
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
        <h2 className="text-xl font-semibold text-navy-500 mb-2">Error Loading Clients</h2>
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
          <h1 className="text-2xl font-bold text-navy-500">Clients</h1>
          <p className="text-gray-500">Manage your customer database</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-ghost">
            <RefreshCw size={18} />
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-secondary">
            <Plus size={18} className="mr-2" />
            Add Client
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Clients</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{stats.thisMonth}</p>
              <p className="text-sm text-gray-500">New This Month</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{stats.withEmail}</p>
              <p className="text-sm text-gray-500">With Email</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{stats.withPhone}</p>
              <p className="text-sm text-gray-500">With Phone</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search clients by name, email, phone, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Clients Table */}
      {filteredClients.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header">Client</th>
                  <th className="table-header">Contact</th>
                  <th className="table-header">Location</th>
                  <th className="table-header">Source</th>
                  <th className="table-header">Added</th>
                  <th className="table-header"></th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 group">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-navy-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-navy-500">
                            {client.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .substring(0, 2)
                              .toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-navy-500">{client.name}</p>
                          {client.notes && (
                            <p className="text-xs text-gray-400 truncate max-w-[200px]">{client.notes}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="space-y-1">
                        {client.email && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Mail size={12} />
                            <span>{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Phone size={12} />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        {!client.email && !client.phone && (
                          <span className="text-sm text-gray-400">No contact info</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      {client.city || client.state ? (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin size={12} />
                          <span>
                            {[client.city, client.state].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <span className="badge bg-gray-100 text-gray-600">
                        {client.source || 'manual'}
                      </span>
                    </td>
                    <td className="table-cell text-gray-500">{formatDate(client.created_at)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {client.phone && (
                          <a
                            href={`tel:${client.phone}`}
                            className="p-2 hover:bg-green-50 rounded-lg text-green-600"
                            title="Call"
                          >
                            <Phone size={16} />
                          </a>
                        )}
                        {client.email && (
                          <a
                            href={`mailto:${client.email}`}
                            className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                            title="Email"
                          >
                            <Mail size={16} />
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setSelectedClient(client);
                            setShowEditModal(true);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedClient(client);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">
            {clients.length === 0 ? 'No clients yet' : 'No clients found'}
          </h3>
          <p className="text-gray-400 mt-1">
            {clients.length === 0
              ? 'Add your first client to start managing your customers'
              : 'Try adjusting your search'}
          </p>
          {clients.length === 0 && (
            <button onClick={() => setShowAddModal(true)} className="btn-secondary mt-4">
              <Plus size={18} className="mr-2" />
              Add First Client
            </button>
          )}
        </div>
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-navy-500">Add New Client</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-4 space-y-4">
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
                <label className="input-label">Address</label>
                <input
                  type="text"
                  name="address"
                  className="input"
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="input-label">City</label>
                  <input
                    type="text"
                    name="city"
                    className="input"
                    placeholder="Los Angeles"
                  />
                </div>
                <div>
                  <label className="input-label">State</label>
                  <input
                    type="text"
                    name="state"
                    className="input"
                    placeholder="CA"
                    defaultValue="CA"
                  />
                </div>
                <div>
                  <label className="input-label">ZIP</label>
                  <input
                    type="text"
                    name="zip"
                    className="input"
                    placeholder="90001"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Source</label>
                <select name="source" className="input">
                  <option value="manual">Manual Entry</option>
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="google">Google</option>
                  <option value="facebook">Facebook</option>
                  <option value="yelp">Yelp</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="input-label">Notes</label>
                <textarea
                  name="notes"
                  className="input min-h-[80px]"
                  placeholder="Additional notes about this client..."
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
                    'Add Client'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-navy-500">Edit Client</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedClient(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-4 space-y-4">
              <div>
                <label className="input-label">Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="input"
                  defaultValue={selectedClient.name}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="input"
                    defaultValue={selectedClient.email || ''}
                  />
                </div>
                <div>
                  <label className="input-label">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    className="input"
                    defaultValue={selectedClient.phone || ''}
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Address</label>
                <input
                  type="text"
                  name="address"
                  className="input"
                  defaultValue={selectedClient.address || ''}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="input-label">City</label>
                  <input
                    type="text"
                    name="city"
                    className="input"
                    defaultValue={selectedClient.city || ''}
                  />
                </div>
                <div>
                  <label className="input-label">State</label>
                  <input
                    type="text"
                    name="state"
                    className="input"
                    defaultValue={selectedClient.state || 'CA'}
                  />
                </div>
                <div>
                  <label className="input-label">ZIP</label>
                  <input
                    type="text"
                    name="zip"
                    className="input"
                    defaultValue={selectedClient.zip || ''}
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Notes</label>
                <textarea
                  name="notes"
                  className="input min-h-[80px]"
                  defaultValue={selectedClient.notes || ''}
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
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedClient(null);
                  }}
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
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-navy-500 text-center mb-2">
                Delete Client?
              </h2>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete <strong>{selectedClient.name}</strong>? This action cannot be undone.
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
                    setSelectedClient(null);
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
    </div>
  );
}
