import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    // Get user ID from request body
    const body = await request.json()
    const { user_id, clear_sync_data = false } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Verify user exists
    const { data: user, error: userError } = await getSupabaseAdmin()
      .from('users')
      .select('id, company_id')
      .eq('id', user_id)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete the QBO connection
    const { error: deleteError } = await getSupabaseAdmin()
      .from('qbo_connections')
      .delete()
      .eq('user_id', user_id)

    if (deleteError) {
      console.error('Error deleting QBO connection:', deleteError)
      return NextResponse.json(
        { error: 'Failed to disconnect QuickBooks' },
        { status: 500 }
      )
    }

    // Optionally clear QBO IDs from customers and invoices
    if (clear_sync_data && user.company_id) {
      // Clear customer QBO data
      await getSupabaseAdmin()
        .from('customers')
        .update({
          qbo_id: null,
          qbo_synced_at: null,
        })
        .eq('company_id', user.company_id)

      // Clear invoice QBO data
      await getSupabaseAdmin()
        .from('invoices')
        .update({
          qbo_id: null,
          qbo_synced_at: null,
        })
        .eq('company_id', user.company_id)
    }

    // Log the disconnection
    await getSupabaseAdmin().from('qbo_sync_log').insert({
      user_id: user_id,
      sync_type: 'disconnection',
      direction: 'to_qbo',
      status: 'success',
    })

    return NextResponse.json({
      success: true,
      message: 'QuickBooks disconnected successfully',
    })
  } catch (error) {
    console.error('Disconnect error:', error)
    return NextResponse.json(
      { error: 'An error occurred while disconnecting' },
      { status: 500 }
    )
  }
}
