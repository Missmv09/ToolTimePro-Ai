import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { memberId, newEmail, companyId } = await request.json()

    if (!memberId || !newEmail || !companyId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify the request is from an authenticated admin/owner
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

    // Verify caller identity
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the caller is an admin/owner for this company
    const { data: callerProfile } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (
      !callerProfile ||
      callerProfile.company_id !== companyId ||
      !['owner', 'admin'].includes(callerProfile.role)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify the member belongs to the same company
    const { data: memberProfile } = await supabase
      .from('users')
      .select('id, email, company_id')
      .eq('id', memberId)
      .eq('company_id', companyId)
      .single()

    if (!memberProfile) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Skip if email hasn't changed
    if (memberProfile.email === newEmail) {
      return NextResponse.json({ success: true })
    }

    // Use admin client to update auth email
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(
      memberId,
      { email: newEmail }
    )

    if (updateAuthError) {
      console.error('Error updating auth email:', updateAuthError)
      return NextResponse.json(
        { error: `Failed to update email: ${updateAuthError.message}` },
        { status: 500 }
      )
    }

    // Update email in users table
    const { error: updateProfileError } = await adminClient
      .from('users')
      .update({ email: newEmail })
      .eq('id', memberId)

    if (updateProfileError) {
      console.error('Error updating profile email:', updateProfileError)
      return NextResponse.json(
        { error: `Failed to update profile email: ${updateProfileError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating team member email:', error)
    return NextResponse.json(
      { error: 'Failed to update email' },
      { status: 500 }
    )
  }
}
