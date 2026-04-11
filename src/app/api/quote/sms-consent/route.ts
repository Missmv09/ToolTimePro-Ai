import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { customerId, quoteId, consent } = await request.json()

    if (!customerId || typeof consent !== 'boolean') {
      return NextResponse.json({ error: 'customerId and consent are required' }, { status: 400 })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(customerId)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the customer exists and is linked to the quote (prevents unauthorized consent changes)
    if (quoteId) {
      const { data: quote } = await supabase
        .from('quotes')
        .select('customer_id')
        .eq('id', quoteId)
        .single()

      if (!quote || quote.customer_id !== customerId) {
        return NextResponse.json({ error: 'Customer not found for this quote' }, { status: 404 })
      }
    }

    // Update SMS consent on the customer record
    const updateData: Record<string, unknown> = {
      sms_consent: consent,
      sms_consent_date: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', customerId)

    if (error) {
      // Retry without sms_consent_date if column doesn't exist yet
      if (error.message?.includes('sms_consent_date')) {
        await supabase
          .from('customers')
          .update({ sms_consent: consent })
          .eq('id', customerId)
      } else {
        return NextResponse.json({ error: 'Failed to update consent' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, sms_consent: consent })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
