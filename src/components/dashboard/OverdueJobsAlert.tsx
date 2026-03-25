'use client';

import Link from 'next/link';
import { useOverdueJobs } from '@/hooks/useOverdueJobs';

export default function OverdueJobsAlert() {
  const { overdueJobs, stats, isLoading } = useOverdueJobs();

  if (isLoading || overdueJobs.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Alert Banner */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">&#9888;&#65039;</span>
          <div className="flex-1">
            <h3 className="font-semibold text-red-800">
              {stats.total} Overdue {stats.total === 1 ? 'Job' : 'Jobs'}
            </h3>
            <p className="text-sm text-red-600 mt-1">
              {stats.total === 1
                ? 'You have a job that is past its scheduled date and has not been completed.'
                : `You have ${stats.total} jobs that are past their scheduled dates and have not been completed.`}
              {stats.urgent > 0 && ` ${stats.urgent} marked as urgent.`}
              {stats.highPriority > 0 && ` ${stats.highPriority} marked as high priority.`}
            </p>
          </div>
          <Link
            href="/dashboard/jobs?filter=overdue"
            className="text-sm font-medium text-red-700 hover:text-red-800 whitespace-nowrap"
          >
            View all &rarr;
          </Link>
        </div>
      </div>

      {/* Overdue Jobs List (show up to 5) */}
      <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
        <div className="px-4 py-3 bg-red-50 border-b border-red-100">
          <h3 className="text-sm font-semibold text-red-800">Overdue Jobs</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {overdueJobs.slice(0, 5).map((job) => (
            <Link
              key={job.id}
              href="/dashboard/jobs"
              className="flex items-center justify-between px-4 py-3 hover:bg-red-50/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{job.title}</p>
                <p className="text-sm text-gray-500">
                  {job.customer?.name || 'No customer'}
                </p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="text-sm font-medium text-red-600">
                  {job.days_overdue} {job.days_overdue === 1 ? 'day' : 'days'} overdue
                </p>
                <p className="text-xs text-gray-500">
                  Due: {new Date(job.scheduled_date + 'T00:00:00').toLocaleDateString()}
                </p>
                {(job.priority === 'urgent' || job.priority === 'high') && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    job.priority === 'urgent'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {job.priority.toUpperCase()}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
        {overdueJobs.length > 5 && (
          <div className="px-4 py-2 bg-gray-50 border-t text-center">
            <Link href="/dashboard/jobs" className="text-sm text-red-600 hover:text-red-700 font-medium">
              +{overdueJobs.length - 5} more overdue jobs
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
