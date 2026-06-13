import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncConnection } from '@/lib/google-calendar-sync'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Authenticate via Bearer token (the app uses localStorage-based auth)
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Google Calendar connection for this user
    const { data: connection, error: connError } = await supabaseAdmin
      .from('google_calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (connError || !connection) {
      return NextResponse.json(
        { error: 'Google Calendar not connected. Please connect first.' },
        { status: 400 }
      )
    }

    const { synced, total } = await syncConnection(connection, supabaseAdmin)

    return NextResponse.json({ success: true, synced, total })
  } catch (error) {
    console.error('Google Calendar sync error:', error)
    return NextResponse.json(
      { error: 'Sync failed: ' + error.message },
      { status: 500 }
    )
  }
}
