import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const REDIRECT_URI = `${APP_URL}/api/google-calendar/callback`

export async function GET(request) {
  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Google Calendar environment variables not configured')
      return NextResponse.redirect(
        new URL('/dashboard/settings?gcal=error&reason=not_configured', APP_URL)
      )
    }

    // Get user from Authorization header Bearer token
    const authHeader = request.headers.get('authorization')
    let userId = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
      if (!error && user) {
        userId = user.id
      }
    }

    // Fallback: try cookie-based auth
    if (!userId) {
      const { createSupabaseServerClient } = await import('@/lib/supabase-server')
      const supabase = await createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
      }
    }

    if (!userId) {
      return NextResponse.redirect(
        new URL('/auth/login?redirect=/dashboard/settings', APP_URL)
      )
    }

    // Encode user ID in state param for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        userId,
        timestamp: Date.now(),
        nonce: Math.random().toString(36).substring(7),
      })
    ).toString('base64url')

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.events',
      access_type: 'offline',
      prompt: 'consent',
      state,
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Google Calendar connect error:', error)
    return NextResponse.redirect(
      new URL('/dashboard/settings?gcal=error', APP_URL)
    )
  }
}
