import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateRequest } from '@/lib/server-auth'
import {
  OPEN_QUOTE_STATUSES,
  resolveQuoteReminderConfig,
  sendQuoteReminder,
  siteBaseUrl,
} from '@/lib/quote-reminder'

export const dynamic = 'force-dynamic'

/**
 * POST /api/quote/remind — the "Send Reminder" button on the Quotes page.
 *
 * Sends the customer a check-in by text (opted-in only) and/or email with the
 * quote link, then stamps the quote so the Needs Follow-up flag clears and
 * the automatic quote_follow_up action counts this toward its cap.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const quoteId = typeof body?.quoteId === 'string' ? body.quoteId : null
    if (!quoteId) {
      return NextResponse.json({ error: 'quoteId is required' }, { status: 400 })
    }

    const auth = await authenticateRequest(request, body?.token)
    if (auth.error) return auth.error
    if (!auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: caller } = await admin
      .from('users')
      .select('id, company_id')
      .eq('id', auth.user.id)
      .single()
    if (!caller?.company_id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 })
    }

    const { data: quote } = await admin
      .from('quotes')
      .select(
        'id, quote_number, status, total, valid_until, sent_at, created_at, reminder_count, last_reminder_at, company_id, customer:customers(id, name, phone, email, sms_consent)'
      )
      .eq('id', quoteId)
      .single()
    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }
    if (quote.company_id !== caller.company_id) {
      return NextResponse.json({ error: 'Company mismatch' }, { status: 403 })
    }
    if (!(OPEN_QUOTE_STATUSES as readonly string[]).includes(quote.status)) {
      return NextResponse.json(
        { error: 'Only quotes that are sent or viewed and still unanswered can be reminded' },
        { status: 400 }
      )
    }

    const { data: company } = await admin
      .from('companies')
      .select('id, name, phone, timezone')
      .eq('id', caller.company_id)
      .single()
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Use the owner's saved reminder settings (message wording, channel,
    // spacing) even when the action itself is switched off.
    const { data: configRow } = await admin
      .from('jenny_action_configs')
      .select('config')
      .eq('company_id', caller.company_id)
      .eq('action_type', 'quote_follow_up')
      .maybeSingle()
    const config = resolveQuoteReminderConfig((configRow?.config as Record<string, unknown>) || null)

    const origin = request.headers.get('origin')
    const baseUrl = origin && /^https?:\/\//.test(origin) ? origin : siteBaseUrl()

    const result = await sendQuoteReminder({
      supabase: admin,
      quote,
      company,
      config,
      source: 'manual',
      baseUrl,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Reminder could not be sent', result }, { status: 400 })
    }
    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Error sending quote reminder:', error)
    return NextResponse.json({ error: 'Failed to send reminder' }, { status: 500 })
  }
}
