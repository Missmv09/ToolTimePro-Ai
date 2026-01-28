import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getOAuthClient } from '@/lib/quickbooks/client'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state') // Contains user ID
    const realmId = url.searchParams.get('realmId')
    const error = url.searchParams.get('error')

    // Check for OAuth errors
    if (error) {
      console.error('QuickBooks OAuth error:', error)
      return NextResponse.redirect(
        new URL('/dashboard/settings?qbo=error&message=' + encodeURIComponent(error), request.url)
      )
    }

    // Validate required parameters
    if (!code || !state || !realmId) {
      console.error('Missing OAuth parameters:', { code: !!code, state: !!state, realmId: !!realmId })
      return NextResponse.redirect(
        new URL('/dashboard/settings?qbo=error&message=missing_params', request.url)
      )
    }

    const userId = state

    // Verify user exists
    const { data: user, error: userError } = await getSupabaseAdmin()
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.error('User not found:', userId)
      return NextResponse.redirect(
        new URL('/dashboard/settings?qbo=error&message=user_not_found', request.url)
      )
    }

    // Initialize OAuth client and exchange code for tokens
    const oauthClient = getOAuthClient()

    try {
      const authResponse = await oauthClient.createToken(url.toString())
      const token = authResponse.getJson()

      // Calculate token expiration time
      const expiresAt = new Date()
      expiresAt.setSeconds(expiresAt.getSeconds() + token.expires_in)

      // Check if connection already exists for this user
      const { data: existingConnection } = await getSupabaseAdmin()
        .from('qbo_connections')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (existingConnection) {
        // Update existing connection
        const { error: updateError } = await getSupabaseAdmin()
          .from('qbo_connections')
          .update({
            qbo_realm_id: realmId,
            access_token: token.access_token,
            refresh_token: token.refresh_token,
            token_expires_at: expiresAt.toISOString(),
            connected_at: new Date().toISOString(),
            sync_status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingConnection.id)

        if (updateError) {
          console.error('Error updating QBO connection:', updateError)
          return NextResponse.redirect(
            new URL('/dashboard/settings?qbo=error&message=db_error', request.url)
          )
        }
      } else {
        // Create new connection
        const { error: insertError } = await getSupabaseAdmin()
          .from('qbo_connections')
          .insert({
            user_id: userId,
            qbo_realm_id: realmId,
            access_token: token.access_token,
            refresh_token: token.refresh_token,
            token_expires_at: expiresAt.toISOString(),
            connected_at: new Date().toISOString(),
            sync_status: 'active',
          })

        if (insertError) {
          console.error('Error creating QBO connection:', insertError)
          return NextResponse.redirect(
            new URL('/dashboard/settings?qbo=error&message=db_error', request.url)
          )
        }
      }

      // Log the successful connection
      await getSupabaseAdmin().from('qbo_sync_log').insert({
        user_id: userId,
        sync_type: 'connection',
        direction: 'to_qbo',
        status: 'success',
      })

      // Redirect to settings page with success message
      return NextResponse.redirect(
        new URL('/dashboard/settings?qbo=connected', request.url)
      )
    } catch (tokenError) {
      console.error('Token exchange error:', tokenError)
      return NextResponse.redirect(
        new URL('/dashboard/settings?qbo=error&message=token_exchange_failed', request.url)
      )
    }
  } catch (error) {
    console.error('QuickBooks callback error:', error)
    return NextResponse.redirect(
      new URL('/dashboard/settings?qbo=error&message=unknown', request.url)
    )
  }
}
