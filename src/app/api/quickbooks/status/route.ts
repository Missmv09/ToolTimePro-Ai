import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getQBOConnection } from '@/lib/quickbooks/client'

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

    // Verify user exists
    const { data: user, error: userError } = await getSupabaseAdmin()
      .from('users')
      .select('id, company_id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get QBO connection
    const connection = await getQBOConnection(userId)

    if (!connection) {
      return NextResponse.json({
        connected: false,
        last_sync_at: null,
        sync_status: null,
        pending: {
          customers: 0,
          invoices: 0,
        },
      })
    }

    // Get pending sync counts
    let pendingCustomers = 0
    let pendingInvoices = 0

    if (user.company_id) {
      // Count unsynced customers
      const { count: customerCount } = await getSupabaseAdmin()
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', user.company_id)
        .is('qbo_synced_at', null)

      pendingCustomers = customerCount || 0

      // Count unsynced invoices (not drafts)
      const { count: invoiceCount } = await getSupabaseAdmin()
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', user.company_id)
        .is('qbo_synced_at', null)
        .in('status', ['sent', 'viewed', 'paid', 'partial', 'overdue'])

      pendingInvoices = invoiceCount || 0
    }

    // Get recent sync log entries
    const { data: recentLogs } = await getSupabaseAdmin()
      .from('qbo_sync_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      connected: true,
      connected_at: connection.connected_at,
      last_sync_at: connection.last_sync_at,
      sync_status: connection.sync_status,
      pending: {
        customers: pendingCustomers,
        invoices: pendingInvoices,
      },
      recent_logs: recentLogs || [],
    })
  } catch (error) {
    console.error('Status error:', error)
    return NextResponse.json(
      { error: 'An error occurred checking status' },
      { status: 500 }
    )
  }
}
