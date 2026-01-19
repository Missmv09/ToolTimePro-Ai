'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  User,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  XCircle,
} from 'lucide-react';

interface Job {
  id: string;
  client: string;
  address: string;
  service: string;
  date: string;
  time: string;
  worker: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  amount: number;
}

const mockJobs: Job[] = [
  {
    id: '1',
    client: 'Johnson Residence',
    address: '123 Oak Street, Los Angeles, CA',
    service: 'Weekly Lawn Maintenance',
    date: 'Today',
    time: '9:00 AM - 11:00 AM',
    worker: 'Mike S.',
    status: 'completed',
    amount: 150,
  },
  {
    id: '2',
    client: 'Smith Pool Service',
    address: '456 Palm Ave, Beverly Hills, CA',
    service: 'Pool Cleaning & Chemical Balance',
    date: 'Today',
    time: '11:30 AM - 12:30 PM',
    worker: 'Carlos R.',
    status: 'in_progress',
    amount: 125,
  },
  {
    id: '3',
    client: 'Tech Office Park',
    address: '789 Business Blvd, Suite 100',
    service: 'Window Cleaning - Exterior',
    date: 'Today',
    time: '1:00 PM - 4:00 PM',
    worker: 'Sarah L.',
    status: 'scheduled',
    amount: 450,
  },
  {
    id: '4',
    client: 'Maple Street Apts',
    address: '321 Maple Street, Units 1-8',
    service: 'Pressure Washing - Common Areas',
    date: 'Today',
    time: '4:30 PM - 6:00 PM',
    worker: 'David K.',
    status: 'scheduled',
    amount: 380,
  },
  {
    id: '5',
    client: 'Wilson Family',
    address: '555 Sunset Blvd',
    service: 'Monthly Landscaping',
    date: 'Tomorrow',
    time: '8:00 AM - 12:00 PM',
    worker: 'Mike S.',
    status: 'scheduled',
    amount: 600,
  },
  {
    id: '6',
    client: 'Harbor View HOA',
    address: '100 Harbor Drive',
    service: 'Pool Maintenance',
    date: 'Tomorrow',
    time: '1:00 PM - 3:00 PM',
    worker: 'Carlos R.',
    status: 'scheduled',
    amount: 200,
  },
  {
    id: '7',
    client: 'Downtown Cafe',
    address: '222 Main Street',
    service: 'Window Cleaning',
    date: 'Jan 20',
    time: '7:00 AM - 9:00 AM',
    worker: 'Sarah L.',
    status: 'scheduled',
    amount: 175,
  },
  {
    id: '8',
    client: 'Green Valley School',
    address: '1000 School Road',
    service: 'Pressure Washing - Playground',
    date: 'Jan 21',
    time: '6:00 AM - 10:00 AM',
    worker: 'David K.',
    status: 'scheduled',
    amount: 550,
  },
];

const statusConfig = {
  scheduled: { label: 'Scheduled', color: 'badge-info', icon: Calendar },
  in_progress: { label: 'In Progress', color: 'badge-warning', icon: Clock },
  completed: { label: 'Completed', color: 'badge-success', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'badge-danger', icon: XCircle },
};

export default function JobsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredJobs = mockJobs.filter((job) => {
    const matchesSearch =
      job.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.worker.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const todayJobs = filteredJobs.filter((j) => j.date === 'Today');
  const upcomingJobs = filteredJobs.filter((j) => j.date !== 'Today');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-500">Jobs</h1>
          <p className="text-gray-500">Manage and track all service jobs</p>
        </div>
        <button className="btn-secondary">
          <Plus size={18} className="mr-2" />
          New Job
        </button>
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
                      <h3 className="font-semibold text-navy-500">{job.client}</h3>
                      <p className="text-sm text-gray-500">{job.service}</p>
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
                      <span>{job.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin size={14} />
                      <span>{job.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <User size={14} />
                      <span>{job.worker}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                    <span className="text-lg font-bold text-navy-500">${job.amount}</span>
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
                            <p className="font-medium text-navy-500">{job.client}</p>
                            <p className="text-xs text-gray-500">{job.address}</p>
                          </div>
                        </td>
                        <td className="table-cell">{job.service}</td>
                        <td className="table-cell">
                          <div>
                            <p className="font-medium">{job.date}</p>
                            <p className="text-xs text-gray-500">{job.time}</p>
                          </div>
                        </td>
                        <td className="table-cell">{job.worker}</td>
                        <td className="table-cell font-medium">${job.amount}</td>
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

      {filteredJobs.length === 0 && (
        <div className="card text-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">No jobs found</h3>
          <p className="text-gray-400 mt-1">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
