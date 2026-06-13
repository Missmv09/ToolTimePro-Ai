import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncConnection } from '@/lib/google-calendar-sync'

export const dynamic = 'force-dynamic'

/**
 * Sync every connected user's upcoming jobs to their Google Calendar.
 * Invoked by the calendar-sync-cron scheduled function. Authenticated with
 * CRON_SECRET (matching the other internal cron routes) so it can run without
 * a user session and use the service-role key.
 *
 * One connection failing (e.g. a revoked refresh token) does not abort the
 * others — failures are collected and reported.
 */
async function handle(request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: connections, error: connError } = await supabaseAdmin
    .from('google_calendar_connections')
    .select('*')

  if (connError) {
    console.error('[Calendar Sync All] Failed to load connections:', connError)
    return NextResponse.json({ error: 'Failed to load connections' }, { status: 500 })
  }

  let totalSynced = 0
  let connectionsOk = 0
  const failures = []

  for (const connection of connections || []) {
    try {
      const { synced } = await syncConnection(connection, supabaseAdmin)
      totalSynced += synced
      connectionsOk++
    } catch (error) {
      console.error(
        `[Calendar Sync All] Connection ${connection.id} (user ${connection.user_id}) failed:`,
        error
      )
      failures.push({ connectionId: connection.id, error: error.message })
    }
  }

  return NextResponse.json({
    success: true,
    connections: (connections || []).length,
    connectionsOk,
    jobsSynced: totalSynced,
    failed: failures.length,
    failures,
  })
}

// Support both GET (cron functions here invoke via GET) and POST.
export async function GET(request) {
  return handle(request)
}

export async function POST(request) {
  return handle(request)
}
