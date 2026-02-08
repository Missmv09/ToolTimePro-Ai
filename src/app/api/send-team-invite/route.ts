import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendTeamMemberWelcomeEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email, name, tempPassword, companyId } = await request.json()

    if (!email || !name || !tempPassword || !companyId) {
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

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

    // Get company name for the email
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()

    await sendTeamMemberWelcomeEmail({
      to: email,
      name,
      tempPassword,
      companyName: company?.name,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending team invite email:', error)
    return NextResponse.json(
      { error: 'Failed to send welcome email' },
      { status: 500 }
    )
  }
}
