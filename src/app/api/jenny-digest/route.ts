import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildWeeklyDigest, weeklyPeriod, type DigestLogRow } from '@/lib/jenny-digest';
import { sendJennyWeeklyDigestEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * GET — Cron-triggered: send each company its weekly Jenny digest.
 *
 * Runs Monday morning and covers the seven complete days before today.
 *
 * Only companies with at least one enabled autonomous action are considered:
 * a company that never turned Jenny on has nothing to report, and emailing
 * them an empty digest is worse than staying quiet.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  const { start, end } = weeklyPeriod(new Date());

  const results = { considered: 0, sent: 0, skipped_empty: 0, skipped_duplicate: 0, failed: 0 };

  try {
    const { data: configs, error: configError } = await supabase
      .from('jenny_action_configs')
      .select('company_id')
      .eq('enabled', true);

    if (configError) {
      console.error('[jenny-digest] failed to read action configs:', configError.message);
      return NextResponse.json({ error: 'Failed to read configs' }, { status: 500 });
    }

    const companyIds = Array.from(new Set((configs || []).map((c) => c.company_id)));
    if (companyIds.length === 0) {
      return NextResponse.json({ message: 'No companies with Jenny enabled', period: { start, end }, results });
    }

    // Companies already sent this period — a redeploy or manual re-run must
    // not double-send. Checked up front so one query covers every company.
    const { data: alreadySent } = await supabase
      .from('jenny_digest_sends')
      .select('company_id')
      .eq('period_start', start);

    const sentCompanyIds = new Set((alreadySent || []).map((r) => r.company_id));

    for (const companyId of companyIds) {
      results.considered++;

      if (sentCompanyIds.has(companyId)) {
        results.skipped_duplicate++;
        continue;
      }

      try {
        // `end` is an inclusive date, so the upper bound is the following
        // midnight — otherwise everything logged during the last day is lost.
        const { data: logs, error: logError } = await supabase
          .from('jenny_action_log')
          .select('action_type, title, status, created_at, target_name')
          .eq('company_id', companyId)
          .gte('created_at', `${start}T00:00:00Z`)
          .lt('created_at', `${nextDay(end)}T00:00:00Z`)
          .order('created_at', { ascending: false });

        if (logError) {
          console.error(`[jenny-digest] failed to read log for ${companyId}: ${logError.message}`);
          results.failed++;
          continue;
        }

        const digest = buildWeeklyDigest((logs || []) as DigestLogRow[], start, end);

        if (digest.isEmpty) {
          results.skipped_empty++;
          continue;
        }

        const { data: owner } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('company_id', companyId)
          .eq('role', 'owner')
          .single();

        if (!owner?.email) {
          results.skipped_empty++;
          continue;
        }

        await sendJennyWeeklyDigestEmail({
          to: owner.email,
          name: owner.full_name?.split(' ')[0] || 'there',
          digest,
        });

        // Record only after a successful send, so a send failure retries on
        // the next run instead of being marked done.
        const { error: recordError } = await supabase.from('jenny_digest_sends').insert({
          company_id: companyId,
          period_start: start,
          period_end: end,
          total_completed: digest.totalCompleted,
          total_awaiting: digest.totalAwaiting,
          sent_to: owner.email,
        });

        if (recordError) {
          console.error(`[jenny-digest] sent to ${companyId} but failed to record: ${recordError.message}`);
        }

        results.sent++;
      } catch (err) {
        // One company's failure must not stop the rest of the run.
        console.error(`[jenny-digest] error for company ${companyId}:`, err);
        results.failed++;
      }
    }

    return NextResponse.json({ success: true, period: { start, end }, results });
  } catch (error) {
    console.error('[jenny-digest] run failed:', error);
    return NextResponse.json({ error: 'Digest run failed' }, { status: 500 });
  }
}

/** The ISO date one day after `isoDate`, used as an exclusive upper bound. */
function nextDay(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
