import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getOAuthClient } from '@/lib/quickbooks/client'

export async function GET(request: Request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    const cookieHeader = request.headers.get('cookie')

    // Extract access token from cookie or header
    let accessToken: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7)
    } else if (cookieHeader) {
      // Parse Supabase auth cookie
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        acc[key] = value
        return acc
      }, {} as Record<string, string>)

      // Try to find the Supabase auth token in cookies
      const authCookieKey = Object.keys(cookies).find(
        (key) => key.includes('auth-token') || key.includes('sb-')
      )
      if (authCookieKey) {
        try {
          const decoded = decodeURIComponent(cookies[authCookieKey])
          const parsed = JSON.parse(decoded)
          accessToken = parsed.access_token || parsed
        } catch {
          // Cookie might be the token itself
          accessToken = cookies[authCookieKey]
        }
      }
    }

    // For now, get user from session using URL params as fallback
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')

    // Verify user exists
    if (!userId) {
      return NextResponse.redirect(
        new URL('/auth/login?error=unauthorized', request.url)
      )
    }

    const { data: user, error: userError } = await getSupabaseAdmin()
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.redirect(
        new URL('/auth/login?error=unauthorized', request.url)
      )
    }

    // Initialize OAuth client
    const oauthClient = getOAuthClient()

    // Generate authorization URL
    const authUri = oauthClient.authorizeUri({
      scope: [
        'com.intuit.quickbooks.accounting',
      ],
      state: userId, // Pass user ID in state for callback
    })

    // Redirect to QuickBooks OAuth
    return NextResponse.redirect(authUri)
  } catch (error) {
    console.error('QuickBooks connect error:', error)
    return NextResponse.redirect(
      new URL('/dashboard/settings?qbo=error', request.url)
    )
  }
}
