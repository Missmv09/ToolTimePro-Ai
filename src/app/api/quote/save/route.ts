import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { canSendQuoteDirectly } from '@/lib/quote-approval'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { quoteData, items } = body

    if (!quoteData || !quoteData.company_id) {
      return NextResponse.json(
        { error: 'Missing required quote data' },
        { status: 400 }
      )
    }

    // Verify the request is from an authenticated user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verify caller identity
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get caller's profile (role + company + granular permissions)
    const { data: callerProfile } = await adminClient
      .from('users')
      .select('id, role, company_id, admin_permissions')
      .eq('id', user.id)
      .single()

    if (!callerProfile || !callerProfile.company_id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 })
    }

    // Ensure quote belongs to caller's company
    if (quoteData.company_id !== callerProfile.company_id) {
      return NextResponse.json({ error: 'Company mismatch' }, { status: 403 })
    }

    // Server-side approval gate. A quote only reaches the customer once its
    // status is 'sent'; a non-approver (e.g. a worker, or an admin when the
    // owner requires approval) must not be able to push a priced quote out
    // without owner review — not from the dashboard, not from the smart-quote
    // builder, not from a hand-crafted request. If such a caller tries to save
    // a quote as 'sent', hold it at 'pending_approval' instead. This enforces
    // the gate on the server, not just in the UI.
    let heldForApproval = false
    if (quoteData.status === 'sent') {
      const { data: companyRow } = await adminClient
        .from('companies')
        .select('quote_approval_settings')
        .eq('id', callerProfile.company_id)
        .single()

      const canSend = canSendQuoteDirectly({
        role: callerProfile.role,
        userId: callerProfile.id,
        adminPermissions: callerProfile.admin_permissions,
        approvalSettings: companyRow?.quote_approval_settings ?? null,
      })

      if (!canSend) {
        quoteData.status = 'pending_approval'
        delete quoteData.sent_at
        delete quoteData.sent_by
        heldForApproval = true
      }
    }

    // Insert the quote using service role (bypasses RLS)
    const { data: quote, error: quoteError } = await adminClient
      .from('quotes')
      .insert(quoteData)
      .select()
      .single()

    if (quoteError) {
      console.error('Error creating quote:', quoteError)

      // If the error is about columns not existing in schema cache,
      // retry without those fields
      if (quoteError.message?.includes('created_by') || quoteError.message?.includes('sent_by') || quoteError.message?.includes('terms') || quoteError.message?.includes('frequency') || quoteError.code === '42703') {
        const retryData = { ...quoteData }
        delete retryData.created_by
        delete retryData.terms
        delete retryData.sent_by
        delete retryData.frequency
        delete retryData.deposit_amount
        delete retryData.deposit_required
        delete retryData.deposit_percentage
        delete retryData.deposit_paid
        delete retryData.deposit_paid_at
        delete retryData.deposit_stripe_payment_id

        const { data: retryQuote, error: retryError } = await adminClient
          .from('quotes')
          .insert(retryData)
          .select()
          .single()

        if (retryError) {
          return NextResponse.json(
            { error: `Failed to create quote: ${retryError.message}` },
            { status: 500 }
          )
        }

        // Insert items for retry quote
        if (items && items.length > 0) {
          const quoteItems = items.map((item: { description: string; quantity: number; unit_price: number; total_price: number; sort_order: number }) => ({
            ...item,
            quote_id: retryQuote.id,
          }))

          const { error: itemsError } = await adminClient
            .from('quote_items')
            .insert(quoteItems)

          if (itemsError) {
            console.error('Error creating quote items:', itemsError)
            return NextResponse.json({
              quote: retryQuote,
              itemsError: itemsError.message,
            })
          }
        }

        return NextResponse.json({ quote: retryQuote, success: true, pendingApproval: heldForApproval })
      }

      return NextResponse.json(
        { error: `Failed to create quote: ${quoteError.message}` },
        { status: 500 }
      )
    }

    // Insert quote items using service role (bypasses RLS)
    if (items && items.length > 0) {
      const quoteItems = items.map((item: { description: string; quantity: number; unit_price: number; total_price: number; sort_order: number }) => ({
        ...item,
        quote_id: quote.id,
      }))

      const { error: itemsError } = await adminClient
        .from('quote_items')
        .insert(quoteItems)

      if (itemsError) {
        console.error('Error creating quote items:', itemsError)
        return NextResponse.json({
          quote,
          itemsError: itemsError.message,
        })
      }
    }

    return NextResponse.json({ quote, success: true, pendingApproval: heldForApproval })
  } catch (error) {
    console.error('Error saving quote:', error)
    return NextResponse.json(
      { error: 'Failed to save quote' },
      { status: 500 }
    )
  }
}
