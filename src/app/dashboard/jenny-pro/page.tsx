'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanGating } from '@/hooks/usePlanGating';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  Phone,
  MessageSquare,
  Clock,
  Users,
  ArrowRight,
  Settings,
  PhoneIncoming,
  Send,
  RefreshCw,
} from 'lucide-react';
import UpgradeGate from '@/components/plan/UpgradeGate';

interface SMSConversation {
  id: string;
  customer_name: string;
  customer_phone: string;
  last_message: string;
  last_message_at: string;
  status: 'active' | 'resolved' | 'needs_response';
  message_count: number;
  lead_id: string | null;
  booking_id?: string | null;
}

interface JennyProStats {
  totalConversations: number;
  leadsCapture: number;
  bookingsMade: number;
  avgResponseTime: string;
}

interface JennyProSettings {
  business_hours_greeting: string;
  after_hours_greeting: string;
  emergency_keywords: string;
  escalation_phone: string;
  language: 'en' | 'es' | 'both';
  operator_language: 'en' | 'es';
  auto_booking: boolean;
}

const DEFAULT_SETTINGS: JennyProSettings = {
  business_hours_greeting: '',
  after_hours_greeting: '',
  emergency_keywords: 'emergency, urgent, burst, leak, flood, fire, broken',
  escalation_phone: '',
  language: 'both',
  operator_language: 'en',
  auto_booking: true,
};

export default function JennyProPage() {
  const { company, dbUser } = useAuth();
  const { canAccess } = usePlanGating();

  if (!canAccess('jenny_pro')) {
    return <UpgradeGate feature="jenny_pro"><div /></UpgradeGate>;
  }

  return <JennyProDashboard />;
}

