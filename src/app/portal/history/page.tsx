'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  Briefcase,
  TrendingUp,
  MapPin,
} from 'lucide-react';

interface HistoryJob {
  id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  status: string;
  total_amount: number | null;
  address: string | null;
}

interface Stats {
  totalJobs: number;
  completedJobs: number;
  totalSpent: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function PortalHistory() {
  const [jobs, setJobs] = useState<HistoryJob[]>([]);
  const [stats, setStats] = useState<Stats>({ totalJobs: 0, completedJobs: 0, totalSpent: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const token = localStorage.getItem('portal_token');
    if (!token) return;

    fetch('/api/portal?action=history', { headers: { 'x-portal-token': token } })
      .then(res => res.json())
      .then(data => {
        setJobs(data.jobs || []);
        setStats(data.stats || { totalJobs: 0, completedJobs: 0, totalSpent: 0 });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading history...</div>;

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter);

  // Group by year
  const grouped = new Map<string, HistoryJob[]>();
  for (const job of filtered) {
    const year = new Date(job.scheduled_date).getFullYear().toString();
    const list = grouped.get(year) || [];
    list.push(job);
    grouped.set(year, list);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Service History</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <Briefcase className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{stats.totalJobs}</p>
          <p className="text-xs text-gray-500">Total Jobs</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-600">{stats.completedJobs}</p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <DollarSign className="w-5 h-5 text-gold-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">
            ${stats.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-500">Total Invested</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'All' },
          { key: 'completed', label: 'Completed' },
          { key: 'scheduled', label: 'Upcoming' },
          { key: 'cancelled', label: 'Cancelled' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key ? 'bg-navy-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow-sm text-center">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="font-medium text-gray-700">No service history</h3>
          <p className="text-sm text-gray-500 mt-1">Your completed jobs will build a timeline here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries())
            .sort((a, b) => Number(b[0]) - Number(a[0]))
            .map(([year, yearJobs]) => (
              <div key={year}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{year}</h2>
                <div className="space-y-3">
                  {yearJobs.map(job => {
                    const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.completed;
                    const StatusIcon = config.icon;

                    return (
                      <div key={job.id} className="bg-white rounded-xl p-4 shadow-sm flex items-start gap-3">
                        <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <StatusIcon className={`w-5 h-5 ${
                            job.status === 'completed' ? 'text-green-500' :
                            job.status === 'cancelled' ? 'text-red-400' : 'text-blue-500'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium text-gray-900">{job.title}</h3>
                              {job.description && (
                                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{job.description}</p>
                              )}
                            </div>
                            {job.total_amount && (
                              <p className="font-semibold text-gray-900 ml-3 flex-shrink-0">
                                ${job.total_amount.toFixed(2)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(job.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
                              {config.label}
                            </span>
                            {job.address && (
                              <span className="text-xs text-gray-400 flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                {job.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
