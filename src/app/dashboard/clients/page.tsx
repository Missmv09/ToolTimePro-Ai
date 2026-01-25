'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  Users,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  RefreshCw,
  AlertCircle,
  Calendar,
  Building2,
} from 'lucide-react';
import { useCustomers } from '@/hooks/useCustomers';
import { useAuth } from '@/contexts/AuthContext';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export default function ClientsPage() {
  const { company } = useAuth();
  const { customers, stats, isLoading, error, refetch } = useCustomers();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.phone || '').includes(searchQuery) ||
      (customer.address || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
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
        <h2 className="text-xl font-semibold text-navy-500 mb-2">Error Loading Clients</h2>
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
          <h1 className="text-2xl font-bold text-navy-500">Clients</h1>
          <p className="text-gray-500">Manage your customer database</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-ghost"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button className="btn-secondary">
            <Plus size={18} className="mr-2" />
            Add Client
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{stats.thisMonth}</p>
              <p className="text-sm text-gray-500">New This Month</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-gold-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">
                {customers.filter((c) => c.source === 'referral').length}
              </p>
              <p className="text-sm text-gray-500">Referrals</p>
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
            placeholder="Search clients by name, email, phone, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Clients Grid */}
      {filteredCustomers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <div key={customer.id} className="card-hover">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-navy-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-navy-500">
                      {getInitials(customer.name)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-500">{customer.name}</h3>
                    {customer.source && (
                      <span className="text-xs text-gray-400">via {customer.source}</span>
                    )}
                  </div>
                </div>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <MoreVertical size={18} className="text-gray-400" />
                </button>
              </div>

              <div className="space-y-2 text-sm">
                {customer.email && (
                  <a
                    href={`mailto:${customer.email}`}
                    className="flex items-center gap-2 text-gray-600 hover:text-blue-600"
                  >
                    <Mail size={14} />
                    <span className="truncate">{customer.email}</span>
                  </a>
                )}
                {customer.phone && (
                  <a
                    href={`tel:${customer.phone}`}
                    className="flex items-center gap-2 text-gray-600 hover:text-green-600"
                  >
                    <Phone size={14} />
                    <span>{customer.phone}</span>
                  </a>
                )}
                {customer.address && (
                  <div className="flex items-start gap-2 text-gray-600">
                    <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">
                      {customer.address}
                      {customer.city && `, ${customer.city}`}
                      {customer.state && `, ${customer.state}`}
                      {customer.zip && ` ${customer.zip}`}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  Added {formatDate(customer.created_at)}
                </span>
                <button className="btn-ghost text-sm">View Details</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">No clients found</h3>
          <p className="text-gray-400 mt-1">
            {searchQuery
              ? 'Try adjusting your search'
              : 'Add your first client to get started'}
          </p>
          {!searchQuery && (
            <button className="btn-secondary mt-4">
              <Plus size={18} className="mr-2" />
              Add First Client
            </button>
          )}
        </div>
      )}
    </div>
  );
}
