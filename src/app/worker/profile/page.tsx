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
  Loader2,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface WorkerData {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  hourly_rate: number | null;
  is_active: boolean;
  created_at: string;
  company_id: string;
}

interface CompanyData {
  id: string;
  name: string;
  phone: string | null;
}

interface WorkerStats {
  ytdHours: number;
  ytdEarnings: number;
  thisWeekHours: number;
}

export default function WorkerProfilePage() {
  const router = useRouter();
  const [worker, setWorker] = useState<WorkerData | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [notifications, setNotifications] = useState(true);
  const [stats, setStats] = useState<WorkerStats>({
    ytdHours: 0,
    ytdEarnings: 0,
    thisWeekHours: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Initialize auth and fetch data
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/worker/login');
        return;
      }

      // Fetch worker data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching profile:', userError.message);
      }

      if (userData) {
        setWorker(userData as WorkerData);

        // Fetch company data
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('id, name, phone')
          .eq('id', userData.company_id)
          .single();

        if (companyError) {
          console.error('Error fetching company:', companyError.message);
        }

        if (companyData) {
          setCompany(companyData as CompanyData);
        }
      }

      setIsLoading(false);
    };
    init();
  }, [router]);

  // Fetch worker stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!worker?.id || !worker?.company_id) return;

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
        const calculateHours = (entries: { clock_in: string; clock_out: string; break_minutes: number }[]) => {
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
  }, [worker?.id, worker?.company_id, worker?.hourly_rate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/worker/login');
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl shadow-sm h-40 animate-pulse bg-gray-100" />
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl shadow-sm h-24 animate-pulse bg-gray-100" />
          <div className="bg-white rounded-xl shadow-sm h-24 animate-pulse bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="p-4 flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Not Authenticated</h2>
        <p className="text-gray-600 mb-4">Please log in to view your profile</p>
        <button onClick={() => router.push('/worker/login')} className="px-4 py-2 bg-gray-200 rounded-lg">
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
    <div className="space-y-4">
      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-sm p-4 text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-bold text-blue-600">
            {worker.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{worker.full_name}</h1>
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
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            <span className="text-sm text-gray-500">This Week</span>
          </div>
          {isLoadingStats ? (
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-gray-900">
              {stats.thisWeekHours.toFixed(1)}
              <span className="text-sm font-normal text-gray-500 ml-1">hrs</span>
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-500">YTD Earnings</span>
          </div>
          {isLoadingStats ? (
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-gray-900">
              ${stats.ytdEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          )}
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-semibold text-gray-900 mb-4">Contact Information</h2>
        <div className="space-y-4">
          {worker.phone && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium text-gray-900">{worker.phone}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{worker.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Start Date</p>
              <p className="font-medium text-gray-900">{startDate}</p>
            </div>
          </div>
          {worker.hourly_rate && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Hourly Rate</p>
                <p className="font-medium text-gray-900">${worker.hourly_rate.toFixed(2)}/hr</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Company Info */}
      {company && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-900 mb-4">Company</h2>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold text-blue-600">
                {company.name.charAt(0)}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">{company.name}</p>
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
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-semibold text-gray-900 mb-4">Settings</h2>
        <div className="space-y-2">
          <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Push Notifications</span>
            </div>
            <div
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                notifications ? 'bg-yellow-500' : 'bg-gray-300'
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

          <button
            onClick={() => setShowEditProfile(true)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Edit Profile</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button
            onClick={() => setShowChangePin(true)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Change PIN</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button
            onClick={() => setShowChangePassword(true)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Change Password</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <EditProfileModal
          worker={worker}
          onClose={() => setShowEditProfile(false)}
          onSave={(updated) => {
            setWorker(updated);
            setShowEditProfile(false);
          }}
        />
      )}

      {/* Change PIN Modal */}
      {showChangePin && (
        <ChangePinModal
          workerId={worker.id}
          onClose={() => setShowChangePin(false)}
          onSave={() => setShowChangePin(false)}
        />
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
          onSave={() => setShowChangePassword(false)}
        />
      )}

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

function EditProfileModal({ worker, onClose, onSave }: {
  worker: WorkerData;
  onClose: () => void;
  onSave: (updated: WorkerData) => void;
}) {
  const [formData, setFormData] = useState({
    full_name: worker.full_name,
    phone: worker.phone || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      alert('Name is required');
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from('users')
      .update({
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || null,
      })
      .eq('id', worker.id)
      .select()
      .single();

    if (error) {
      alert('Failed to update profile: ' + error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    onSave(data as WorkerData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-xl hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChangePinModal({ workerId, onClose, onSave }: {
  workerId: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^\d{4}$/.test(newPin)) {
      alert('PIN must be exactly 4 digits');
      return;
    }

    if (newPin !== confirmPin) {
      alert('PINs do not match');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('users')
      .update({ pin: newPin })
      .eq('id', workerId);

    if (error) {
      alert('Failed to update PIN: ' + error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    alert('PIN updated successfully!');
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Change PIN</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New 4-Digit PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
              placeholder="••••"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
              placeholder="••••"
              required
            />
          </div>
          <p className="text-xs text-gray-500">
            This PIN is used to sign in to the ToolTime Worker App.
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-xl hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Update PIN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChangePasswordModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: () => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    alert('Password updated successfully!');
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Change Password</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 pr-12"
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm your password"
              minLength={8}
              required
            />
          </div>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-xl hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
