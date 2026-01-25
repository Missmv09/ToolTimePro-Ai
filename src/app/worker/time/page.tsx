'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Calendar, ChevronLeft, ChevronRight, DollarSign, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Customer {
  name: string;
}

interface Job {
  title: string;
  customer: Customer | Customer[] | null;
}

interface TimeEntry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  status: string;
  job: Job | Job[] | null;
}

interface GroupedEntry {
  date: Date;
  entries: TimeEntry[];
  totalHours: number;
}

interface WorkerData {
  id: string;
  company_id: string;
}

function formatTimeRange(clockIn: string, clockOut: string | null): string {
  const inTime = new Date(clockIn).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (!clockOut) {
    return `${inTime} - Active`;
  }

  const outTime = new Date(clockOut).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${inTime} - ${outTime}`;
}

function calculateHours(clockIn: string, clockOut: string | null, breakMinutes: number): number {
  const inTime = new Date(clockIn).getTime();
  const outTime = clockOut ? new Date(clockOut).getTime() : Date.now();
  const totalMinutes = (outTime - inTime) / (1000 * 60) - breakMinutes;
  return Math.max(0, totalMinutes / 60);
}

export default function WorkerTimePage() {
  const router = useRouter();
  const [worker, setWorker] = useState<WorkerData | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helper to get job data from potentially array result
  const getJob = (job: TimeEntry['job']): Job | null => {
    if (!job) return null;
    if (Array.isArray(job)) return job[0] || null;
    return job;
  };

  // Helper to get customer name from potentially array result
  const getCustomerName = (customer: Customer | Customer[] | null): string => {
    if (!customer) return 'Unknown Customer';
    if (Array.isArray(customer)) return customer[0]?.name || 'Unknown Customer';
    return customer.name || 'Unknown Customer';
  };

  // Initialize auth
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/worker/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('id, company_id')
        .eq('id', user.id)
        .single();

      if (userData) {
        setWorker(userData);
      }
    };
    init();
  }, [router]);

  const getWeekDates = (offset: number) => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek - offset * 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return { start: startOfWeek, end: endOfWeek };
  };

  const fetchTimeEntries = useCallback(async () => {
    if (!worker?.id || !worker?.company_id) return;

    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('time_entries')
        .select(`
          *,
          job:jobs(
            title,
            customer:customers(name)
          )
        `)
        .eq('user_id', worker.id)
        .eq('company_id', worker.company_id)
        .order('clock_in', { ascending: false });

      if (fetchError) throw fetchError;

      setTimeEntries((data as unknown as TimeEntry[]) || []);
    } catch (err) {
      console.error('Error fetching time entries:', err);
      setError('Failed to load time entries');
    } finally {
      setIsLoading(false);
    }
  }, [worker?.id, worker?.company_id]);

  useEffect(() => {
    if (worker) {
      fetchTimeEntries();
    }
  }, [worker, fetchTimeEntries]);

  // Real-time subscription
  useEffect(() => {
    if (!worker?.id) return;

    const subscription = supabase
      .channel('worker-time-entries')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_entries',
          filter: `user_id=eq.${worker.id}`,
        },
        () => {
          fetchTimeEntries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [worker?.id, fetchTimeEntries]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTimeEntries();
    setIsRefreshing(false);
  };

  const { start, end } = getWeekDates(selectedWeek);

  // Filter entries for selected week
  const weekEntries = timeEntries.filter((entry) => {
    const entryDate = new Date(entry.clock_in);
    return entryDate >= start && entryDate <= end;
  });

  // Calculate week totals
  const totalHours = weekEntries.reduce((sum, entry) => {
    return sum + calculateHours(entry.clock_in, entry.clock_out, entry.break_minutes);
  }, 0);
  const regularHours = Math.min(totalHours, 40);
  const overtimeHours = Math.max(totalHours - 40, 0);

  // Group by date
  const entriesByDate: GroupedEntry[] = [];
  const dateMap = new Map<string, TimeEntry[]>();

  weekEntries.forEach((entry) => {
    const dateKey = new Date(entry.clock_in).toDateString();
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, []);
    }
    dateMap.get(dateKey)!.push(entry);
  });

  dateMap.forEach((entries, dateKey) => {
    const totalHours = entries.reduce((sum, entry) => {
      return sum + calculateHours(entry.clock_in, entry.clock_out, entry.break_minutes);
    }, 0);
    entriesByDate.push({
      date: new Date(dateKey),
      entries,
      totalHours,
    });
  });

  // Sort by date descending
  entriesByDate.sort((a, b) => b.date.getTime() - a.date.getTime());

  const formatDateRange = (start: Date, end: Date) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  if (isLoading || !worker) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Time Entries</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={handleRefresh} className="px-4 py-2 bg-gray-200 rounded-lg">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week Selector */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedWeek(selectedWeek + 1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <div className="text-center">
            <p className="text-sm text-gray-500">Week of</p>
            <p className="font-semibold text-gray-900">{formatDateRange(start, end)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw className={`w-5 h-5 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setSelectedWeek(Math.max(0, selectedWeek - 1))}
              disabled={selectedWeek === 0}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Hours Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <Clock className="w-6 h-6 text-blue-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}</p>
          <p className="text-xs text-gray-500">Total Hours</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <Calendar className="w-6 h-6 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-600">{regularHours.toFixed(1)}</p>
          <p className="text-xs text-gray-500">Regular</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <DollarSign className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-yellow-600">{overtimeHours.toFixed(1)}</p>
          <p className="text-xs text-gray-500">Overtime</p>
        </div>
      </div>

      {/* Time Entries by Date */}
      {entriesByDate.map((group) => {
        return (
          <div key={group.date.toISOString()} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900">
                  {group.date.toLocaleDateString('en-US', { weekday: 'long' })}
                </p>
                <p className="text-sm text-gray-500">
                  {group.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{group.totalHours.toFixed(1)} hrs</p>
                <p className="text-xs text-gray-500">{group.entries.length} entries</p>
              </div>
            </div>

            <div className="space-y-2">
              {group.entries.map((entry) => {
                const hours = calculateHours(entry.clock_in, entry.clock_out, entry.break_minutes);
                const isActive = !entry.clock_out;
                const job = getJob(entry.job);
                const customerName = job ? getCustomerName(job.customer) : 'Unknown Customer';

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isActive ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">
                        {customerName}
                      </p>
                      <p className="text-xs text-gray-500">{job?.title || 'No job assigned'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatTimeRange(entry.clock_in, entry.clock_out)}
                      </p>
                      <p className="text-xs text-gray-500">{hours.toFixed(1)} hrs</p>
                    </div>
                    <div className="ml-3">
                      {isActive ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          Active
                        </span>
                      ) : entry.status === 'completed' ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Completed</span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">Edited</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {entriesByDate.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 text-center py-12">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No time entries for this week</p>
          <p className="text-sm text-gray-400 mt-1">
            Clock in to a job to start tracking time
          </p>
        </div>
      )}
    </div>
  );
}
