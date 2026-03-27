'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { WorkerProfileRow, ClassificationGuardrailRow, ContractorInvoiceRow } from '@/types/database';
import type { WorkforceStats, WorkerClassification } from '@/types/workforce';
import { GUARDRAIL_RULES } from '@/types/workforce';
import { getStateRules } from '@/lib/state-compliance';

interface WorkerProfileWithUser extends WorkerProfileRow {
  user?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    role: string;
    is_active: boolean;
  };
}

export function useWorkforce() {
  const { company, dbUser } = useAuth();
  const [profiles, setProfiles] = useState<WorkerProfileWithUser[]>([]);
  const [guardrails, setGuardrails] = useState<ClassificationGuardrailRow[]>([]);
  const [contractorInvoices, setContractorInvoices] = useState<ContractorInvoiceRow[]>([]);
  const [stats, setStats] = useState<WorkforceStats>({
    totalWorkers: 0,
    w2Count: 0,
    contractorCount: 0,
    activeGuardrails: 0,
    violationCount: 0,
    warningCount: 0,
    missingW9Count: 0,
    expiredInsuranceCount: 0,
    reviewsDue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkforceData = useCallback(async () => {
    if (!company?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch worker profiles with user info
      const { data: profilesData, error: profilesError } = await supabase
        .from('worker_profiles')
        .select(`
          *,
          user:users!worker_profiles_user_id_fkey(id, full_name, email, phone, role, is_active)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (profilesError) {
        // Table may not exist yet — show empty state
        const msg = profilesError.message || '';
        if (msg.includes('does not exist') || msg.includes('relation')) {
          setProfiles([]);
          setGuardrails([]);
          setContractorInvoices([]);
          return;
        }
        throw profilesError;
      }

      const workerProfiles = (profilesData || []) as WorkerProfileWithUser[];
      setProfiles(workerProfiles);

      // Fetch active guardrails
      const { data: guardrailsData } = await supabase
        .from('classification_guardrails')
        .select('*')
        .eq('company_id', company.id)
        .eq('resolved', false)
        .order('detected_at', { ascending: false });

      setGuardrails((guardrailsData || []) as ClassificationGuardrailRow[]);

      // Fetch contractor invoices
      const { data: invoicesData } = await supabase
        .from('contractor_invoices')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setContractorInvoices((invoicesData || []) as ContractorInvoiceRow[]);

      // Calculate stats
      const now = new Date();
      const w2Workers = workerProfiles.filter(p => p.classification === 'w2_employee');
      const contractors = workerProfiles.filter(p => p.classification === '1099_contractor');
      const activeGuardrailsList = (guardrailsData || []) as ClassificationGuardrailRow[];

      setStats({
        totalWorkers: workerProfiles.length,
        w2Count: w2Workers.length,
        contractorCount: contractors.length,
        activeGuardrails: activeGuardrailsList.length,
        violationCount: activeGuardrailsList.filter(g => g.severity === 'violation').length,
        warningCount: activeGuardrailsList.filter(g => g.severity === 'warning').length,
        missingW9Count: contractors.filter(c => !c.w9_received).length,
        expiredInsuranceCount: contractors.filter(c =>
          c.insurance_expiry && new Date(c.insurance_expiry) < now
        ).length,
        reviewsDue: workerProfiles.filter(p =>
          p.next_review_date && new Date(p.next_review_date) <= now
        ).length,
      });
    } catch (err: unknown) {
      console.error('Error fetching workforce data:', err);
      const msg = err instanceof Error ? err.message : String(err);
      const isSchemaMissing =
        msg.includes('does not exist') ||
        msg.includes('relation') ||
        msg.includes('could not find');
      if (!isSchemaMissing) {
        setError('Failed to load workforce data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [company?.id]);

  // Run guardrail checks against a specific worker profile
  // Uses the company's state to apply the correct rules
  const runGuardrailChecks = useCallback(async (profile: WorkerProfileWithUser) => {
    if (!company?.id || profile.classification !== '1099_contractor') return [];

    const detectedIssues: { rule_code: string; rule_name: string; severity: 'info' | 'warning' | 'violation'; description: string; recommendation: string }[] = [];
    const now = new Date();

    // Get state-specific rules
    const companyState = company.state || 'CA';
    const stateRules = getStateRules(companyState);

    // Check: Missing W-9 (required in all states)
    if (!profile.w9_received) {
      detectedIssues.push(GUARDRAIL_RULES.NO_W9);
    }

    // Check: Missing contract (required in some states, recommended in all)
    if (!profile.contract_start_date && (stateRules?.contractor.writtenContractRequired !== false)) {
      detectedIssues.push(GUARDRAIL_RULES.NO_CONTRACT);
    }

    // Check: Expired insurance
    if (profile.insurance_expiry && new Date(profile.insurance_expiry) < now) {
      detectedIssues.push(GUARDRAIL_RULES.INSURANCE_EXPIRED);
    }

    // Check: Classification review overdue
    if (profile.next_review_date && new Date(profile.next_review_date) <= now) {
      detectedIssues.push(GUARDRAIL_RULES.REVIEW_OVERDUE);
    }

    // Check time entries for schedule/hours patterns
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 28); // Look back 4 weeks

    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select('clock_in, clock_out, break_minutes')
      .eq('user_id', profile.user_id)
      .eq('company_id', company.id)
      .gte('clock_in', weekAgo.toISOString())
      .not('clock_out', 'is', null);

    if (timeEntries && timeEntries.length > 0) {
      // Check: Excessive weekly hours (40+ avg)
      const totalHours = timeEntries.reduce((sum, entry) => {
        const clockIn = new Date(entry.clock_in);
        const clockOut = new Date(entry.clock_out!);
        const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60) - (entry.break_minutes || 0) / 60;
        return sum + Math.max(0, hours);
      }, 0);
      const weeksSpan = Math.max(1, 4);
      const avgWeeklyHours = totalHours / weeksSpan;

      if (avgWeeklyHours >= 40) {
        detectedIssues.push(GUARDRAIL_RULES.EXCESSIVE_HOURS);
      }
    }

    // Save detected issues to database
    const workerName = profile.user?.full_name || 'Unknown Worker';
    for (const issue of detectedIssues) {
      // Check if this rule is already active for this worker
      const existingGuardrail = guardrails.find(
        g => g.worker_id === profile.user_id && g.rule_code === issue.rule_code && !g.resolved
      );
      if (existingGuardrail) continue;

      await supabase.from('classification_guardrails').insert({
        company_id: company.id,
        worker_id: profile.user_id,
        worker_name: workerName,
        rule_code: issue.rule_code,
        rule_name: issue.rule_name,
        severity: issue.severity,
        description: issue.description,
        recommendation: issue.recommendation,
      });
    }

    return detectedIssues;
  }, [company?.id, guardrails]);

  // Create or update a worker profile
  const saveWorkerProfile = useCallback(async (
    userId: string,
    classification: WorkerClassification,
    profileData: Record<string, unknown>
  ) => {
    if (!company?.id || !dbUser?.id) return { error: 'Not authenticated' };

    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

    const payload = {
      user_id: userId,
      company_id: company.id,
      classification,
      classified_by: dbUser.id,
      classified_at: new Date().toISOString(),
      last_review_date: new Date().toISOString(),
      next_review_date: sixMonthsFromNow.toISOString(),
      ...profileData,
    };

    const { data: existing } = await supabase
      .from('worker_profiles')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', company.id)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('worker_profiles')
        .update(payload)
        .eq('id', existing.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase
        .from('worker_profiles')
        .insert(payload);
      if (error) return { error: error.message };
    }

    await fetchWorkforceData();
    return { error: null };
  }, [company?.id, dbUser?.id, fetchWorkforceData]);

  // Resolve a guardrail alert
  const resolveGuardrail = useCallback(async (guardrailId: string, notes: string) => {
    if (!dbUser?.id) return;

    const { error } = await supabase
      .from('classification_guardrails')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: dbUser.id,
        resolution_notes: notes,
      })
      .eq('id', guardrailId);

    if (!error) {
      setGuardrails(prev => prev.filter(g => g.id !== guardrailId));
      setStats(prev => ({
        ...prev,
        activeGuardrails: Math.max(0, prev.activeGuardrails - 1),
      }));
    }
  }, [dbUser?.id]);

  useEffect(() => {
    fetchWorkforceData();
  }, [fetchWorkforceData]);

  return {
    profiles,
    guardrails,
    contractorInvoices,
    stats,
    isLoading,
    error,
    saveWorkerProfile,
    runGuardrailChecks,
    resolveGuardrail,
    refetch: fetchWorkforceData,
  };
}
