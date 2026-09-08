import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authorizeCronRequest } from '@/lib/cron-auth'
import { sendSMS, SMS_TEMPLATES } from '@/lib/twilio'
import { sendReviewRequestEmail } from '@/lib/email'
import { scheduleReviewRequest, BASE_URL } from '@/lib/after-payment'

export const dynamic = 'force-dynamic'

type SB = ReturnType<typeof createClient<any, any, any>>

function getSupabase(): SB | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

/**
 * Review-request dispatcher. Runs every 15 minutes
 * (netlify/functions/review-requests-cron.ts) and does two things:
 *
 *  1. Queues a request for every job completed in the last 48h that has none
 *     yet, due `companies.review_delay_hours` (default 2) after completion.
 *     Payment-triggered requests are queued directly by the payment pipeline
 *     (@/lib/after-payment), so a paid invoice and its completed job share one
 *     row — scheduleReviewRequest dedupes by job, invoice and customer-week.
 *
 *  2. Sends every pending request whose scheduled_for has passed: SMS when the
 *     customer consented, otherwise email, otherwise 'skipped'. The link is a
 *     tracked /r/<token> redirect so clicks show up on the Reviews page.
 *
 * Secured with CRON_SECRET when set (same convention as the other cron routes).
 */
export async function GET(request: Request) {
  if (process.env.CRON_SECRET) {
    const auth = authorizeCronRequest(request)
    if (!auth.ok) {
      console.error('[reviews/dispatch] unauthorized:', auth.reason)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = getSupabase()
  if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

  const queued = await queueCompletedJobs(supabase)
  const sent = await sendDueRequests(supabase)

  return NextResponse.json({ success: true, queued, ...sent })
}

// ── 1. Completed jobs → pending requests ────────────────────────────────────
async function queueCompletedJobs(supabase: SB): Promise<number> {
  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, company_id, customer_id, updated_at')
    .eq('status', 'completed')
    .is('followup_sent_at', null)
    .gte('updated_at', since)
    .limit(300)
  if (error) {
    console.error('[reviews/dispatch] job query failed:', error.message)
    return 0
  }
  if (!jobs || jobs.length === 0) return 0

  // Skip jobs that already have a request in any status (Jenny, the daily
  // follow-up cron, the payment pipeline, or a previous run of this one).
  const { data: existing } = await supabase
    .from('review_requests')
    .select('job_id')
    .in('job_id', jobs.map((j) => j.id))
  const requested = new Set((existing || []).map((r) => r.job_id))

  let queued = 0
  for (const job of jobs) {
    if (requested.has(job.id) || !job.company_id || !job.customer_id) continue
    const r = await scheduleReviewRequest(supabase, {
      companyId: job.company_id,
      customerId: job.customer_id,
      jobId: job.id,
      trigger: 'job_completed',
      baseTime: job.updated_at,
    })
    if (r.scheduled) {
      queued++
    } else if (r.reason === 'disabled' || r.reason === 'no_channel' || r.reason === 'already_requested') {
      // Leave a skipped marker so this job is not re-evaluated every 15 min.
      // 'already_requested' here means the customer got one this week from
      // another job/invoice; the marker keeps the daily cron from texting too.
      const { error: skipErr } = await supabase.from('review_requests').insert({
        company_id: job.company_id,
        job_id: job.id,
        customer_id: job.customer_id,
        customer_name: 'Customer',
        status: 'skipped',
        channel: 'sms',
        trigger: 'job_completed',
        error: r.reason,
      })
      if (skipErr) console.warn('[reviews/dispatch] could not write skip marker:', skipErr.message)
    }
  }
  return queued
}

// ── 2. Pending + due → send ─────────────────────────────────────────────────
interface PendingRequest {
  id: string
  company_id: string
  job_id: string | null
  customer_id: string | null
  customer_name: string | null
  tracking_token: string | null
}

async function sendDueRequests(supabase: SB): Promise<{ sent: number; skipped: number; failed: number }> {
  const now = new Date().toISOString()
  const { data: due, error } = await supabase
    .from('review_requests')
    .select('id, company_id, job_id, customer_id, customer_name, tracking_token')
    .eq('status', 'pending')
    .not('scheduled_for', 'is', null)
    .lte('scheduled_for', now)
    .order('scheduled_for', { ascending: true })
    .limit(200)
  if (error) {
    console.error('[reviews/dispatch] due query failed:', error.message)
    return { sent: 0, skipped: 0, failed: 0 }
  }

  const counts = { sent: 0, skipped: 0, failed: 0 }
  const companyCache = new Map<string, CompanyInfo | null>()

  for (const req of (due || []) as PendingRequest[]) {
    const outcome = await sendOne(supabase, req, companyCache)
    counts[outcome]++
  }
  return counts
}

interface CompanyInfo {
  id: string
  name: string
  google: string
  yelp: string
  enabled: boolean
}

async function loadCompany(supabase: SB, companyId: string, cache: Map<string, CompanyInfo | null>): Promise<CompanyInfo | null> {
  if (cache.has(companyId)) return cache.get(companyId) || null

  const [{ data: company }, { data: settings }, { data: config }] = await Promise.all([
    supabase.from('companies').select('id, name, google_review_link, yelp_review_link').eq('id', companyId).single(),
    supabase.from('jenny_pro_settings').select('review_followup_enabled').eq('company_id', companyId).maybeSingle(),
    supabase.from('jenny_action_configs').select('config').eq('company_id', companyId).eq('action_type', 'review_request').maybeSingle(),
  ])

  if (!company) {
    cache.set(companyId, null)
    return null
  }
  const cfg = (config?.config || {}) as { google_review_link?: string; yelp_review_link?: string }
  const info: CompanyInfo = {
    id: company.id,
    name: company.name || 'Our team',
    google: cfg.google_review_link || company.google_review_link || '',
    yelp: cfg.yelp_review_link || company.yelp_review_link || '',
    enabled: !(settings && settings.review_followup_enabled === false),
  }
  cache.set(companyId, info)
  return info
}

/** Alternate Google/Yelp when both are configured, like Jenny does. */
async function pickPlatform(supabase: SB, company: CompanyInfo): Promise<{ link: string; platform: 'google' | 'yelp' | 'none' }> {
  if (company.google && company.yelp) {
    const { data: last } = await supabase
      .from('review_requests')
      .select('review_platform')
      .eq('company_id', company.id)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(1)
    const lastPlatform = last?.[0]?.review_platform
    return lastPlatform === 'google' ? { link: company.yelp, platform: 'yelp' } : { link: company.google, platform: 'google' }
  }
  if (company.google) return { link: company.google, platform: 'google' }
  if (company.yelp) return { link: company.yelp, platform: 'yelp' }
  return { link: '', platform: 'none' }
}

async function finish(supabase: SB, id: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from('review_requests').update(patch).eq('id', id)
  if (error) console.error('[reviews/dispatch] failed to update request', id, error.message)
}

async function sendOne(supabase: SB, req: PendingRequest, cache: Map<string, CompanyInfo | null>): Promise<'sent' | 'skipped' | 'failed'> {
  const company = await loadCompany(supabase, req.company_id, cache)
  if (!company) {
    await finish(supabase, req.id, { status: 'skipped', error: 'no_company' })
    return 'skipped'
  }
  if (!company.enabled) {
    await finish(supabase, req.id, { status: 'skipped', error: 'disabled' })
    return 'skipped'
  }

  // Re-read the customer at send time: consent or contact details may have
  // changed in the 1–2h since the request was queued.
  const { data: customer } = req.customer_id
    ? await supabase.from('customers').select('name, phone, email, sms_consent').eq('id', req.customer_id).single()
    : { data: null }

  const name = customer?.name || req.customer_name || 'there'
  const canSms = !!(customer?.phone && customer.sms_consent)
  const canEmail = !!customer?.email
  if (!canSms && !canEmail) {
    await finish(supabase, req.id, { status: 'skipped', error: 'no_channel' })
    return 'skipped'
  }

  const { link, platform } = await pickPlatform(supabase, company)
  const platformLabel = platform === 'google' ? 'Google' : platform === 'yelp' ? 'Yelp' : ''
  const trackingUrl = link && req.tracking_token ? `${BASE_URL}/r/${req.tracking_token}` : link || ''
  const bookingLink = `${BASE_URL}/book/${company.id}`

  let ok = false
  let channel: 'sms' | 'email' = canSms ? 'sms' : 'email'
  let errMsg: string | null = null

  if (canSms) {
    const r = await sendSMS({
      to: customer!.phone as string,
      body: SMS_TEMPLATES.reviewRequest({ customerName: name, companyName: company.name, reviewLink: trackingUrl || undefined, platformLabel: platformLabel || undefined }),
    })
    ok = r.success
    errMsg = r.error || null
  }
  if (!ok && canEmail) {
    channel = 'email'
    try {
      await sendReviewRequestEmail({
        to: customer!.email as string,
        customerName: name,
        companyName: company.name,
        reviewLink: trackingUrl || null,
        platformLabel: platformLabel || null,
        bookingLink,
      })
      ok = true
      errMsg = null
    } catch (err) {
      errMsg = err instanceof Error ? err.message : 'email failed'
    }
  }

  if (!ok) {
    await finish(supabase, req.id, { status: 'failed', channel, error: errMsg || 'send failed' })
    return 'failed'
  }

  await finish(supabase, req.id, {
    status: 'sent',
    channel,
    sent_at: new Date().toISOString(),
    review_link: link || null,
    review_platform: platform === 'none' ? 'google' : platform,
    customer_phone: customer?.phone || null,
    customer_email: customer?.email || null,
    customer_name: name,
    error: null,
  })

  // Stop the daily follow-up cron from texting this job again.
  if (req.job_id) {
    const { error } = await supabase.from('jobs').update({ followup_sent_at: new Date().toISOString() }).eq('id', req.job_id)
    if (error) console.warn('[reviews/dispatch] could not stamp followup_sent_at:', error.message)
  }
  return 'sent'
}
