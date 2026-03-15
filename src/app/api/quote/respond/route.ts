import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { quoteId, action, signature, rejectReason } = await request.json()

    if (!quoteId || !action) {
      return NextResponse.json({ error: 'Quote ID and action are required' }, { status: 400 })
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Action must be "approve" or "reject"' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify quote exists and is in a respondable state
    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('id, status, notes')
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
