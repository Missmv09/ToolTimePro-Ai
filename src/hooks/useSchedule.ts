'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface ScheduledJob {
  id: string;
  title: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  scheduled_date: string | null;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  total_amount: number | null;
  notes: string | null;
  created_at: string;
  customer?: {
    id: string;
    name: string;
    phone: string | null;
  };
}

export interface ScheduleStats {
  today: number;
  thisWeek: number;
  scheduled: number;
  inProgress: number;
  completed: number;
}

interface UseScheduleReturn {
  jobs: ScheduledJob[];
  stats: ScheduleStats;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getJobsForDate: (date: Date) => ScheduledJob[];
  getJobsForWeek: (startDate: Date) => ScheduledJob[];
  updateJobStatus: (id: string, status: ScheduledJob['status']) => Promise<{ error: Error | null }>;
}

export function useSchedule(): UseScheduleReturn {
  const { company } = useAuth();
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!company?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(id, name, phone)
        `)
        .eq('company_id', company.id)
        .not('scheduled_date', 'is', null)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time_start', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setJobs((data as ScheduledJob[]) || []);
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setError('Failed to load schedule');
    } finally {
      setIsLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Real-time subscription
  useEffect(() => {
    if (!company?.id) return;

    const subscription = supabase
      .channel('schedule-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          fetchJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [company?.id, fetchJobs]);

  const getJobsForDate = (date: Date): ScheduledJob[] => {
    const dateStr = date.toISOString().split('T')[0];
    return jobs.filter((job) => job.scheduled_date === dateStr);
  };

  const getJobsForWeek = (startDate: Date): ScheduledJob[] => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    return jobs.filter((job) => {
      if (!job.scheduled_date) return false;
      const jobDate = new Date(job.scheduled_date);
      return jobDate >= start && jobDate < end;
    });
  };

  const updateJobStatus = async (
    id: string,
    status: ScheduledJob['status']
  ): Promise<{ error: Error | null }> => {
    try {
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ status })
        .eq('id', id);

      if (updateError) {
        return { error: updateError };
      }

      await fetchJobs();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Calculate stats
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const stats: ScheduleStats = {
    today: jobs.filter((job) => job.scheduled_date === today).length,
    thisWeek: jobs.filter((job) => {
      if (!job.scheduled_date) return false;
      const jobDate = new Date(job.scheduled_date);
      return jobDate >= weekStart && jobDate < weekEnd;
    }).length,
    scheduled: jobs.filter((job) => job.status === 'scheduled').length,
    inProgress: jobs.filter((job) => job.status === 'in_progress').length,
    completed: jobs.filter((job) => job.status === 'completed').length,
  };

  return {
    jobs,
    stats,
    isLoading,
    error,
    refetch: fetchJobs,
    getJobsForDate,
    getJobsForWeek,
    updateJobStatus,
  };
}
