import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendQuoteAcceptedEmail } from '@/lib/email'

// Simple in-memory rate limiter for quote responses (per quote ID)
const responseAttempts = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(quoteId: string): boolean {
  const now = Date.now()
  const entry = responseAttempts.get(quoteId)
  if (!entry || now > entry.resetAt) {
    responseAttempts.set(quoteId, { count: 1, resetAt: now + 15 * 60 * 1000 }) // 15 min window
    return false
  }
  entry.count++
  if (entry.count > 10) return true // Max 10 attempts per 15 min per quote
  return false
}

export async function POST(request: NextRequest) {
  try {
    const { quoteId, action, signature, rejectReason } = await request.json()

    if (!quoteId || !action) {
      return NextResponse.json({ error: 'Quote ID and action are required' }, { status: 400 })
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Action must be "approve" or "reject"' }, { status: 400 })
    }

    // Rate limit per quote ID to prevent abuse
    if (isRateLimited(quoteId)) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
    }

    // Validate quoteId is a valid UUID format to prevent enumeration
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(quoteId)) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch quote with company and customer details for notifications
    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select(`
        id, status, notes, quote_number, total,
        company:companies(id, name, email, phone),
        customer:customers(id, name, email, phone)
      `)
      .eq('id', quoteId)
      .single()

    if (fetchError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    if (!['sent', 'viewed'].includes(quote.status)) {
      return NextResponse.json({ error: 'Quote has already been responded to' }, { status: 400 })
    }

    if (action === 'approve') {
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          ...(signature ? { signature_url: signature } : {}),
        })
        .eq('id', quoteId)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      // Send confirmation email to customer
      const customer = quote.customer as { name?: string; email?: string } | null
      const company = quote.company as { name?: string; phone?: string } | null
      if (customer?.email) {
        try {
          await sendQuoteAcceptedEmail({
            to: customer.email,
            customerName: customer.name || 'Customer',
            quoteNumber: quote.quote_number || quoteId.slice(0, 8),
            total: quote.total || 0,
            companyName: company?.name || 'Our team',
            companyPhone: company?.phone || undefined,
          })
        } catch (emailErr) {
          // Don't fail the approval if email fails
          console.error('Failed to send quote accepted email:', emailErr)
        }
      }
    } else {
      const notes = quote.notes
        ? `${quote.notes}\n\nRejection reason: ${rejectReason || 'No reason provided'}`
        : `Rejection reason: ${rejectReason || 'No reason provided'}`

      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          status: 'rejected',
          notes,
        })
        .eq('id', quoteId)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error responding to quote:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
