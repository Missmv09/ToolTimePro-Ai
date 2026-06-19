import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const log: string[] = []
  try {
    const body = await request.json()
    const { jobId } = body
    log.push(`Received: jobId=${jobId}`)

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId', log }, { status: 400 })
    }

    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No auth token provided', log }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server env vars not configured', log }, { status: 500 })
    }

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

    // Verify company membership
    const { data: callerProfile, error: profileError } = await adminClient
      .from('users')
      .select('id, company_id')
      .eq('id', callerId)
      .single()

    if (profileError || !callerProfile?.company_id) {
      log.push(`Profile error: ${profileError?.message || 'no profile found'}`)
      return NextResponse.json({ error: 'User profile not found in database', log }, { status: 403 })
    }

    // Verify job exists and belongs to caller's company
    const { data: existingJob, error: fetchJobErr } = await adminClient
      .from('jobs')
      .select('id, company_id')
      .eq('id', jobId)
      .single()

    if (fetchJobErr || !existingJob) {
      log.push(`Fetch job error: ${fetchJobErr?.message || 'not found'}`)
      return NextResponse.json({ error: 'Job not found', log }, { status: 404 })
    }

    if (existingJob.company_id !== callerProfile.company_id) {
      return NextResponse.json({ error: 'Job belongs to another company', log }, { status: 403 })
    }

    // Delete the job (related rows cascade via ON DELETE CASCADE / SET NULL)
    const { error: deleteError } = await adminClient
      .from('jobs')
      .delete()
      .eq('id', jobId)

    if (deleteError) {
      log.push(`Delete job error: ${deleteError.message} (code: ${deleteError.code})`)
      return NextResponse.json(
        { error: 'Failed to delete job', details: deleteError.message, log },
        { status: 500 }
      )
    }

    log.push(`Job deleted: ${jobId}`)
    return NextResponse.json({ success: true, jobId, log })
  } catch (err) {
    log.push(`Exception: ${err instanceof Error ? err.message : String(err)}`)
    return NextResponse.json(
      { error: 'Unexpected server error', details: err instanceof Error ? err.message : 'Unknown', log },
      { status: 500 }
    )
  }
}
