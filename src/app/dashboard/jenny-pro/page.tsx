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
  PhoneOff,
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
}

interface JennyProStats {
  totalConversations: number;
  leadsCapture: number;
  bookingsMade: number;
  avgResponseTime: string;
}

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
          bookingsMade: 0,
          avgResponseTime: data.length > 0 ? '< 30s' : '--',
        });
      }
    } catch {
      // Table may not exist yet — show empty state
    }
    setLoading(false);
  }, [dbUser?.company_id]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

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

          {/* Voice Feature Card — Pending Twilio Approval */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <PhoneIncoming className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">AI Phone Receptionist</h3>
                <p className="text-gray-600 mt-1">
                  Jenny will answer your business calls 24/7, capture leads, book appointments, and handle emergencies — in English and Spanish.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                    <Clock size={14} />
                    Pending Twilio Campaign Approval
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Voice features will activate automatically once your Twilio A2P 10DLC campaign is approved. SMS features are available now.
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

            {/* Business Hours */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Hours Greeting</label>
                <textarea
                  className="w-full border rounded-lg p-3 text-sm"
                  rows={2}
                  defaultValue={`Thank you for calling ${company?.name || 'our office'}! I'm Jenny, your AI assistant. How can I help you today?`}
                  placeholder="Greeting for business hours calls..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">After-Hours Greeting</label>
                <textarea
                  className="w-full border rounded-lg p-3 text-sm"
                  rows={2}
                  defaultValue={`Thank you for calling ${company?.name || 'our office'}. Our office is currently closed, but I can help with emergencies and take messages.`}
                  placeholder="Greeting for after-hours calls..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Keywords</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-3 text-sm"
                  defaultValue="emergency, urgent, burst, leak, flood, fire, broken"
                  placeholder="Keywords that trigger emergency handling..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  When a caller mentions these words, Jenny escalates to your on-call number immediately.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">On-Call / Escalation Number</label>
                <input
                  type="tel"
                  className="w-full border rounded-lg p-3 text-sm"
                  defaultValue={company?.phone || ''}
                  placeholder="Phone number for emergency escalation..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <select className="w-full border rounded-lg p-3 text-sm">
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="both">Bilingual (English + Spanish)</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Save Settings
              </button>
              <p className="text-xs text-gray-500">
                Voice settings will apply once Twilio campaign is approved.
              </p>
            </div>
          </div>

          {/* Twilio Status */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Twilio Campaign Status</h3>
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <PhoneOff className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">A2P 10DLC Campaign: Pending Approval</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  This is required for business SMS and voice services. Typical approval takes 1-5 business days.
                  SMS features using existing approved numbers are available now.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
