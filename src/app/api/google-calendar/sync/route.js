import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''

/**
 * Refresh the Google access token if it's expired.
 * Returns a valid access token string.
 */
async function getValidAccessToken(connection, supabaseAdmin) {
  const now = new Date()
  const expiresAt = new Date(connection.token_expires_at)

  // If token is still valid (with 5-minute buffer), return it
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return connection.access_token
  }

  // Token expired — refresh it
  const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!refreshResponse.ok) {
    const errBody = await refreshResponse.text()
    throw new Error(`Token refresh failed: ${errBody}`)
  }

  const tokens = await refreshResponse.json()
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  // Update stored tokens
  await supabaseAdmin
    .from('google_calendar_connections')
    .update({
      access_token: tokens.access_token,
      token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connection.id)

  return tokens.access_token
}

/**
 * Create or update a Google Calendar event for a job.
 */
async function syncJobToCalendar(job, accessToken, calendarId) {
  const startDate = job.scheduled_date
  if (!startDate) return null

  // Build start/end times
  const startTime = job.scheduled_time_start || '09:00'
  const endTime = job.scheduled_time_end || '10:00'
  const startDateTime = `${startDate}T${startTime}:00`
  const endDateTime = `${startDate}T${endTime}:00`

  const customerName = job.customer?.name || job.customer?.full_name || 'Customer'
  const customerAddress = job.customer?.address || ''

  const eventBody = {
    summary: `${job.title || 'Job'} - ${customerName}`,
    description: [
      job.description || '',
      customerAddress ? `Address: ${customerAddress}` : '',
      `Status: ${job.status || 'scheduled'}`,
      `ToolTime Pro Job #${job.id}`,
    ]
      .filter(Boolean)
      .join('\n'),
    start: {
      dateTime: startDateTime,
      timeZone: 'America/Los_Angeles',
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'America/Los_Angeles',
    },
    location: customerAddress || undefined,
  }

  const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`

  let response
  if (job.gcal_event_id) {
    // Update existing event
    response = await fetch(`${baseUrl}/${job.gcal_event_id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    })

    // If event not found (deleted from calendar), create a new one
    if (response.status === 404) {
      response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      })
    }
  } else {
    // Create new event
    response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    })
  }

  if (!response.ok) {
    const errBody = await response.text()
    console.error(`Failed to sync job ${job.id} to Google Calendar:`, errBody)
    return null
  }

  const event = await response.json()
  return event.id
}

export async function POST(request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get user from Authorization header or cookie
    let userId = null
    const authHeader = request.headers.get('authorization')

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
      if (!error && user) {
        userId = user.id
      }
    }

    if (!userId) {
      const { createSupabaseServerClient } = await import('@/lib/supabase-server')
      const supabase = await createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Google Calendar connection for this user
    const { data: connection, error: connError } = await supabaseAdmin
      .from('google_calendar_connections')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (connError || !connection) {
      return NextResponse.json(
        { error: 'Google Calendar not connected. Please connect first.' },
        { status: 400 }
      )
    }

    // Get a valid access token (refreshing if needed)
    const accessToken = await getValidAccessToken(connection, supabaseAdmin)

    // Fetch upcoming jobs for the next 30 days
    const today = new Date().toISOString().split('T')[0]
    const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from('jobs')
      .select('id, title, description, scheduled_date, scheduled_time_start, scheduled_time_end, status, gcal_event_id, customer:customers(name, full_name, address)')
      .eq('company_id', connection.company_id)
      .gte('scheduled_date', today)
      .lte('scheduled_date', thirtyDaysOut)
      .in('status', ['scheduled', 'in_progress', 'pending', 'confirmed'])

    if (jobsError) {
      console.error('Failed to fetch jobs:', jobsError)
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    // Sync each job to Google Calendar
    let syncedCount = 0
    const calendarId = connection.calendar_id || 'primary'

    for (const job of jobs || []) {
      const eventId = await syncJobToCalendar(job, accessToken, calendarId)
      if (eventId) {
        // Store the gcal_event_id on the job
        if (eventId !== job.gcal_event_id) {
          await supabaseAdmin
            .from('jobs')
            .update({ gcal_event_id: eventId })
            .eq('id', job.id)
        }
        syncedCount++
      }
    }

    // Update last sync time
    await supabaseAdmin
      .from('google_calendar_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      total: (jobs || []).length,
    })
  } catch (error) {
    console.error('Google Calendar sync error:', error)
    return NextResponse.json(
      { error: 'Sync failed: ' + error.message },
      { status: 500 }
    )
  }
}
