import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// QuickBooks OAuth configuration
const QUICKBOOKS_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID || ''
const QUICKBOOKS_REDIRECT_URI = process.env.QUICKBOOKS_REDIRECT_URI || ''

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.tooltimepro.com'

export async function GET() {
  try {
    // Check if QuickBooks is configured
    if (!QUICKBOOKS_CLIENT_ID || !QUICKBOOKS_REDIRECT_URI) {
      console.error('QuickBooks environment variables not configured')
      return NextResponse.redirect(
        new URL('/dashboard/settings?tab=integrations&qbo=error&reason=not_configured', SITE_URL)
      )
    }

    // Get the current user from Supabase using SSR client
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('Error getting user:', userError)
    }

    if (!user) {
      return NextResponse.redirect(
        new URL('/auth/login?redirect=/dashboard/settings', SITE_URL)
      )
    }

    // Look up the user's company_id before starting OAuth
    const { data: dbUser } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!dbUser?.company_id) {
      console.error('No company found for user before QuickBooks OAuth')
      return NextResponse.redirect(
        new URL('/dashboard/settings?tab=integrations&qbo=error&reason=no_company', SITE_URL)
      )
    }

    // Generate a random state parameter for CSRF protection
    // Use base64url encoding (URL-safe: no +, /, or = characters that break OAuth redirects)
    const state = Buffer.from(
      JSON.stringify({
        userId: user.id,
        companyId: dbUser.company_id,
        timestamp: Date.now(),
        nonce: Math.random().toString(36).substring(7),
      })
    ).toString('base64url')

    // Build the QuickBooks OAuth URL
    const params = new URLSearchParams({
      client_id: QUICKBOOKS_CLIENT_ID,
      response_type: 'code',
      scope: 'com.intuit.quickbooks.accounting',
      redirect_uri: QUICKBOOKS_REDIRECT_URI,
      state: state,
    })

    const authUrl = `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`

    // Redirect to QuickBooks OAuth
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Error initiating QuickBooks OAuth:', error)
    return NextResponse.redirect(
      new URL('/dashboard/settings?tab=integrations&qbo=error', SITE_URL)
    )
  }
}
