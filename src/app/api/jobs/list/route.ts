import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'
    const customerFilter = searchParams.get('customer') || ''

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verify caller identity
    const { data: authData, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get caller's company
    const { data: profile } = await adminClient
      .from('users')
      .select('company_id')
      .eq('id', authData.user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 403 })
    }

    // Fetch jobs with assignments using admin client (bypasses RLS on job_assignments)
    let query = adminClient
      .from('jobs')
      .select(`
        *,
        customer:customers(id, name),
        assigned_users:job_assignments(user:users(id, full_name))
      `)
      .eq('company_id', profile.company_id)
      .order('scheduled_date', { ascending: true })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    if (customerFilter) {
      query = query.eq('customer_id', customerFilter)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch jobs', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ jobs: data || [] })
  } catch (err) {
    return NextResponse.json(
      { error: 'Unexpected error', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    )
  }
}
