import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendQuoteCancellationEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { quoteId, reason } = await request.json()

    if (!quoteId) {
      return NextResponse.json({ error: 'Missing quoteId' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Fetch quote with customer and company details
    const { data: quote, error: quoteError } = await adminClient
      .from('quotes')
      .select('id, quote_number, total, company_id, customer:customers(name)')
      .eq('id', quoteId)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    const customerName = (quote.customer as { name: string } | null)?.name || 'Customer'
    const quoteNumber = quote.quote_number || `Q-${quote.id.slice(0, 8)}`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tooltimepro.com'
    const dashboardLink = `${appUrl}/dashboard/quotes`

    // Fetch owner/admin users for this company
    const { data: owners } = await adminClient
      .from('users')
      .select('phone, full_name, email')
      .eq('company_id', quote.company_id)
      .in('role', ['owner', 'admin'])

    if (!owners || owners.length === 0) {
      return NextResponse.json({ success: true, notified: 0 })
    }

    let notified = 0

    for (const owner of owners) {
      // Send SMS alert
      if (owner.phone) {
        try {
          const smsBody = reason
            ? `Quote ${quoteNumber} for ${customerName} ($${(quote.total || 0).toLocaleString()}) was declined. Reason: ${reason}. Check your dashboard for details.`
            : `Quote ${quoteNumber} for ${customerName} ($${(quote.total || 0).toLocaleString()}) was declined by the customer. Check your dashboard for details.`

          const { sendSMS, formatPhoneNumber } = await import('@/lib/twilio')
          await sendSMS({
            to: formatPhoneNumber(owner.phone),
            body: smsBody,
          })
        } catch (smsErr) {
          console.error('SMS notification failed for owner:', smsErr)
        }
      }

      // Send email alert
      if (owner.email) {
        try {
          await sendQuoteCancellationEmail({
            to: owner.email,
            ownerName: owner.full_name || 'Boss',
            quoteNumber,
            customerName,
            total: quote.total || 0,
            reason: reason || undefined,
            dashboardLink,
          })
        } catch (emailErr) {
          console.error('Email notification failed for owner:', emailErr)
        }
      }

      if (owner.phone || owner.email) notified++
    }

    return NextResponse.json({ success: true, notified })
  } catch (error) {
    console.error('Quote cancellation notification error:', error)
    const message = error instanceof Error ? error.message : 'Failed to send cancellation notification'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
