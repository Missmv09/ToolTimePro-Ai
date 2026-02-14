'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  CreditCard,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PlatformStats {
  totalCompanies: number;
  activeCompanies: number;
  trialCompanies: number;
  paidCompanies: number;
  newSignupsThisMonth: number;
  newSignupsLastMonth: number;
  totalUsers: number;
  recentSignups: Array<{
    id: string;
    name: string;
    email: string;
    plan: string;
    stripe_customer_id: string | null;
    trial_starts_at: string | null;
    trial_ends_at: string | null;
    created_at: string;
    industry: string | null;
  }>;
  expiringTrials: Array<{
    id: string;
    name: string;
    email: string;
    trial_ends_at: string;
    created_at: string;
  }>;
  planDistribution: Record<string, number>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${session?.access_token || ''}` },
        });

        if (!res.ok) {
          throw new Error('Failed to fetch stats');
        }

        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const signupGrowth = stats.newSignupsLastMonth > 0
    ? Math.round(((stats.newSignupsThisMonth - stats.newSignupsLastMonth) / stats.newSignupsLastMonth) * 100)
    : stats.newSignupsThisMonth > 0 ? 100 : 0;

  const trialConversionRate = stats.totalCompanies > 0
    ? Math.round((stats.paidCompanies / stats.totalCompanies) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Platform Admin Dashboard</h1>
        <p className="text-gray-400 mt-1">Overview of all ToolTime Pro customers and platform health</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Total Companies"
          value={stats.totalCompanies}
          icon={<Building2 size={22} />}
          color="blue"
        />
        <MetricCard
          title="Paid Customers"
          value={stats.paidCompanies}
          icon={<CreditCard size={22} />}
          color="green"
          subtitle={`${trialConversionRate}% conversion rate`}
        />
        <MetricCard
          title="Active Trials"
          value={stats.trialCompanies}
          icon={<Clock size={22} />}
          color="orange"
        />
        <MetricCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<Users size={22} />}
          color="purple"
        />
      </div>

      {/* Growth & Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Signups Growth */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Signup Growth</h2>
          <div className="flex items-end gap-8">
            <div>
              <p className="text-gray-400 text-sm">This Month</p>
              <p className="text-3xl font-bold text-white">{stats.newSignupsThisMonth}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Last Month</p>
              <p className="text-xl text-gray-300">{stats.newSignupsLastMonth}</p>
            </div>
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
              signupGrowth >= 0
                ? 'bg-green-500/10 text-green-400'
                : 'bg-red-500/10 text-red-400'
            }`}>
              {signupGrowth >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {signupGrowth >= 0 ? '+' : ''}{signupGrowth}%
            </div>
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Plan Distribution</h2>
          <div className="space-y-3">
            {Object.entries(stats.planDistribution).map(([plan, count]) => {
              const percentage = stats.totalCompanies > 0 ? Math.round((count / stats.totalCompanies) * 100) : 0;
              const colors: Record<string, string> = {
                starter: 'bg-blue-500',
                pro: 'bg-orange-500',
                elite: 'bg-purple-500',
              };
              return (
                <div key={plan}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300 capitalize">{plan}</span>
                    <span className="text-gray-400">{count} ({percentage}%)</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colors[plan] || 'bg-gray-500'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two Column: Recent Signups + Expiring Trials */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Signups */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Signups</h2>
            <Link
              href="/admin/companies"
              className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recentSignups.length === 0 ? (
              <p className="text-gray-500 text-center py-6">No companies yet</p>
            ) : (
              stats.recentSignups.map((company) => (
                <Link
                  key={company.id}
                  href={`/admin/companies/${company.id}`}
                  className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-200">{company.name}</p>
                    <p className="text-sm text-gray-400">{company.email}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge
                      status={
                        company.stripe_customer_id
                          ? 'paid'
                          : company.trial_ends_at && new Date(company.trial_ends_at) > new Date()
                          ? 'trial'
                          : 'expired'
                      }
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(company.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Expiring Trials */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-orange-400" />
            <h2 className="text-lg font-semibold text-white">Trials Expiring Soon</h2>
          </div>
          <div className="space-y-3">
            {stats.expiringTrials.length === 0 ? (
              <p className="text-gray-500 text-center py-6">No trials expiring in the next 7 days</p>
            ) : (
              stats.expiringTrials.map((company) => {
                const daysLeft = Math.ceil(
                  (new Date(company.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <Link
                    key={company.id}
                    href={`/admin/companies/${company.id}`}
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-200">{company.name}</p>
                      <p className="text-sm text-gray-400">{company.email}</p>
                    </div>
                    <div className={`text-sm font-medium px-2 py-1 rounded ${
                      daysLeft <= 1
                        ? 'bg-red-500/10 text-red-400'
                        : daysLeft <= 3
                        ? 'bg-orange-500/10 text-orange-400'
                        : 'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  color,
  subtitle,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'purple';
  subtitle?: string;
}) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  const iconColors = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    orange: 'bg-orange-500/20 text-orange-400',
    purple: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-400">{title}</p>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColors[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value.toLocaleString()}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: 'bg-green-500/10 text-green-400',
    trial: 'bg-orange-500/10 text-orange-400',
    expired: 'bg-red-500/10 text-red-400',
    no_trial: 'bg-gray-500/10 text-gray-400',
  };

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || styles.no_trial}`}>
      {status === 'paid' ? 'Paid' : status === 'trial' ? 'Trial' : status === 'expired' ? 'Expired' : 'No Trial'}
    </span>
  );
}
