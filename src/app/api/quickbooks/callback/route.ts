import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// QuickBooks OAuth configuration
const QUICKBOOKS_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID || ''
const QUICKBOOKS_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET || ''
const QUICKBOOKS_REDIRECT_URI = process.env.QUICKBOOKS_REDIRECT_URI || ''

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.tooltimepro.com'

// QuickBooks token endpoint (same for sandbox and production)
const QBO_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const realmId = searchParams.get('realmId')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('QuickBooks OAuth error:', error)
      return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&qbo=error&reason=oauth_denied', SITE_URL))
    }

    // Validate required parameters
    if (!code || !realmId || !state) {
      console.error('Missing required OAuth parameters')
      return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&qbo=error&reason=missing_params', SITE_URL))
    }

    // Decode and validate state (base64url encoding, matching connect route)
    let stateData: { userId: string; companyId?: string; timestamp: number }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
    } catch {
      console.error('Invalid state parameter')
      return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&qbo=error&reason=invalid_state', SITE_URL))
    }

    // Check if state is not too old (15 minutes max)
    if (!stateData.timestamp || Date.now() - stateData.timestamp > 15 * 60 * 1000) {
      console.error('State parameter expired')
      return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&qbo=error&reason=state_expired', SITE_URL))
    }

    if (!stateData.userId) {
      console.error('No user ID in state')
      return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&qbo=error&reason=no_user', SITE_URL))
    }

    // Validate QuickBooks credentials are available for token exchange
    if (!QUICKBOOKS_CLIENT_ID || !QUICKBOOKS_CLIENT_SECRET) {
      console.error('QuickBooks client credentials not configured')
      return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&qbo=error&reason=not_configured', SITE_URL))
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
      return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&qbo=error&reason=token_exchange_failed', SITE_URL))
    }

    const tokenData = await tokenResponse.json()

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

    // Store the connection in the database using service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase not configured')
      return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&qbo=error&reason=db_not_configured', SITE_URL))
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Resolve company_id — prefer state (set by connect route), fall back to DB lookup
    let companyId = stateData.companyId
    if (!companyId) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', stateData.userId)
        .single()

      if (userError) {
        console.error('Failed to get user company:', userError)
      }
      companyId = userData?.company_id
    }

    // Try new schema first (after migration: company_id + realm_id columns)
    // If that fails, fall back to old schema (user_id + qbo_realm_id columns)
    let upsertSucceeded = false

    if (companyId) {
      const { error: dbError } = await supabase.from('qbo_connections').upsert(
        {
          user_id: stateData.userId,
          company_id: companyId,
          realm_id: realmId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: expiresAt,
          connected_at: new Date().toISOString(),
        },
        {
          onConflict: 'company_id',
        }
      )

      if (!dbError) {
        upsertSucceeded = true
      } else {
        console.warn('New schema upsert failed, trying old schema:', dbError.message)
      }
    }

    // Fallback: old schema (before migration — uses user_id + qbo_realm_id)
    if (!upsertSucceeded) {
      const { error: fallbackError } = await supabase.from('qbo_connections').upsert(
        {
          user_id: stateData.userId,
          qbo_realm_id: realmId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: expiresAt,
          connected_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )

      if (fallbackError) {
        console.error('Failed to store QBO connection (both schemas tried):', fallbackError)
        return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&qbo=error&reason=db_error', SITE_URL))
      }
    }

    // Success! Redirect back to settings integrations tab with success message
    return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&qbo=connected', SITE_URL))
  } catch (error) {
    console.error('Error in QuickBooks callback:', error)
    return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&qbo=error', SITE_URL))
  }
}
