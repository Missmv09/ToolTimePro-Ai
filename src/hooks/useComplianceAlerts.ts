'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { ComplianceAlert } from '@/types/database';

interface ComplianceStats {
  totalViolations: number;
  mealBreakViolations: number;
  restBreakViolations: number;
  overtimeAlerts: number;
  doubleTimeAlerts: number;
  unacknowledgedCount: number;
}

interface ComplianceAlertWithUser extends ComplianceAlert {
  user?: {
    full_name: string;
    email: string;
  };
}

interface TimeEntryWithCompliance {
  id: string;
  clock_in: string;
  clock_out: string | null;
  hours_worked: number;
  missed_meal_break: boolean;
  missed_rest_break: boolean;
  attestation_completed: boolean;
  user: {
    id: string;
    full_name: string;
  };
}

export function useComplianceAlerts(dateRange: 'today' | 'week' | 'month' = 'week') {
  const { company } = useAuth();
  const [alerts, setAlerts] = useState<ComplianceAlertWithUser[]>([]);
  const [stats, setStats] = useState<ComplianceStats>({
    totalViolations: 0,
    mealBreakViolations: 0,
    restBreakViolations: 0,
    overtimeAlerts: 0,
    doubleTimeAlerts: 0,
    unacknowledgedCount: 0,
  });
  const [timeEntries, setTimeEntries] = useState<TimeEntryWithCompliance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getDateFilter = useCallback(() => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return now.toISOString().split('T')[0];
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return weekAgo.toISOString().split('T')[0];
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return monthAgo.toISOString().split('T')[0];
      default:
        return now.toISOString().split('T')[0];
    }
  }, [dateRange]);

  const fetchComplianceData = useCallback(async () => {
    if (!company?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const startDate = getDateFilter();

      // Fetch compliance alerts with user info
      const { data: alertsData, error: alertsError } = await supabase
        .from('compliance_alerts')
        .select(`
          *,
          user:users(full_name, email)
        `)
        .eq('company_id', company.id)
        .gte('created_at', `${startDate}T00:00:00`)
        .order('created_at', { ascending: false });

      if (alertsError) throw alertsError;

      // Fetch time entries with attestation data
      // Try with compliance columns first, fall back to base columns if migration not applied
      let entriesData;
      const { data: fullData, error: fullError } = await supabase
        .from('time_entries')
        .select(`
          id,
          clock_in,
          clock_out,
          break_minutes,
          missed_meal_break,
          missed_rest_break,
          attestation_completed,
          user:users(id, full_name)
        `)
        .eq('company_id', company.id)
        .gte('clock_in', `${startDate}T00:00:00`)
        .not('clock_out', 'is', null)
        .order('clock_in', { ascending: false });

      if (fullError) {
        const errMsg = fullError.message || '';
        // If compliance columns don't exist yet, retry with base columns only
        if (errMsg.includes('does not exist') || errMsg.includes('undefined')) {
          const { data: baseData, error: baseError } = await supabase
            .from('time_entries')
            .select(`
              id,
              clock_in,
              clock_out,
              break_minutes,
              user:users(id, full_name)
            `)
            .eq('company_id', company.id)
            .gte('clock_in', `${startDate}T00:00:00`)
            .not('clock_out', 'is', null)
            .order('clock_in', { ascending: false });

          if (baseError) throw baseError;
          entriesData = (baseData || []).map((e) => ({
            ...e,
            missed_meal_break: false,
            missed_rest_break: false,
            attestation_completed: false,
          }));
        } else {
          throw fullError;
        }
      } else {
        entriesData = fullData;
      }

      // Calculate hours worked for each entry
      const entriesWithHours = (entriesData || []).map((entry) => {
        const clockIn = new Date(entry.clock_in);
        const clockOut = entry.clock_out ? new Date(entry.clock_out) : new Date();
        const diffMs = clockOut.getTime() - clockIn.getTime();
        const hours = diffMs / (1000 * 60 * 60) - (entry.break_minutes || 0) / 60;
        return {
          ...entry,
          hours_worked: Math.max(0, hours),
          user: Array.isArray(entry.user) ? entry.user[0] : entry.user,
        };
      });

      // Calculate stats
      const alertsList = (alertsData || []) as ComplianceAlertWithUser[];
      const violations = alertsList.filter((a) => a.severity === 'violation');

      setStats({
        totalViolations: violations.length,
        mealBreakViolations: alertsList.filter((a) => a.alert_type === 'meal_break_missed').length,
        restBreakViolations: alertsList.filter((a) => a.alert_type === 'rest_break_due').length,
        overtimeAlerts: alertsList.filter((a) => a.alert_type === 'overtime_warning').length,
        doubleTimeAlerts: alertsList.filter((a) => a.alert_type === 'double_time_warning').length,
        unacknowledgedCount: alertsList.filter((a) => !a.acknowledged).length,
      });

      setAlerts(alertsList);
      setTimeEntries(entriesWithHours as TimeEntryWithCompliance[]);
    } catch (err: unknown) {
      console.error('Error fetching compliance data:', err);
      // If tables or columns don't exist yet, show empty state instead of error
      const msg = err instanceof Error ? err.message : String(err);
      const isSchemaMissing =
        msg.includes('does not exist') || msg.includes('undefined');
      if (!isSchemaMissing) {
        setError('Failed to load compliance data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [company?.id, getDateFilter]);

  const acknowledgeAlert = async (alertId: string): Promise<void> => {
    const { error } = await supabase
      .from('compliance_alerts')
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (!error) {
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? { ...a, acknowledged: true, acknowledged_at: new Date().toISOString() }
            : a
        )
      );
      setStats((prev) => ({
        ...prev,
        unacknowledgedCount: Math.max(0, prev.unacknowledgedCount - 1),
      }));
    }
  };

  useEffect(() => {
    fetchComplianceData();
  }, [fetchComplianceData]);

  // Real-time subscription
  useEffect(() => {
    if (!company?.id) return;

    const subscription = supabase
      .channel('compliance-alerts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'compliance_alerts',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          fetchComplianceData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [company?.id, fetchComplianceData]);

  return {
    alerts,
    stats,
    timeEntries,
    isLoading,
    error,
    acknowledgeAlert,
    refetch: fetchComplianceData,
  };
}
