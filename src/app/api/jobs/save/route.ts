import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const log: string[] = []
  try {
    const body = await request.json()
    const { jobData, assignedWorkerId, existingJobId } = body
    log.push(`Received: existingJobId=${existingJobId}, assignedWorkerId=${assignedWorkerId}`)

    if (!jobData || !jobData.company_id) {
      return NextResponse.json({ error: 'Missing required job data', log }, { status: 400 })
    }

    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No auth token provided', log }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    log.push('Auth token present')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      log.push(`SUPABASE_URL=${supabaseUrl ? 'SET' : 'MISSING'}, SERVICE_KEY=${supabaseServiceKey ? 'SET' : 'MISSING'}`)
      return NextResponse.json({ error: 'Server env vars not configured', log }, { status: 500 })
    }
    log.push('Env vars OK')

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verify caller identity
    const { data: authData, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !authData?.user) {
      log.push(`Auth error: ${authError?.message || 'no user returned'}`)
      return NextResponse.json({ error: 'Invalid auth token', log }, { status: 401 })
    }
    const callerId = authData.user.id
    log.push(`Caller verified: ${callerId}`)

    // Verify company membership
    const { data: callerProfile, error: profileError } = await adminClient
      .from('users')
      .select('id, role, company_id')
      .eq('id', callerId)
      .single()

    if (profileError || !callerProfile) {
      log.push(`Profile error: ${profileError?.message || 'no profile found'}`)
      return NextResponse.json({ error: 'User profile not found in database', log }, { status: 403 })
    }

    if (callerProfile.company_id !== jobData.company_id) {
      log.push(`Company mismatch: user=${callerProfile.company_id}, job=${jobData.company_id}`)
      return NextResponse.json({ error: 'Company mismatch', log }, { status: 403 })
    }
    log.push(`Company verified: ${callerProfile.company_id}`)

    // ---- SAVE JOB ----
    let jobId = existingJobId

    if (existingJobId) {
      // Verify job exists and belongs to company
      const { data: existingJob, error: fetchJobErr } = await adminClient
        .from('jobs')
        .select('id, company_id')
        .eq('id', existingJobId)
        .single()

      if (fetchJobErr || !existingJob) {
        log.push(`Fetch existing job error: ${fetchJobErr?.message || 'not found'}`)
        return NextResponse.json({ error: 'Existing job not found', log }, { status: 404 })
      }

      if (existingJob.company_id !== callerProfile.company_id) {
        return NextResponse.json({ error: 'Job belongs to another company', log }, { status: 403 })
      }

      // Don't overwrite company_id, created_at, or id
      const { company_id: _c, id: _id, created_at: _ca, ...updateFields } = jobData
      const { error: updateError } = await adminClient
        .from('jobs')
        .update({ ...updateFields, updated_at: new Date().toISOString() })
        .eq('id', existingJobId)

      if (updateError) {
        log.push(`Update job error: ${updateError.message} (code: ${updateError.code})`)
        return NextResponse.json({ error: 'Failed to update job', details: updateError.message, log }, { status: 500 })
      }
      log.push(`Job updated: ${existingJobId}`)
    } else {
      // INSERT new job
      const { data: newJob, error: insertError } = await adminClient
        .from('jobs')
        .insert(jobData)
        .select('id')
        .single()

      if (insertError) {
        log.push(`Insert job error: ${insertError.message} (code: ${insertError.code})`)
        return NextResponse.json({ error: 'Failed to create job', details: insertError.message, log }, { status: 500 })
      }
      if (!newJob) {
        log.push('Insert returned no data')
        return NextResponse.json({ error: 'Job insert returned no data', log }, { status: 500 })
      }
      jobId = newJob.id
      log.push(`Job created: ${jobId}`)
    }

    // ---- HANDLE ASSIGNMENT ----
    // Step 1: Delete ALL existing assignments for this job
    const { error: deleteError, count: deleteCount } = await adminClient
      .from('job_assignments')
      .delete()
      .eq('job_id', jobId)
      .select('id', { count: 'exact', head: true })

    if (deleteError) {
      log.push(`Delete assignments error: ${deleteError.message} (code: ${deleteError.code})`)
      return NextResponse.json(
        { error: 'Job saved but failed to clear assignments', details: deleteError.message, jobId, log },
        { status: 500 }
      )
    }
    log.push(`Cleared ${deleteCount ?? '?'} existing assignment(s) for job ${jobId}`)

    // Step 2: Insert new assignment if a worker was selected
    if (assignedWorkerId) {
      // Verify the worker exists
      const { data: workerCheck, error: workerCheckErr } = await adminClient
        .from('users')
        .select('id, full_name')
        .eq('id', assignedWorkerId)
        .single()

      if (workerCheckErr || !workerCheck) {
        log.push(`Worker not found: ${assignedWorkerId}, error: ${workerCheckErr?.message || 'no data'}`)
        return NextResponse.json(
          { error: 'Selected worker not found in database', details: workerCheckErr?.message, jobId, log },
          { status: 400 }
        )
      }
      log.push(`Worker verified: ${workerCheck.full_name} (${assignedWorkerId})`)

      const { data: insertedAssignment, error: assignError } = await adminClient
        .from('job_assignments')
        .insert({ job_id: jobId, user_id: assignedWorkerId })
        .select('id, job_id, user_id')
        .single()

      if (assignError) {
        log.push(`Insert assignment error: ${assignError.message} (code: ${assignError.code}, details: ${assignError.details})`)
        return NextResponse.json(
          { error: 'Job saved but assignment insert failed', details: assignError.message, jobId, log },
          { status: 500 }
        )
      }

      if (!insertedAssignment) {
        log.push('Assignment insert returned no data')
        return NextResponse.json(
          { error: 'Job saved but assignment insert returned no data', jobId, log },
          { status: 500 }
        )
      }
      log.push(`Assignment created: ${JSON.stringify(insertedAssignment)}`)

      // Step 3: VERIFY - Read back the assignment to confirm it persisted
      const { data: verifyData, error: verifyError } = await adminClient
        .from('job_assignments')
        .select('id, job_id, user_id')
        .eq('job_id', jobId)
        .eq('user_id', assignedWorkerId)

      if (verifyError || !verifyData || verifyData.length === 0) {
        log.push(`VERIFICATION FAILED: ${verifyError?.message || 'no rows found after insert'}`)
        return NextResponse.json(
          { error: 'Assignment was inserted but verification read-back found nothing', jobId, log },
          { status: 500 }
        )
      }
      log.push(`VERIFIED: assignment exists (${verifyData.length} row(s))`)
    } else {
      log.push('No worker selected - assignments cleared only')
    }

    return NextResponse.json({ success: true, jobId, log })
  } catch (err) {
    log.push(`Exception: ${err instanceof Error ? err.message : String(err)}`)
    return NextResponse.json(
      { error: 'Unexpected server error', details: err instanceof Error ? err.message : 'Unknown', log },
      { status: 500 }
    )
  }
}
