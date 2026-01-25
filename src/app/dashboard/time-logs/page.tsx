'use client';

import { useState } from 'react';
import {
  Search,
  Clock,
  User,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  RefreshCw,
  MapPin,
} from 'lucide-react';
import { useTimeLogs } from '@/hooks/useTimeLogs';
import { useAuth } from '@/contexts/AuthContext';

const statusConfig = {
  active: { label: 'Active', color: 'badge-warning', icon: Clock },
  completed: { label: 'Approved', color: 'badge-success', icon: CheckCircle },
  edited: { label: 'Edited', color: 'badge-danger', icon: XCircle },
};

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const entryDate = new Date(date);
  entryDate.setHours(0, 0, 0, 0);

  if (entryDate.getTime() === today.getTime()) return 'Today';
  if (entryDate.getTime() === yesterday.getTime()) return 'Yesterday';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function calculateHours(clockIn: string, clockOut: string | null): number {
  if (!clockOut) return 0;
  const start = new Date(clockIn).getTime();
  const end = new Date(clockOut).getTime();
  return (end - start) / (1000 * 60 * 60);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export default function TimeLogsPage() {
  const { company } = useAuth();
  const { entries, workers, stats, isLoading, error, refetch, approveEntry, rejectEntry } = useTimeLogs();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [workerFilter, setWorkerFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleApprove = async (id: string) => {
    await approveEntry(id);
  };

  const handleReject = async (id: string) => {
    await rejectEntry(id);
  };

  const filteredEntries = entries.filter((entry) => {
    const workerName = entry.user?.full_name || '';
    const customerName = entry.job?.customer?.name || '';
    const jobTitle = entry.job?.title || '';
    const matchesSearch =
      workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
    const matchesWorker = workerFilter === 'all' || entry.user?.id === workerFilter;
    return matchesSearch && matchesStatus && matchesWorker;
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-24 animate-pulse bg-gray-100" />
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
        <h2 className="text-xl font-semibold text-navy-500 mb-2">Error Loading Time Logs</h2>
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
          <h1 className="text-2xl font-bold text-navy-500">Time Logs</h1>
          <p className="text-gray-500">Track and approve worker time entries</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-ghost"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button className="btn-outline">
            <Download size={18} className="mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{stats.totalHoursThisWeek.toFixed(1)}</p>
              <p className="text-sm text-gray-500">Total Hours (Week)</p>
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
                ${stats.totalLaborCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-sm text-gray-500">Labor Cost (Week)</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{stats.pendingApprovals}</p>
              <p className="text-sm text-gray-500">Pending Approval</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{stats.activeWorkers}</p>
              <p className="text-sm text-gray-500">Active Workers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Worker Hours Summary */}
      {workers.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-navy-500 mb-4">Worker Hours This Week</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {workers.map((worker) => {
              const isOvertime = worker.hoursThisWeek > 40;
              return (
                <div
                  key={worker.id}
                  className={`p-4 rounded-lg ${
                    isOvertime ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-navy-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-navy-500">
                        {getInitials(worker.name)}
                      </span>
                    </div>
                    <span className="font-medium text-navy-500">{worker.name}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold text-navy-500">
                        {worker.hoursThisWeek.toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-500">hours</p>
                    </div>
                    {isOvertime && (
                      <span className="text-xs text-red-600 font-medium">
                        +{(worker.hoursThisWeek - 40).toFixed(1)} OT
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search time entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={workerFilter}
            onChange={(e) => setWorkerFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">All Workers</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            {['all', 'active', 'completed', 'edited'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-navy-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all'
                  ? 'All'
                  : status === 'active'
                  ? 'Pending'
                  : statusConfig[status as keyof typeof statusConfig]?.label || status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Time Entries Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header">Worker</th>
                <th className="table-header">Date</th>
                <th className="table-header">Job</th>
                <th className="table-header">Clock In/Out</th>
                <th className="table-header">Hours</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => {
                const status = statusConfig[entry.status] || statusConfig.active;
                const StatusIcon = status.icon;
                const hours = calculateHours(entry.clock_in, entry.clock_out);
                const isPending = entry.status === 'active' && entry.clock_out;

                return (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-navy-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-navy-500">
                            {entry.user ? getInitials(entry.user.full_name) : '?'}
                          </span>
                        </div>
                        <span className="font-medium text-navy-500">
                          {entry.user?.full_name || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">{formatDate(entry.clock_in)}</td>
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-navy-500">
                          {entry.job?.customer?.name || 'No Customer'}
                        </p>
                        <p className="text-xs text-gray-500">{entry.job?.title || 'No Job'}</p>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="font-mono text-sm">
                        {formatTime(entry.clock_in)} - {entry.clock_out ? formatTime(entry.clock_out) : 'Active'}
                      </span>
                    </td>
                    <td className="table-cell font-medium">
                      {hours > 0 ? `${hours.toFixed(2)} hrs` : '-'}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${status.color} flex items-center gap-1 w-fit`}>
                        <StatusIcon size={12} />
                        {isPending ? 'Pending' : status.label}
                      </span>
                    </td>
                    <td className="table-cell">
                      {isPending && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(entry.id)}
                            className="p-2 bg-green-50 hover:bg-green-100 rounded-lg text-green-600 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleReject(entry.id)}
                            className="p-2 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                            title="Reject"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredEntries.length === 0 && (
        <div className="card text-center py-12">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">No time entries found</h3>
          <p className="text-gray-400 mt-1">
            {searchQuery || statusFilter !== 'all' || workerFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Time entries will appear here when workers clock in'}
          </p>
        </div>
      )}
    </div>
  );
}
