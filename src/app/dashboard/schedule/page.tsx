'use client';

import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useJobs } from '@/hooks/useJobs';
import { useAuth } from '@/contexts/AuthContext';

const statusColors = {
  scheduled: 'bg-blue-100 border-blue-300 text-blue-800',
  in_progress: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  completed: 'bg-green-100 border-green-300 text-green-800',
  cancelled: 'bg-gray-100 border-gray-300 text-gray-500',
};

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function getWorkerNames(
  assignments: { user: { id: string; full_name: string } | null }[] | null
): string {
  if (!assignments || assignments.length === 0) return 'Unassigned';
  return (
    assignments
      .map((a) => a.user?.full_name?.split(' ')[0])
      .filter(Boolean)
      .join(', ') || 'Unassigned'
  );
}

export default function SchedulePage() {
  const { company } = useAuth();
  const { jobs, isLoading, error, refetch } = useJobs();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'day'>('week');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // Get week dates
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day); // Start from Sunday

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentDate]);

  // Navigate
  const goToPrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get jobs for a specific date
  const getJobsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return jobs.filter((job) => job.scheduled_date === dateStr);
  };

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Format for header
  const formatWeekHeader = () => {
    const start = weekDates[0];
    const end = weekDates[6];
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const year = end.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${year}`;
    }
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="card h-[600px] animate-pulse bg-gray-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-navy-500 mb-2">Error Loading Schedule</h2>
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
          <h1 className="text-2xl font-bold text-navy-500">Schedule</h1>
          <p className="text-gray-500">View and manage job schedule</p>
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
            Add Job
          </button>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button onClick={goToPrevWeek} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft size={20} />
            </button>
            <button onClick={goToToday} className="px-4 py-2 hover:bg-gray-100 rounded-lg font-medium">
              Today
            </button>
            <button onClick={goToNextWeek} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight size={20} />
            </button>
          </div>

          <h2 className="text-lg font-semibold text-navy-500">{formatWeekHeader()}</h2>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'week' ? 'bg-navy-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView('day')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'day' ? 'bg-navy-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Day
            </button>
          </div>
        </div>
      </div>

      {/* Week Calendar */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {weekDates.map((date, index) => (
            <div
              key={index}
              className={`p-3 text-center border-r last:border-r-0 ${
                isToday(date) ? 'bg-blue-50' : ''
              }`}
            >
              <div className="text-xs text-gray-500 uppercase">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div
                className={`text-lg font-semibold mt-1 ${
                  isToday(date)
                    ? 'w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto'
                    : 'text-navy-500'
                }`}
              >
                {date.getDate()}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 min-h-[500px]">
          {weekDates.map((date, dayIndex) => {
            const dayJobs = getJobsForDate(date);
            return (
              <div
                key={dayIndex}
                className={`border-r last:border-r-0 p-2 ${
                  isToday(date) ? 'bg-blue-50/50' : ''
                }`}
              >
                {dayJobs.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm mt-4">No jobs</div>
                ) : (
                  <div className="space-y-2">
                    {dayJobs.map((job) => (
                      <div
                        key={job.id}
                        className={`p-2 rounded-lg border text-xs cursor-pointer hover:shadow-md transition-shadow ${
                          statusColors[job.status]
                        }`}
                      >
                        <div className="font-semibold truncate">
                          {job.customer?.name || 'No Customer'}
                        </div>
                        <div className="truncate text-gray-600">{job.title}</div>
                        {job.scheduled_time_start && (
                          <div className="flex items-center gap-1 mt-1 text-gray-500">
                            <Clock size={10} />
                            <span>{formatTime(job.scheduled_time_start)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 mt-1 text-gray-500">
                          <User size={10} />
                          <span className="truncate">{getWorkerNames(job.assignments)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-600 mb-3">Status Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300" />
            <span className="text-sm text-gray-600">Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300" />
            <span className="text-sm text-gray-600">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
            <span className="text-sm text-gray-600">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-100 border border-gray-300" />
            <span className="text-sm text-gray-600">Cancelled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
