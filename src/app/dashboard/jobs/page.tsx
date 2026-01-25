'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  User,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { useJobs } from '@/hooks/useJobs';
import { useAuth } from '@/contexts/AuthContext';

const statusConfig = {
  scheduled: { label: 'Scheduled', color: 'badge-info', icon: Calendar },
  in_progress: { label: 'In Progress', color: 'badge-warning', icon: Clock },
  completed: { label: 'Completed', color: 'badge-success', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'badge-danger', icon: XCircle },
};

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCurrency(amount: number | null): string {
  if (!amount) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getWorkerNames(
  assignments: { user: { id: string; full_name: string } | null }[] | null
): string {
  if (!assignments || assignments.length === 0) return 'Unassigned';
  return (
    assignments
      .map((a) => a.user?.full_name)
      .filter(Boolean)
      .join(', ') || 'Unassigned'
  );
}

export default function JobsPage() {
  const { company } = useAuth();
  const { jobs, stats, isLoading, error, refetch } = useJobs();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const filteredJobs = jobs.filter((job) => {
    const customerName = job.customer?.name || '';
    const workerNames = getWorkerNames(job.assignments);
    const matchesSearch =
      customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workerNames.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const today = new Date().toISOString().split('T')[0];
  const todayJobs = filteredJobs.filter((j) => j.scheduled_date === today);
  const upcomingJobs = filteredJobs.filter((j) => j.scheduled_date && j.scheduled_date > today);
  const pastJobs = filteredJobs.filter((j) => j.scheduled_date && j.scheduled_date < today);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="card h-20 animate-pulse bg-gray-100" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-48 animate-pulse bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-navy-500 mb-2">Error Loading Jobs</h2>
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
          <h1 className="text-2xl font-bold text-navy-500">Jobs</h1>
          <p className="text-gray-500">Manage and track all service jobs</p>
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
            New Job
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-navy-500">{stats.total}</p>
          <p className="text-sm text-gray-500">Total</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-blue-500">{stats.scheduled}</p>
          <p className="text-sm text-gray-500">Scheduled</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-yellow-500">{stats.inProgress}</p>
          <p className="text-sm text-gray-500">In Progress</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
          <p className="text-sm text-gray-500">Completed</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-400">{stats.cancelled}</p>
          <p className="text-sm text-gray-500">Cancelled</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search jobs, clients, workers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'scheduled', 'in_progress', 'completed', 'cancelled'].map((status) => (
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

      {/* Today's Jobs */}
      {todayJobs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-navy-500 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gold-500" />
            Today&apos;s Jobs ({todayJobs.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {todayJobs.map((job) => {
              const status = statusConfig[job.status];
              return (
                <div key={job.id} className="card-hover">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-navy-500">{job.customer?.name || 'No Customer'}</h3>
                      <p className="text-sm text-gray-500">{job.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={status.color}>{status.label}</span>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <MoreVertical size={18} className="text-gray-400" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock size={14} />
                      <span>
                        {formatTime(job.scheduled_time_start)}
                        {job.scheduled_time_end && ` - ${formatTime(job.scheduled_time_end)}`}
                      </span>
                    </div>
                    {job.address && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin size={14} />
                        <span>{job.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-600">
                      <User size={14} />
                      <span>{getWorkerNames(job.assignments)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                    <span className="text-lg font-bold text-navy-500">
                      {formatCurrency(job.total_amount)}
                    </span>
                    <button className="btn-ghost text-sm">View Details</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Jobs */}
      {upcomingJobs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-navy-500 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-500" />
            Upcoming Jobs ({upcomingJobs.length})
          </h2>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="table-header">Client</th>
                    <th className="table-header">Service</th>
                    <th className="table-header">Date & Time</th>
                    <th className="table-header">Worker</th>
                    <th className="table-header">Amount</th>
                    <th className="table-header">Status</th>
                    <th className="table-header"></th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingJobs.map((job) => {
                    const status = statusConfig[job.status];
                    return (
                      <tr key={job.id} className="hover:bg-gray-50">
                        <td className="table-cell">
                          <div>
                            <p className="font-medium text-navy-500">{job.customer?.name || 'No Customer'}</p>
                            {job.address && <p className="text-xs text-gray-500">{job.address}</p>}
                          </div>
                        </td>
                        <td className="table-cell">{job.title}</td>
                        <td className="table-cell">
                          <div>
                            <p className="font-medium">{formatDate(job.scheduled_date)}</p>
                            <p className="text-xs text-gray-500">
                              {formatTime(job.scheduled_time_start)}
                              {job.scheduled_time_end && ` - ${formatTime(job.scheduled_time_end)}`}
                            </p>
                          </div>
                        </td>
                        <td className="table-cell">{getWorkerNames(job.assignments)}</td>
                        <td className="table-cell font-medium">{formatCurrency(job.total_amount)}</td>
                        <td className="table-cell">
                          <span className={status.color}>{status.label}</span>
                        </td>
                        <td className="table-cell">
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <MoreVertical size={18} className="text-gray-400" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Past Jobs (if any visible after filter) */}
      {pastJobs.length > 0 && statusFilter !== 'scheduled' && (
        <div>
          <h2 className="text-lg font-semibold text-navy-500 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-gray-400" />
            Past Jobs ({pastJobs.length})
          </h2>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="table-header">Client</th>
                    <th className="table-header">Service</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Worker</th>
                    <th className="table-header">Amount</th>
                    <th className="table-header">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pastJobs.slice(0, 10).map((job) => {
                    const status = statusConfig[job.status];
                    return (
                      <tr key={job.id} className="hover:bg-gray-50">
                        <td className="table-cell">
                          <p className="font-medium text-navy-500">{job.customer?.name || 'No Customer'}</p>
                        </td>
                        <td className="table-cell">{job.title}</td>
                        <td className="table-cell">{formatDate(job.scheduled_date)}</td>
                        <td className="table-cell">{getWorkerNames(job.assignments)}</td>
                        <td className="table-cell font-medium">{formatCurrency(job.total_amount)}</td>
                        <td className="table-cell">
                          <span className={status.color}>{status.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {filteredJobs.length === 0 && (
        <div className="card text-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">No jobs found</h3>
          <p className="text-gray-400 mt-1">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first job to get started'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <button className="btn-secondary mt-4">
              <Plus size={18} className="mr-2" />
              Create First Job
            </button>
          )}
        </div>
      )}
    </div>
  );
}
