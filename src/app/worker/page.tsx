'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Clock,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Calendar,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { useWorkerAuth } from '@/contexts/WorkerAuthContext';
import { useWorkerJobs } from '@/hooks/useWorkerJobs';

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const statusLabels = {
  scheduled: 'Upcoming',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export default function WorkerJobsPage() {
  const { worker, company } = useWorkerAuth();
  const { todaysJobs, isLoading, error, refetch, updateJobStatus } = useWorkerJobs(
    worker?.id || null,
    company?.id || null
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const completedCount = todaysJobs.filter((j) => j.status === 'completed').length;
  const inProgressJob = todaysJobs.find((j) => j.status === 'in_progress');

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="card h-32 animate-pulse bg-gray-100" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-24 animate-pulse bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-navy-500 mb-2">Error Loading Jobs</h2>
        <p className="text-gray-600 mb-4 text-center">{error}</p>
        <button onClick={handleRefresh} className="btn-secondary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Date Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-500">Today&apos;s Jobs</h1>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Calendar size={14} />
            {today}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className={`w-5 h-5 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="text-right">
            <p className="text-2xl font-bold text-navy-500">
              {completedCount}/{todaysJobs.length}
            </p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
        </div>
      </div>

      {/* Current Job Banner */}
      {inProgressJob && (
        <div className="bg-gold-50 border-2 border-gold-500 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-gold-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-gold-700">Currently Working</span>
          </div>
          <h3 className="font-bold text-navy-500">
            {inProgressJob.customer?.name || 'Job In Progress'}
          </h3>
          <p className="text-sm text-gray-600">{inProgressJob.title}</p>
          <Link href={`/worker/job`} className="btn-secondary mt-3 w-full text-center">
            View Job Details
          </Link>
        </div>
      )}

      {/* Job List */}
      {todaysJobs.length > 0 ? (
        <div className="space-y-3">
          {todaysJobs.map((job) => (
            <Link
              key={job.id}
              href={`/worker/job`}
              className="card block hover:shadow-card-hover transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-navy-500">
                      {job.customer?.name || 'Unknown Customer'}
                    </h3>
                    <span className={`badge text-xs ${statusColors[job.status]}`}>
                      {statusLabels[job.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{job.title}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
                {job.scheduled_time_start && (
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {formatTime(job.scheduled_time_start)}
                    {job.scheduled_time_end && ` - ${formatTime(job.scheduled_time_end)}`}
                  </span>
                )}
                {job.address && (
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />
                    {job.address.split(',')[0]}
                  </span>
                )}
              </div>

              {job.status === 'completed' && (
                <div className="flex items-center gap-1 mt-3 text-green-600 text-sm">
                  <CheckCircle size={16} />
                  <span>Completed</span>
                </div>
              )}

              {job.notes && job.status !== 'completed' && (
                <div className="flex items-start gap-2 mt-3 p-2 bg-yellow-50 rounded-lg">
                  <AlertCircle size={14} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-700">{job.notes}</p>
                </div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">No jobs scheduled</h3>
          <p className="text-gray-400 mt-1">You have no jobs assigned for today</p>
        </div>
      )}

      {/* Help Button */}
      {company?.phone && (
        <div className="fixed bottom-24 right-4">
          <a
            href={`tel:${company.phone}`}
            className="w-14 h-14 bg-navy-500 rounded-full flex items-center justify-center shadow-lg hover:bg-navy-600 transition-colors"
          >
            <Phone className="w-6 h-6 text-white" />
          </a>
        </div>
      )}
    </div>
  );
}
