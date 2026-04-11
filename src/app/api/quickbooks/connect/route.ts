import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// QuickBooks OAuth configuration
const QUICKBOOKS_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID || ''
const QUICKBOOKS_REDIRECT_URI = process.env.QUICKBOOKS_REDIRECT_URI || ''

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.tooltimepro.com'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  try {
    // Check if QuickBooks is configured
    if (!QUICKBOOKS_CLIENT_ID || !QUICKBOOKS_REDIRECT_URI) {
      console.error('QuickBooks environment variables not configured')
      return NextResponse.json(
        { error: 'QuickBooks is not configured. Please contact support.' },
        { status: 503 }
      )
    }

    // Authenticate via Bearer token (the app uses localStorage-based auth,
    // so cookies are not available in API routes)
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      )
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Session expired. Please log in again.' },
        { status: 401 }
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
      return NextResponse.json(
        { error: 'No company found. Please complete your account setup first.' },
        { status: 400 }
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

    return NextResponse.json({ url: authUrl })
  } catch (error) {
    console.error('Error initiating QuickBooks OAuth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate QuickBooks connection. Please try again.' },
      { status: 500 }
    )
  }
}
