import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Quote ID is required' }, { status: 400 })
    }

    // Only allow UUID lookups to prevent enumeration attacks on quote_number
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: quote, error } = await supabase
      .from('quotes')
      .select(`
        *,
        company:companies(*),
        customer:customers(*)
      `)
      .eq('id', id)
      .single()

    if (error || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Only allow viewing sent/viewed/approved/rejected quotes (not drafts)
    if (quote.status === 'draft' || quote.status === 'pending_approval') {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Fetch line items
    const { data: lineItems } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quote.id)
      .order('created_at', { ascending: true })

    // Mark as viewed if currently sent
    if (quote.status === 'sent') {
      await supabase
        .from('quotes')
        .update({
          status: 'viewed',
          viewed_at: new Date().toISOString(),
        })
        .eq('id', quote.id)
    }

    return NextResponse.json({ quote, lineItems: lineItems || [] })
  } catch (err) {
    console.error('Error fetching public quote:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
