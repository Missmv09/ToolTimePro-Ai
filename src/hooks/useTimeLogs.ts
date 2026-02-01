'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { TimeEntry } from '@/types/database';

export interface TimeEntryWithDetails extends TimeEntry {
  user: {
    id: string;
    full_name: string;
    hourly_rate: number | null;
  } | null;
  job: {
    id: string;
    title: string;
    customer: { name: string } | null;
  } | null;
}

interface WorkerSummary {
  id: string;
  name: string;
  hoursThisWeek: number;
  hourlyRate: number;
  entries: number;
}

interface TimeLogStats {
  totalHoursThisWeek: number;
  totalLaborCost: number;
  pendingApprovals: number;
  activeWorkers: number;
  workersOvertime: number;
}

interface UseTimeLogsReturn {
  entries: TimeEntryWithDetails[];
  workers: WorkerSummary[];
  stats: TimeLogStats;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  approveEntry: (id: string) => Promise<{ error: Error | null }>;
  rejectEntry: (id: string) => Promise<{ error: Error | null }>;
}

export function useTimeLogs(): UseTimeLogsReturn {
  const { company } = useAuth();
  const [entries, setEntries] = useState<TimeEntryWithDetails[]>([]);
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [stats, setStats] = useState<TimeLogStats>({
    totalHoursThisWeek: 0,
    totalLaborCost: 0,
    pendingApprovals: 0,
    activeWorkers: 0,
    workersOvertime: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeLogs = useCallback(async () => {
    if (!company?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get start of week (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      startOfWeek.setHours(0, 0, 0, 0);

      const { data, error: fetchError } = await supabase
        .from('time_entries')
        .select(`
          *,
          user:users(id, full_name, hourly_rate),
          job:jobs(id, title, customer:customers(name))
        `)
        .eq('company_id', company.id)
        .gte('clock_in', startOfWeek.toISOString())
        .order('clock_in', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const entriesData = (data as unknown as TimeEntryWithDetails[]) || [];
      setEntries(entriesData);

      // Calculate worker summaries
      const workerMap = new Map<string, WorkerSummary>();

      entriesData.forEach((entry) => {
        if (!entry.user) return;

        const hours = entry.clock_out
          ? (new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / (1000 * 60 * 60)
          : 0;

        const existing = workerMap.get(entry.user.id);
        if (existing) {
          existing.hoursThisWeek += hours;
          existing.entries += 1;
        } else {
          workerMap.set(entry.user.id, {
            id: entry.user.id,
            name: entry.user.full_name,
            hoursThisWeek: hours,
            hourlyRate: entry.user.hourly_rate || 0,
            entries: 1,
          });
        }
      });

      const workerSummaries = Array.from(workerMap.values());
      setWorkers(workerSummaries);

      // Calculate stats
      const totalHours = workerSummaries.reduce((sum, w) => sum + w.hoursThisWeek, 0);
      const totalCost = workerSummaries.reduce((sum, w) => sum + (w.hoursThisWeek * w.hourlyRate), 0);
      const pending = entriesData.filter((e) => e.status === 'active' && e.clock_out).length;
      const overtime = workerSummaries.filter((w) => w.hoursThisWeek > 40).length;

      setStats({
        totalHoursThisWeek: totalHours,
        totalLaborCost: totalCost,
        pendingApprovals: pending,
        activeWorkers: workerSummaries.length,
        workersOvertime: overtime,
      });
    } catch (err) {
      console.error('Error fetching time logs:', err);
      setError('Failed to load time logs');
    } finally {
      setIsLoading(false);
    }
  }, [company?.id]);

  const approveEntry = async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('time_entries')
        .update({ status: 'completed' })
        .eq('id', id);

      if (updateError) {
        return { error: updateError };
      }

      await fetchTimeLogs();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const rejectEntry = async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('time_entries')
        .update({ status: 'edited' })
        .eq('id', id);

      if (updateError) {
        return { error: updateError };
      }

      await fetchTimeLogs();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  useEffect(() => {
    fetchTimeLogs();
  }, [fetchTimeLogs]);

  // Set up real-time subscription
  useEffect(() => {
    if (!company?.id) return;

    const subscription = supabase
      .channel('time-logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_entries',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          fetchTimeLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [company?.id, fetchTimeLogs]);

  return {
    entries,
    workers,
    stats,
    isLoading,
    error,
    refetch: fetchTimeLogs,
    approveEntry,
    rejectEntry,
  };
}
