'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  Phone,
  FileText,
  Users,
  Globe,
  Settings,
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
}

interface SetupOrder {
  id: string;
  service_type: 'assisted_onboarding' | 'white_glove';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  checklist: ChecklistItem[];
  assigned_to: string | null;
  purchased_at: string;
  started_at: string | null;
  completed_at: string | null;
  kickoff_call_at: string | null;
  notes: string | null;
}

const ASSISTED_CHECKLIST: ChecklistItem[] = [
  { id: 'kickoff_call', label: 'Kickoff call scheduled', completed: false },
  { id: 'account_setup', label: 'Account settings configured', completed: false },
  { id: 'services_added', label: 'Services & pricing added', completed: false },
  { id: 'team_invited', label: 'Team members invited', completed: false },
  { id: 'customer_import', label: 'Customer data imported', completed: false },
  { id: 'booking_configured', label: 'Online booking set up', completed: false },
  { id: 'invoice_template', label: 'Invoice template customized', completed: false },
  { id: 'training_complete', label: 'Training session completed', completed: false },
];

const WHITE_GLOVE_CHECKLIST: ChecklistItem[] = [
  { id: 'kickoff_call', label: 'Kickoff call scheduled', completed: false },
  { id: 'account_setup', label: 'Account settings configured', completed: false },
  { id: 'services_added', label: 'Services & pricing added', completed: false },
  { id: 'team_invited', label: 'Team members invited', completed: false },
  { id: 'customer_import', label: 'Customer data imported', completed: false },
  { id: 'booking_configured', label: 'Online booking set up', completed: false },
  { id: 'invoice_template', label: 'Invoice template customized', completed: false },
  { id: 'website_designed', label: 'Website designed & published', completed: false },
  { id: 'jenny_configured', label: 'Jenny AI configured', completed: false },
  { id: 'compliance_setup', label: 'Compliance rules configured', completed: false },
  { id: 'training_1', label: 'Training session 1 completed', completed: false },
  { id: 'training_2', label: 'Training session 2 completed', completed: false },
  { id: '30_day_checkin', label: '30-day check-in call', completed: false },
];

const SERVICE_INFO = {
  assisted_onboarding: {
    name: 'Assisted Onboarding',
    price: '$149',
    description: 'Guided setup with a dedicated specialist',
    icon: Settings,
    color: 'blue',
  },
  white_glove: {
    name: 'White Glove Setup',
    price: '$349',
    description: 'Full-service setup with website design, training, and 30-day support',
    icon: Sparkles,
    color: 'purple',
  },
};

export default function OnboardingStatusPage() {
  const { dbUser } = useAuth();
  const [orders, setOrders] = useState<SetupOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!dbUser?.company_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('setup_service_orders')
        .select('*')
        .eq('company_id', dbUser.company_id)
        .order('purchased_at', { ascending: false });

      if (!error && data) {
        setOrders(data as SetupOrder[]);
      }
    } catch {
      // Table may not exist yet
    }
    setLoading(false);
  }, [dbUser?.company_id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Setup Services</h1>
        <div className="bg-white rounded-xl border p-12 text-center">
          <Settings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No setup services purchased</h3>
          <p className="text-gray-500 mb-4">
            Get help setting up your ToolTime Pro account with our expert team.
          </p>
          <div className="flex justify-center gap-4">
            <a href="/pricing" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              View Setup Options
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Setup Services</h1>

      {orders.map((order) => {
        const info = SERVICE_INFO[order.service_type];
        const checklist = order.checklist?.length > 0
          ? order.checklist
          : order.service_type === 'white_glove' ? WHITE_GLOVE_CHECKLIST : ASSISTED_CHECKLIST;
        const completedCount = checklist.filter((item: ChecklistItem) => item.completed).length;
        const progress = Math.round((completedCount / checklist.length) * 100);

        return (
          <div key={order.id} className="bg-white rounded-xl border overflow-hidden">
            {/* Header */}
            <div className={`p-6 ${info.color === 'purple' ? 'bg-purple-50' : 'bg-blue-50'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    info.color === 'purple' ? 'bg-purple-100' : 'bg-blue-100'
                  }`}>
                    <info.icon className={`w-5 h-5 ${info.color === 'purple' ? 'text-purple-600' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{info.name}</h2>
                    <p className="text-sm text-gray-600">{info.description}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  order.status === 'completed' ? 'bg-green-100 text-green-700' :
                  order.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                  order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {order.status === 'in_progress' ? 'In Progress' :
                   order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">{completedCount} of {checklist.length} steps complete</span>
                  <span className="font-medium text-gray-900">{progress}%</span>
                </div>
                <div className="h-2 bg-white rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      info.color === 'purple' ? 'bg-purple-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="p-6 space-y-4">
              {/* Key dates */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Purchased</p>
                  <p className="text-sm font-medium">{new Date(order.purchased_at).toLocaleDateString()}</p>
                </div>
                {order.kickoff_call_at && (
                  <div>
                    <p className="text-xs text-gray-500">Kickoff Call</p>
                    <p className="text-sm font-medium">{new Date(order.kickoff_call_at).toLocaleDateString()}</p>
                  </div>
                )}
                {order.assigned_to && (
                  <div>
                    <p className="text-xs text-gray-500">Your Specialist</p>
                    <p className="text-sm font-medium">{order.assigned_to}</p>
                  </div>
                )}
                {order.completed_at && (
                  <div>
                    <p className="text-xs text-gray-500">Completed</p>
                    <p className="text-sm font-medium">{new Date(order.completed_at).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              {/* Checklist */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Setup Checklist</h3>
                <div className="space-y-2">
                  {checklist.map((item: ChecklistItem) => (
                    <div key={item.id} className="flex items-center gap-3">
                      {item.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${item.completed ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {order.notes && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Notes from your specialist</p>
                  <p className="text-sm text-gray-700">{order.notes}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
