'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Worker {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: 'owner' | 'admin' | 'worker';
  avatar_url: string | null;
  is_active: boolean;
  status: 'available' | 'on_site' | 'en_route' | 'offline';
  currentJobId: string | null;
  location: { lat: number; lng: number } | null;
  jobsToday: number;
}

export interface DispatchJob {
  id: string;
  title: string;
  customer_id: string | null;
  customer: { name: string; phone: string | null } | null;
  address: string | null;
  city: string | null;
  scheduled_date: string | null;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  total_amount: number | null;
  assignedWorkers: { id: string; full_name: string }[];
}

interface UseDispatchReturn {
  workers: Worker[];
  jobs: DispatchJob[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  assignJob: (jobId: string, workerId: string) => Promise<{ error: Error | null }>;
  unassignJob: (jobId: string, workerId: string) => Promise<{ error: Error | null }>;
  updateJobStatus: (jobId: string, status: string) => Promise<{ error: Error | null }>;
  sendRunningLate: (jobId: string) => Promise<{ success: boolean; error?: string }>;
}

export function useDispatch(): UseDispatchReturn {
  const { company } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [jobs, setJobs] = useState<DispatchJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!company?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get today's date
      const today = new Date().toISOString().split('T')[0];

      // Fetch workers (users with role worker or admin)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .in('role', ['worker', 'admin']);

      if (usersError) throw usersError;

      // Fetch active time entries to determine who's clocked in
      const { data: activeEntries } = await supabase
        .from('time_entries')
        .select('user_id, job_id, clock_in_location, status')
        .eq('company_id', company.id)
        .eq('status', 'active');

      const activeWorkerMap = new Map(
        activeEntries?.map((e) => [e.user_id, e]) || []
      );

      // Fetch today's jobs with assignments
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(name, phone),
          assignments:job_assignments(
            user:users(id, full_name)
          )
        `)
        .eq('company_id', company.id)
        .eq('scheduled_date', today)
        .neq('status', 'cancelled')
        .order('scheduled_time_start', { ascending: true });

      if (jobsError) throw jobsError;

      // Count jobs per worker today
      const jobCountMap = new Map<string, number>();
      jobsData?.forEach((job) => {
        job.assignments?.forEach((a: { user: { id: string } | null }) => {
          if (a.user?.id) {
            jobCountMap.set(a.user.id, (jobCountMap.get(a.user.id) || 0) + 1);
          }
        });
      });

      // Find current job for each worker
      const currentJobMap = new Map<string, string>();
      jobsData?.forEach((job) => {
        if (job.status === 'in_progress') {
          job.assignments?.forEach((a: { user: { id: string } | null }) => {
            if (a.user?.id) {
              currentJobMap.set(a.user.id, job.id);
            }
          });
        }
      });

      // Transform workers data
      const transformedWorkers: Worker[] = (usersData || []).map((user) => {
        const activeEntry = activeWorkerMap.get(user.id);
        const currentJobId = currentJobMap.get(user.id) || null;

        // Determine status
        let status: Worker['status'] = 'offline';
        if (activeEntry) {
          if (currentJobId) {
            status = 'on_site';
          } else {
            status = 'available';
          }
        }

        // Get location from clock-in if available
        let location = null;
        if (activeEntry?.clock_in_location) {
          const loc = activeEntry.clock_in_location as { lat?: number; lng?: number };
          if (loc.lat && loc.lng) {
            location = { lat: loc.lat, lng: loc.lng };
          }
        }

        return {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          avatar_url: user.avatar_url,
          is_active: user.is_active,
          status,
          currentJobId,
          location,
          jobsToday: jobCountMap.get(user.id) || 0,
        };
      });

      // Transform jobs data
      const transformedJobs: DispatchJob[] = (jobsData || []).map((job) => ({
        id: job.id,
        title: job.title,
        customer_id: job.customer_id,
        customer: job.customer,
        address: job.address,
        city: job.city,
        scheduled_date: job.scheduled_date,
        scheduled_time_start: job.scheduled_time_start,
        scheduled_time_end: job.scheduled_time_end,
        status: job.status,
        notes: job.notes,
        total_amount: job.total_amount,
        assignedWorkers:
          job.assignments
            ?.map((a: { user: { id: string; full_name: string } | null }) => a.user)
            .filter(Boolean) || [],
      }));

      setWorkers(transformedWorkers);
      setJobs(transformedJobs);
    } catch (err) {
      console.error('Error fetching dispatch data:', err);
      setError('Failed to load dispatch data');
    } finally {
      setIsLoading(false);
    }
  }, [company?.id]);

  // Assign worker to job
  const assignJob = async (jobId: string, workerId: string) => {
    try {
      const { error: assignError } = await supabase.from('job_assignments').insert({
        job_id: jobId,
        user_id: workerId,
      });

      if (assignError) throw assignError;

      await fetchData();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Unassign worker from job
  const unassignJob = async (jobId: string, workerId: string) => {
    try {
      const { error: unassignError } = await supabase
        .from('job_assignments')
        .delete()
        .eq('job_id', jobId)
        .eq('user_id', workerId);

      if (unassignError) throw unassignError;

      await fetchData();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Update job status
  const updateJobStatus = async (jobId: string, status: string) => {
    try {
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', jobId);

      if (updateError) throw updateError;

      await fetchData();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Send running late SMS
  const sendRunningLate = async (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job || !job.customer?.phone) {
      return { success: false, error: 'No customer phone number' };
    }

    try {
      const response = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: job.customer.phone,
          template: 'running_late',
          data: {
            customerName: job.customer.name || 'Customer',
            companyName: company?.name || 'Our team',
            estimatedArrival: '15-20 minutes',
          },
          companyId: company?.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send SMS');
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to send SMS' };
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up real-time subscription for job updates
  useEffect(() => {
    if (!company?.id) return;

    const subscription = supabase
      .channel('dispatch-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_assignments',
        },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_entries',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [company?.id, fetchData]);

  return {
    workers,
    jobs,
    isLoading,
    error,
    refetch: fetchData,
    assignJob,
    unassignJob,
    updateJobStatus,
    sendRunningLate,
  };
}
