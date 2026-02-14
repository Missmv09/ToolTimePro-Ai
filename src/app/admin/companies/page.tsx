'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Building2,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Users,
  ArrowUpDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CompanyRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plan: string;
  stripe_customer_id: string | null;
  trial_starts_at: string | null;
  trial_ends_at: string | null;
  industry: string | null;
  is_beta_tester: boolean;
  created_at: string;
  user_count: number;
  status: string;
}

interface CompaniesResponse {
  companies: CompanyRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminCompaniesPage() {
  const [data, setData] = useState<CompaniesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        sort: sortField,
        order: sortOrder,
      });
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (planFilter) params.set('plan', planFilter);

      const res = await fetch(`/api/admin/companies?${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      });

      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, planFilter, sortField, sortOrder]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const getTrialDaysLeft = (trialEnd: string | null) => {
    if (!trialEnd) return null;
    const days = Math.ceil((new Date(trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Companies</h1>
        <p className="text-gray-400 mt-1">Manage all ToolTime Pro customer companies</p>
      </div>

      {/* Filters Bar */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by company name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-gray-700 border border-gray-600 rounded-lg text-gray-200 px-3 py-2.5 focus:outline-none focus:border-orange-500"
            >
              <option value="all">All Status</option>
              <option value="trial">Trial</option>
              <option value="paid">Paid</option>
              <option value="expired">Expired</option>
              <option value="beta">Beta Tester</option>
            </select>
          </div>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
            className="bg-gray-700 border border-gray-600 rounded-lg text-gray-200 px-3 py-2.5 focus:outline-none focus:border-orange-500"
          >
            <option value="">All Plans</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="elite">Elite</option>
          </select>
        </div>

        {data && (
          <p className="text-sm text-gray-500 mt-3">
            Showing {data.companies.length} of {data.total} companies
          </p>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data || data.companies.length === 0 ? (
          <div className="text-center py-20">
            <Building2 size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No companies found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <SortableHeader label="Company" field="name" current={sortField} order={sortOrder} onSort={handleSort} />
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <SortableHeader label="Plan" field="plan" current={sortField} order={sortOrder} onSort={handleSort} />
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Users</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Trial</th>
                    <SortableHeader label="Signed Up" field="created_at" current={sortField} order={sortOrder} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {data.companies.map((company) => {
                    const daysLeft = getTrialDaysLeft(company.trial_ends_at);
                    return (
                      <tr key={company.id} className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-4">
                          <Link href={`/admin/companies/${company.id}`} className="group">
                            <p className="font-medium text-gray-200 group-hover:text-orange-400 transition-colors">
                              {company.name}
                              {company.is_beta_tester && (
                                <span className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                                  Beta
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-500">{company.email}</p>
                          </Link>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={company.status} />
                        </td>
                        <td className="px-4 py-4">
                          <PlanBadge plan={company.plan} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 text-gray-300">
                            <Users size={14} className="text-gray-500" />
                            {company.user_count}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {company.status === 'paid' ? (
                            <span className="text-sm text-gray-500">-</span>
                          ) : daysLeft !== null ? (
                            <span className={`text-sm ${
                              daysLeft <= 0 ? 'text-red-400' :
                              daysLeft <= 3 ? 'text-orange-400' :
                              'text-gray-400'
                            }`}>
                              {daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">No trial</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-400">
                          {new Date(company.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
                <p className="text-sm text-gray-500">
                  Page {data.page} of {data.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                    className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= data.totalPages}
                    className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  field,
  current,
  order,
  onSort,
}: {
  label: string;
  field: string;
  current: string;
  order: string;
  onSort: (field: string) => void;
}) {
  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={12} className={current === field ? 'text-orange-400' : 'text-gray-600'} />
      </div>
    </th>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: 'bg-green-500/10 text-green-400 border-green-500/20',
    trial: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    expired: 'bg-red-500/10 text-red-400 border-red-500/20',
    no_trial: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };

  const labels: Record<string, string> = {
    paid: 'Paid',
    trial: 'Trial',
    expired: 'Expired',
    no_trial: 'No Trial',
  };

  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${styles[status] || styles.no_trial}`}>
      {labels[status] || status}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    starter: 'bg-blue-500/10 text-blue-400',
    pro: 'bg-orange-500/10 text-orange-400',
    elite: 'bg-purple-500/10 text-purple-400',
  };

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${styles[plan] || 'bg-gray-500/10 text-gray-400'}`}>
      {plan || 'starter'}
    </span>
  );
}
