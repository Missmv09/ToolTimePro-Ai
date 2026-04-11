import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.tooltimepro.com'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      console.error('Google OAuth error:', error)
      return NextResponse.redirect(
        new URL('/dashboard/settings?gcal=error&reason=oauth_denied', SITE_URL)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?gcal=error&reason=missing_params', SITE_URL)
      )
    }

    // Decode state to get user ID
    let stateData
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
    } catch {
      return NextResponse.redirect(
        new URL('/dashboard/settings?gcal=error&reason=invalid_state', SITE_URL)
      )
    }

    const { userId, timestamp } = stateData

    // Reject stale OAuth state (older than 10 minutes) to prevent replay attacks
    if (!timestamp || Date.now() - timestamp > 10 * 60 * 1000) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?gcal=error&reason=expired_state', SITE_URL)
      )
    }

    if (!userId) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?gcal=error&reason=no_user', SITE_URL)
      )
    }

    const REDIRECT_URI = `${SITE_URL}/api/google-calendar/callback`

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text()
      console.error('Google token exchange failed:', errBody)
      return NextResponse.redirect(
        new URL('/dashboard/settings?gcal=error&reason=token_exchange', SITE_URL)
      )
    }

    const tokens = await tokenResponse.json()

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Get user's company_id from the database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase not configured')
      return NextResponse.redirect(
        new URL('/dashboard/settings?gcal=error&reason=db_not_configured', SITE_URL)
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { data: dbUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .single()

    if (userError || !dbUser?.company_id) {
      console.error('Failed to get user company:', userError)
      return NextResponse.redirect(
        new URL('/dashboard/settings?gcal=error&reason=no_company', SITE_URL)
      )
    }

    // Upsert connection (one per user)
    const { error: upsertError } = await supabaseAdmin
      .from('google_calendar_connections')
      .upsert(
        {
          user_id: userId,
          company_id: dbUser.company_id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt,
          calendar_id: 'primary',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (upsertError) {
      console.error('Failed to store Google Calendar connection:', upsertError)
      return NextResponse.redirect(
        new URL('/dashboard/settings?gcal=error&reason=db_error', SITE_URL)
      )
    }

    return NextResponse.redirect(
      new URL('/dashboard/settings?gcal=connected', SITE_URL)
    )
  } catch (error) {
    console.error('Google Calendar callback error:', error)
    return NextResponse.redirect(
      new URL('/dashboard/settings?gcal=error', SITE_URL)
    )
  }
}
