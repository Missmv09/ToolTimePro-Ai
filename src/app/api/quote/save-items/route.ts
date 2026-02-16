import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { quoteId, items } = body

    if (!quoteId) {
      return NextResponse.json({ error: 'Missing quoteId' }, { status: 400 })
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

    // Get caller's company
    const { data: callerProfile } = await adminClient
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!callerProfile?.company_id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 })
    }

    // Verify quote belongs to caller's company
    const { data: quote } = await adminClient
      .from('quotes')
      .select('id, company_id')
      .eq('id', quoteId)
      .single()

    if (!quote || quote.company_id !== callerProfile.company_id) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Delete existing items
    await adminClient.from('quote_items').delete().eq('quote_id', quoteId)

    // Insert new items
    if (items && items.length > 0) {
      const quoteItems = items.map((item: { description: string; quantity: number; unit_price: number; total_price: number; sort_order: number }) => ({
        ...item,
        quote_id: quoteId,
      }))

      const { error: itemsError } = await adminClient
        .from('quote_items')
        .insert(quoteItems)

      if (itemsError) {
        console.error('Error saving quote items:', itemsError)
        return NextResponse.json(
          { error: `Failed to save items: ${itemsError.message}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving quote items:', error)
    return NextResponse.json(
      { error: 'Failed to save quote items' },
      { status: 500 }
    )
  }
}
