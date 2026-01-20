'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  todaysJobs: number;
  newLeads: number;
  workersOnClock: number;
  monthlyRevenue: number;
}

export interface TodayJob {
  id: string;
  title: string;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  status: string;
  address: string | null;
  // Supabase returns single relations as arrays with one item
  customer: { name: string }[] | { name: string } | null;
  assignments: {
    user: { full_name: string }[] | { full_name: string } | null;
  }[];
}

interface RecentLead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  service_requested: string | null;
  source: string;
  status: string;
  created_at: string;
}

interface ClockedInWorker {
  id: string;
  clock_in: string;
  user: {
    id: string;
    full_name: string;
  } | null;
  job: {
    id: string;
    title: string;
  } | null;
}

interface DashboardData {
  stats: DashboardStats;
  todaysJobs: TodayJob[];
  recentLeads: RecentLead[];
  clockedInWorkers: ClockedInWorker[];
}

export function useDashboard() {
  const { company } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!company?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split('T')[0];

      // Fetch all data in parallel
      const [
        jobsCountResult,
        leadsCountResult,
        clockedInResult,
        revenueResult,
        todaysJobsResult,
        recentLeadsResult,
        clockedInWorkersResult,
      ] = await Promise.all([
        // Count today's jobs
        supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .eq('scheduled_date', today),

        // Count new leads
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .eq('status', 'new'),

        // Count clocked-in workers (clock_in today, no clock_out)
        supabase
          .from('time_entries')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .gte('clock_in', `${today}T00:00:00`)
          .is('clock_out', null),

        // Sum paid invoices this month
        supabase
          .from('invoices')
          .select('total')
          .eq('company_id', company.id)
          .eq('status', 'paid')
          .gte('paid_at', monthStart),

        // Get today's jobs with details
        supabase
          .from('jobs')
          .select(`
            id,
            title,
            scheduled_time_start,
            scheduled_time_end,
            status,
            address,
            customer:customers(name),
            assignments:job_assignments(
              user:users(full_name)
            )
          `)
          .eq('company_id', company.id)
          .eq('scheduled_date', today)
          .order('scheduled_time_start', { ascending: true })
          .limit(10),

        // Get recent leads
        supabase
          .from('leads')
          .select('id, name, phone, email, service_requested, source, status, created_at')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false })
          .limit(5),

        // Get clocked-in workers
        supabase
          .from('time_entries')
          .select(`
            id,
            clock_in,
            user:users(id, full_name),
            job:jobs(id, title)
          `)
          .eq('company_id', company.id)
          .gte('clock_in', `${today}T00:00:00`)
          .is('clock_out', null),
      ]);

      // Calculate monthly revenue
      const monthlyRevenue = revenueResult.data?.reduce(
        (sum, inv) => sum + (inv.total || 0),
        0
      ) || 0;

      setData({
        stats: {
          todaysJobs: jobsCountResult.count || 0,
          newLeads: leadsCountResult.count || 0,
          workersOnClock: clockedInResult.count || 0,
          monthlyRevenue,
        },
        todaysJobs: (todaysJobsResult.data as unknown as TodayJob[]) || [],
        recentLeads: (recentLeadsResult.data as unknown as RecentLead[]) || [],
        clockedInWorkers: (clockedInWorkersResult.data as unknown as ClockedInWorker[]) || [],
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!company?.id) return;

    // Subscribe to leads for new lead notifications
    const leadsSubscription = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    // Subscribe to time_entries for clock in/out updates
    const timeEntriesSubscription = supabase
      .channel('time-entries-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_entries',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsSubscription);
      supabase.removeChannel(timeEntriesSubscription);
    };
  }, [company?.id, fetchDashboardData]);

  return { data, isLoading, error, refetch: fetchDashboardData };
}
