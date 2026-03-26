import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { GUARDRAIL_RULES } from '@/types/workforce';

export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's company
  const { data: dbUser } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!dbUser?.company_id) {
    return NextResponse.json({ error: 'No company found' }, { status: 404 });
  }

  const companyId = dbUser.company_id;
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  try {
    if (action === 'stats') {
      // Return workforce statistics
      const { data: profiles } = await supabase
        .from('worker_profiles')
        .select('classification, w9_received, insurance_expiry, next_review_date')
        .eq('company_id', companyId);

      const { data: guardrails } = await supabase
        .from('classification_guardrails')
        .select('severity')
        .eq('company_id', companyId)
        .eq('resolved', false);

      const now = new Date();
      const profilesList = (profiles || []) as { classification: string; w9_received: boolean; insurance_expiry: string | null; next_review_date: string | null }[];
      const guardrailsList = (guardrails || []) as { severity: string }[];
      const contractors = profilesList.filter((p: { classification: string }) => p.classification === '1099_contractor');

      return NextResponse.json({
        totalWorkers: profilesList.length,
        w2Count: profilesList.filter((p: { classification: string }) => p.classification === 'w2_employee').length,
        contractorCount: contractors.length,
        activeGuardrails: guardrailsList.length,
        violationCount: guardrailsList.filter((g: { severity: string }) => g.severity === 'violation').length,
        warningCount: guardrailsList.filter((g: { severity: string }) => g.severity === 'warning').length,
        missingW9Count: contractors.filter((c: { w9_received: boolean }) => !c.w9_received).length,
        expiredInsuranceCount: contractors.filter((c: { insurance_expiry: string | null }) =>
          c.insurance_expiry && new Date(c.insurance_expiry) < now
        ).length,
        reviewsDue: profilesList.filter((p: { next_review_date: string | null }) =>
          p.next_review_date && new Date(p.next_review_date) <= now
        ).length,
      });
    }

    if (action === 'scan') {
      // Run guardrail checks for all 1099 contractors
      const { data: profiles } = await supabase
        .from('worker_profiles')
        .select('*, user:users!worker_profiles_user_id_fkey(id, full_name)')
        .eq('company_id', companyId)
        .eq('classification', '1099_contractor');

      const { data: existingGuardrails } = await supabase
        .from('classification_guardrails')
        .select('worker_id, rule_code')
        .eq('company_id', companyId)
        .eq('resolved', false);

      const existing = new Set(
        (existingGuardrails || []).map((g: { worker_id: string; rule_code: string }) => `${g.worker_id}:${g.rule_code}`)
      );

      let newIssues = 0;
      const now = new Date();

      for (const profile of (profiles || [])) {
        const workerName = Array.isArray(profile.user) ? profile.user[0]?.full_name : profile.user?.full_name || 'Unknown';
        const checks: { rule: typeof GUARDRAIL_RULES[keyof typeof GUARDRAIL_RULES]; applies: boolean }[] = [
          { rule: GUARDRAIL_RULES.NO_W9, applies: !profile.w9_received },
          { rule: GUARDRAIL_RULES.NO_CONTRACT, applies: !profile.contract_start_date },
          { rule: GUARDRAIL_RULES.INSURANCE_EXPIRED, applies: !!(profile.insurance_expiry && new Date(profile.insurance_expiry) < now) },
          { rule: GUARDRAIL_RULES.REVIEW_OVERDUE, applies: !!(profile.next_review_date && new Date(profile.next_review_date) <= now) },
        ];

        for (const { rule, applies } of checks) {
          if (applies && !existing.has(`${profile.user_id}:${rule.code}`)) {
            await supabase.from('classification_guardrails').insert({
              company_id: companyId,
              worker_id: profile.user_id,
              worker_name: workerName,
              rule_code: rule.code,
              rule_name: rule.name,
              severity: rule.severity,
              description: rule.description,
              recommendation: rule.recommendation,
            });
            newIssues++;
          }
        }
      }

      return NextResponse.json({ scanned: (profiles || []).length, newIssues });
    }

    // Default: return all workforce data
    const { data: profiles } = await supabase
      .from('worker_profiles')
      .select('*, user:users!worker_profiles_user_id_fkey(id, full_name, email, phone, role, is_active)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    return NextResponse.json({ profiles: profiles || [] });
  } catch (err: unknown) {
    console.error('Workforce API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!dbUser?.company_id) {
    return NextResponse.json({ error: 'No company found' }, { status: 404 });
  }

  // Only owners and admins can modify workforce profiles
  if (!['owner', 'admin'].includes(dbUser.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'classify') {
      const { userId, classification, profileData } = body;

      if (!userId || !classification) {
        return NextResponse.json({ error: 'userId and classification required' }, { status: 400 });
      }

      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

      const payload = {
        user_id: userId,
        company_id: dbUser.company_id,
        classification,
        classified_by: user.id,
        classified_at: new Date().toISOString(),
        last_review_date: new Date().toISOString(),
        next_review_date: sixMonthsFromNow.toISOString(),
        ...profileData,
      };

      const { data: existing } = await supabase
        .from('worker_profiles')
        .select('id')
        .eq('user_id', userId)
        .eq('company_id', dbUser.company_id)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('worker_profiles')
          .update(payload)
          .eq('id', existing.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      } else {
        const { error } = await supabase
          .from('worker_profiles')
          .insert(payload);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'resolve_guardrail') {
      const { guardrailId, notes } = body;

      const { error } = await supabase
        .from('classification_guardrails')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_notes: notes,
        })
        .eq('id', guardrailId)
        .eq('company_id', dbUser.company_id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Workforce API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
