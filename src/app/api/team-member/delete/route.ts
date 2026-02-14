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

    // Verify the request is from an authenticated owner
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Verify caller identity with anon key
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the caller is an owner for this company
    const { data: callerProfile } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (
      !callerProfile ||
      callerProfile.company_id !== companyId ||
      callerProfile.role !== 'owner'
    ) {
      return NextResponse.json({ error: 'Only owners can delete team members' }, { status: 403 })
    }

    // Prevent self-deletion
    if (memberId === user.id) {
      return NextResponse.json({ error: 'You cannot delete yourself' }, { status: 400 })
    }

    // Verify the member belongs to the same company
    const { data: memberProfile } = await supabase
      .from('users')
      .select('id, company_id')
      .eq('id', memberId)
      .eq('company_id', companyId)
      .single()

    if (!memberProfile) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Use admin client to delete related records and auth user
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Delete related worker_notes
    await adminClient
      .from('worker_notes')
      .delete()
      .eq('worker_id', memberId)

    // Delete related worker_certifications
    await adminClient
      .from('worker_certifications')
      .delete()
      .eq('worker_id', memberId)

    // Delete related job_assignments
    await adminClient
      .from('job_assignments')
      .delete()
      .eq('user_id', memberId)

    // Delete the user profile from users table
    const { error: deleteProfileError } = await adminClient
      .from('users')
      .delete()
      .eq('id', memberId)

    if (deleteProfileError) {
      console.error('Error deleting user profile:', deleteProfileError)
      return NextResponse.json(
        { error: `Failed to delete team member: ${deleteProfileError.message}` },
        { status: 500 }
      )
    }

    // Delete the auth user
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(memberId)
    if (deleteAuthError) {
      console.error('Error deleting auth user (profile already removed):', deleteAuthError)
      // Profile is already deleted, so we still return success
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting team member:', error)
    return NextResponse.json(
      { error: 'Failed to delete team member' },
      { status: 500 }
    )
  }
}
