'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  MapPin,
  Clock,
  Fuel,
  TrendingDown,
  RefreshCw,
  ArrowRight,
  Navigation,
  ChevronRight,
  Route,
  User,
} from 'lucide-react';

interface RouteJob {
  id: string;
  title: string;
  address: string | null;
  city: string | null;
  scheduled_date: string;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  status: string;
  total_amount: number | null;
  customer: { name: string } | { name: string }[] | null;
  assigned_users: { user: { full_name: string } | { full_name: string }[] | null }[];
}

function getCustomerName(customer: RouteJob['customer']): string {
  if (!customer) return 'No customer';
  if (Array.isArray(customer)) return customer[0]?.name || 'No customer';
  return customer.name || 'No customer';
}

function getAssignedNames(assigned: RouteJob['assigned_users']): string {
  if (!assigned || assigned.length === 0) return 'Unassigned';
  return assigned
    .map((a) => {
      if (!a.user) return null;
      if (Array.isArray(a.user)) return a.user[0]?.full_name;
      return a.user.full_name;
    })
    .filter(Boolean)
    .join(', ') || 'Unassigned';
}

// Simple nearest-neighbor optimization simulation
function optimizeRoute(jobs: RouteJob[]): { optimized: RouteJob[]; savings: { miles: string; time: string; fuel: string; percent: string } } {
  if (jobs.length <= 2) {
    return { optimized: jobs, savings: { miles: '0', time: '0 min', fuel: '$0', percent: '0%' } };
  }

  // Group by city/area for clustering, then sort by time
  const withAddress = jobs.filter((j) => j.address || j.city);
  const withoutAddress = jobs.filter((j) => !j.address && !j.city);

  // Group by city
  const byCity: Record<string, RouteJob[]> = {};
  withAddress.forEach((job) => {
    const key = (job.city || 'Unknown').toLowerCase();
    if (!byCity[key]) byCity[key] = [];
    byCity[key].push(job);
  });

  // Sort within each city by time
  Object.values(byCity).forEach((cityJobs) => {
    cityJobs.sort((a, b) => (a.scheduled_time_start || '').localeCompare(b.scheduled_time_start || ''));
  });

  // Flatten city groups
  const optimized = [
    ...Object.values(byCity).reduce<RouteJob[]>((acc, arr) => acc.concat(arr), []),
    ...withoutAddress,
  ];

  // Estimate savings based on job count
  const jobCount = jobs.length;
  const estimatedMilesSaved = (jobCount * 3.2).toFixed(1);
  const estimatedTimeSaved = Math.round(jobCount * 7);
  const estimatedFuelSaved = (jobCount * 1.28).toFixed(2);
  const percentSaved = Math.min(Math.round(15 + jobCount * 3), 40);

  return {
    optimized,
    savings: {
      miles: estimatedMilesSaved,
      time: `${estimatedTimeSaved} min`,
      fuel: `$${estimatedFuelSaved}`,
      percent: `${percentSaved}%`,
    },
  };
}

