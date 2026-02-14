'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Users,
  Briefcase,
  Receipt,
  FileText,
  UserCircle,
  Clock,
  CreditCard,
  Calendar,
  Mail,
  Phone,
  Globe,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CompanyUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  phone: string | null;
  last_login_at: string | null;
  created_at: string;
}

interface CompanyDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  website: string | null;
  plan: string;
  stripe_customer_id: string | null;
  trial_starts_at: string | null;
  trial_ends_at: string | null;
  industry: string | null;
  onboarding_completed: boolean;
  is_beta_tester: boolean;
  beta_notes: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  users: CompanyUser[];
  stats: {
    users: number;
    activeUsers: number;
    jobs: number;
    customers: number;
    quotes: number;
    leads: number;
    invoices: {
      total: number;
      totalRevenue: number;
      unpaid: number;
      unpaidAmount: number;
    };
  };
}

export default function AdminCompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [extendDays, setExtendDays] = useState(14);
  const [selectedPlan, setSelectedPlan] = useState('');

  const fetchCompany = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/companies/${id}`, {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      });

      if (res.ok) {
        const data = await res.json();
        setCompany(data);
        setSelectedPlan(data.plan);
      }
    } catch (err) {
      console.error('Error fetching company:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, [id]);

  const performAction = async (action: string, body: Record<string, unknown> = {}) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/companies/${id}/actions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...body }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: data.message });
        // Refresh company data
        await fetchCompany();
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Action failed' });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Network error' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-20">
        <Building2 size={48} className="mx-auto text-gray-600 mb-4" />
        <p className="text-gray-400">Company not found</p>
        <Link href="/admin/companies" className="text-orange-400 hover:text-orange-300 mt-2 inline-block">
          Back to companies
        </Link>
      </div>
    );
  }

  const daysLeft = company.trial_ends_at
    ? Math.ceil((new Date(company.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/companies"
          className="text-gray-400 hover:text-gray-200 text-sm flex items-center gap-1 mb-4"
        >
          <ArrowLeft size={16} /> Back to Companies
        </Link>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              {company.name}
              <StatusBadge status={company.status} />
            </h1>
            <p className="text-gray-400 mt-1">{company.email}</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center gap-2"
            >
              Actions <ChevronDown size={16} />
            </button>
            {showActions && (
              <div className="absolute right-0 mt-2 w-72 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-10 p-4 space-y-4">
                {/* Extend Trial */}
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-2">Extend Trial</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={extendDays}
                      onChange={(e) => setExtendDays(parseInt(e.target.value) || 7)}
                      className="w-20 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-gray-200 text-sm"
                      min={1}
                    />
                    <button
                      onClick={() => performAction('extend_trial', { days: extendDays })}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded text-sm hover:bg-blue-500/30 disabled:opacity-50"
                    >
                      Extend {extendDays}d
                    </button>
                  </div>
                </div>

                {/* Change Plan */}
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-2">Change Plan</p>
                  <div className="flex gap-2">
                    <select
                      value={selectedPlan}
                      onChange={(e) => setSelectedPlan(e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-gray-200 text-sm"
                    >
                      <option value="starter">Starter</option>
                      <option value="pro">Pro</option>
                      <option value="elite">Elite</option>
                    </select>
                    <button
                      onClick={() => performAction('change_plan', { plan: selectedPlan })}
                      disabled={actionLoading || selectedPlan === company.plan}
                      className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded text-sm hover:bg-purple-500/30 disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* Toggle Beta Tester */}
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-2">Beta Tester</p>
                  <button
                    onClick={() => performAction('toggle_beta_tester')}
                    disabled={actionLoading}
                    className={`w-full px-3 py-2 rounded-lg text-sm disabled:opacity-50 ${
                      company.is_beta_tester
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-gray-600/50 text-gray-400 hover:bg-gray-600/70'
                    }`}
                  >
                    {company.is_beta_tester ? 'Beta Tester (ON) — Click to remove' : 'Enable Beta Tester Access'}
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    Grants Elite access, all add-ons, no trial expiry
                  </p>
                </div>

                {/* Suspend / Reactivate */}
                <div className="pt-2 border-t border-gray-700">
                  {company.users.some((u) => u.is_active) ? (
                    <button
                      onClick={() => {
                        if (confirm('Suspend this company? All users will be deactivated.')) {
                          performAction('suspend');
                        }
                      }}
                      disabled={actionLoading}
                      className="w-full px-3 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20 disabled:opacity-50"
                    >
                      Suspend Company
                    </button>
                  ) : (
                    <button
                      onClick={() => performAction('reactivate')}
                      disabled={actionLoading}
                      className="w-full px-3 py-2 bg-green-500/10 text-green-400 rounded-lg text-sm hover:bg-green-500/20 disabled:opacity-50"
                    >
                      Reactivate Company
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div className={`mb-6 p-4 rounded-lg border ${
          actionMessage.type === 'success'
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {actionMessage.text}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <StatCard icon={<Users size={18} />} label="Users" value={company.stats.users} sub={`${company.stats.activeUsers} active`} />
        <StatCard icon={<UserCircle size={18} />} label="Customers" value={company.stats.customers} />
        <StatCard icon={<Briefcase size={18} />} label="Jobs" value={company.stats.jobs} />
        <StatCard icon={<FileText size={18} />} label="Quotes" value={company.stats.quotes} />
        <StatCard icon={<Receipt size={18} />} label="Invoices" value={company.stats.invoices.total} sub={`${company.stats.invoices.unpaid} unpaid`} />
        <StatCard icon={<CreditCard size={18} />} label="Revenue" value={`$${company.stats.invoices.totalRevenue.toLocaleString()}`} />
      </div>

      {/* Company Details & Users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Info */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Company Details</h2>
          <div className="space-y-4">
            <InfoRow icon={<Mail size={16} />} label="Email" value={company.email} />
            <InfoRow icon={<Phone size={16} />} label="Phone" value={company.phone || 'Not set'} />
            <InfoRow icon={<Globe size={16} />} label="Website" value={company.website || 'Not set'} />
            <InfoRow
              icon={<MapPin size={16} />}
              label="Address"
              value={[company.address, company.city, company.state, company.zip].filter(Boolean).join(', ') || 'Not set'}
            />
            <InfoRow icon={<Briefcase size={16} />} label="Industry" value={company.industry || 'Not set'} />
            <InfoRow icon={<Calendar size={16} />} label="Created" value={new Date(company.created_at).toLocaleDateString()} />

            <div className="pt-3 border-t border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Plan</span>
                <PlanBadge plan={company.plan} />
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Payment</span>
                <span className="text-sm text-gray-200">
                  {company.stripe_customer_id ? 'Stripe connected' : 'No payment method'}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Onboarding</span>
                <span className={`text-sm ${company.onboarding_completed ? 'text-green-400' : 'text-orange-400'}`}>
                  {company.onboarding_completed ? 'Completed' : 'Incomplete'}
                </span>
              </div>
              {company.is_beta_tester && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Beta Tester</span>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-green-500/10 text-green-400 border-green-500/20">
                    Beta
                  </span>
                </div>
              )}
              {company.trial_ends_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Trial Ends</span>
                  <span className={`text-sm ${
                    daysLeft !== null && daysLeft <= 0 ? 'text-red-400' :
                    daysLeft !== null && daysLeft <= 3 ? 'text-orange-400' :
                    'text-gray-200'
                  }`}>
                    {new Date(company.trial_ends_at).toLocaleDateString()}
                    {daysLeft !== null && ` (${daysLeft <= 0 ? 'expired' : `${daysLeft}d left`})`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Team Members ({company.users.length})
          </h2>
          {company.users.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No users found</p>
          ) : (
            <div className="space-y-3">
              {company.users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      user.is_active ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-600 text-gray-400'
                    }`}>
                      {user.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-200">{user.full_name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <RoleBadge role={user.role} />
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-400' : 'bg-gray-500'}`} />
                      <span className="text-xs text-gray-500">
                        {user.last_login_at
                          ? `Last login: ${new Date(user.last_login_at).toLocaleDateString()}`
                          : 'Never logged in'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <div className="flex items-center gap-2 text-gray-400 mb-2">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-gray-500 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-200">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: 'bg-green-500/10 text-green-400 border-green-500/20',
    trial: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    expired: 'bg-red-500/10 text-red-400 border-red-500/20',
    no_trial: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };
  const labels: Record<string, string> = { paid: 'Paid', trial: 'Trial', expired: 'Expired', no_trial: 'No Trial' };

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

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    owner: 'bg-purple-500/10 text-purple-400',
    admin: 'bg-blue-500/10 text-blue-400',
    worker: 'bg-gray-500/10 text-gray-400',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${styles[role] || styles.worker}`}>
      {role}
    </span>
  );
}
