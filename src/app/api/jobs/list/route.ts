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

    // Fetch jobs with customers
    let query = adminClient
      .from('jobs')
      .select('*, customer:customers(id, name)')
      .eq('company_id', profile.company_id)
      .order('scheduled_date', { ascending: false })
      .limit(5000)

    if (filter === 'overdue') {
      const today = new Date().toISOString().split('T')[0]
      query = query.in('status', ['scheduled', 'in_progress']).lt('scheduled_date', today)
    } else if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    if (customerFilter) {
      query = query.eq('customer_id', customerFilter)
    }

    const { data: jobs, error: jobsError } = await query

    if (jobsError) {
      return NextResponse.json({ error: 'Failed to fetch jobs', details: jobsError.message }, { status: 500 })
    }

    // ---------- TEMPORARY DIAGNOSTIC ----------
    // Ground-truth, UNFILTERED snapshot of every job for this company so we can
    // see exactly what exists in the DB regardless of which tab is active.
    // Remove once the "All vs Scheduled" discrepancy is understood.
    const { data: allJobsRaw, error: allJobsErr } = await adminClient
      .from('jobs')
      .select('id, status, scheduled_date, company_id')
      .eq('company_id', profile.company_id)
      .limit(5000)

    const statusBreakdown: Record<string, number> = {}
    for (const j of allJobsRaw || []) {
      const s = j.status ?? '(null)'
      statusBreakdown[s] = (statusBreakdown[s] || 0) + 1
    }
    const debug = {
      callerUserId: authData.user.id,
      companyId: profile.company_id,
      filterApplied: filter,
      customerFilterApplied: customerFilter || null,
      totalJobsForCompany_unfiltered: allJobsRaw?.length ?? 0,
      statusBreakdown_unfiltered: statusBreakdown,
      allJobsErr: allJobsErr?.message || null,
      sample: (allJobsRaw || []).slice(0, 20).map(j => ({
        id: j.id, status: j.status, scheduled_date: j.scheduled_date,
      })),
    }
    console.log('[JobsList][DIAGNOSTIC]', JSON.stringify(debug))
    // ------------------------------------------

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ jobs: [], debug })
    }

    // Fetch ALL assignments for these jobs separately (avoids any PostgREST join issues)
    const jobIds = jobs.map(j => j.id)
    const { data: assignments, error: assignError } = await adminClient
      .from('job_assignments')
      .select('job_id, user_id')
      .in('job_id', jobIds)

    if (assignError) {
      console.error('[JobsList] Failed to fetch assignments:', assignError)
    }

    // Fetch user names for assigned workers
    let userMap: Record<string, string> = {}
    if (assignments && assignments.length > 0) {
      const userIds = [...new Set(assignments.map(a => a.user_id))]
      const { data: users } = await adminClient
        .from('users')
        .select('id, full_name')
        .in('id', userIds)

      if (users) {
        userMap = Object.fromEntries(users.map(u => [u.id, u.full_name]))
      }
    }

    // Merge assignments into jobs in the expected format
    const jobsWithAssignments = jobs.map(job => ({
      ...job,
      assigned_users: (assignments || [])
        .filter(a => a.job_id === job.id)
        .map(a => ({ user: { id: a.user_id, full_name: userMap[a.user_id] || 'Unknown' } })),
    }))

    return NextResponse.json({ jobs: jobsWithAssignments, debug })
  } catch (err) {
    return NextResponse.json(
      { error: 'Unexpected error', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    )
  }
}
