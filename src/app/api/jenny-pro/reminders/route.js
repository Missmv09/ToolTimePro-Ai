import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS, SMS_TEMPLATES } from '@/lib/twilio';

export const dynamic = 'force-dynamic';

let supabaseInstance = null;
function getSupabase() {
  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase not configured');
    supabaseInstance = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return supabaseInstance;
}

function fmtDate(dateStr) {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  } catch { return dateStr; }
}
function fmtTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = String(timeStr).split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${m || '00'} ${ampm}`;
}

/**
 * Cron-triggered automation (called by netlify/functions/appointment-reminders-cron):
 *  1. Appointment reminders — texts customers the day before their job.
 *  2. Post-job follow-up — thanks the customer and asks for a review after a job
 *     is marked completed.
 *
 * Only sends to customers who consented to SMS, and exactly once per job
 * (tracked via reminder_sent_at / followup_sent_at). Each is gated by a
 * per-company toggle in jenny_pro_settings.
 *
 * Secured with CRON_SECRET when set.
 */
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization') || '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = getSupabase();

  // Per-company toggles.
  const settingsMap = new Map();
  try {
    const { data: settings } = await supabase
      .from('jenny_pro_settings')
      .select('company_id, reminders_enabled, review_followup_enabled');
    (settings || []).forEach((s) => settingsMap.set(s.company_id, s));
  } catch {
    // columns may not exist yet — default everything enabled
  }

  let remindersSent = 0;
  let followupsSent = 0;

  // ── 1. Appointment reminders (jobs scheduled for tomorrow) ───────────────
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const { data: upcoming } = await supabase
    .from('jobs')
    .select('id, title, scheduled_date, scheduled_time_start, company_id, customer:customers(name, phone, sms_consent), company:companies(name)')
    .eq('scheduled_date', tomorrowStr)
    .eq('status', 'scheduled')
    .is('reminder_sent_at', null)
    .limit(500);

  for (const job of upcoming || []) {
    const s = settingsMap.get(job.company_id);
    if (s && s.reminders_enabled === false) continue;
    const cust = job.customer;
    if (!cust?.phone || !cust?.sms_consent) continue;

    const r = await sendSMS({
      to: cust.phone,
      body: SMS_TEMPLATES.bookingReminder({
        customerName: cust.name || 'there',
        serviceName: job.title || 'appointment',
        date: fmtDate(job.scheduled_date),
        time: fmtTime(job.scheduled_time_start),
        companyName: job.company?.name || 'us',
      }),
    });
    if (r.success) {
      await supabase.from('jobs').update({ reminder_sent_at: new Date().toISOString() }).eq('id', job.id);
      remindersSent++;
    }
  }

  // ── 2. Post-job follow-up + review (completed 1h–36h ago) ────────────────
  const windowStart = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
  const windowEnd = new Date(Date.now() - 1 * 3600 * 1000).toISOString();

  const { data: done } = await supabase
    .from('jobs')
    .select('id, title, company_id, customer_id, updated_at, customer:customers(name, phone, sms_consent), company:companies(name, google_review_link, yelp_review_link)')
    .eq('status', 'completed')
    .is('followup_sent_at', null)
    .gte('updated_at', windowStart)
    .lte('updated_at', windowEnd)
    .limit(500);

  for (const job of done || []) {
    const s = settingsMap.get(job.company_id);
    if (s && s.review_followup_enabled === false) continue;
    const cust = job.customer;
    if (!cust?.phone || !cust?.sms_consent) continue;

    const reviewLink = job.company?.google_review_link || job.company?.yelp_review_link || '';
    const r = await sendSMS({
      to: cust.phone,
      body: SMS_TEMPLATES.jobComplete({
        customerName: cust.name || 'there',
        companyName: job.company?.name || 'us',
        reviewLink: reviewLink || undefined,
      }),
    });
    if (r.success) {
      await supabase.from('jobs').update({ followup_sent_at: new Date().toISOString() }).eq('id', job.id);
      try {
        await supabase.from('review_requests').insert({
          company_id: job.company_id,
          job_id: job.id,
          customer_id: job.customer_id,
          customer_name: cust.name,
          customer_phone: cust.phone,
          review_link: reviewLink || null,
          review_platform: job.company?.google_review_link ? 'google' : (job.company?.yelp_review_link ? 'yelp' : 'none'),
          status: 'sent',
          channel: 'sms',
          sent_at: new Date().toISOString(),
        });
      } catch {
        // review_requests logging is best-effort
      }
      followupsSent++;
    }
  }

  return NextResponse.json({ success: true, remindersSent, followupsSent });
}
