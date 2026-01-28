import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// QuickBooks OAuth configuration
const QUICKBOOKS_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID || ''
const QUICKBOOKS_REDIRECT_URI = process.env.QUICKBOOKS_REDIRECT_URI || ''
const QUICKBOOKS_ENVIRONMENT = process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox'

// QuickBooks OAuth base URLs
const QBO_AUTH_URL =
  QUICKBOOKS_ENVIRONMENT === 'production'
    ? 'https://appcenter.intuit.com/connect/oauth2'
    : 'https://appcenter.intuit.com/connect/oauth2'

export async function GET() {
  try {
    // Check if QuickBooks is configured
    if (!QUICKBOOKS_CLIENT_ID || !QUICKBOOKS_REDIRECT_URI) {
      console.error('QuickBooks environment variables not configured')
      return NextResponse.redirect(
        new URL('/dashboard/settings?qbo=error&reason=not_configured', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      )
    }

    // Get the current user from Supabase
    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?qbo=error&reason=db_not_configured', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          cookie: cookieStore.toString(),
        },
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(
        new URL('/auth/login?redirect=/dashboard/settings', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      )
    }

    // Generate a random state parameter for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        userId: user.id,
        timestamp: Date.now(),
        nonce: Math.random().toString(36).substring(7),
      })
    ).toString('base64')

    // Build the QuickBooks OAuth URL
    const params = new URLSearchParams({
      client_id: QUICKBOOKS_CLIENT_ID,
      response_type: 'code',
      scope: 'com.intuit.quickbooks.accounting',
      redirect_uri: QUICKBOOKS_REDIRECT_URI,
      state: state,
    })

    const authUrl = `${QBO_AUTH_URL}?${params.toString()}`

    // Redirect to QuickBooks OAuth
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Error initiating QuickBooks OAuth:', error)
    return NextResponse.redirect(
      new URL('/dashboard/settings?qbo=error', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
    )
  }
}
