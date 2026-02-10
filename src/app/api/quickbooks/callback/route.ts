import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// QuickBooks OAuth configuration
const QUICKBOOKS_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID || ''
const QUICKBOOKS_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET || ''
const QUICKBOOKS_REDIRECT_URI = process.env.QUICKBOOKS_REDIRECT_URI || ''
const QUICKBOOKS_ENVIRONMENT = process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox'

// QuickBooks token endpoint
const QBO_TOKEN_URL =
  QUICKBOOKS_ENVIRONMENT === 'production'
    ? 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
    : 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const realmId = searchParams.get('realmId')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('QuickBooks OAuth error:', error)
      return NextResponse.redirect(new URL('/dashboard/settings?qbo=error&reason=oauth_denied', SITE_URL))
    }

    // Validate required parameters
    if (!code || !realmId || !state) {
      console.error('Missing required OAuth parameters')
      return NextResponse.redirect(new URL('/dashboard/settings?qbo=error&reason=missing_params', SITE_URL))
    }

    // Decode and validate state
    let stateData: { userId: string; companyId?: string; timestamp: number }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    } catch {
      console.error('Invalid state parameter')
      return NextResponse.redirect(new URL('/dashboard/settings?qbo=error&reason=invalid_state', SITE_URL))
    }

    // Check if state is not too old (15 minutes max)
    if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
      console.error('State parameter expired')
      return NextResponse.redirect(new URL('/dashboard/settings?qbo=error&reason=state_expired', SITE_URL))
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(QBO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`).toString('base64')}`,
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: QUICKBOOKS_REDIRECT_URI,
      }).toString(),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Failed to exchange code for tokens:', errorText)
      return NextResponse.redirect(new URL('/dashboard/settings?qbo=error&reason=token_exchange_failed', SITE_URL))
    }

    const tokenData = await tokenResponse.json()

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

    // Store the connection in the database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase not configured')
      return NextResponse.redirect(new URL('/dashboard/settings?qbo=error&reason=db_not_configured', SITE_URL))
    }

    // Use service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Resolve company_id — either from state or by looking up the user
    let companyId = stateData.companyId
    if (!companyId) {
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', stateData.userId)
        .single()
      companyId = userData?.company_id
    }

    if (!companyId) {
      console.error('No company found for user')
      return NextResponse.redirect(new URL('/dashboard/settings?qbo=error&reason=no_company', SITE_URL))
    }

    // Upsert the connection (update if exists, insert if not)
    const { error: dbError } = await supabase.from('qbo_connections').upsert(
      {
        company_id: companyId,
        realm_id: realmId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        connected_at: new Date().toISOString(),
      },
      {
        onConflict: 'company_id',
      }
    )

    if (dbError) {
      console.error('Failed to store QBO connection:', dbError)
      return NextResponse.redirect(new URL('/dashboard/settings?qbo=error&reason=db_error', SITE_URL))
    }

    // Success! Redirect back to settings with success message
    return NextResponse.redirect(new URL('/dashboard/settings?qbo=connected', SITE_URL))
  } catch (error) {
    console.error('Error in QuickBooks callback:', error)
    return NextResponse.redirect(new URL('/dashboard/settings?qbo=error', SITE_URL))
  }
}