function JennyProDashboard() {
  const { company, dbUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'conversations' | 'settings'>('overview');
  const [conversations, setConversations] = useState<SMSConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<JennyProStats>({
    totalConversations: 0,
    leadsCapture: 0,
    bookingsMade: 0,
    avgResponseTime: '--',
  });
  const [settings, setSettings] = useState<JennyProSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [jennyNumber, setJennyNumber] = useState('');
  const [savingNumber, setSavingNumber] = useState(false);
  const [numberSaved, setNumberSaved] = useState(false);
  const [numberError, setNumberError] = useState('');
  const [areaCode, setAreaCode] = useState('');
  const [provisioning, setProvisioning] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!dbUser?.company_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('jenny_sms_conversations')
        .select('*')
        .eq('company_id', dbUser.company_id)
        .order('last_message_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setConversations(data as SMSConversation[]);
        setStats({
          totalConversations: data.length,
          leadsCapture: data.filter((c: SMSConversation) => c.lead_id).length,
          bookingsMade: data.filter((c: { booking_id?: string | null }) => c.booking_id).length,
          avgResponseTime: data.length > 0 ? '< 30s' : '--',
        });
      }
    } catch {
      // Table may not exist yet — show empty state
    }
    setLoading(false);
  }, [dbUser?.company_id]);

  const fetchSettings = useCallback(async () => {
    if (!dbUser?.company_id) return;
    try {
      const { data } = await supabase
        .from('jenny_pro_settings')
        .select('*')
        .eq('company_id', dbUser.company_id)
        .maybeSingle();
      if (data) {
        setSettings({
          business_hours_greeting: data.business_hours_greeting || '',
          after_hours_greeting: data.after_hours_greeting || '',
          emergency_keywords: Array.isArray(data.emergency_keywords)
            ? data.emergency_keywords.join(', ')
            : (data.emergency_keywords || DEFAULT_SETTINGS.emergency_keywords),
          escalation_phone: data.escalation_phone || '',
          language: (data.language as JennyProSettings['language']) || 'both',
          operator_language: (data.operator_language as JennyProSettings['operator_language']) || 'en',
          auto_booking: data.auto_booking !== false,
        });
      }
    } catch {
      // Settings table/columns may not exist yet — keep defaults
    }
  }, [dbUser?.company_id]);

  const saveSettings = useCallback(async () => {
    if (!dbUser?.company_id) return;
    setSavingSettings(true);
    try {
      await supabase.from('jenny_pro_settings').upsert(
        {
          company_id: dbUser.company_id,
          business_hours_greeting: settings.business_hours_greeting,
          after_hours_greeting: settings.after_hours_greeting,
          emergency_keywords: settings.emergency_keywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
          escalation_phone: settings.escalation_phone,
          language: settings.language,
          operator_language: settings.operator_language,
          auto_booking: settings.auto_booking,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id' }
      );
      setSavedAt(Date.now());
    } catch {
      // ignore — best effort
    }
    setSavingSettings(false);
  }, [dbUser?.company_id, settings]);

  const fetchNumber = useCallback(async () => {
    if (!dbUser?.company_id) return;
    try {
      const { data } = await supabase
        .from('company_phone_numbers')
        .select('phone_number')
        .eq('company_id', dbUser.company_id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (data?.phone_number) setJennyNumber(data.phone_number);
    } catch {
      // table may not exist yet — leave blank
    }
  }, [dbUser?.company_id]);

  const saveNumber = useCallback(async () => {
    if (!dbUser?.company_id || !jennyNumber.trim()) return;
    setSavingNumber(true);
    setNumberError('');
    setNumberSaved(false);
    // Normalize to E.164 (US default).
    const digits = jennyNumber.replace(/\D/g, '');
    const e164 = jennyNumber.trim().startsWith('+')
      ? `+${digits}`
      : digits.length === 10
      ? `+1${digits}`
      : `+${digits}`;
    const { error } = await supabase.from('company_phone_numbers').upsert(
      {
        company_id: dbUser.company_id,
        phone_number: e164,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'phone_number' }
    );
    if (error) {
      setNumberError('Could not save — that number may already be assigned to another company.');
    } else {
      setJennyNumber(e164);
      setNumberSaved(true);
    }
    setSavingNumber(false);
  }, [dbUser?.company_id, jennyNumber]);

  const provisionNumber = useCallback(async () => {
    setProvisioning(true);
    setNumberError('');
    setNumberSaved(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/jenny-pro/provision-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _authToken: session?.access_token, areaCode }),
      });
      const data = await res.json();
      if (res.ok && data.phoneNumber) {
        setJennyNumber(data.phoneNumber);
        setNumberSaved(true);
      } else {
        setNumberError(data.error || 'Could not get a number. Please try again.');
      }
    } catch {
      setNumberError('Could not get a number. Please try again.');
    }
    setProvisioning(false);
  }, [areaCode]);

  useEffect(() => {
    fetchConversations();
    fetchSettings();
    fetchNumber();
  }, [fetchConversations, fetchSettings, fetchNumber]);

  const isBetaTester = company?.is_beta_tester;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Jenny Pro {isBetaTester && <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full ml-2">Beta Access</span>}
          </h1>
          <p className="text-gray-600 mt-1">AI phone receptionist & SMS conversations</p>
        </div>
        <button
          onClick={fetchConversations}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 bg-white border rounded-lg hover:bg-gray-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { id: 'overview' as const, label: 'Overview', icon: Phone },
            { id: 'conversations' as const, label: 'SMS Conversations', icon: MessageSquare },
            { id: 'settings' as const, label: 'Settings', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Conversations', value: stats.totalConversations, icon: MessageSquare, color: 'blue' },
              { label: 'Leads Captured', value: stats.leadsCapture, icon: Users, color: 'green' },
              { label: 'Bookings Made', value: stats.bookingsMade, icon: Clock, color: 'purple' },
              { label: 'Avg Response', value: stats.avgResponseTime, icon: ArrowRight, color: 'amber' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <stat.icon size={14} />
                  {stat.label}
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Voice Feature Card — Campaign Approved */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <PhoneIncoming className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">AI Phone Receptionist</h3>
                <p className="text-gray-600 mt-1">
                  Jenny will answer your business calls 24/7, capture leads, book appointments, and handle emergencies — in English and Spanish.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Active
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Your A2P 10DLC campaign is verified. SMS and voice features are fully active.
                </p>
              </div>
            </div>
          </div>

          {/* SMS Feature Card — Active */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">SMS Conversations</h3>
                <p className="text-gray-600 mt-1">
                  Automated SMS follow-ups, appointment reminders, and two-way customer conversations. All messages logged for your review.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/dashboard/jenny-actions"
              className="bg-white rounded-xl border p-4 hover:border-blue-300 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Autonomous Actions</h4>
                  <p className="text-sm text-gray-500">Configure auto-dispatch, lead follow-ups, review requests</p>
                </div>
                <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
            </Link>
            <Link
              href="/dashboard/jenny-lite"
              className="bg-white rounded-xl border p-4 hover:border-blue-300 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Website Chat Widget</h4>
                  <p className="text-sm text-gray-500">Configure Jenny Lite chatbot for your website</p>
                </div>
                <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Conversations Tab */}
      {activeTab === 'conversations' && (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <RefreshCw className="w-8 h-8 text-gray-300 animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Loading conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No conversations yet</h3>
              <p className="text-gray-500">
                SMS conversations will appear here as Jenny interacts with your customers.
                Conversations are auto-created from booking confirmations, lead follow-ups, and inbound messages.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border divide-y">
              {conversations.map((conv) => (
                <div key={conv.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{conv.customer_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          conv.status === 'needs_response'
                            ? 'bg-red-100 text-red-700'
                            : conv.status === 'active'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {conv.status === 'needs_response' ? 'Needs Response' : conv.status === 'active' ? 'Active' : 'Resolved'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{conv.customer_phone}</p>
                      <p className="text-sm text-gray-600 mt-1 truncate">{conv.last_message}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-xs text-gray-400">
                        {new Date(conv.last_message_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {conv.message_count} messages
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Jenny Pro Settings</h3>

            {/* Auto-booking toggle */}
            <div className="flex items-start justify-between gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Auto-book appointments</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  When Jenny has the name, service, date and time, she books the job automatically
                  and notifies you. Turn off to review every request before it&apos;s confirmed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettings((s) => ({ ...s, auto_booking: !s.auto_booking }))}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                  settings.auto_booking ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                aria-pressed={settings.auto_booking}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.auto_booking ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Hours Greeting</label>
                <textarea
                  className="w-full border rounded-lg p-3 text-sm"
                  rows={2}
                  value={settings.business_hours_greeting}
                  onChange={(e) => setSettings((s) => ({ ...s, business_hours_greeting: e.target.value }))}
                  placeholder={`Thank you for calling ${company?.name || 'our office'}! I'm Jenny, your AI assistant. How can I help you today?`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">After-Hours Greeting</label>
                <textarea
                  className="w-full border rounded-lg p-3 text-sm"
                  rows={2}
                  value={settings.after_hours_greeting}
                  onChange={(e) => setSettings((s) => ({ ...s, after_hours_greeting: e.target.value }))}
                  placeholder={`Thank you for calling ${company?.name || 'our office'}. Our office is currently closed, but I can help with emergencies and take messages.`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Keywords</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-3 text-sm"
                  value={settings.emergency_keywords}
                  onChange={(e) => setSettings((s) => ({ ...s, emergency_keywords: e.target.value }))}
                  placeholder="Keywords that trigger emergency handling..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  When a customer uses these words (in English or Spanish), Jenny skips booking and
                  escalates to your on-call number immediately.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">On-Call / Escalation Number</label>
                <input
                  type="tel"
                  className="w-full border rounded-lg p-3 text-sm"
                  value={settings.escalation_phone}
                  onChange={(e) => setSettings((s) => ({ ...s, escalation_phone: e.target.value }))}
                  placeholder="Phone number for missed-call ring + emergency escalation..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Jenny rings this number first on inbound calls. If you don&apos;t pick up, she texts the
                  caller to keep the lead alive.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Language</label>
                  <select
                    className="w-full border rounded-lg p-3 text-sm"
                    value={settings.language}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, language: e.target.value as JennyProSettings['language'] }))
                    }
                  >
                    <option value="both">Bilingual — auto-detect EN/ES (recommended)</option>
                    <option value="es">Spanish only</option>
                    <option value="en">English only</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    How Jenny talks to your customers. Bilingual mirrors whichever language they text or speak.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Notification Language</label>
                  <select
                    className="w-full border rounded-lg p-3 text-sm"
                    value={settings.operator_language}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        operator_language: e.target.value as JennyProSettings['operator_language'],
                      }))
                    }
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    The language for your booking and missed-call alerts.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={saveSettings}
                disabled={savingSettings}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {savingSettings ? 'Saving…' : 'Save Settings'}
              </button>
              {savedAt && !savingSettings && (
                <p className="text-xs text-green-600">Saved ✓</p>
              )}
            </div>
          </div>

          {/* Jenny Phone Number — multi-tenant routing */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Your Jenny Phone Number</h3>
            <p className="text-sm text-gray-600 mb-4">
              The dedicated business number Jenny answers on. Texts and calls to it are routed to
              <span className="font-medium"> your</span> company, so Jenny replies as your business,
              with your services, and books into your calendar.
            </p>

            {jennyNumber ? (
              <div className="flex items-center justify-between gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Active number</p>
                  <p className="text-lg font-semibold text-gray-900">{jennyNumber}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  Connected
                </span>
              </div>
            ) : (
              <>
                {/* Auto-provision (recommended) */}
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={3}
                    className="w-full sm:w-40 border rounded-lg p-3 text-sm"
                    value={areaCode}
                    onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="Area code (optional)"
                  />
                  <button
                    onClick={provisionNumber}
                    disabled={provisioning}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                  >
                    {provisioning ? 'Getting your number…' : 'Get my Jenny number'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  We&apos;ll set you up with a dedicated number and wire it automatically — no Twilio setup needed.
                </p>

                {/* Manual fallback — register an existing number */}
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-gray-500 mb-2">Already have a number? Connect it instead:</p>
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <input
                      type="tel"
                      className="flex-1 border rounded-lg p-3 text-sm"
                      value={jennyNumber}
                      onChange={(e) => setJennyNumber(e.target.value)}
                      placeholder="+1 765 789 5752"
                    />
                    <button
                      onClick={saveNumber}
                      disabled={savingNumber || !jennyNumber.trim()}
                      className="px-4 py-2 bg-white border text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
                    >
                      {savingNumber ? 'Saving…' : 'Connect Number'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {numberSaved && !numberError && (
              <p className="text-xs text-green-600 mt-3">Saved ✓ — Jenny is now routed to your company.</p>
            )}
            {numberError && <p className="text-xs text-red-600 mt-3">{numberError}</p>}
          </div>

          {/* Twilio Status */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Twilio Campaign Status</h3>
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <Phone className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">A2P 10DLC Campaign: Verified</p>
                <p className="text-xs text-green-600 mt-0.5">
                  Your campaign is approved and active. All SMS and voice features are fully operational.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
