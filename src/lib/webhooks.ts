/**
 * Outbound webhook system — fires events to registered webhook URLs.
 * Supports HMAC signature verification for security.
 */
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export type WebhookEvent =
  | 'job.created'
  | 'job.completed'
  | 'job.cancelled'
  | 'invoice.created'
  | 'invoice.sent'
  | 'invoice.paid'
  | 'invoice.overdue'
  | 'quote.created'
  | 'quote.accepted'
  | 'quote.rejected'
  | 'customer.created'
  | 'lead.created'
  | 'lead.converted'
  | 'booking.received'
  | 'review.received'
  | 'worker.clock_in'
  | 'worker.clock_out'

export const WEBHOOK_EVENTS: { value: WebhookEvent; label: string; category: string }[] = [
  { value: 'job.created', label: 'Job Created', category: 'Jobs' },
  { value: 'job.completed', label: 'Job Completed', category: 'Jobs' },
  { value: 'job.cancelled', label: 'Job Cancelled', category: 'Jobs' },
  { value: 'invoice.created', label: 'Invoice Created', category: 'Invoicing' },
  { value: 'invoice.sent', label: 'Invoice Sent', category: 'Invoicing' },
  { value: 'invoice.paid', label: 'Invoice Paid', category: 'Invoicing' },
  { value: 'invoice.overdue', label: 'Invoice Overdue', category: 'Invoicing' },
  { value: 'quote.created', label: 'Quote Created', category: 'Quotes' },
  { value: 'quote.accepted', label: 'Quote Accepted', category: 'Quotes' },
  { value: 'quote.rejected', label: 'Quote Rejected', category: 'Quotes' },
  { value: 'customer.created', label: 'Customer Created', category: 'Customers' },
  { value: 'lead.created', label: 'New Lead', category: 'Leads' },
  { value: 'lead.converted', label: 'Lead Converted', category: 'Leads' },
  { value: 'booking.received', label: 'Booking Received', category: 'Bookings' },
  { value: 'review.received', label: 'Review Received', category: 'Reviews' },
  { value: 'worker.clock_in', label: 'Worker Clocked In', category: 'Workforce' },
  { value: 'worker.clock_out', label: 'Worker Clocked Out', category: 'Workforce' },
]

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

/**
 * Fire a webhook event for a company. Finds all matching webhook subscriptions
 * and sends the payload to each. Logs the result.
 */
export async function fireWebhookEvent(
  companyId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
) {
  if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('placeholder')) return

  const admin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Find active webhooks subscribed to this event
  const { data: webhooks } = await admin
    .from('webhooks')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .contains('events', [event])

  if (!webhooks || webhooks.length === 0) return

  const payload = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data,
  })

  for (const webhook of webhooks) {
    const start = Date.now()
    let responseStatus = 0
    let responseBody = ''
    let success = false

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': event,
      }

      if (webhook.secret) {
        headers['X-Webhook-Signature'] = signPayload(payload, webhook.secret)
      }

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: payload,
        signal: AbortSignal.timeout(10000), // 10s timeout
      })

      responseStatus = response.status
      responseBody = await response.text().catch(() => '')
      success = response.ok
    } catch (err) {
      responseBody = err instanceof Error ? err.message : 'Unknown error'
    }

    const durationMs = Date.now() - start

    // Log the delivery
    await admin.from('webhook_logs').insert({
      webhook_id: webhook.id,
      event_type: event,
      payload: { event, data },
      response_status: responseStatus,
      response_body: responseBody.slice(0, 2000),
      success,
      duration_ms: durationMs,
    })

    // Update webhook metadata
    await admin
      .from('webhooks')
      .update({
        last_triggered_at: new Date().toISOString(),
        failure_count: success ? 0 : (webhook.failure_count || 0) + 1,
      })
      .eq('id', webhook.id)

    // Auto-disable after 10 consecutive failures
    if (!success && (webhook.failure_count || 0) + 1 >= 10) {
      await admin
        .from('webhooks')
        .update({ is_active: false })
        .eq('id', webhook.id)
    }
  }
}
