import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Worker app posts the technician's current GPS position for an in-progress
// job, so the customer's tracking page can show a live pin. Auth required and
// scoped to the caller's company.

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function validCoord(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number' && typeof lng === 'number' &&
    isFinite(lat) && isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 &&
    !(lat === 0 && lng === 0)
  )
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { jobId, lat, lng } = await request.json()
    if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
    if (!validCoord(lat, lng)) return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })

    const admin = getAdmin()
    const { data: { user } } = await admin.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: caller } = await admin.from('users').select('company_id').eq('id', user.id).single()
    if (!caller?.company_id) return NextResponse.json({ error: 'No company' }, { status: 403 })

    const { data: job } = await admin.from('jobs').select('id, company_id, status').eq('id', jobId).single()
    if (!job || job.company_id !== caller.company_id) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    // Only track while the job is actually in progress.
    if (job.status !== 'in_progress') {
      return NextResponse.json({ success: true, skipped: 'job not in progress' })
    }

    const { error } = await admin
      .from('jobs')
      .update({ tech_lat: lat, tech_lng: lng, tech_location_at: new Date().toISOString() })
      .eq('id', jobId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[track/location] error:', err)
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
  }
}
