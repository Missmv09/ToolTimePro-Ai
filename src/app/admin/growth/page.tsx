'use client';

/**
 * Growth agent approval queue.
 *
 * One screen: what the agent proposed, why, and what it wrote. Approve, reject,
 * or read the draft. This is the human gate — the planner and generator only
 * ever produce drafts, and nothing published happens without a click here.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';

interface GrowthTask {
  id: string;
  title: string;
  rationale: string;
  channel: string;
  task_type: string;
  priority: number;
  expected_impact: string | null;
  status: string;
  review_note: string | null;
  created_at: string;
}

interface GrowthAsset {
  id: string;
  task_id: string;
  asset_type: string;
  title: string | null;
  body: string;
  slug: string | null;
  generated_by: string | null;
  status: string;
}

interface MetricRow {
  metric_date: string;
  leads_captured: number;
  leads_total: number;
  signups: number;
  trials_active: number;
  paid_active: number;
}

const STATUS_STYLES: Record<string, string> = {
  proposed: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  generated: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  rejected: 'bg-gray-100 text-gray-600',
};

export default function AdminGrowthPage() {
  const [tasks, setTasks] = useState<GrowthTask[]>([]);
  const [assets, setAssets] = useState<GrowthAsset[]>([]);
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const authHeaders = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token || ''}`,
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/growth', { headers: await authHeaders() });
      if (!res.ok) {
        setError(res.status === 403 ? 'Platform admin access required.' : 'Could not load the queue.');
        return;
      }
      const data = await res.json();
      setTasks(data.tasks || []);
      setAssets(data.assets || []);
      setMetrics(data.metrics || []);
    } catch {
      setError('Could not load the queue.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (payload: Record<string, string>, id: string) => {
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/growth', {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError('Could not save that change.');
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const latest = metrics[0];
  const leadsLast30 = metrics.reduce((sum, row) => sum + (row.leads_captured || 0), 0);
  const assetFor = (taskId: string) => assets.find((a) => a.task_id === taskId);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Admin</span>
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">Growth Agent</h1>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
        )}

        {/* The same numbers the planner reasoned over, so a proposal can be
            judged against the data that produced it. */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Leads (30d)', value: leadsLast30 },
            { label: 'Leads total', value: latest?.leads_total ?? 0 },
            { label: 'Signups (today)', value: latest?.signups ?? 0 },
            { label: 'Active trials', value: latest?.trials_active ?? 0 },
            { label: 'Paying', value: latest?.paid_active ?? 0 },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {metrics.length === 0 && !loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            No funnel snapshots yet. The metrics cron runs daily at 5am UTC — until it has run at
            least once, the planner is working without data.
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Proposed work
          </h2>

          {loading && tasks.length === 0 && <p className="text-gray-500 text-sm">Loading…</p>}

          {!loading && tasks.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Nothing in the queue</p>
              <p className="text-sm text-gray-500 mt-1">
                The planner runs Mondays at 6am UTC and proposes the week&apos;s work.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {tasks.map((task) => {
              const asset = assetFor(task.id);
              const isOpen = expanded === task.id;

              return (
                <div key={task.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          P{task.priority}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            STATUS_STYLES[task.status] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {task.status}
                        </span>
                        <span className="text-xs text-gray-500">{task.channel}</span>
                      </div>

                      <h3 className="font-semibold text-gray-900">{task.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{task.rationale}</p>

                      {task.expected_impact && (
                        <p className="text-sm text-gray-500 mt-2 flex items-start gap-1.5">
                          <TrendingUp className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          {task.expected_impact}
                        </p>
                      )}

                      {task.review_note && task.status === 'failed' && (
                        <p className="text-sm text-red-600 mt-2">{task.review_note}</p>
                      )}
                    </div>

                    {task.status === 'proposed' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => review({ taskId: task.id, status: 'approved' }, task.id)}
                          disabled={busyId === task.id}
                          className="inline-flex items-center gap-1.5 bg-[#0A0C11] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#2d2d44] disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => review({ taskId: task.id, status: 'rejected' }, task.id)}
                          disabled={busyId === task.id}
                          className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {asset && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => setExpanded(isOpen ? null : task.id)}
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                      >
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {asset.title || asset.asset_type}
                        <span className="text-xs text-gray-400 font-normal">
                          {asset.generated_by}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="mt-3">
                          <pre className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap font-sans max-h-[400px] overflow-y-auto">
                            {asset.body}
                          </pre>
                          {asset.status === 'draft' && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => review({ assetId: asset.id, status: 'approved' }, asset.id)}
                                disabled={busyId === asset.id}
                                className="inline-flex items-center gap-1.5 bg-[#0A0C11] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#2d2d44] disabled:opacity-50"
                              >
                                <Check className="w-4 h-4" />
                                Approve draft
                              </button>
                              <button
                                onClick={() => review({ assetId: asset.id, status: 'rejected' }, asset.id)}
                                disabled={busyId === asset.id}
                                className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                              >
                                <X className="w-4 h-4" />
                                Reject draft
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
