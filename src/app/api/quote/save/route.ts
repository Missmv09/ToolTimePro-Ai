import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    // Get caller's profile (role + company)
    const { data: callerProfile } = await adminClient
      .from('users')
      .select('id, role, company_id')
      .eq('id', user.id)
      .single()

    if (!callerProfile || !callerProfile.company_id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 })
    }

    // Ensure quote belongs to caller's company
    if (quoteData.company_id !== callerProfile.company_id) {
      return NextResponse.json({ error: 'Company mismatch' }, { status: 403 })
    }

    // Insert the quote using service role (bypasses RLS)
    const { data: quote, error: quoteError } = await adminClient
      .from('quotes')
      .insert(quoteData)
      .select()
      .single()

    if (quoteError) {
      console.error('Error creating quote:', quoteError)

      // If the error is about created_by/sent_by columns not existing,
      // retry without those fields
      if (quoteError.message?.includes('created_by') || quoteError.message?.includes('sent_by') || quoteError.code === '42703') {
        const retryData = { ...quoteData }
        delete retryData.created_by
        delete retryData.sent_by

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

        return NextResponse.json({ quote: retryQuote, success: true })
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

    return NextResponse.json({ quote, success: true })
  } catch (error) {
    console.error('Error saving quote:', error)
    return NextResponse.json(
      { error: 'Failed to save quote' },
      { status: 500 }
    )
  }
}
