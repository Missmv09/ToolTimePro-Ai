import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { syncAll } from '@/lib/quickbooks/sync'
import { getQBOConnection } from '@/lib/quickbooks/client'

export async function POST(request: Request) {
  try {
    // Get user ID from request body
    const body = await request.json()
    const { user_id } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Verify user exists
    const { data: user, error: userError } = await getSupabaseAdmin()
      .from('users')
      .select('id')
      .eq('id', user_id)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user has QBO connection
    const connection = await getQBOConnection(user_id)
    if (!connection) {
      return NextResponse.json(
        { error: 'No QuickBooks connection found. Please connect your QuickBooks account first.' },
        { status: 400 }
      )
    }

    // Perform full sync
    const results = await syncAll(user_id)

    return NextResponse.json({
      success: true,
      results: {
        customers: {
          synced: results.customers.synced,
          errors: results.customers.errors,
        },
        invoices: {
          synced: results.invoices.synced,
          errors: results.invoices.errors,
        },
        total_synced: results.customers.synced + results.invoices.synced,
        total_errors: results.customers.errors + results.invoices.errors,
      },
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'An error occurred during sync' },
      { status: 500 }
    )
  }
}

// GET endpoint to check sync status
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get connection status
    const connection = await getQBOConnection(userId)

    if (!connection) {
      return NextResponse.json({
        connected: false,
      })
    }

    // Get sync statistics
    const { data: userData } = await getSupabaseAdmin()
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .single()

    let pendingCustomers = 0
    let pendingInvoices = 0

    if (userData?.company_id) {
      // Count unsynced customers
      const { count: customerCount } = await getSupabaseAdmin()
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', userData.company_id)
        .is('qbo_synced_at', null)

      pendingCustomers = customerCount || 0

      // Count unsynced invoices
      const { count: invoiceCount } = await getSupabaseAdmin()
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', userData.company_id)
        .is('qbo_synced_at', null)
        .in('status', ['sent', 'viewed', 'paid', 'partial', 'overdue'])

      pendingInvoices = invoiceCount || 0
    }

    return NextResponse.json({
      connected: true,
      last_sync_at: connection.last_sync_at,
      sync_status: connection.sync_status,
      pending: {
        customers: pendingCustomers,
        invoices: pendingInvoices,
      },
    })
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'An error occurred checking sync status' },
      { status: 500 }
    )
  }
}
