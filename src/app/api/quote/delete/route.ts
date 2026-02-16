import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { quoteId } = await request.json()

    if (!quoteId) {
      return NextResponse.json(
        { error: 'Missing required field: quoteId' },
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
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (!callerProfile || !callerProfile.company_id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 })
    }

    // Fetch the quote to check ownership, status, and company
    const { data: quote, error: quoteError } = await adminClient
      .from('quotes')
      .select('id, status, company_id, created_by')
      .eq('id', quoteId)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Ensure quote belongs to caller's company
    if (quote.company_id !== callerProfile.company_id) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Only allow deletion of unsent quotes (draft or pending_approval)
    const deletableStatuses = ['draft', 'pending_approval']
    if (!deletableStatuses.includes(quote.status)) {
      return NextResponse.json(
        { error: 'Only draft or pending approval quotes can be deleted. Sent quotes cannot be deleted.' },
        { status: 409 }
      )
    }

    // Check if an invoice references this quote
    const { count: invoiceCount } = await adminClient
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('quote_id', quoteId)

    if (invoiceCount && invoiceCount > 0) {
      return NextResponse.json(
        { error: 'This quote has an associated invoice and cannot be deleted.' },
        { status: 409 }
      )
    }

    // Permission check based on role
    const isOwnerOrAdmin = callerProfile.role === 'owner' || callerProfile.role === 'admin'

    if (!isOwnerOrAdmin) {
      // Workers can only delete their own draft quotes
      if (quote.created_by !== user.id) {
        return NextResponse.json(
          { error: 'You can only delete quotes you created.' },
          { status: 403 }
        )
      }
      if (quote.status !== 'draft') {
        return NextResponse.json(
          { error: 'You can only delete your own draft quotes. Quotes submitted for approval must be deleted by an admin or owner.' },
          { status: 403 }
        )
      }
    }

    // Delete quote items first
    await adminClient
      .from('quote_items')
      .delete()
      .eq('quote_id', quoteId)

    // Delete the quote
    const { error: deleteError } = await adminClient
      .from('quotes')
      .delete()
      .eq('id', quoteId)

    if (deleteError) {
      console.error('Error deleting quote:', deleteError)
      return NextResponse.json(
        { error: `Failed to delete quote: ${deleteError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting quote:', error)
    return NextResponse.json(
      { error: 'Failed to delete quote' },
      { status: 500 }
    )
  }
}
