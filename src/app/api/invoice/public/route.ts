import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Public read endpoint for the customer-facing invoice page (/invoice/[id]).
// The invoices table is protected by company-scoped RLS, so a logged-out
// customer using the anon client cannot read their own invoice. Mirroring the
// public quote route, this reads with the service role (bypassing RLS) but is
// deliberately narrow: UUID-only lookups (no enumeration) and drafts are never
// exposed.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
    }

    // Only allow UUID lookups to prevent enumeration attacks on invoice_number
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        company:companies(*),
        customer:customers(*)
      `)
      .eq('id', id)
      .single()

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Never expose unfinished drafts on the public page
    if (invoice.status === 'draft') {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Line items
    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('sort_order', { ascending: true })

    // Structured payment methods for this company
    let paymentMethods: unknown[] = []
    if (invoice.company_id) {
      const { data: pmData } = await supabase
        .from('company_payment_methods')
        .select('method, handle, is_preferred, sort_order')
        .eq('company_id', invoice.company_id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      paymentMethods = pmData || []
    }

    // Mark as viewed if currently sent
    if (invoice.status === 'sent') {
      await supabase
        .from('invoices')
        .update({
          status: 'viewed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id)
      invoice.status = 'viewed'
    }

    return NextResponse.json({ invoice, items: items || [], paymentMethods })
  } catch (err) {
    console.error('Error fetching public invoice:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
