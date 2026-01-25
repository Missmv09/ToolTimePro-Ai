'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Job } from '@/types/database';

export interface JobWithDetails extends Job {
  customer: { name: string } | null;
  assignments: {
    user: { id: string; full_name: string } | null;
  }[];
}

interface JobStats {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

interface UseJobsReturn {
  jobs: JobWithDetails[];
  stats: JobStats;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createJob: (job: Partial<Job>) => Promise<{ data: Job | null; error: Error | null }>;
  updateJob: (id: string, updates: Partial<Job>) => Promise<{ error: Error | null }>;
  deleteJob: (id: string) => Promise<{ error: Error | null }>;
}

export function useJobs(): UseJobsReturn {
  const { company } = useAuth();
  const [jobs, setJobs] = useState<JobWithDetails[]>([]);
  const [stats, setStats] = useState<JobStats>({
    total: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  });
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
          customer:customers(name),
          assignments:job_assignments(
            user:users(id, full_name)
          )
        `)
        .eq('company_id', company.id)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time_start', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      const jobsData = (data as unknown as JobWithDetails[]) || [];
      setJobs(jobsData);

      // Calculate stats
      setStats({
        total: jobsData.length,
        scheduled: jobsData.filter((j) => j.status === 'scheduled').length,
        inProgress: jobsData.filter((j) => j.status === 'in_progress').length,
        completed: jobsData.filter((j) => j.status === 'completed').length,
        cancelled: jobsData.filter((j) => j.status === 'cancelled').length,
      });
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError('Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  }, [company?.id]);

  const createJob = async (jobData: Partial<Job>) => {
    if (!company?.id) {
      return { data: null, error: new Error('No company found') };
    }

    try {
      const { data, error: insertError } = await supabase
        .from('jobs')
        .insert({
          ...jobData,
          company_id: company.id,
        })
        .select()
        .single();

      if (insertError) {
        return { data: null, error: insertError };
      }

      await fetchJobs();
      return { data: data as Job, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  };

  const updateJob = async (id: string, updates: Partial<Job>) => {
    try {
      const { error: updateError } = await supabase
        .from('jobs')
        .update(updates)
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

  const deleteJob = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id);

      if (deleteError) {
        return { error: deleteError };
      }

      await fetchJobs();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Set up real-time subscription
  useEffect(() => {
    if (!company?.id) return;

    const subscription = supabase
      .channel('jobs-changes')
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

  return {
    jobs,
    stats,
    isLoading,
    error,
    refetch: fetchJobs,
    createJob,
    updateJob,
    deleteJob,
  };
}
