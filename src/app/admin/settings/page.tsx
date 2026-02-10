'use client';

import { useState, useEffect } from 'react';
import { Shield, Users, Plus, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PlatformAdmin {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export default function AdminSettingsPage() {
  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // Use the stats endpoint to verify access (admins list comes from platform_admins table)
      const res = await fetch('/api/admin/settings/admins', {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      });

      if (res.ok) {
        const data = await res.json();
        setAdmins(data.admins || []);
      }
    } catch {
      // Platform admins table may not exist yet
    } finally {
      setLoading(false);
    }
  };

  const addAdmin = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/settings/admins', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newEmail.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`Added ${newEmail} as platform admin`);
        setNewEmail('');
        fetchAdmins();
      } else {
        setError(data.error || 'Failed to add admin');
      }
    } catch {
      setError('Network error');
    } finally {
      setAdding(false);
    }
  };

  const removeAdmin = async (adminId: string, email: string) => {
    if (!confirm(`Remove ${email} as platform admin?`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/admin/settings/admins?id=${adminId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      });

      if (res.ok) {
        setSuccess(`Removed ${email}`);
        fetchAdmins();
      }
    } catch {
      setError('Failed to remove admin');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
        <p className="text-gray-400 mt-1">Manage platform admin access and configuration</p>
      </div>

      {/* Platform Admins */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
            <Shield size={20} className="text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Platform Admins</h2>
            <p className="text-sm text-gray-400">Users with vendor-level access to manage all companies</p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            {success}
          </div>
        )}

        {/* Add Admin */}
        <div className="flex gap-3 mb-6">
          <input
            type="email"
            placeholder="admin@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAdmin()}
            className="flex-1 px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          />
          <button
            onClick={addAdmin}
            disabled={adding || !newEmail.trim()}
            className="px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <Plus size={16} /> Add Admin
          </button>
        </div>

        {/* Admin List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-8">
            <Users size={40} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">No platform admins in the database</p>
            <p className="text-sm text-gray-500 mt-1">
              You can also set admins via the PLATFORM_ADMIN_EMAILS environment variable
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {admins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-500/20 rounded-full flex items-center justify-center">
                    <Shield size={16} className="text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{admin.email}</p>
                    <p className="text-xs text-gray-500">
                      Added {new Date(admin.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeAdmin(admin.id, admin.email)}
                  className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                  title="Remove admin"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Environment Config Info */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Configuration</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-1">PLATFORM_ADMIN_EMAILS</h3>
            <p className="text-sm text-gray-500">
              Set this environment variable to a comma-separated list of emails for quick admin bootstrapping.
              These users get platform admin access without needing a database entry.
            </p>
            <code className="text-xs text-orange-400 bg-gray-900 px-2 py-1 rounded mt-2 inline-block">
              PLATFORM_ADMIN_EMAILS=you@company.com,cto@company.com
            </code>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-1">SUPABASE_SERVICE_ROLE_KEY</h3>
            <p className="text-sm text-gray-500">
              Required for admin API routes. This key bypasses Row Level Security to query across all companies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
