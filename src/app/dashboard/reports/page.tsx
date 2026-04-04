'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Users,
  BarChart3,
  Download,
  Calendar,
  FileText,
  Briefcase,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// ── Date range helpers ──────────────────────────────────────────────

type RangePreset = 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'custom';

function getPresetRange(preset: RangePreset): { start: string; end: string } {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = now.getMonth();
  const dd = now.getDate();
  const day = now.getDay(); // 0=Sun

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  switch (preset) {
    case 'this_week': {
      const start = new Date(yyyy, mm, dd - day);
      const end = new Date(yyyy, mm, dd - day + 6);
      return { start: fmt(start), end: fmt(end) };
    }
    case 'this_month':
      return { start: fmt(new Date(yyyy, mm, 1)), end: fmt(new Date(yyyy, mm + 1, 0)) };
    case 'this_quarter': {
      const q = Math.floor(mm / 3) * 3;
      return { start: fmt(new Date(yyyy, q, 1)), end: fmt(new Date(yyyy, q + 3, 0)) };
    }
    case 'this_year':
      return { start: `${yyyy}-01-01`, end: `${yyyy}-12-31` };
    default:
      return { start: fmt(new Date(yyyy, mm, 1)), end: fmt(new Date(yyyy, mm + 1, 0)) };
  }
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Types ───────────────────────────────────────────────────────────

interface RevenueRow { month: string; revenue: number; jobs: number }
interface WorkerRow { name: string; hours: number }
interface TopCustomer { name: string; revenue: number }

// ── Component ───────────────────────────────────────────────────────

export default function ReportsPage() {
  const { user, dbUser, company } = useAuth();
  const companyId = dbUser?.company_id;

  // Date range state
  const [preset, setPreset] = useState<RangePreset>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const { start, end } = useMemo(() => {
    if (preset === 'custom' && customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }
    return getPresetRange(preset);
  }, [preset, customStart, customEnd]);

  // Data state
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [outstanding, setOutstanding] = useState(0);
  const [avgJobValue, setAvgJobValue] = useState(0);
  const [jobsCompleted, setJobsCompleted] = useState(0);
  const [revenueByMonth, setRevenueByMonth] = useState<RevenueRow[]>([]);
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [newCustomers, setNewCustomers] = useState(0);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [leadConversion, setLeadConversion] = useState({ won: 0, total: 0 });

  // ── Fetch all data ───────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    try {
      const [
        paidInvoicesRes,
        unpaidInvoicesRes,
        completedJobsRes,
        timeEntriesRes,
        newCustRes,
        topCustRes,
        leadsWonRes,
        leadsTotalRes,
      ] = await Promise.all([
        // Paid invoices in range
        supabase
          .from('invoices')
          .select('id, total, paid_at')
          .eq('company_id', companyId)
          .eq('status', 'paid')
          .gte('paid_at', start)
          .lte('paid_at', end + 'T23:59:59'),

        // Unpaid / outstanding invoices
        supabase
          .from('invoices')
          .select('id, total')
          .eq('company_id', companyId)
          .in('status', ['sent', 'overdue', 'pending'])
          .gte('created_at', start)
          .lte('created_at', end + 'T23:59:59'),

        // Completed jobs in range
        supabase
          .from('jobs')
          .select('id, total_amount, scheduled_date')
          .eq('company_id', companyId)
          .eq('status', 'completed')
          .gte('scheduled_date', start)
          .lte('scheduled_date', end),

        // Time entries
        supabase
          .from('time_entries')
          .select('user_id, hours_worked')
          .eq('company_id', companyId)
          .gte('clock_in', start)
          .lte('clock_in', end + 'T23:59:59'),

        // New customers
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .gte('created_at', start)
          .lte('created_at', end + 'T23:59:59'),

        // Top 5 customers by revenue (paid invoices with customer join)
        supabase
          .from('invoices')
          .select('total, customers(id, first_name, last_name)')
          .eq('company_id', companyId)
          .eq('status', 'paid')
          .gte('paid_at', start)
          .lte('paid_at', end + 'T23:59:59'),

        // Leads won
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'won')
          .gte('created_at', start)
          .lte('created_at', end + 'T23:59:59'),

        // Total leads
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .gte('created_at', start)
          .lte('created_at', end + 'T23:59:59'),
      ]);

      // ── Revenue stats ──
      const paidInvoices = paidInvoicesRes.data || [];
      const totalRev = paidInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
      setTotalRevenue(totalRev);

      const unpaid = (unpaidInvoicesRes.data || []).reduce((s, i) => s + (Number(i.total) || 0), 0);
      setOutstanding(unpaid);

      const completedJobs = completedJobsRes.data || [];
      setJobsCompleted(completedJobs.length);
      setAvgJobValue(completedJobs.length > 0
        ? completedJobs.reduce((s, j) => s + (Number(j.total_amount) || 0), 0) / completedJobs.length
        : 0);

      // ── Revenue by month ──
      const monthMap: Record<string, { revenue: number; jobs: number }> = {};
      for (const inv of paidInvoices) {
        const d = new Date(inv.paid_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap[key]) monthMap[key] = { revenue: 0, jobs: 0 };
        monthMap[key].revenue += Number(inv.total) || 0;
      }
      for (const job of completedJobs) {
        const d = new Date(job.scheduled_date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap[key]) monthMap[key] = { revenue: 0, jobs: 0 };
        monthMap[key].jobs += 1;
      }
      const sortedMonths = Object.keys(monthMap).sort();
      setRevenueByMonth(sortedMonths.map(k => {
        const [yr, mo] = k.split('-');
        return {
          month: `${MONTH_NAMES[parseInt(mo, 10) - 1]} ${yr}`,
          revenue: Math.round(monthMap[k].revenue * 100) / 100,
          jobs: monthMap[k].jobs,
        };
      }));

      // ── Worker productivity (time_entries grouped by user) ──
      const workerMap: Record<string, number> = {};
      for (const te of (timeEntriesRes.data || [])) {
        const uid = te.user_id;
        workerMap[uid] = (workerMap[uid] || 0) + (Number(te.hours_worked) || 0);
      }
      // Fetch worker names
      const workerIds = Object.keys(workerMap);
      let workerRows: WorkerRow[] = [];
      if (workerIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', workerIds);
        workerRows = (usersData || []).map(u => ({
          name: u.full_name || u.email || u.id,
          hours: Math.round((workerMap[u.id] || 0) * 100) / 100,
        }));
        workerRows.sort((a, b) => b.hours - a.hours);
      }
      setWorkers(workerRows);

      // ── Customer insights ──
      setNewCustomers(newCustRes.count ?? 0);

      // Top customers
      const custRevMap: Record<string, { name: string; revenue: number }> = {};
      for (const inv of (topCustRes.data || [])) {
        const cust = inv.customers as unknown as { id: string; first_name: string; last_name: string } | null;
        if (!cust) continue;
        const cid = cust.id;
        if (!custRevMap[cid]) {
          custRevMap[cid] = { name: `${cust.first_name || ''} ${cust.last_name || ''}`.trim() || 'Unknown', revenue: 0 };
        }
        custRevMap[cid].revenue += Number(inv.total) || 0;
      }
      const topCust = Object.values(custRevMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      setTopCustomers(topCust);

      setLeadConversion({ won: leadsWonRes.count ?? 0, total: leadsTotalRes.count ?? 0 });
    } catch (err) {
      console.error('Reports fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, start, end]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── CSV export ──────────────────────────────────────────────────

  const exportCSV = () => {
    const header = 'Month,Jobs Completed,Revenue,Avg Job Value';
    const rows = revenueByMonth.map(r =>
      `${r.month},${r.jobs},${r.revenue.toFixed(2)},${r.jobs > 0 ? (r.revenue / r.jobs).toFixed(2) : '0.00'}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${start}-to-${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Formatting helpers ──────────────────────────────────────────

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const conversionRate = leadConversion.total > 0
    ? ((leadConversion.won / leadConversion.total) * 100).toFixed(1)
    : '0.0';

  // ── Skeleton pulse ──────────────────────────────────────────────

  const Skeleton = ({ className = '' }: { className?: string }) => (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );

  // ── Render ──────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Analytics</h1>
            <p className="text-sm text-gray-500 mt-1">
              {start} to {end}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['this_week', 'this_month', 'this_quarter', 'this_year', 'custom'] as RangePreset[]).map(p => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={preset === p ? 'btn-primary text-sm' : 'btn-ghost text-sm'}
              >
                {p === 'this_week' && 'This Week'}
                {p === 'this_month' && 'This Month'}
                {p === 'this_quarter' && 'This Quarter'}
                {p === 'this_year' && 'This Year'}
                {p === 'custom' && 'Custom'}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date inputs */}
        {preset === 'custom' && (
          <div className="flex items-center gap-3">
            <Calendar size={18} className="text-gray-400" />
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="input text-sm"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="input text-sm"
            />
          </div>
        )}

        {/* ── Revenue Stats Cards ─────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-5">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))
          ) : (
            <>
              <div className="stat-card">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign size={18} className="text-green-600" />
                  <span className="stat-label">Total Revenue</span>
                </div>
                <p className="stat-value">{fmtCurrency(totalRevenue)}</p>
              </div>

              <div className="stat-card">
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={18} className="text-yellow-600" />
                  <span className="stat-label">Outstanding</span>
                </div>
                <p className="stat-value">{fmtCurrency(outstanding)}</p>
              </div>

              <div className="stat-card">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={18} className="text-blue-600" />
                  <span className="stat-label">Avg Job Value</span>
                </div>
                <p className="stat-value">{fmtCurrency(avgJobValue)}</p>
              </div>

              <div className="stat-card">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase size={18} className="text-purple-600" />
                  <span className="stat-label">Jobs Completed</span>
                </div>
                <p className="stat-value">{jobsCompleted}</p>
              </div>
            </>
          )}
        </div>

        {/* ── Revenue Trend Chart ─────────────────────────────── */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Revenue Trend</h2>
            <button onClick={exportCSV} className="btn-secondary text-sm flex items-center gap-1">
              <Download size={16} /> Export CSV
            </button>
          </div>

          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : revenueByMonth.length === 0 ? (
            <p className="text-gray-500 text-center py-16">No revenue data for this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Revenue by Month Table ──────────────────────────── */}
        <div className="card overflow-hidden">
          <div className="p-6 pb-0">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Month</h2>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : revenueByMonth.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="table-header text-left px-6 py-3">Month</th>
                    <th className="table-header text-right px-6 py-3">Jobs Completed</th>
                    <th className="table-header text-right px-6 py-3">Revenue</th>
                    <th className="table-header text-right px-6 py-3">Avg Job Value</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueByMonth.map(row => (
                    <tr key={row.month} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="table-cell px-6 py-3">{row.month}</td>
                      <td className="table-cell text-right px-6 py-3">{row.jobs}</td>
                      <td className="table-cell text-right px-6 py-3">{fmtCurrency(row.revenue)}</td>
                      <td className="table-cell text-right px-6 py-3">
                        {row.jobs > 0 ? fmtCurrency(row.revenue / row.jobs) : '$0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Worker Productivity ─────────────────────────────── */}
        <div className="card overflow-hidden">
          <div className="p-6 pb-0">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Worker Productivity</h2>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : workers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No time entries found for this period.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="table-header text-left px-6 py-3">Worker Name</th>
                      <th className="table-header text-right px-6 py-3">Hours Worked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.map(w => (
                      <tr key={w.name} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="table-cell px-6 py-3">{w.name}</td>
                        <td className="table-cell text-right px-6 py-3">{w.hours.toFixed(1)}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bar chart for worker hours */}
              <div className="p-6 pt-2">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={workers}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => [`${Number(value)}h`, 'Hours Worked']} />
                    <Bar dataKey="hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>

        {/* ── Customer Insights ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* New Customers */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-3">
              <Users size={18} className="text-blue-600" />
              <h3 className="font-semibold text-gray-900">New Customers</h3>
            </div>
            {loading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <p className="text-3xl font-bold text-gray-900">{newCustomers}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">this period</p>
          </div>

          {/* Lead Conversion */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={18} className="text-green-600" />
              <h3 className="font-semibold text-gray-900">Lead Conversion</h3>
            </div>
            {loading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-900">{conversionRate}%</p>
                <p className="text-sm text-gray-500 mt-1">
                  {leadConversion.won} won of {leadConversion.total} leads
                </p>
              </>
            )}
          </div>

          {/* Top Customers */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign size={18} className="text-amber-600" />
              <h3 className="font-semibold text-gray-900">Top Customers</h3>
            </div>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : topCustomers.length === 0 ? (
              <p className="text-sm text-gray-500">No customer data.</p>
            ) : (
              <ul className="space-y-2">
                {topCustomers.map((c, idx) => (
                  <li key={c.name + idx} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 truncate mr-2">
                      <span className="badge-success text-xs mr-1">#{idx + 1}</span>
                      {c.name}
                    </span>
                    <span className="font-medium text-gray-900 whitespace-nowrap">{fmtCurrency(c.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
