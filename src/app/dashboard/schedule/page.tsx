'use client';

import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  PlayCircle,
  XCircle,
} from 'lucide-react';
import { useSchedule, ScheduledJob } from '@/hooks/useSchedule';

const statusConfig = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', icon: Calendar },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700', icon: PlayCircle },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700', icon: XCircle },
};

const priorityColors = {
  low: 'border-l-gray-400',
  normal: 'border-l-blue-500',
  high: 'border-l-orange-500',
  urgent: 'border-l-red-500',
};

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDay.getDay();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    days.push(date);
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

export default function SchedulePage() {
  const { jobs, stats, isLoading, error, refetch, updateJobStatus } = useSchedule();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const daysInMonth = useMemo(
    () => getDaysInMonth(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getJobsForDate = (date: Date): ScheduledJob[] => {
    const dateStr = date.toISOString().split('T')[0];
    return jobs.filter((job) => job.scheduled_date === dateStr);
  };

  const selectedDateJobs = selectedDate ? getJobsForDate(selectedDate) : [];

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentMonth;
  };

  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-navy-500 mb-2">Error Loading Schedule</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={() => refetch()} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-500">Schedule</h1>
          <p className="text-gray-500">View and manage your job calendar</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-ghost">
            <RefreshCw size={18} />
          </button>
          <button onClick={goToToday} className="btn-ghost">
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{stats.today}</p>
              <p className="text-sm text-gray-500">Today</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{stats.thisWeek}</p>
              <p className="text-sm text-gray-500">This Week</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{stats.scheduled}</p>
              <p className="text-sm text-gray-500">Scheduled</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <PlayCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{stats.inProgress}</p>
              <p className="text-sm text-gray-500">In Progress</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500">{stats.completed}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-navy-500">{monthName}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight size={20} className="text-gray-600" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map((date, index) => {
              const dayJobs = getJobsForDate(date);
              const hasJobs = dayJobs.length > 0;

              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(date)}
                  className={`
                    relative p-2 min-h-[80px] rounded-lg text-left transition-colors
                    ${isCurrentMonth(date) ? 'bg-white' : 'bg-gray-50'}
                    ${isSelected(date) ? 'ring-2 ring-orange-500' : ''}
                    ${isToday(date) ? 'bg-orange-50' : ''}
                    hover:bg-gray-100
                  `}
                >
                  <span
                    className={`
                      text-sm font-medium
                      ${isCurrentMonth(date) ? 'text-gray-900' : 'text-gray-400'}
                      ${isToday(date) ? 'text-orange-600' : ''}
                    `}
                  >
                    {date.getDate()}
                  </span>
                  {hasJobs && (
                    <div className="mt-1 space-y-1">
                      {dayJobs.slice(0, 2).map((job) => (
                        <div
                          key={job.id}
                          className={`text-xs px-1 py-0.5 rounded truncate ${statusConfig[job.status].color}`}
                        >
                          {job.title}
                        </div>
                      ))}
                      {dayJobs.length > 2 && (
                        <div className="text-xs text-gray-500 px-1">+{dayJobs.length - 2} more</div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-navy-500 mb-4">
            {selectedDate
              ? selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })
              : 'Select a day'}
          </h2>

          {selectedDateJobs.length > 0 ? (
            <div className="space-y-3">
              {selectedDateJobs.map((job) => {
                const status = statusConfig[job.status];
                const StatusIcon = status.icon;

                return (
                  <div
                    key={job.id}
                    className={`p-3 rounded-lg border-l-4 bg-gray-50 ${priorityColors[job.priority]}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-navy-500">{job.title}</h3>
                      <span className={`badge ${status.color} text-xs flex items-center gap-1`}>
                        <StatusIcon size={10} />
                        {status.label}
                      </span>
                    </div>

                    {job.customer && (
                      <p className="text-sm text-gray-600 mt-1">{job.customer.name}</p>
                    )}

                    {(job.scheduled_time_start || job.scheduled_time_end) && (
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-2">
                        <Clock size={12} />
                        <span>
                          {formatTime(job.scheduled_time_start)}
                          {job.scheduled_time_end && ` - ${formatTime(job.scheduled_time_end)}`}
                        </span>
                      </div>
                    )}

                    {job.address && (
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                        <MapPin size={12} />
                        <span className="truncate">
                          {[job.address, job.city, job.state].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}

                    {job.customer?.phone && (
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                        <Phone size={12} />
                        <a href={`tel:${job.customer.phone}`} className="hover:text-orange-500">
                          {job.customer.phone}
                        </a>
                      </div>
                    )}

                    {job.status !== 'completed' && job.status !== 'cancelled' && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                        {job.status === 'scheduled' && (
                          <button
                            onClick={() => updateJobStatus(job.id, 'in_progress')}
                            className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                          >
                            Start Job
                          </button>
                        )}
                        {job.status === 'in_progress' && (
                          <button
                            onClick={() => updateJobStatus(job.id, 'completed')}
                            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No jobs scheduled for this day</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
