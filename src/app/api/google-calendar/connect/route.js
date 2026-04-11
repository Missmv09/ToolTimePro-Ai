import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.tooltimepro.com'

export async function GET() {
  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Google Calendar environment variables not configured')
      return NextResponse.redirect(
        new URL('/dashboard/settings?gcal=error&reason=not_configured', SITE_URL)
      )
    }

    // Get the current user from Supabase using SSR client
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError) {
      console.error('Error getting user:', userError)
    }

    if (!user) {
      return NextResponse.redirect(
        new URL('/auth/login?redirect=/dashboard/settings', SITE_URL)
      )
    }

    // Encode user ID in state param for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        userId: user.id,
        timestamp: Date.now(),
        nonce: Math.random().toString(36).substring(7),
      })
    ).toString('base64url')

    const REDIRECT_URI = `${SITE_URL}/api/google-calendar/callback`

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
      new URL('/dashboard/settings?gcal=error', SITE_URL)
    )
  }
}
