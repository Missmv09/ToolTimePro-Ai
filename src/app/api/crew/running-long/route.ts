import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { loadCrewJobs, daysAgo } from '@/lib/crew-data';
import { buildStepTimesReport, formatMinutes } from '@/lib/step-times';
import { findRunningLong, typicalByStepFromReport, type LiveChecklistItem } from '@/lib/crew-insights';

export const dynamic = 'force-dynamic';

/**
 * GET — Cron-triggered every 15 minutes (netlify.toml).
 *
 * For each job in progress with a worker clocked in, finds the checklist step
 * they're on and, if it has run past max(2x typical, typical + 20 min), tells
 * the company's owners and admins once. "Typical" comes from the last 90 days
 * of that company's own checklists, and a step needs 5+ timed samples before
 * it can alert, so a new company gets no noise until it has real history.
 */

function getAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

type JobRow = { id: string; company_id: string; title: string | null };
type ItemRow = {
  id: string;
  job_id: string;
  item_text: string;
  sort_order: number | null;
  is_completed: boolean | null;
  completed_at: string | null;
  overdue_alerted_at: string | null;
};
type TimeRow = { job_id: string; user_id: string | null; clock_in: string | null };

export async function GET(request: NextRequest) {
  const auth = authorizeCronRequest(request);
  if (!auth.ok) {
    console.error(`[running-long] unauthorized: ${auth.reason}`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = getAdmin();
  if (!supabase) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

  const results = { jobs_checked: 0, alerts: 0, notifications: 0, failed: 0 };
  const now = new Date();

  const { data: jobRows, error: jobErr } = await supabase
    .from('jobs')
    .select('id, company_id, title')
    .eq('status', 'in_progress')
    .limit(1000);
  if (jobErr) {
    console.error('[running-long] jobs:', jobErr.message);
    return NextResponse.json({ error: 'Failed to read jobs' }, { status: 500 });
  }
  const jobs = (jobRows || []) as JobRow[];
  if (jobs.length === 0) return NextResponse.json({ results });
  const ids = jobs.map((j) => j.id);

  // Only jobs someone is clocked in on right now.
  const { data: timeRows, error: timeErr } = await supabase
    .from('time_entries')
    .select('job_id, user_id, clock_in')
    .in('job_id', ids)
    .is('clock_out', null);
  if (timeErr) {
    console.error('[running-long] time_entries:', timeErr.message);
    return NextResponse.json({ error: 'Failed to read time entries' }, { status: 500 });
  }
  const openByJob: Record<string, TimeRow[]> = {};
  for (const t of (timeRows || []) as TimeRow[]) (openByJob[t.job_id] ||= []).push(t);
  const activeJobs = jobs.filter((j) => openByJob[j.id]?.length);
  if (activeJobs.length === 0) return NextResponse.json({ results });

  const { data: itemRows, error: itemErr } = await supabase
    .from('job_checklists')
    .select('id, job_id, item_text, sort_order, is_completed, completed_at, overdue_alerted_at')
    .in('job_id', activeJobs.map((j) => j.id));
  if (itemErr) {
    // Most likely the overdue_alerted_at migration hasn't run in this environment.
    console.error('[running-long] job_checklists:', itemErr.message);
    return NextResponse.json({ error: 'Failed to read checklists', detail: itemErr.message }, { status: 500 });
  }
  const itemsByJob: Record<string, ItemRow[]> = {};
  for (const it of (itemRows || []) as ItemRow[]) (itemsByJob[it.job_id] ||= []).push(it);

  const typicalCache: Record<string, ReturnType<typeof typicalByStepFromReport>> = {};
  const recipientCache: Record<string, string[]> = {};

  for (const job of activeJobs) {
    const items = itemsByJob[job.id];
    if (!items?.length) continue;
    results.jobs_checked++;
    try {
      if (!typicalCache[job.company_id]) {
        const history = await loadCrewJobs(supabase, job.company_id, { since: daysAgo(90) });
        typicalCache[job.company_id] = typicalByStepFromReport(buildStepTimesReport(history));
      }
      const open = openByJob[job.id];
      const clockIn = open.map((t) => t.clock_in).filter(Boolean).sort()[0] || null;
      const live: LiveChecklistItem[] = items.map((it) => ({
        id: it.id,
        text: it.item_text,
        sortOrder: it.sort_order ?? 0,
        completed: !!it.is_completed,
        completedAt: it.completed_at,
        overdueAlertedAt: it.overdue_alerted_at,
      }));

      const hit = findRunningLong({ clockIn, items: live }, typicalCache[job.company_id], now);
      if (!hit) continue;

      // Claim the alert first, conditionally, so overlapping runs can't double-notify.
      const { data: claimed, error: claimErr } = await supabase
        .from('job_checklists')
        .update({ overdue_alerted_at: now.toISOString() })
        .eq('id', hit.itemId)
        .is('overdue_alerted_at', null)
        .select('id');
      if (claimErr) throw new Error(`claim: ${claimErr.message}`);
      if (!claimed?.length) continue;
      results.alerts++;

      if (!recipientCache[job.company_id]) {
        const { data: admins, error: adminErr } = await supabase
          .from('users')
          .select('id')
          .eq('company_id', job.company_id)
          .in('role', ['owner', 'admin'])
          .eq('is_active', true);
        if (adminErr) throw new Error(`recipients: ${adminErr.message}`);
        recipientCache[job.company_id] = ((admins || []) as { id: string }[]).map((a) => a.id);
      }
      const recipients = recipientCache[job.company_id];
      if (!recipients.length) continue;

      const workerIds = Array.from(new Set(open.map((t) => t.user_id).filter(Boolean))) as string[];
      let who = 'The crew';
      if (workerIds.length) {
        const { data: ws } = await supabase.from('users').select('full_name').in('id', workerIds);
        const names = ((ws || []) as { full_name: string | null }[]).map((w) => w.full_name).filter(Boolean);
        if (names.length) who = names.join(' & ');
      }

      const message =
        `${who} ${workerIds.length > 1 ? 'have' : 'has'} been on "${hit.step}" for ${formatMinutes(hit.elapsedMinutes)} ` +
        `(typical ${formatMinutes(hit.typicalMinutes)})${job.title ? ` on ${job.title}` : ''}. ` +
        `Might be worth a check-in.`;

      const { error: notifyErr } = await supabase.from('notifications').insert(
        recipients.map((userId) => ({
          company_id: job.company_id,
          user_id: userId,
          type: 'job_running_long',
          title: 'Job step running long',
          message,
          link: `/dashboard/jobs?job=${job.id}`,
        }))
      );
      if (notifyErr) throw new Error(`notify: ${notifyErr.message}`);
      results.notifications += recipients.length;
    } catch (err) {
      results.failed++;
      console.error(`[running-long] job ${job.id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log('[running-long] results:', JSON.stringify(results));
  return NextResponse.json({ results });
}
