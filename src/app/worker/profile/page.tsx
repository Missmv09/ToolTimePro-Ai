'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Phone,
  Mail,
  Shield,
  Bell,
  LogOut,
  ChevronRight,
  Clock,
  DollarSign,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { useWorkerAuth } from '@/contexts/WorkerAuthContext';
import { supabase } from '@/lib/supabase';

interface WorkerStats {
  ytdHours: number;
  ytdEarnings: number;
  thisWeekHours: number;
}

export default function WorkerProfilePage() {
  const router = useRouter();
  const { worker, company, signOut, isLoading: authLoading } = useWorkerAuth();
  const [notifications, setNotifications] = useState(true);
  const [stats, setStats] = useState<WorkerStats>({
    ytdHours: 0,
    ytdEarnings: 0,
    thisWeekHours: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Fetch worker stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!worker?.id || !company?.id) return;

      setIsLoadingStats(true);

      try {
        // Get start of year
        const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();

        // Get start of week
        const now = new Date();
        const dayOfWeek = now.getDay();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        weekStart.setHours(0, 0, 0, 0);

        // Fetch YTD time entries
        const { data: ytdEntries } = await supabase
          .from('time_entries')
          .select('clock_in, clock_out, break_minutes')
          .eq('user_id', worker.id)
          .gte('clock_in', yearStart)
          .not('clock_out', 'is', null);

        // Fetch this week's entries
        const { data: weekEntries } = await supabase
          .from('time_entries')
          .select('clock_in, clock_out, break_minutes')
          .eq('user_id', worker.id)
          .gte('clock_in', weekStart.toISOString())
          .not('clock_out', 'is', null);

        // Calculate hours
        const calculateHours = (entries: any[]) => {
          return entries?.reduce((total, entry) => {
            const clockIn = new Date(entry.clock_in).getTime();
            const clockOut = new Date(entry.clock_out).getTime();
            const hours = (clockOut - clockIn) / (1000 * 60 * 60);
            const breakHours = (entry.break_minutes || 0) / 60;
            return total + Math.max(0, hours - breakHours);
          }, 0) || 0;
        };

        const ytdHours = calculateHours(ytdEntries || []);
        const weekHours = calculateHours(weekEntries || []);
        const hourlyRate = worker.hourly_rate || 0;

        setStats({
          ytdHours,
          ytdEarnings: ytdHours * hourlyRate,
          thisWeekHours: weekHours,
        });
      } catch (err) {
        console.error('Error fetching worker stats:', err);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
  }, [worker?.id, company?.id, worker?.hourly_rate]);

  const handleLogout = async () => {
    await signOut();
    router.push('/worker/login');
  };

  if (authLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="card h-40 animate-pulse bg-gray-100" />
        <div className="grid grid-cols-2 gap-3">
          <div className="card h-24 animate-pulse bg-gray-100" />
          <div className="card h-24 animate-pulse bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="p-4 flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-navy-500 mb-2">Not Authenticated</h2>
        <p className="text-gray-600 mb-4">Please log in to view your profile</p>
        <button onClick={() => router.push('/worker/login')} className="btn-secondary">
          Go to Login
        </button>
      </div>
    );
  }

  const startDate = new Date(worker.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="p-4 space-y-4">
      {/* Profile Header */}
      <div className="card text-center">
        <div className="w-20 h-20 bg-navy-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-bold text-navy-500">
            {worker.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </span>
        </div>
        <h1 className="text-xl font-bold text-navy-500">{worker.full_name}</h1>
        <p className="text-gray-500 capitalize">{worker.role}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Shield className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-600">
            {worker.is_active ? 'Active Employee' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-gold-500" />
            <span className="text-sm text-gray-500">This Week</span>
          </div>
          {isLoadingStats ? (
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-navy-500">
              {stats.thisWeekHours.toFixed(1)}
              <span className="text-sm font-normal text-gray-500 ml-1">hrs</span>
            </p>
          )}
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-500">YTD Earnings</span>
          </div>
          {isLoadingStats ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-navy-500">
              ${stats.ytdEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          )}
        </div>
      </div>

      {/* Contact Info */}
      <div className="card">
        <h2 className="font-semibold text-navy-500 mb-4">Contact Information</h2>
        <div className="space-y-4">
          {worker.phone && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium text-navy-500">{worker.phone}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-navy-500">{worker.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Start Date</p>
              <p className="font-medium text-navy-500">{startDate}</p>
            </div>
          </div>
          {worker.hourly_rate && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Hourly Rate</p>
                <p className="font-medium text-navy-500">${worker.hourly_rate.toFixed(2)}/hr</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Company Info */}
      {company && (
        <div className="card">
          <h2 className="font-semibold text-navy-500 mb-4">Company</h2>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-navy-100 rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold text-navy-500">
                {company.name.charAt(0)}
              </span>
            </div>
            <div>
              <p className="font-medium text-navy-500">{company.name}</p>
              {company.phone && (
                <a href={`tel:${company.phone}`} className="text-sm text-blue-600">
                  {company.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="card">
        <h2 className="font-semibold text-navy-500 mb-4">Settings</h2>
        <div className="space-y-2">
          <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-navy-500">Push Notifications</span>
            </div>
            <div
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                notifications ? 'bg-gold-500' : 'bg-gray-300'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setNotifications(!notifications);
              }}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  notifications ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </div>
          </button>

          <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-navy-500">Edit Profile</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-navy-500">Change PIN</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>

      {/* App Version */}
      <p className="text-center text-xs text-gray-400">ToolTime Pro Worker App v1.0.0</p>
    </div>
  );
}
