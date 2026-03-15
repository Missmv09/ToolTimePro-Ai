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
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 })
    }

    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get user's company
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 })
    }

    // Check if company already has a Connect account
    const { data: company } = await supabase
      .from('companies')
      .select('stripe_connect_account_id, stripe_connect_onboarded, email')
      .eq('id', userData.company_id)
      .single()

    const stripe = getStripe()
    let accountId = company?.stripe_connect_account_id

    // Create account if doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'standard',
        email: company?.email || user.email,
      })
      accountId = account.id

      await supabase
        .from('companies')
        .update({ stripe_connect_account_id: accountId })
        .eq('id', userData.company_id)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tooltimepro.com'

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/dashboard/settings?tab=integrations&stripe=refresh`,
      return_url: `${baseUrl}/dashboard/settings?tab=integrations&stripe=connected`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err) {
    console.error('Stripe Connect error:', err)
    return NextResponse.json({ error: 'Failed to create Stripe connection' }, { status: 500 })
  }
}
