import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Public, unauthenticated read endpoint backing the customer tracking page.
// Looks a job up by its unguessable tracking_token and returns only the
// minimal, customer-safe fields needed to show "your tech is on the way".

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function firstName(full: string | null | undefined): string | null {
  if (!full) return null
  return full.trim().split(/\s+/)[0] || null
}

function statusLabel(status: string): { label: string; phase: 'scheduled' | 'enroute' | 'done' } {
  switch (status) {
    case 'in_progress':
      return { label: 'On the way', phase: 'enroute' }
    case 'completed':
      return { label: 'Completed', phase: 'done' }
    case 'cancelled':
      return { label: 'Cancelled', phase: 'done' }
    default:
      return { label: 'Scheduled', phase: 'scheduled' }
  }
}

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const admin = getAdmin()
  const { data: job, error } = await admin
    .from('jobs')
    .select(`
      id, status, scheduled_date, scheduled_time_start, scheduled_time_end,
      address, city, lat, lng, tech_lat, tech_lng, tech_location_at,
      company:companies(name),
      customer:customers(name),
      assigned_users:job_assignments(user:users(full_name))
    `)
    .eq('tracking_token', token)
    .single()

  if (error || !job) {
    return NextResponse.json({ error: 'Tracking link not found' }, { status: 404 })
  }

  const company = Array.isArray(job.company) ? job.company[0] : job.company
  const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer
  const firstAssignment = job.assigned_users?.[0]?.user
  const techUser = Array.isArray(firstAssignment) ? firstAssignment[0] : firstAssignment
  const { label, phase } = statusLabel(job.status)

  // Expose the technician's live position only while en route and only if the
  // fix is recent (within 10 minutes) — stale or off-job positions stay hidden.
  let techLocation: { lat: number; lng: number } | null = null
  if (
    job.status === 'in_progress' &&
    job.tech_lat != null &&
    job.tech_lng != null &&
    job.tech_location_at &&
    Date.now() - new Date(job.tech_location_at).getTime() < 10 * 60 * 1000
  ) {
    techLocation = { lat: job.tech_lat, lng: job.tech_lng }
  }

  return NextResponse.json({
    techLocation,
    companyName: company?.name || 'Your service provider',
    customerName: customer?.name || null,
    techFirstName: firstName(techUser?.full_name),
    status: job.status,
    statusLabel: label,
    phase,
    scheduledDate: job.scheduled_date,
    windowStart: job.scheduled_time_start,
    windowEnd: job.scheduled_time_end,
    destination:
      job.lat != null && job.lng != null
        ? { lat: job.lat, lng: job.lng, city: job.city || null }
        : null,
  })
}
