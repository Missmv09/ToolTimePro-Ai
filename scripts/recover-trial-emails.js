#!/usr/bin/env node
/**
 * Task Iguana — Trial Email Recovery (one-off)
 *
 * Why this exists:
 *   The trial-reminders cron used to fire each email on an EXACT day match
 *   (daysLeft === 7 / 3 / 1 / 0 / -3). While the Supabase Prod project was
 *   paused for inactivity the cron never ran, so any trial that crossed a
 *   threshold during the pause window had that email skipped permanently.
 *
 * What this does:
 *   1. AUDIT (default, read-only): lists trial companies whose milestone
 *      date fell inside the pause window AND whose idempotency column is
 *      still null — i.e. the emails that were missed. The trial-expired
 *      notice is the customer-impactful one and is flagged separately.
 *   2. --trigger: calls the deployed /api/trial-reminders route once so the
 *      now-resilient logic sends the currently-relevant catch-up email
 *      immediately (winback reuses the trial-expired template) and marks
 *      stale countdown reminders as suppressed — instead of waiting up to
 *      24h for the next daily cron run.
 *
 * This script never duplicates the Resend email templates; sending always
 * goes through the deployed route so there is one source of truth.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)  — the PROD project URL
 *   SUPABASE_SERVICE_ROLE_KEY                   — PROD service role key
 * For --trigger also:
 *   SITE_URL     — deployed site base URL (e.g. https://taskiguana.com)
 *   CRON_SECRET  — same value configured in Netlify
 *
 * Usage:
 *   node scripts/recover-trial-emails.js --pause-start=2026-05-01 --pause-end=2026-05-17
 *   node scripts/recover-trial-emails.js --pause-start=2026-05-01 --pause-end=2026-05-17 --trigger
 */

const { createClient } = require('@supabase/supabase-js');

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : undefined;
}

const TRIGGER = process.argv.includes('--trigger');
const pauseStartStr = arg('pause-start');
const pauseEndStr = arg('pause-end');

if (!pauseStartStr || !pauseEndStr) {
  console.error(
    'ERROR: --pause-start=YYYY-MM-DD and --pause-end=YYYY-MM-DD are required.'
  );
  process.exit(1);
}

// Treat the window as inclusive whole days in UTC.
const pauseStart = new Date(`${pauseStartStr}T00:00:00.000Z`);
const pauseEnd = new Date(`${pauseEndStr}T23:59:59.999Z`);

if (isNaN(pauseStart) || isNaN(pauseEnd) || pauseStart > pauseEnd) {
  console.error('ERROR: invalid pause window.');
  process.exit(1);
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'ERROR: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required.'
  );
  process.exit(1);
}

const DAY = 24 * 60 * 60 * 1000;

// Each milestone's calendar date relative to the trial dates, plus the
// idempotency column that proves whether it was already sent.
const MILESTONES = [
  { key: 'welcome', column: 'welcome_email_sent_at', dateOf: (s) => new Date(s.start.getTime() + 1 * DAY) },
  { key: 'reminder_7', column: 'trial_reminder_7_sent_at', dateOf: (s) => new Date(s.end.getTime() - 7 * DAY) },
  { key: 'reminder_3', column: 'trial_reminder_3_sent_at', dateOf: (s) => new Date(s.end.getTime() - 3 * DAY) },
  { key: 'reminder_1', column: 'trial_reminder_1_sent_at', dateOf: (s) => new Date(s.end.getTime() - 1 * DAY) },
  { key: 'expired', column: 'trial_expired_sent_at', dateOf: (s) => s.end },
  { key: 'winback', column: 'trial_winback_sent_at', dateOf: (s) => new Date(s.end.getTime() + 3 * DAY) },
];

const inWindow = (d) => d >= pauseStart && d <= pauseEnd;

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let host = SUPABASE_URL;
  try {
    host = new URL(SUPABASE_URL).host;
  } catch {
    /* keep raw */
  }
  console.log(`Supabase target host: ${host}`);
  console.log(
    `Pause window (UTC, inclusive): ${pauseStart.toISOString()} → ${pauseEnd.toISOString()}\n`
  );

  const { data: companies, error } = await supabase
    .from('companies')
    .select(
      'id, name, email, trial_starts_at, trial_ends_at, welcome_email_sent_at, is_beta_tester, ' +
        'trial_reminder_7_sent_at, trial_reminder_3_sent_at, trial_reminder_1_sent_at, ' +
        'trial_expired_sent_at, trial_winback_sent_at'
    )
    .is('stripe_customer_id', null)
    .not('trial_ends_at', 'is', null)
    .or('is_beta_tester.is.null,is_beta_tester.eq.false');

  if (error) {
    console.error('Query failed:', error.message);
    process.exit(1);
  }

  const missed = [];
  for (const c of companies || []) {
    if (!c.trial_starts_at || !c.trial_ends_at) continue;
    const s = { start: new Date(c.trial_starts_at), end: new Date(c.trial_ends_at) };
    for (const m of MILESTONES) {
      const d = m.dateOf(s);
      if (inWindow(d) && !c[m.column]) {
        missed.push({
          company: c.name || c.id,
          email: c.email,
          milestone: m.key,
          dueDate: d.toISOString().slice(0, 10),
          impactful: m.key === 'expired',
        });
      }
    }
  }

  if (missed.length === 0) {
    console.log('No missed trial emails found in the pause window. Nothing to recover.');
    return;
  }

  missed.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  console.log(`Missed milestones during the pause window (${missed.length}):\n`);
  for (const m of missed) {
    const flag = m.impactful ? '  ⟵ EXPIRY NOTICE (customer-impactful)' : '';
    console.log(
      `  ${m.dueDate}  ${m.milestone.padEnd(11)}  ${m.company} <${m.email}>${flag}`
    );
  }

  const expiredCount = missed.filter((m) => m.impactful).length;
  console.log(
    `\nSummary: ${missed.length} missed total, ${expiredCount} missed EXPIRY notices.`
  );

  if (!TRIGGER) {
    console.log(
      '\nDry run (audit only). Re-run with --trigger to flush catch-up emails now\n' +
        'via the deployed /api/trial-reminders route (requires SITE_URL + CRON_SECRET).'
    );
    return;
  }

  const siteUrl = process.env.SITE_URL;
  const cronSecret = process.env.CRON_SECRET;
  if (!siteUrl || !cronSecret) {
    console.error('\nERROR: --trigger requires SITE_URL and CRON_SECRET env vars.');
    process.exit(1);
  }

  console.log(`\nTriggering ${siteUrl}/api/trial-reminders ...`);
  const res = await fetch(`${siteUrl}/api/trial-reminders`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const body = await res.json().catch(() => ({}));
  console.log(`HTTP ${res.status}`);
  console.log(JSON.stringify(body, null, 2));
  if (!res.ok) process.exit(1);
}

main().catch((e) => {
  console.error('Recovery failed:', e);
  process.exit(1);
});
