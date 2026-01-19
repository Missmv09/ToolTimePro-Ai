'use client';

import { useState } from 'react';
import {
  Search,
  Calendar,
  Clock,
  User,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  Filter,
} from 'lucide-react';

interface TimeEntry {
  id: string;
  worker: string;
  workerAvatar: string;
  date: string;
  client: string;
  service: string;
  clockIn: string;
  clockOut: string;
  hours: number;
  status: 'approved' | 'pending' | 'rejected';
  notes?: string;
}

const mockTimeEntries: TimeEntry[] = [
  {
    id: '1',
    worker: 'Mike Sanders',
    workerAvatar: 'MS',
    date: 'Today',
    client: 'Johnson Residence',
    service: 'Lawn Maintenance',
    clockIn: '9:00 AM',
    clockOut: '11:15 AM',
    hours: 2.25,
    status: 'approved',
  },
  {
    id: '2',
    worker: 'Carlos Rodriguez',
    workerAvatar: 'CR',
    date: 'Today',
    client: 'Smith Pool Service',
    service: 'Pool Cleaning',
    clockIn: '11:30 AM',
    clockOut: '12:45 PM',
    hours: 1.25,
    status: 'pending',
    notes: 'Extra time for pump repair',
  },
  {
    id: '3',
    worker: 'Sarah Lee',
    workerAvatar: 'SL',
    date: 'Today',
    client: 'Tech Office Park',
    service: 'Window Cleaning',
    clockIn: '1:00 PM',
    clockOut: '',
    hours: 0,
    status: 'pending',
    notes: 'Still on job',
  },
  {
    id: '4',
    worker: 'David Kim',
    workerAvatar: 'DK',
    date: 'Yesterday',
    client: 'Maple Street Apts',
    service: 'Pressure Washing',
    clockIn: '8:00 AM',
    clockOut: '12:30 PM',
    hours: 4.5,
    status: 'approved',
  },
  {
    id: '5',
    worker: 'Mike Sanders',
    workerAvatar: 'MS',
    date: 'Yesterday',
    client: 'Wilson Family',
    service: 'Landscaping',
    clockIn: '1:00 PM',
    clockOut: '5:00 PM',
    hours: 4,
    status: 'approved',
  },
  {
    id: '6',
    worker: 'Carlos Rodriguez',
    workerAvatar: 'CR',
    date: 'Yesterday',
    client: 'Harbor View HOA',
    service: 'Pool Maintenance',
    clockIn: '2:00 PM',
    clockOut: '4:30 PM',
    hours: 2.5,
    status: 'approved',
  },
  {
    id: '7',
    worker: 'Sarah Lee',
    workerAvatar: 'SL',
    date: 'Jan 17',
    client: 'Downtown Cafe',
    service: 'Window Cleaning',
    clockIn: '7:00 AM',
    clockOut: '9:15 AM',
    hours: 2.25,
    status: 'rejected',
    notes: 'Time entry disputed - hours adjusted',
  },
  {
    id: '8',
    worker: 'David Kim',
    workerAvatar: 'DK',
    date: 'Jan 17',
    client: 'Green Valley School',
    service: 'Pressure Washing',
    clockIn: '6:00 AM',
    clockOut: '10:30 AM',
    hours: 4.5,
    status: 'approved',
  },
];

const statusConfig = {
  approved: { label: 'Approved', color: 'badge-success', icon: CheckCircle },
  pending: { label: 'Pending', color: 'badge-warning', icon: AlertCircle },
  rejected: { label: 'Rejected', color: 'badge-danger', icon: XCircle },
};

// Worker summary
const workers = [
  { name: 'Mike Sanders', avatar: 'MS', hoursThisWeek: 38.5, rate: 22 },
  { name: 'Carlos Rodriguez', avatar: 'CR', hoursThisWeek: 32.25, rate: 20 },
  { name: 'Sarah Lee', avatar: 'SL', hoursThisWeek: 28.75, rate: 24 },
  { name: 'David Kim', avatar: 'DK', hoursThisWeek: 41, rate: 21 },
];

export default function TimeLogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [workerFilter, setWorkerFilter] = useState<string>('all');

  const filteredEntries = mockTimeEntries.filter((entry) => {
    const matchesSearch =
      entry.worker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.service.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
    const matchesWorker = workerFilter === 'all' || entry.worker === workerFilter;
    return matchesSearch && matchesStatus && matchesWorker;
  });

  const totalHoursThisWeek = workers.reduce((sum, w) => sum + w.hoursThisWeek, 0);
  const totalLaborCost = workers.reduce((sum, w) => sum + w.hoursThisWeek * w.rate, 0);
  const pendingApprovals = mockTimeEntries.filter((e) => e.status === 'pending').length;

  const handleApprove = (id: string) => {
    console.log('Approving entry:', id);
  };

  const handleReject = (id: string) => {
    console.log('Rejecting entry:', id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-500">Time Logs</h1>
          <p className="text-gray-500">Track and approve worker time entries</p>
        </div>
        <button className="btn-outline">
          <Download size={18} className="mr-2" />
          Export Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{totalHoursThisWeek.toFixed(1)}</p>
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
                ${totalLaborCost.toLocaleString()}
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
              <p className="text-2xl font-bold text-navy-500">{pendingApprovals}</p>
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
              <p className="text-2xl font-bold text-navy-500">{workers.length}</p>
              <p className="text-sm text-gray-500">Active Workers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Worker Hours Summary */}
      <div className="card">
        <h2 className="text-lg font-semibold text-navy-500 mb-4">Worker Hours This Week</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {workers.map((worker) => {
            const isOvertime = worker.hoursThisWeek > 40;
            return (
              <div
                key={worker.name}
                className={`p-4 rounded-lg ${
                  isOvertime ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-navy-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-navy-500">{worker.avatar}</span>
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
              <option key={w.name} value={w.name}>
                {w.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            {['all', 'pending', 'approved', 'rejected'].map((status) => (
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
                const status = statusConfig[entry.status];
                const StatusIcon = status.icon;
                return (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-navy-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-navy-500">
                            {entry.workerAvatar}
                          </span>
                        </div>
                        <span className="font-medium text-navy-500">{entry.worker}</span>
                      </div>
                    </td>
                    <td className="table-cell">{entry.date}</td>
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-navy-500">{entry.client}</p>
                        <p className="text-xs text-gray-500">{entry.service}</p>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="font-mono text-sm">
                        {entry.clockIn} - {entry.clockOut || 'Active'}
                      </span>
                    </td>
                    <td className="table-cell font-medium">
                      {entry.hours > 0 ? `${entry.hours.toFixed(2)} hrs` : '-'}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${status.color} flex items-center gap-1 w-fit`}>
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                    </td>
                    <td className="table-cell">
                      {entry.status === 'pending' && (
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
          <p className="text-gray-400 mt-1">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
