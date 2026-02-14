import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { sendTeamMemberWelcomeEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

function generateTempPassword(length = 12): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  const special = '!@#$%&*'
  const all = upper + lower + digits + special

  const bytes = randomBytes(length * 4)
  const randomValues = new Uint32Array(bytes.buffer)

  const password: string[] = [
    upper[randomValues[0] % upper.length],
    lower[randomValues[1] % lower.length],
    digits[randomValues[2] % digits.length],
    special[randomValues[3] % special.length],
  ]

  for (let i = 4; i < length; i++) {
    password.push(all[randomValues[i] % all.length])
  }

  for (let i = password.length - 1; i > 0; i--) {
    const j = randomValues[i] % (i + 1)
    ;[password[i], password[j]] = [password[j], password[i]]
  }

  return password.join('')
}

export async function POST(request: NextRequest) {
  try {
    const { email, full_name, phone, role, hourly_rate, is_active, notes, companyId } =
      await request.json()

    if (!email || !full_name || !role || !companyId) {
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

    // Use admin client to bypass RLS for the caller profile check
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tempPassword = generateTempPassword()

    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    })

    if (createError) {
      console.error('Error creating auth user:', createError)
      if (createError.message.includes('already been registered') || createError.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'A user with this email already exists. Please use a different email address.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // Insert user profile
    const { error: insertError } = await adminClient
      .from('users')
      .insert({
        id: authData.user.id,
        full_name,
        email,
        phone: phone || null,
        role,
        hourly_rate: hourly_rate ? parseFloat(hourly_rate) : null,
        is_active: is_active ?? true,
        notes: notes || null,
        company_id: companyId,
      })

    if (insertError) {
      console.error('Error creating user profile:', insertError)
      // Clean up: delete the auth user since profile creation failed
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: `Error creating team member profile: ${insertError.message}` },
        { status: 500 }
      )
    }

    // Get company name for the welcome email
    const { data: company } = await adminClient
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()

    // Send welcome email via Resend
    try {
      await sendTeamMemberWelcomeEmail({
        to: email,
        name: full_name,
        tempPassword,
        companyName: company?.name,
      })
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError)
      // User was created successfully, just email failed
      return NextResponse.json({
        success: true,
        emailFailed: true,
        tempPassword,
        message: 'Team member created but welcome email could not be sent.',
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error creating team member:', error)
    return NextResponse.json(
      { error: 'Failed to create team member' },
      { status: 500 }
    )
  }
}
