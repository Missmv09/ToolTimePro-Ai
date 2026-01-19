'use client';

import {
  DollarSign,
  Users,
  ClipboardCheck,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

const stats = [
  {
    label: "Today's Revenue",
    value: '$2,450',
    change: '+12%',
    trend: 'up',
    icon: DollarSign,
  },
  {
    label: 'Active Jobs',
    value: '8',
    change: '+2',
    trend: 'up',
    icon: ClipboardCheck,
  },
  {
    label: 'Workers Clocked In',
    value: '5',
    change: '0',
    trend: 'neutral',
    icon: Users,
  },
  {
    label: 'Hours Today',
    value: '32.5',
    change: '+4.5',
    trend: 'up',
    icon: Clock,
  },
];

const recentJobs = [
  {
    id: 1,
    client: 'Johnson Residence',
    service: 'Lawn Maintenance',
    worker: 'Mike S.',
    status: 'In Progress',
    time: '9:00 AM - 11:00 AM',
  },
  {
    id: 2,
    client: 'Smith Pool Co.',
    service: 'Pool Cleaning',
    worker: 'Carlos R.',
    status: 'Completed',
    time: '8:00 AM - 9:30 AM',
  },
  {
    id: 3,
    client: 'Tech Office Park',
    service: 'Window Cleaning',
    worker: 'Sarah L.',
    status: 'Scheduled',
    time: '1:00 PM - 4:00 PM',
  },
  {
    id: 4,
    client: 'Maple Street Apts',
    service: 'Pressure Washing',
    worker: 'David K.',
    status: 'In Progress',
    time: '10:00 AM - 2:00 PM',
  },
];

const statusColors: Record<string, string> = {
  'In Progress': 'badge-warning',
  Completed: 'badge-success',
  Scheduled: 'badge-info',
  Cancelled: 'badge-danger',
};

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy-500">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here&apos;s what&apos;s happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-gold-50 rounded-lg flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-gold-500" />
              </div>
              <div
                className={`flex items-center gap-1 text-sm font-medium ${
                  stat.trend === 'up'
                    ? 'text-green-600'
                    : stat.trend === 'down'
                    ? 'text-red-600'
                    : 'text-gray-500'
                }`}
              >
                {stat.change}
                {stat.trend === 'up' && <ArrowUpRight size={16} />}
                {stat.trend === 'down' && <ArrowDownRight size={16} />}
              </div>
            </div>
            <div className="mt-4">
              <p className="stat-value">{stat.value}</p>
              <p className="stat-label">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Jobs */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-navy-500">Today&apos;s Jobs</h2>
          <button className="btn-ghost text-sm">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header">Client</th>
                <th className="table-header">Service</th>
                <th className="table-header">Worker</th>
                <th className="table-header">Time</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentJobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{job.client}</td>
                  <td className="table-cell">{job.service}</td>
                  <td className="table-cell">{job.worker}</td>
                  <td className="table-cell">{job.time}</td>
                  <td className="table-cell">
                    <span className={statusColors[job.status]}>{job.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-hover cursor-pointer hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-navy-500 rounded-lg flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-navy-500">Create New Job</h3>
              <p className="text-sm text-gray-500">Schedule a new service</p>
            </div>
          </div>
        </div>

        <div className="card-hover cursor-pointer hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gold-500 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-navy-500" />
            </div>
            <div>
              <h3 className="font-semibold text-navy-500">Add New Lead</h3>
              <p className="text-sm text-gray-500">Capture a potential customer</p>
            </div>
          </div>
        </div>

        <div className="card-hover cursor-pointer hover-lift">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-navy-500">View Reports</h3>
              <p className="text-sm text-gray-500">Analyze your performance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
