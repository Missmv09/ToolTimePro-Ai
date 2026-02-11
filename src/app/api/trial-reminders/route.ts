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

// This endpoint should be called by a cron job (e.g., Vercel Cron, Supabase Edge Function)
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
    errors: [] as string[],
  };

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Get all companies on trial (no stripe_customer_id = not yet paid)
    const { data: companies, error } = await supabaseAdmin
      .from('companies')
      .select('id, name, email, trial_starts_at, trial_ends_at, welcome_email_sent_at')
      .is('stripe_customer_id', null)
      .not('trial_ends_at', 'is', null);

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
      const daysSinceStart = Math.ceil((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));

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

      try {
        // Day 1: Welcome email (sent once, 1 day after signup)
        // Skip if the user already received the immediate welcome email at password-set time
        if (daysSinceStart === 1 && !company.welcome_email_sent_at) {
          await sendTrialWelcomeEmail({ to: emailTo, name });
          results.welcome.push(emailTo);
        }
        // Day 7: Mid-trial reminder
        else if (daysLeft === 7) {
          await sendTrialReminderEmail({ to: emailTo, name, daysLeft: 7 });
          results.reminders.push(emailTo);
        }
        // Day 11 (3 days left): Urgent reminder
        else if (daysLeft === 3) {
          await sendTrialReminderEmail({ to: emailTo, name, daysLeft: 3 });
          results.reminders.push(emailTo);
        }
        // Day 13 (1 day left): Final warning
        else if (daysLeft === 1) {
          await sendTrialReminderEmail({ to: emailTo, name, daysLeft: 1 });
          results.reminders.push(emailTo);
        }
        // Day 14: Trial expired
        else if (daysLeft === 0) {
          await sendTrialExpiredEmail({ to: emailTo, name });
          results.expired.push(emailTo);
        }
        // Day 17: "We miss you" follow-up (3 days after expiry)
        else if (daysLeft === -3) {
          await sendTrialExpiredEmail({ to: emailTo, name });
          results.expired.push(emailTo);
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
