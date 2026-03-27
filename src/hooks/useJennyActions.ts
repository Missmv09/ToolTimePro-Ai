'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { JennyActionLog, JennyActionConfig, JennyActionType } from '@/types/jenny-actions';
import { DEFAULT_ACTION_CONFIGS } from '@/types/jenny-actions';

interface ActionStats {
  totalActions: number;
  executedToday: number;
  pendingActions: number;
  failedActions: number;
  autoDispatchCount: number;
  followUpsSent: number;
  cashFlowAlerts: number;
  jobsCostCalculated: number;
}

export function useJennyActions() {
  const { company } = useAuth();
  const [actionLog, setActionLog] = useState<JennyActionLog[]>([]);
  const [configs, setConfigs] = useState<JennyActionConfig[]>([]);
  const [stats, setStats] = useState<ActionStats>({
    totalActions: 0,
    executedToday: 0,
    pendingActions: 0,
    failedActions: 0,
    autoDispatchCount: 0,
    followUpsSent: 0,
    cashFlowAlerts: 0,
    jobsCostCalculated: 0,
  });
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!company?.id) return;
    setIsLoading(true);
    setError(null);

    try {
      // Fetch action configs
      const { data: configsData, error: configsError } = await supabase
        .from('jenny_action_configs')
        .select('*')
        .eq('company_id', company.id);

      if (configsError) {
        const msg = configsError.message || '';
        if (msg.includes('does not exist') || msg.includes('relation')) {
          setConfigs([]);
          setActionLog([]);
          return;
        }
        throw configsError;
      }

      setConfigs((configsData || []) as JennyActionConfig[]);

      // Fetch recent action log
      const { data: logData } = await supabase
        .from('jenny_action_log')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(100);

      const logs = (logData || []) as JennyActionLog[];
      setActionLog(logs);

      // Fetch last cron run time
      const { data: cronRun } = await supabase
        .from('jenny_cron_runs')
        .select('ran_at')
        .eq('company_id', company.id)
        .single();

      if (cronRun) {
        setLastRunAt(cronRun.ran_at);
      }

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const todayLogs = logs.filter(l => l.created_at.startsWith(today));

      setStats({
        totalActions: logs.length,
        executedToday: todayLogs.filter(l => l.status === 'executed').length,
        pendingActions: logs.filter(l => l.status === 'pending').length,
        failedActions: logs.filter(l => l.status === 'failed').length,
        autoDispatchCount: logs.filter(l => l.action_type === 'auto_dispatch' && l.status === 'executed').length,
        followUpsSent: logs.filter(l => l.action_type === 'lead_follow_up' && l.status === 'executed').length,
        cashFlowAlerts: logs.filter(l => l.action_type === 'cash_flow_alert' && l.status === 'executed').length,
        jobsCostCalculated: logs.filter(l => l.action_type === 'job_costing' && l.status === 'executed').length,
      });
    } catch (err: unknown) {
      console.error('Error fetching Jenny actions data:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('does not exist') && !msg.includes('relation')) {
        setError('Failed to load Jenny actions data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [company?.id]);

  // Get config for a specific action type
  const getConfig = useCallback((actionType: JennyActionType): Record<string, unknown> => {
    const existing = configs.find(c => c.action_type === actionType);
    if (existing) return existing.config;
    return DEFAULT_ACTION_CONFIGS[actionType];
  }, [configs]);

  // Check if an action type is enabled
  const isEnabled = useCallback((actionType: JennyActionType): boolean => {
    const existing = configs.find(c => c.action_type === actionType);
    return existing?.enabled ?? false;
  }, [configs]);

  // Save config for an action type
  const saveConfig = useCallback(async (
    actionType: JennyActionType,
    enabled: boolean,
    config: Record<string, unknown>
  ) => {
    if (!company?.id) return { error: 'Not authenticated' };

    const { data: existing } = await supabase
      .from('jenny_action_configs')
      .select('id')
      .eq('company_id', company.id)
      .eq('action_type', actionType)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('jenny_action_configs')
        .update({ enabled, config, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase
        .from('jenny_action_configs')
        .insert({
          company_id: company.id,
          action_type: actionType,
          enabled,
          config,
        });
      if (error) return { error: error.message };
    }

    await fetchData();
    return { error: null };
  }, [company?.id, fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    actionLog,
    configs,
    stats,
    lastRunAt,
    isLoading,
    error,
    getConfig,
    isEnabled,
    saveConfig,
    refetch: fetchData,
  };
}
