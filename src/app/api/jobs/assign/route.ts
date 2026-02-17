import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { job_id, user_id } = body

    if (!job_id) {
      return NextResponse.json({ error: 'Missing job_id' }, { status: 400 })
    }

    // Verify the request is from an authenticated user
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

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verify caller identity
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the user belongs to the same company as the job
    const { data: dbUser } = await adminClient
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!dbUser?.company_id) {
      return NextResponse.json({ error: 'User has no company' }, { status: 403 })
    }

    const { data: job } = await adminClient
      .from('jobs')
      .select('company_id')
      .eq('id', job_id)
      .single()

    if (!job || job.company_id !== dbUser.company_id) {
      return NextResponse.json({ error: 'Job not found or access denied' }, { status: 403 })
    }

    // Remove existing assignments for this job
    const { error: deleteError } = await adminClient
      .from('job_assignments')
      .delete()
      .eq('job_id', job_id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to clear existing assignments', details: deleteError.message },
        { status: 500 }
      )
    }

    // Insert new assignment if a worker was provided
    if (user_id) {
      const { data: assignData, error: assignError } = await adminClient
        .from('job_assignments')
        .insert({ job_id, user_id })
        .select()

      if (assignError) {
        return NextResponse.json(
          { error: 'Failed to assign worker', details: assignError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, assignment: assignData?.[0] })
    }

    // No worker — just cleared assignments
    return NextResponse.json({ success: true, assignment: null })
  } catch (err) {
    return NextResponse.json(
      { error: 'Unexpected error', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    )
  }
}
