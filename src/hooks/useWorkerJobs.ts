'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Job } from '@/types/database';

export interface WorkerJobWithDetails extends Job {
  customer: {
    name: string;
    phone: string | null;
    address: string | null;
  } | null;
}

interface UseWorkerJobsReturn {
  jobs: WorkerJobWithDetails[];
  todaysJobs: WorkerJobWithDetails[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateJobStatus: (jobId: string, status: Job['status']) => Promise<{ error: Error | null }>;
}

export function useWorkerJobs(workerId: string | null, companyId: string | null): UseWorkerJobsReturn {
  const [jobs, setJobs] = useState<WorkerJobWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!workerId || !companyId) {
      setJobs([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get jobs assigned to this worker
      const { data: assignments, error: assignmentError } = await supabase
        .from('job_assignments')
        .select('job_id')
        .eq('user_id', workerId);

      if (assignmentError) {
        throw assignmentError;
      }

      const jobIds = assignments?.map((a) => a.job_id) || [];

      if (jobIds.length === 0) {
        setJobs([]);
        setIsLoading(false);
        return;
      }

      // Fetch the jobs with customer details
      const { data, error: fetchError } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(name, phone, address)
        `)
        .in('id', jobIds)
        .eq('company_id', companyId)
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time_start', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setJobs((data as unknown as WorkerJobWithDetails[]) || []);
    } catch (err) {
      console.error('Error fetching worker jobs:', err);
      setError('Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  }, [workerId, companyId]);

  const updateJobStatus = async (jobId: string, status: Job['status']) => {
    try {
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ status })
        .eq('id', jobId);

      if (updateError) {
        return { error: updateError };
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

  // Set up real-time subscriptions for job updates
  useEffect(() => {
    if (!workerId || !companyId) return;

    const subscription = supabase
      .channel(`worker-jobs-${workerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_assignments',
          filter: `user_id=eq.${workerId}`,
        },
        () => {
          fetchJobs();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          fetchJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [workerId, companyId, fetchJobs]);

  // Calculate today's jobs
  const today = new Date().toISOString().split('T')[0];
  const todaysJobs = jobs.filter((job) => job.scheduled_date === today);

  return {
    jobs,
    todaysJobs,
    isLoading,
    error,
    refetch: fetchJobs,
    updateJobStatus,
  };
}
