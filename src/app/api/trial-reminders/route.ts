import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTrialReminderEmail, sendTrialExpiredEmail, sendTrialWelcomeEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Lazy-initialize to avoid build-time errors when env vars aren't set
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables not configured');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Trial lifecycle milestones, ordered from earliest (most days left) to
// latest (post-expiry). Each has a resilient window and a dedicated
// idempotency column so a milestone fires once and only once — even if
// the cron skipped the exact threshold day (e.g. Supabase Prod paused).
//
// A long gap can skip several windows at once. We only send the email
// for the milestone matching the CURRENT state and SUPPRESS (mark sent,
// no email) any earlier unsent milestones — a stale "7 days left" notice
// when the trial already expired would confuse customers.
type MilestoneKey =
  | 'reminder_7'
  | 'reminder_3'
  | 'reminder_1'
  | 'expired'
  | 'winback';

const MILESTONES: {
  key: MilestoneKey;
  column: string;
  // Whether `daysLeft` falls in this milestone's current window.
  inWindow: (daysLeft: number) => boolean;
}[] = [
  { key: 'reminder_7', column: 'trial_reminder_7_sent_at', inWindow: (d) => d >= 4 && d <= 7 },
  { key: 'reminder_3', column: 'trial_reminder_3_sent_at', inWindow: (d) => d >= 2 && d <= 3 },
  { key: 'reminder_1', column: 'trial_reminder_1_sent_at', inWindow: (d) => d === 1 },
  { key: 'expired', column: 'trial_expired_sent_at', inWindow: (d) => d <= 0 && d >= -2 },
  { key: 'winback', column: 'trial_winback_sent_at', inWindow: (d) => d <= -3 },
];

// This endpoint should be called by a cron job (e.g., Netlify Scheduled Function)
// Schedule: once per day
// Security: protected by CRON_SECRET header
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    welcome: [] as string[],
    reminders: [] as string[],
    expired: [] as string[],
    suppressed: [] as string[],
    errors: [] as string[],
  };

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Get all companies on trial (no stripe_customer_id = not yet paid)
    // Skip beta testers - they don't get trial reminder emails
    const { data: companies, error } = await supabaseAdmin
      .from('companies')
      .select('id, name, email, trial_starts_at, trial_ends_at, welcome_email_sent_at, is_beta_tester, trial_reminder_7_sent_at, trial_reminder_3_sent_at, trial_reminder_1_sent_at, trial_expired_sent_at, trial_winback_sent_at')
      .is('stripe_customer_id', null)
      .not('trial_ends_at', 'is', null)
      .or('is_beta_tester.is.null,is_beta_tester.eq.false');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!companies || companies.length === 0) {
      return NextResponse.json({ message: 'No trial companies to process', results });
    }

    const now = new Date();

    for (const company of companies) {
      const trialEnd = new Date(company.trial_ends_at);
      const trialStart = new Date(company.trial_starts_at);
      const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const daysSinceStart = Math.ceil(
        (now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Get company owner for sending emails
      const { data: owner } = await supabaseAdmin
        .from('users')
        .select('full_name, email')
        .eq('company_id', company.id)
        .eq('role', 'owner')
        .single();

      if (!owner) continue;

      const emailTo = owner.email;
      const name = owner.full_name?.split(' ')[0] || 'there';

      // Accumulate column updates so each company is written once.
      const updates: Record<string, string> = {};
      const nowIso = now.toISOString();

      try {
        // Welcome email — independent of the countdown milestones.
        // Resilient: ">= 1 day since start" + idempotency guard, so a
        // missed day-1 run still sends it on the next run (once).
        if (daysSinceStart >= 1 && !company.welcome_email_sent_at) {
          await sendTrialWelcomeEmail({ to: emailTo, name });
          updates.welcome_email_sent_at = nowIso;
          results.welcome.push(emailTo);
        }

        // Find the milestone matching the CURRENT trial state.
        const currentIdx = MILESTONES.findIndex((m) => m.inWindow(daysLeft));

        if (currentIdx !== -1) {
          // Suppress any earlier, now-stale milestones that were never
          // sent (e.g. skipped during a pause) — mark them sent without
          // emailing so they never fire late.
          for (let i = 0; i < currentIdx; i++) {
            const m = MILESTONES[i];
            const sentAt = (company as Record<string, unknown>)[m.column];
            if (!sentAt) {
              updates[m.column] = nowIso;
              results.suppressed.push(`${emailTo}:${m.key}`);
            }
          }

          // Send the current milestone's email if it hasn't been sent.
          const current = MILESTONES[currentIdx];
          const currentSentAt = (company as Record<string, unknown>)[current.column];
          if (!currentSentAt) {
            switch (current.key) {
              case 'reminder_7':
                await sendTrialReminderEmail({ to: emailTo, name, daysLeft: 7 });
                results.reminders.push(emailTo);
                break;
              case 'reminder_3':
                await sendTrialReminderEmail({ to: emailTo, name, daysLeft: 3 });
                results.reminders.push(emailTo);
                break;
              case 'reminder_1':
                await sendTrialReminderEmail({ to: emailTo, name, daysLeft: 1 });
                results.reminders.push(emailTo);
                break;
              case 'expired':
                await sendTrialExpiredEmail({ to: emailTo, name });
                results.expired.push(emailTo);
                break;
              case 'winback':
                await sendTrialExpiredEmail({ to: emailTo, name });
                results.expired.push(emailTo);
                break;
            }
            updates[current.column] = nowIso;
          }
        }

        if (Object.keys(updates).length > 0) {
          await supabaseAdmin.from('companies').update(updates).eq('id', company.id);
        }
      } catch (emailError) {
        const msg = emailError instanceof Error ? emailError.message : 'Unknown error';
        results.errors.push(`${emailTo}: ${msg}`);
      }
    }

    return NextResponse.json({
      message: 'Trial reminders processed',
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
