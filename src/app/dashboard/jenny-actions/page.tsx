'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useJennyActions } from '@/hooks/useJennyActions';
import type { JennyActionType } from '@/types/jenny-actions';
import { ACTION_DESCRIPTIONS, DEFAULT_ACTION_CONFIGS } from '@/types/jenny-actions';
import {
  Zap,
  MessageSquare,
  DollarSign,
  TrendingUp,
  Star,
  Bot,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Play,
  Settings,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  X,
  RefreshCw,
  Activity,
  AlertCircle,
} from 'lucide-react';

const ACTION_ICONS: Record<string, typeof Zap> = {
  Zap, MessageSquare, DollarSign, TrendingUp, Star,
};

const STATUS_STYLES: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  executed: { icon: CheckCircle, color: 'text-green-500', label: 'Executed' },
  pending: { icon: Clock, color: 'text-yellow-500', label: 'Pending' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
  skipped: { icon: X, color: 'text-gray-400', label: 'Skipped' },
};

export default function JennyActionsPage() {
  const { actionLog, stats, isLoading, error, isEnabled, getConfig, saveConfig, refetch } = useJennyActions();
  const [expandedAction, setExpandedAction] = useState<JennyActionType | null>(null);
  const [running, setRunning] = useState(false);
  const [savingConfig, setSavingConfig] = useState<string | null>(null);

  // Local config state for editing
  const [localConfigs, setLocalConfigs] = useState<Record<string, Record<string, unknown>>>({});

  useEffect(() => {
    // Initialize local configs from fetched configs
    const actionTypes: JennyActionType[] = ['auto_dispatch', 'lead_follow_up', 'cash_flow_alert', 'job_costing'];
    const initial: Record<string, Record<string, unknown>> = {};
    for (const type of actionTypes) {
      initial[type] = getConfig(type);
    }
    setLocalConfigs(initial);
  }, [getConfig]);

  const handleToggle = async (actionType: JennyActionType) => {
    setSavingConfig(actionType);
    const newEnabled = !isEnabled(actionType);
    const config = localConfigs[actionType] || DEFAULT_ACTION_CONFIGS[actionType];
    await saveConfig(actionType, newEnabled, config);
    setSavingConfig(null);
  };

  const handleSaveConfig = async (actionType: JennyActionType) => {
    setSavingConfig(actionType);
    const config = localConfigs[actionType] || DEFAULT_ACTION_CONFIGS[actionType];
    await saveConfig(actionType, isEnabled(actionType), config);
    setSavingConfig(null);
  };

  const updateLocalConfig = (actionType: string, key: string, value: unknown) => {
    setLocalConfigs(prev => ({
      ...prev,
      [actionType]: { ...prev[actionType], [key]: value },
    }));
  };

  const handleRunAll = async () => {
    setRunning(true);
    try {
      await fetch('/api/jenny-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_all' }),
      });
      await refetch();
    } catch (err) {
      console.error('Failed to run Jenny actions:', err);
    }
    setRunning(false);
  };

  const handleApproveDispatch = async (actionLogId: string) => {
    await fetch('/api/jenny-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve_dispatch', actionLogId }),
    });
    await refetch();
  };

  const handleDismiss = async (actionLogId: string) => {
    await fetch('/api/jenny-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss', actionLogId }),
    });
    await refetch();
  };

  const actionTypes: JennyActionType[] = ['auto_dispatch', 'lead_follow_up', 'cash_flow_alert', 'job_costing'];
  const pendingActions = actionLog.filter(a => a.status === 'pending');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-navy-gradient rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-gold-500 rounded-xl flex items-center justify-center">
            <Bot className="w-8 h-8 text-navy-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Jenny Autonomous Actions</h1>
            <p className="text-white/70">AI That Acts, Not Just Answers</p>
          </div>
        </div>
        <p className="text-white/80 max-w-2xl">
          Jenny doesn&apos;t just answer questions — she runs your back office. Auto-dispatch crews,
          follow up on cold leads, alert you about cash flow, and calculate job profitability.
          All on autopilot.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center">
          <Activity className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-600">{isLoading ? '...' : stats.executedToday}</p>
          <p className="text-sm text-gray-500">Actions Today</p>
        </div>
        <div className="card text-center">
          <Zap className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-blue-600">{isLoading ? '...' : stats.autoDispatchCount}</p>
          <p className="text-sm text-gray-500">Auto-Dispatches</p>
        </div>
        <div className="card text-center">
          <MessageSquare className="w-5 h-5 text-purple-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-purple-600">{isLoading ? '...' : stats.followUpsSent}</p>
          <p className="text-sm text-gray-500">Follow-Ups Sent</p>
        </div>
        <div className="card text-center">
          <DollarSign className="w-5 h-5 text-orange-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-orange-600">{isLoading ? '...' : stats.cashFlowAlerts}</p>
          <p className="text-sm text-gray-500">Cash Flow Alerts</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Pending Actions (need approval) */}
      {pendingActions.length > 0 && (
        <div className="card border-2 border-yellow-200">
          <h2 className="text-lg font-semibold text-navy-500 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            Pending Approval ({pendingActions.length})
          </h2>
          <div className="space-y-3">
            {pendingActions.map(action => (
              <div key={action.id} className="bg-yellow-50 rounded-lg p-4 flex items-start gap-4">
                <Zap className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{action.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(action.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveDispatch(action.id)}
                    className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-1"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => handleDismiss(action.id)}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Run All Button */}
      <div className="flex justify-end">
        <button
          onClick={handleRunAll}
          disabled={running}
          className="btn-primary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Running Jenny...' : 'Run All Actions Now'}
        </button>
      </div>

      {/* Action Configurations */}
      <div>
        <h2 className="text-lg font-semibold text-navy-500 mb-4">Automation Settings</h2>
        <div className="space-y-4">
          {actionTypes.map(actionType => {
            const desc = ACTION_DESCRIPTIONS[actionType];
            const IconComponent = ACTION_ICONS[desc.icon] || Zap;
            const enabled = isEnabled(actionType);
            const isExpanded = expandedAction === actionType;
            const config = localConfigs[actionType] || {};

            return (
              <div key={actionType} className={`card border-2 ${enabled ? 'border-green-200' : 'border-gray-200'}`}>
                {/* Action Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <IconComponent className={`w-5 h-5 ${enabled ? 'text-green-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-navy-500">{desc.title}</h3>
                      <p className="text-sm text-gray-500">{desc.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(actionType)}
                      disabled={savingConfig === actionType}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        enabled ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                        enabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                    {/* Expand */}
                    <button
                      onClick={() => setExpandedAction(isExpanded ? null : actionType)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Config */}
                {isExpanded && (
                  <div className="border-t mt-4 pt-4 space-y-4">
                    {actionType === 'auto_dispatch' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Strategy</label>
                          <select
                            value={(config.assign_strategy as string) || 'least_busy'}
                            onChange={e => updateLocalConfig(actionType, 'assign_strategy', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500"
                          >
                            <option value="least_busy">Least Busy (fewest jobs today)</option>
                            <option value="round_robin">Round Robin (rotate evenly)</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="require_approval" checked={config.require_approval !== false}
                            onChange={e => updateLocalConfig(actionType, 'require_approval', e.target.checked)} className="w-4 h-4 text-gold-500 rounded" />
                          <label htmlFor="require_approval" className="text-sm text-gray-700">
                            Require my approval before assigning (recommended)
                          </label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="notify_worker" checked={config.notify_worker_sms !== false}
                            onChange={e => updateLocalConfig(actionType, 'notify_worker_sms', e.target.checked)} className="w-4 h-4 text-gold-500 rounded" />
                          <label htmlFor="notify_worker" className="text-sm text-gray-700">Send SMS to worker when assigned</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="notify_customer" checked={config.notify_customer_sms !== false}
                            onChange={e => updateLocalConfig(actionType, 'notify_customer_sms', e.target.checked)} className="w-4 h-4 text-gold-500 rounded" />
                          <label htmlFor="notify_customer" className="text-sm text-gray-700">Send confirmation SMS to customer</label>
                        </div>
                      </>
                    )}

                    {actionType === 'lead_follow_up' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Follow-Up Schedule (days after quote)</label>
                          <div className="flex gap-2">
                            {((config.follow_up_days as number[]) || [3, 7, 14]).map((day, i) => (
                              <div key={i} className="flex items-center gap-1">
                                <span className="text-sm text-gray-500">Day</span>
                                <input
                                  type="number" min="1" max="90"
                                  value={day}
                                  onChange={e => {
                                    const days = [...((config.follow_up_days as number[]) || [3, 7, 14])];
                                    days[i] = parseInt(e.target.value) || 1;
                                    updateLocalConfig(actionType, 'follow_up_days', days);
                                  }}
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Max Follow-Up Attempts</label>
                          <select
                            value={(config.max_attempts as number) || 3}
                            onChange={e => updateLocalConfig(actionType, 'max_attempts', parseInt(e.target.value))}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                            <option value={5}>5</option>
                          </select>
                        </div>
                      </>
                    )}

                    {actionType === 'cash_flow_alert' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Alert after invoice is overdue by</label>
                          <select
                            value={(config.overdue_threshold_days as number) || 1}
                            onChange={e => updateLocalConfig(actionType, 'overdue_threshold_days', parseInt(e.target.value))}
                            className="w-48 px-3 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value={1}>1 day</option>
                            <option value={3}>3 days</option>
                            <option value={7}>7 days</option>
                            <option value={14}>14 days</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="owner_sms" checked={config.notify_owner_sms !== false}
                            onChange={e => updateLocalConfig(actionType, 'notify_owner_sms', e.target.checked)} className="w-4 h-4 text-gold-500 rounded" />
                          <label htmlFor="owner_sms" className="text-sm text-gray-700">Notify me via SMS about overdue invoices</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="auto_reminder" checked={(config.auto_send_reminder as boolean) || false}
                            onChange={e => updateLocalConfig(actionType, 'auto_send_reminder', e.target.checked)} className="w-4 h-4 text-gold-500 rounded" />
                          <label htmlFor="auto_reminder" className="text-sm text-gray-700">
                            Auto-send payment reminders to customers (use with caution)
                          </label>
                        </div>
                      </>
                    )}

                    {actionType === 'job_costing' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Alert when profit margin falls below</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number" min="0" max="100"
                              value={(config.alert_threshold_percent as number) || 20}
                              onChange={e => updateLocalConfig(actionType, 'alert_threshold_percent', parseInt(e.target.value) || 0)}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center"
                            />
                            <span className="text-sm text-gray-500">%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" id="include_labor" checked={config.include_labor !== false}
                            onChange={e => updateLocalConfig(actionType, 'include_labor', e.target.checked)} className="w-4 h-4 text-gold-500 rounded" />
                          <label htmlFor="include_labor" className="text-sm text-gray-700">Include labor costs (from time tracking)</label>
                        </div>
                      </>
                    )}

                    <button
                      onClick={() => handleSaveConfig(actionType)}
                      disabled={savingConfig === actionType}
                      className="btn-primary text-sm"
                    >
                      {savingConfig === actionType ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Log */}
      <div className="card">
        <h2 className="text-lg font-semibold text-navy-500 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-navy-500" />
          Activity Log
        </h2>
        {isLoading ? (
          <p className="text-gray-500 text-sm text-center py-8">Loading...</p>
        ) : actionLog.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Actions Yet</h3>
            <p className="text-gray-500 text-sm">
              Enable at least one automation above, then click &quot;Run All Actions Now&quot; to see Jenny in action.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {actionLog.map(action => {
              const statusInfo = STATUS_STYLES[action.status] || STATUS_STYLES.executed;
              const StatusIcon = statusInfo.icon;
              const desc = ACTION_DESCRIPTIONS[action.action_type as JennyActionType];
              const ActionIcon = desc ? ACTION_ICONS[desc.icon] || Zap : Zap;

              return (
                <div key={action.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 mt-0.5">
                    <ActionIcon className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{action.title}</p>
                      <StatusIcon className={`w-4 h-4 flex-shrink-0 ${statusInfo.color}`} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{action.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(action.created_at).toLocaleString()}
                    </p>
                  </div>
                  {action.status === 'pending' && action.action_type === 'auto_dispatch' && (
                    <div className="flex gap-1.5">
                      <button onClick={() => handleApproveDispatch(action.id)}
                        className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200">
                        Approve
                      </button>
                      <button onClick={() => handleDismiss(action.id)}
                        className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium hover:bg-gray-200">
                        Skip
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="font-semibold text-navy-500 mb-3">How Jenny Autonomous Actions Work</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <span className="bg-gold-500 text-navy-500 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
            <p><strong>Configure</strong> — Enable the actions you want and set your preferences (schedule, thresholds, approval required).</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="bg-gold-500 text-navy-500 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
            <p><strong>Jenny Monitors</strong> — She continuously checks for unassigned jobs, cold leads, overdue invoices, and completed jobs.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="bg-gold-500 text-navy-500 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
            <p><strong>She Acts</strong> — Jenny dispatches crews, sends follow-ups, alerts you about cash flow, and calculates profitability — automatically.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
