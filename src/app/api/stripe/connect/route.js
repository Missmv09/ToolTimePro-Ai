import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// POST - Create Stripe Connect account and return onboarding link
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Server configuration error. Please contact support.' }, { status: 500 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 })
    }

    // Get user's company
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'No company found. Please complete your account setup first.' }, { status: 400 })
    }

    // Check if company already has a Connect account
    const { data: company } = await supabase
      .from('companies')
      .select('stripe_connect_account_id, stripe_connect_onboarded, email')
      .eq('id', userData.company_id)
      .single()

    let stripe
    try {
      stripe = getStripe()
    } catch {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please contact support.' },
        { status: 500 }
      )
    }

    let accountId = company?.stripe_connect_account_id

    // If an existing account ID is stored, verify it's still valid in Stripe
    if (accountId) {
      try {
        await stripe.accounts.retrieve(accountId)
      } catch (retrieveErr) {
        // Account no longer exists in Stripe — clear stale ID and create a new one
        console.warn('Stale Stripe Connect account ID, clearing:', accountId, retrieveErr.message)
        await supabase
          .from('companies')
          .update({ stripe_connect_account_id: null, stripe_connect_onboarded: false })
          .eq('id', userData.company_id)
        accountId = null
      }
    }

    // Create account if doesn't exist
    if (!accountId) {
      try {
        const account = await stripe.accounts.create({
          type: 'standard',
          email: company?.email || user.email,
        })
        accountId = account.id

        await supabase
          .from('companies')
          .update({ stripe_connect_account_id: accountId })
          .eq('id', userData.company_id)
      } catch (createErr) {
        console.error('Failed to create Stripe account:', createErr)
        let msg = 'Failed to create Stripe account. Please try again.'
        if (createErr?.message?.includes('api_key')) {
          msg = 'Stripe API key is invalid. Please contact support.'
        } else if (createErr?.code === 'platform_api_not_enabled') {
          msg = 'Stripe Connect is not enabled on this account. Please enable Connect in your Stripe dashboard at https://dashboard.stripe.com/connect/overview'
        } else if (createErr?.type === 'StripeInvalidRequestError') {
          msg = `Stripe error: ${createErr.message}`
        }
        return NextResponse.json({ error: msg }, { status: 500 })
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://tooltimepro.com'

    // Create onboarding link
    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/dashboard/settings?tab=integrations&stripe=refresh`,
        return_url: `${baseUrl}/dashboard/settings?tab=integrations&stripe=connected`,
        type: 'account_onboarding',
      })

      return NextResponse.json({ url: accountLink.url })
    } catch (linkErr) {
      console.error('Failed to create Stripe account link:', linkErr)
      return NextResponse.json(
        { error: 'Failed to generate Stripe setup link. Please try again.' },
        { status: 500 }
      )
    }
  } catch (err) {
    console.error('Stripe Connect error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