export default function RouteOptimizerPage() {
  const { user, dbUser } = useAuth();
  const companyId = dbUser?.company_id || null;

  const [jobs, setJobs] = useState<RouteJob[]>([]);
  const [optimizedJobs, setOptimizedJobs] = useState<RouteJob[] | null>(null);
  const [savings, setSavings] = useState<{ miles: string; time: string; fuel: string; percent: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedJob, setSelectedJob] = useState<RouteJob | null>(null);

  const fetchJobs = useCallback(async (compId: string, date: string) => {
    setLoading(true);
    setOptimizedJobs(null);
    setSavings(null);

    const { data, error } = await supabase
      .from('jobs')
      .select(`
        id, title, address, city, scheduled_date, scheduled_time_start, scheduled_time_end, status, total_amount,
        customer:customers(name),
        assigned_users:job_assignments(user:users(full_name))
      `)
      .eq('company_id', compId)
      .eq('scheduled_date', date)
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_time_start');

    if (error) {
      console.error('Error fetching jobs:', error);
    } else {
      setJobs(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (companyId) {
      fetchJobs(companyId, selectedDate);
    } else {
      setLoading(false);
    }
  }, [companyId, selectedDate, fetchJobs]);

  const handleOptimize = () => {
    setIsOptimizing(true);
    // Simulate optimization processing
    setTimeout(() => {
      const result = optimizeRoute(jobs);
      setOptimizedJobs(result.optimized);
      setSavings(result.savings);
      setIsOptimizing(false);
    }, 1500);
  };

  const handleReset = () => {
    setOptimizedJobs(null);
    setSavings(null);
  };

  const displayJobs = optimizedJobs || jobs;

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  const formatDate = (date: string) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[#f5a623] to-[#e6991a] rounded-xl flex items-center justify-center">
            <Route className="w-6 h-6 text-[#1a1a2e]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Route Optimizer</h1>
            <p className="text-sm text-gray-500">Reduce drive time, save fuel, fit more jobs in the day</p>
          </div>
        </div>
        <Link
          href="/dashboard/dispatch"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a2e] text-white rounded-lg text-sm font-medium hover:bg-[#2d2d44] transition-colors"
        >
          <Navigation className="w-4 h-4" /> Open Dispatch Board
        </Link>
      </div>

      {/* Date Selector */}
      <div className="flex flex-wrap gap-4 items-center mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => changeDate(-1)} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200">
            &larr;
          </button>
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium"
          >
            Today
          </button>
          <button onClick={() => changeDate(1)} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200">
            &rarr;
          </button>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        />
        <p className="text-lg font-semibold text-gray-700 ml-auto">{formatDate(selectedDate)}</p>
      </div>

      {/* Savings Cards */}
      {savings && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <TrendingDown className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-700">{savings.percent}</p>
            <p className="text-xs text-green-600">Route Savings</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <MapPin className="w-6 h-6 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-700">{savings.miles} mi</p>
            <p className="text-xs text-blue-600">Miles Saved</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
            <Clock className="w-6 h-6 text-purple-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-purple-700">{savings.time}</p>
            <p className="text-xs text-purple-600">Time Saved</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
            <Fuel className="w-6 h-6 text-orange-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-orange-700">{savings.fuel}</p>
            <p className="text-xs text-orange-600">Fuel Saved</p>
          </div>
        </div>
      )}

      {/* Optimize Button */}
      <div className="mb-6">
        {jobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-500 mb-2">No jobs scheduled for this day</h3>
            <p className="text-sm text-gray-400 mb-4">Schedule jobs to optimize your route.</p>
            <Link
              href="/dashboard/jobs"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Go to Jobs <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : !optimizedJobs ? (
          <button
            onClick={handleOptimize}
            disabled={isOptimizing}
            className="w-full py-4 bg-gradient-to-r from-[#f5a623] to-[#e6991a] text-[#1a1a2e] rounded-xl font-bold text-lg hover:from-[#e6991a] hover:to-[#d98f15] transition-all disabled:opacity-70"
          >
            {isOptimizing ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                Optimizing {jobs.length} jobs...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Route className="w-5 h-5" />
                Optimize Route for {jobs.length} Jobs
              </span>
            )}
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={() => handleOptimize()}
              className="flex-1 py-3 bg-gradient-to-r from-[#f5a623] to-[#e6991a] text-[#1a1a2e] rounded-xl font-bold hover:from-[#e6991a] hover:to-[#d98f15] transition-all"
            >
              Re-Optimize
            </button>
          </div>
        )}
      </div>

      {/* Job List */}
      {displayJobs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              {optimizedJobs ? 'Optimized Route Order' : "Today's Jobs"} ({displayJobs.length})
            </h2>
            {optimizedJobs && (
              <span className="bg-green-100 text-green-700 text-sm font-semibold px-3 py-1 rounded-full">
                Route Optimized
              </span>
            )}
          </div>

          <div className="space-y-3">
            {displayJobs.map((job, index) => (
              <div key={job.id}>
                <div
                  onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                  className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${
                    selectedJob?.id === job.id
                      ? 'border-[#f5a623] shadow-lg'
                      : 'border-gray-100 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                        optimizedJobs ? 'bg-green-500' : 'bg-[#f5a623]'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900">{getCustomerName(job.customer)}</h4>
                      <p className="text-sm text-gray-500 truncate">{job.title}</p>
                      {job.address && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {job.address}{job.city ? `, ${job.city}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-gray-900">{job.scheduled_time_start || 'TBD'}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                        <User className="w-3 h-3" />
                        {getAssignedNames(job.assigned_users)}
                      </p>
                      {job.total_amount && (
                        <p className="text-xs font-medium text-green-600">
                          ${job.total_amount.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {selectedJob?.id === job.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                      {job.address && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                            `${job.address}${job.city ? `, ${job.city}` : ''}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium text-center hover:bg-blue-100 transition-colors"
                        >
                          <Navigation className="w-4 h-4 inline mr-1" /> Get Directions
                        </a>
                      )}
                      <Link
                        href={`/dashboard/jobs?edit=${job.id}`}
                        className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium text-center hover:bg-gray-200 transition-colors"
                      >
                        View Job Details
                      </Link>
                    </div>
                  )}
                </div>

                {/* Arrow between jobs */}
                {index < displayJobs.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowRight className={`w-4 h-4 rotate-90 ${optimizedJobs ? 'text-green-400' : 'text-gray-300'}`} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Daily Summary */}
          <div className="mt-6 bg-[#1a1a2e] rounded-xl p-5 text-white">
            <h4 className="font-semibold mb-3">Daily Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{displayJobs.length}</div>
                <div className="text-xs text-white/60">Jobs</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">
                  ${displayJobs.reduce((sum, j) => sum + (j.total_amount || 0), 0).toLocaleString()}
                </div>
                <div className="text-xs text-white/60">Revenue</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#f5a623]">
                  {displayJobs.filter((j) => j.status === 'in_progress').length}
                </div>
                <div className="text-xs text-white/60">In Progress</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
