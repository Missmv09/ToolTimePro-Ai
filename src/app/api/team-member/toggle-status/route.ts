import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { memberId, companyId } = await request.json()

    if (!memberId || !companyId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

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

    // Use admin client to bypass RLS
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verify caller identity
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the caller is an admin/owner for this company
    const { data: callerProfile } = await adminClient
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (
      !callerProfile ||
      callerProfile.company_id !== companyId ||
      !['owner', 'admin'].includes(callerProfile.role)
    ) {
      return NextResponse.json({ error: 'Only admins and owners can change member status' }, { status: 403 })
    }

    // Prevent self-deactivation
    if (memberId === user.id) {
      return NextResponse.json({ error: 'You cannot change your own status' }, { status: 400 })
    }

    // Get the member's current status
    const { data: member, error: memberError } = await adminClient
      .from('users')
      .select('id, is_active, last_login_at, company_id')
      .eq('id', memberId)
      .eq('company_id', companyId)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    const newIsActive = !member.is_active

    // Build the update: toggle is_active, and clear pending activation
    // when activating a member (set last_login_at if null)
    const updateData: { is_active: boolean; last_login_at?: string } = {
      is_active: newIsActive,
    }
    if (newIsActive && !member.last_login_at) {
      updateData.last_login_at = new Date().toISOString()
    }

    const { error: updateError } = await adminClient
      .from('users')
      .update(updateData)
      .eq('id', memberId)

    if (updateError) {
      console.error('Error toggling member status:', updateError)
      return NextResponse.json(
        { error: `Failed to update status: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, is_active: newIsActive })
  } catch (error) {
    console.error('Error toggling member status:', error)
    return NextResponse.json(
      { error: 'Failed to update member status' },
      { status: 500 }
    )
  }
}
