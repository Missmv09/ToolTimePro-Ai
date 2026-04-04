import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { sendTeamMemberWelcomeEmail } from '@/lib/email'
import { getWorkerLimit, PlanTier } from '@/lib/plan-features'

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
    const { email, full_name, phone, role, hourly_rate, is_active, notes, admin_permissions, home_address, home_city, companyId } =
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
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Use admin client for all server-side operations (bypasses RLS)
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
      .select('role, company_id, admin_permissions')
      .eq('id', user.id)
      .single()

    if (
      !callerProfile ||
      callerProfile.company_id !== companyId ||
      !['owner', 'admin', 'worker_admin'].includes(callerProfile.role)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check granular team_management permission for non-owners
    if (callerProfile.role !== 'owner' && callerProfile.admin_permissions?.team_management === false) {
      return NextResponse.json({ error: 'You do not have permission to manage team members' }, { status: 403 })
    }

    // Enforce worker limit based on plan tier
    const { data: companyData } = await adminClient
      .from('companies')
      .select('plan, addons')
      .eq('id', companyId)
      .single()

    if (companyData) {
      const planTier = (companyData.plan || 'starter') as PlanTier
      const companyAddons = (companyData.addons || []) as string[]
      const limit = getWorkerLimit(planTier, companyAddons)

      if (limit !== Infinity) {
        const { count } = await adminClient
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)

        if ((count ?? 0) >= limit) {
          return NextResponse.json(
            {
              error: `Your ${planTier.charAt(0).toUpperCase() + planTier.slice(1).replace('_', ' ')} plan allows up to ${limit} team members. Please upgrade your plan or add Extra Workers ($7/user/mo) to add more.`,
              code: 'WORKER_LIMIT_REACHED',
              currentCount: count,
              limit,
            },
            { status: 403 }
          )
        }
      }
    }

    const tempPassword = generateTempPassword()

    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        needs_password: true,
      },
      app_metadata: {
        needs_password: true,
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
        admin_permissions: admin_permissions || null,
        home_address: home_address || null,
        home_city: home_city || null,
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

    // Generate a password reset link so the team member can set their own
    // password directly from the welcome email (instead of relying solely
    // on the temporary password).
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tooltimepro.com'
    let resetUrl: string | undefined
    try {
      const { data: linkData } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${baseUrl}/auth/reset-password` },
      })
      if (linkData?.properties?.hashed_token) {
        resetUrl = `${baseUrl}/auth/reset-password?token_hash=${linkData.properties.hashed_token}&type=recovery`
      }
    } catch (linkErr) {
      console.error('Error generating password reset link for welcome email:', linkErr)
      // Non-critical — the temp password is still in the email
    }

    // Send welcome email via Resend
    try {
      await sendTeamMemberWelcomeEmail({
        to: email,
        name: full_name,
        tempPassword,
        companyName: company?.name,
        resetUrl,
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
