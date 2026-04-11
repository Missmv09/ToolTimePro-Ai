'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Check, AlertCircle } from 'lucide-react';

interface SmsPreferences {
  sms_consent: boolean;
  sms_consent_date: string | null;
  phone: string | null;
}

export default function PortalPreferencesPage() {
  const [prefs, setPrefs] = useState<SmsPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('portal_token');
    if (!token) return;

    fetch('/api/portal?action=sms_preferences', {
      headers: { 'x-portal-token': token },
    })
      .then(res => res.json())
      .then(data => {
        setPrefs(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load preferences');
        setLoading(false);
      });
  }, []);

  const updateConsent = async (consent: boolean) => {
    const token = localStorage.getItem('portal_token');
    if (!token) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch('/api/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-portal-token': token,
        },
        body: JSON.stringify({ action: 'update_sms_preferences', sms_consent: consent }),
      });

      if (!res.ok) {
        throw new Error('Failed to update preferences');
      }

      setPrefs(prev => prev ? {
        ...prev,
        sms_consent: consent,
        sms_consent_date: new Date().toISOString(),
      } : null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to update preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading preferences...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Communication Preferences</h1>
        <p className="text-sm text-gray-500 mt-1">Manage how you receive notifications</p>
      </div>

      {/* SMS Preferences */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900">Text Message Notifications</h2>
              <p className="text-sm text-gray-500 mt-1">
                Receive SMS updates about quotes, appointments, and invoices.
              </p>

              {prefs?.phone ? (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-700">SMS notifications</div>
                      <div className="text-xs text-gray-500">
                        Sent to {prefs.phone}
                      </div>
                    </div>
                    <button
                      onClick={() => updateConsent(!prefs.sms_consent)}
                      disabled={saving}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        prefs.sms_consent ? 'bg-green-500' : 'bg-gray-300'
                      } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          prefs.sms_consent ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {prefs.sms_consent && prefs.sms_consent_date && (
                    <p className="text-xs text-gray-400">
                      Opted in on {new Date(prefs.sms_consent_date).toLocaleDateString()}
                    </p>
                  )}

                  <div className="text-xs text-gray-400 border-t border-gray-100 pt-3">
                    <p>Message &amp; data rates may apply. You can also opt out anytime by replying STOP to any text message.</p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">
                    No phone number on file. Contact your service provider to add your phone number.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {saved && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Check className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-700">Preferences saved</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}
    </div>
  );
}
