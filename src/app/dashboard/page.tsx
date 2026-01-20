'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Users,
  ClipboardList,
  Clock,
  Phone,
  Mail,
  FileText,
  RefreshCw,
  Calendar,
  MapPin,
  User,
  AlertCircle,
} from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
import { useAuth } from '@/contexts/AuthContext';

const statusColors: Record<string, string> = {
  scheduled: 'badge-info',
  in_progress: 'badge-warning',
  completed: 'badge-success',
  cancelled: 'badge-danger',
};

const leadStatusColors: Record<string, string> = {
  new: 'badge-gold',
  contacted: 'badge-info',
  quoted: 'badge-warning',
  won: 'badge-success',
  lost: 'badge-danger',
};

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '-';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getTimeSince(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  return `${diffHours}h ${diffMins % 60}m`;
}

// Helper to get name from Supabase relation (can be array or object)
function getCustomerName(customer: { name: string }[] | { name: string } | null): string {
  if (!customer) return '-';
  if (Array.isArray(customer)) return customer[0]?.name || '-';
  return customer.name || '-';
}

function getWorkerNames(
  assignments: { user: { full_name: string }[] | { full_name: string } | null }[] | null
): string {
  if (!assignments || assignments.length === 0) return '-';
  return (
    assignments
      .map((a) => {
        if (!a.user) return null;
        if (Array.isArray(a.user)) return a.user[0]?.full_name;
        return a.user.full_name;
      })
      .filter(Boolean)
      .join(', ') || '-'
  );
}

export default function DashboardPage() {
  const { dbUser, company } = useAuth();
  const { data, isLoading, error, refetch } = useDashboard();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-64 bg-gray-200 rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-32 animate-pulse bg-gray-100" />
          ))}
        </div>
        <div className="card h-64 animate-pulse bg-gray-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-navy-500 mb-2">Error Loading Dashboard</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={handleRefresh} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  const stats = [
    {
      label: "Today's Jobs",
      value: data?.stats.todaysJobs.toString() || '0',
      icon: ClipboardList,
      color: 'bg-blue-50',
      iconColor: 'text-blue-500',
    },
    {
      label: 'New Leads',
      value: data?.stats.newLeads.toString() || '0',
      icon: Users,
      color: 'bg-gold-50',
      iconColor: 'text-gold-500',
    },
    {
      label: 'Workers Clocked In',
      value: data?.stats.workersOnClock.toString() || '0',
      icon: Clock,
      color: 'bg-green-50',
      iconColor: 'text-green-500',
    },
    {
      label: 'Revenue This Month',
      value: formatCurrency(data?.stats.monthlyRevenue || 0),
      icon: DollarSign,
      color: 'bg-purple-50',
      iconColor: 'text-purple-500',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-500">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome back, {dbUser?.full_name?.split(' ')[0] || 'there'}! Here&apos;s what&apos;s happening today.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn-ghost flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center justify-between">
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
            </div>
            <div className="mt-4">
              <p className="stat-value">{stat.value}</p>
              <p className="stat-label">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Today's Schedule */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-navy-500" />
            <h2 className="text-lg font-semibold text-navy-500">Today&apos;s Schedule</h2>
          </div>
          <Link href="/dashboard/jobs" className="btn-ghost text-sm">
            View All Jobs
          </Link>
        </div>

        {data?.todaysJobs && data.todaysJobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header">Time</th>
                  <th className="table-header">Job</th>
                  <th className="table-header">Customer</th>
                  <th className="table-header hidden md:table-cell">Address</th>
                  <th className="table-header hidden lg:table-cell">Assigned To</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.todaysJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="table-cell whitespace-nowrap">
                      {formatTime(job.scheduled_time_start)}
                      {job.scheduled_time_end && ` - ${formatTime(job.scheduled_time_end)}`}
                    </td>
                    <td className="table-cell font-medium">{job.title}</td>
                    <td className="table-cell">{getCustomerName(job.customer)}</td>
                    <td className="table-cell hidden md:table-cell text-gray-500">
                      {job.address ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.address.substring(0, 30)}...
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="table-cell hidden lg:table-cell">
                      {getWorkerNames(job.assignments)}
                    </td>
                    <td className="table-cell">
                      <span className={statusColors[job.status] || 'badge-info'}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No jobs scheduled for today</p>
            <Link href="/dashboard/jobs" className="btn-secondary mt-4 inline-block">
              Schedule a Job
            </Link>
          </div>
        )}
      </div>

      {/* Two Column Layout for Leads and Workers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gold-500" />
              <h2 className="text-lg font-semibold text-navy-500">Recent Leads</h2>
            </div>
            <Link href="/dashboard/leads" className="btn-ghost text-sm">
              View All
            </Link>
          </div>

          {data?.recentLeads && data.recentLeads.length > 0 ? (
            <div className="space-y-4">
              {data.recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-navy-500 truncate">{lead.name}</p>
                      <span className={leadStatusColors[lead.status] || 'badge-info'}>
                        {lead.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {lead.service_requested || 'No service specified'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {lead.source} &bull; {formatDateTime(lead.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                        title="Call"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Email"
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      className="p-2 text-gray-400 hover:text-gold-500 hover:bg-gold-50 rounded-lg transition-colors"
                      title="Create Quote"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No leads yet</p>
              <Link href="/dashboard/leads" className="btn-secondary mt-4 inline-block">
                Add a Lead
              </Link>
            </div>
          )}
        </div>

        {/* Workers On Clock */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-semibold text-navy-500">Workers On Clock</h2>
            </div>
            <Link href="/dashboard/time-logs" className="btn-ghost text-sm">
              View Time Logs
            </Link>
          </div>

          {data?.clockedInWorkers && data.clockedInWorkers.length > 0 ? (
            <div className="space-y-3">
              {data.clockedInWorkers.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 p-3 bg-green-50 border border-green-100 rounded-lg"
                >
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-navy-500">
                      {entry.user?.full_name || 'Unknown Worker'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Clocked in {getTimeSince(entry.clock_in)}
                      {entry.job && (
                        <span className="text-green-600"> &bull; {entry.job.title}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium">Active</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No workers clocked in</p>
              <p className="text-sm text-gray-400 mt-1">
                Workers clock in via the mobile app
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard/jobs" className="card-hover cursor-pointer hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-navy-500 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-navy-500">Create New Job</h3>
              <p className="text-sm text-gray-500">Schedule a new service</p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/leads" className="card-hover cursor-pointer hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gold-500 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-navy-500" />
            </div>
            <div>
              <h3 className="font-semibold text-navy-500">Add New Lead</h3>
              <p className="text-sm text-gray-500">Capture a potential customer</p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/time-logs" className="card-hover cursor-pointer hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-navy-500">View Time Logs</h3>
              <p className="text-sm text-gray-500">Review worker hours</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
