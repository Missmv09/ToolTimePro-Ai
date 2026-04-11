import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

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
      const supabase = await createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Optionally revoke the Google token before deleting
    const { data: connection } = await supabaseAdmin
      .from('google_calendar_connections')
      .select('access_token')
      .eq('user_id', userId)
      .single()

    if (connection?.access_token) {
      // Best-effort revoke — don't fail if this errors
      try {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${connection.access_token}`,
          { method: 'POST' }
        )
      } catch {
        // Revoke is best-effort
      }
    }

    // Delete the connection record
    const { error: deleteError } = await supabaseAdmin
      .from('google_calendar_connections')
      .delete()
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Failed to delete Google Calendar connection:', deleteError)
      return NextResponse.json(
        { error: 'Failed to disconnect' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Google Calendar disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect: ' + error.message },
      { status: 500 }
    )
  }
}
