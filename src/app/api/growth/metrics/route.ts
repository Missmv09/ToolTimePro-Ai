import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * Growth funnel snapshot.
 *
 * Cron-triggered (see netlify/functions/growth-metrics-cron.ts). Recomputes
 * *today's* row in growth_metrics_daily and upserts it, so:
 *   - running more than once a day is harmless (it overwrites the same row)
 *   - a missed run self-heals on the next one, apart from that day's row
 *
 * This is the sensing half of the growth agent. Phase 1's planner reads this
 * table as a time series; nothing here makes decisions, it only records state.
 */

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Percentage to two decimals, or null when the denominator is zero. */
function rate(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 10000) / 100;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  // UTC day boundaries, matching the cron's schedule and the DATE column.
  const now = new Date();
  const metricDate = now.toISOString().slice(0, 10);
  const dayStart = `${metricDate}T00:00:00.000Z`;
  const dayEnd = new Date(Date.parse(dayStart) + 24 * 60 * 60 * 1000).toISOString();

  try {
    // ---- Leads -------------------------------------------------------
    const [
      { count: leadsTotal },
      { count: leadsConsented },
      { data: todaysLeads },
    ] = await Promise.all([
      supabase.from('growth_leads').select('*', { count: 'exact', head: true }),
      supabase
        .from('growth_leads')
        .select('*', { count: 'exact', head: true })
        .eq('marketing_consent', true)
        .is('unsubscribed_at', null),
      supabase
        .from('growth_leads')
        .select('source')
        .gte('created_at', dayStart)
        .lt('created_at', dayEnd),
    ]);

    const leadsCaptured = todaysLeads?.length ?? 0;
    const bySource: Record<string, number> = {};
    for (const lead of todaysLeads ?? []) {
      const source = (lead as { source: string }).source || 'unknown';
      bySource[source] = (bySource[source] || 0) + 1;
    }

    // ---- Companies ---------------------------------------------------
    // One read of the columns we need, then tally in memory. At Task Iguana's
    // current scale this is far cheaper than eight separate count queries,
    // and it keeps the derived rates internally consistent (all computed
    // from the same read rather than from eight racing ones).
    // Test accounts are excluded, not counted. This snapshot is the growth
    // agent planner's entire view of the funnel — counting hand-made accounts
    // told it there were paying customers to optimise for, and it planned a
    // week of work accordingly. A planner reasoning over invented numbers is
    // worse than one reasoning over honest zeroes.
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, plan, subscription_status, onboarding_completed, trial_starts_at, created_at')
      .eq('is_test', false);

    if (companiesError) {
      console.error('[Growth Metrics] Companies read failed:', companiesError.message);
      return NextResponse.json({ error: 'Could not read companies' }, { status: 500 });
    }

    const rows = companies ?? [];
    const isToday = (value: string | null) =>
      Boolean(value && value >= dayStart && value < dayEnd);

    const signups = rows.filter((c) => isToday(c.created_at)).length;
    const trialsStarted = rows.filter((c) => isToday(c.trial_starts_at)).length;
    const trialsActive = rows.filter((c) => c.subscription_status === 'trialing').length;
    const paidActive = rows.filter((c) => c.subscription_status === 'active').length;
    const pastDue = rows.filter((c) => c.subscription_status === 'past_due').length;
    const canceled = rows.filter((c) => c.subscription_status === 'canceled').length;
    const expired = rows.filter((c) => c.subscription_status === 'expired').length;
    const onboardingCompleted = rows.filter((c) => c.onboarding_completed === true).length;

    const byPlan: Record<string, number> = {};
    for (const company of rows) {
      if (company.subscription_status !== 'active') continue;
      const plan = company.plan || 'unknown';
      byPlan[plan] = (byPlan[plan] || 0) + 1;
    }

    // ---- Close the loop: leads that became signups -------------------
    // Bounded by recent signup volume rather than by list size, so this stays
    // cheap as growth_leads grows.
    const conversions = await linkConvertedLeads(supabase, rows, now);

    // ---- Upsert today's row ------------------------------------------
    const snapshot = {
      metric_date: metricDate,
      leads_captured: leadsCaptured,
      leads_total: leadsTotal ?? 0,
      leads_consented: leadsConsented ?? 0,
      signups,
      trials_active: trialsActive,
      trials_started: trialsStarted,
      onboarding_completed: onboardingCompleted,
      paid_active: paidActive,
      past_due: pastDue,
      canceled: canceled,
      expired,
      lead_to_signup_rate: rate(signups, leadsCaptured),
      trial_to_paid_rate: rate(paidActive, paidActive + expired),
      by_source: bySource,
      by_plan: byPlan,
      computed_at: now.toISOString(),
    };

    const { error: upsertError } = await supabase
      .from('growth_metrics_daily')
      .upsert(snapshot, { onConflict: 'metric_date' });

    if (upsertError) {
      console.error('[Growth Metrics] Upsert failed:', upsertError.message);
      return NextResponse.json({ error: 'Could not save snapshot' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Growth metrics snapshot complete',
      snapshot,
      leads_linked: conversions,
    });
  } catch (error) {
    console.error('[Growth Metrics] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * Mark leads as converted when their email later shows up as a company.
 *
 * This is the only join between the marketing list and the product, and it's
 * what lets the Phase 1 planner answer "which source produces customers?"
 * rather than just "which source produces email addresses" — a distinction
 * that decides where the agent spends its effort.
 *
 * Scoped to companies created in the last 30 days: older ones have either been
 * linked by a previous run or were never in growth_leads to begin with.
 */
async function linkConvertedLeads(
  supabase: SupabaseClient,
  companies: Array<{ id: string; created_at: string | null }>,
  now: Date
): Promise<number> {
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const recentIds = companies
    .filter((c) => c.created_at && c.created_at >= cutoff)
    .map((c) => c.id);

  if (recentIds.length === 0) return 0;

  // Redundant today — recentIds comes from an already-filtered list — but this
  // marks leads as 'converted', so a test account slipping through would
  // permanently overstate lead conversion. Cheap to make the invariant local
  // rather than dependent on what the caller happened to pass.
  const { data: recent, error } = await supabase
    .from('companies')
    .select('id, email, created_at')
    .eq('is_test', false)
    .in('id', recentIds);

  if (error || !recent?.length) {
    if (error) console.error('[Growth Metrics] Recent companies read failed:', error.message);
    return 0;
  }

  const byEmail = new Map<string, { id: string; created_at: string | null }>();
  for (const company of recent) {
    if (!company.email) continue;
    byEmail.set(String(company.email).trim().toLowerCase(), company);
  }
  if (byEmail.size === 0) return 0;

  const { data: matches, error: matchError } = await supabase
    .from('growth_leads')
    .select('id, email')
    .in('email', [...byEmail.keys()])
    .neq('status', 'converted');

  if (matchError || !matches?.length) {
    if (matchError) console.error('[Growth Metrics] Lead match failed:', matchError.message);
    return 0;
  }

  let linked = 0;
  for (const lead of matches) {
    const company = byEmail.get(lead.email);
    if (!company) continue;

    const { error: updateError } = await supabase
      .from('growth_leads')
      .update({
        status: 'converted',
        converted_company_id: company.id,
        converted_at: company.created_at || now.toISOString(),
      })
      .eq('id', lead.id);

    if (updateError) {
      console.error('[Growth Metrics] Lead link failed:', updateError.message);
      continue;
    }
    linked += 1;
  }

  return linked;
}
