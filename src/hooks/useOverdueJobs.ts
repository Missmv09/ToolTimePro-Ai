'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface OverdueJob {
  id: string;
  title: string;
  scheduled_date: string;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  status: string;
  priority: string;
  customer: { name: string } | null;
  days_overdue: number;
}

interface OverdueJobsStats {
  total: number;
  highPriority: number;
  urgent: number;
}

export function useOverdueJobs() {
  const { company } = useAuth();
  const [overdueJobs, setOverdueJobs] = useState<OverdueJob[]>([]);
  const [stats, setStats] = useState<OverdueJobsStats>({
    total: 0,
    highPriority: 0,
    urgent: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchOverdueJobs = useCallback(async () => {
    if (!company?.id) return;

    setIsLoading(true);

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          scheduled_date,
          scheduled_time_start,
          scheduled_time_end,
          status,
          priority,
          customer:customers(name)
        `)
        .eq('company_id', company.id)
        .in('status', ['scheduled', 'in_progress'])
        .lt('scheduled_date', today)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const overdueList: OverdueJob[] = (data || []).map((job) => {
        const scheduledDate = new Date(job.scheduled_date + 'T00:00:00');
        const diffTime = now.getTime() - scheduledDate.getTime();
        const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          ...job,
          customer: Array.isArray(job.customer) ? job.customer[0] : job.customer,
          days_overdue: daysOverdue,
        };
      });

      setOverdueJobs(overdueList);
      setStats({
        total: overdueList.length,
        highPriority: overdueList.filter((j) => j.priority === 'high').length,
        urgent: overdueList.filter((j) => j.priority === 'urgent').length,
      });
    } catch (err) {
      console.error('Error fetching overdue jobs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchOverdueJobs();
  }, [fetchOverdueJobs]);

  // Real-time subscription for job changes
  useEffect(() => {
    if (!company?.id) return;

    const subscription = supabase
      .channel('overdue-jobs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          fetchOverdueJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [company?.id, fetchOverdueJobs]);

  return {
    overdueJobs,
    stats,
    isLoading,
    refetch: fetchOverdueJobs,
  };
}
