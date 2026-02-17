import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobData, assignedWorkerId, existingJobId } = body

    if (!jobData || !jobData.company_id) {
      return NextResponse.json({ error: 'Missing required job data' }, { status: 400 })
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

    // Verify the caller belongs to the same company
    const { data: callerProfile } = await adminClient
      .from('users')
      .select('id, role, company_id')
      .eq('id', user.id)
      .single()

    if (!callerProfile || callerProfile.company_id !== jobData.company_id) {
      return NextResponse.json({ error: 'Company mismatch or user not found' }, { status: 403 })
    }

    let jobId = existingJobId

    if (existingJobId) {
      // UPDATE existing job
      const { data: existingJob } = await adminClient
        .from('jobs')
        .select('id, company_id')
        .eq('id', existingJobId)
        .single()

      if (!existingJob || existingJob.company_id !== callerProfile.company_id) {
        return NextResponse.json({ error: 'Job not found or access denied' }, { status: 403 })
      }

      const { error: updateError } = await adminClient
        .from('jobs')
        .update(jobData)
        .eq('id', existingJobId)

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update job', details: updateError.message },
          { status: 500 }
        )
      }
    } else {
      // INSERT new job
      const { data: newJob, error: insertError } = await adminClient
        .from('jobs')
        .insert(jobData)
        .select()
        .single()

      if (insertError || !newJob) {
        return NextResponse.json(
          { error: 'Failed to create job', details: insertError?.message || 'No data returned' },
          { status: 500 }
        )
      }
      jobId = newJob.id
    }

    // Handle worker assignment
    // Delete existing assignments for this job
    const { error: deleteError } = await adminClient
      .from('job_assignments')
      .delete()
      .eq('job_id', jobId)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Job saved but failed to clear existing assignments', details: deleteError.message },
        { status: 500 }
      )
    }

    // Insert new assignment if a worker was provided
    if (assignedWorkerId) {
      const { error: assignError } = await adminClient
        .from('job_assignments')
        .insert({ job_id: jobId, user_id: assignedWorkerId })

      if (assignError) {
        return NextResponse.json(
          { error: 'Job saved but failed to assign worker', details: assignError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true, jobId })
  } catch (err) {
    return NextResponse.json(
      { error: 'Unexpected error', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    )
  }
}
