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

// POST - Verify Stripe Connect onboarding is complete
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 })
    }

    const { data: company } = await supabase
      .from('companies')
      .select('stripe_connect_account_id')
      .eq('id', userData.company_id)
      .single()

    if (!company?.stripe_connect_account_id) {
      return NextResponse.json({ error: 'No Stripe account found' }, { status: 400 })
    }

    let stripe
    try {
      stripe = getStripe()
    } catch {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
    }

    const account = await stripe.accounts.retrieve(company.stripe_connect_account_id)

    const onboarded = account.charges_enabled && account.details_submitted

    await supabase
      .from('companies')
      .update({ stripe_connect_onboarded: onboarded })
      .eq('id', userData.company_id)

    return NextResponse.json({
      onboarded,
      charges_enabled: account.charges_enabled,
      details_submitted: account.details_submitted,
    })
  } catch (err) {
    console.error('Stripe Connect callback error:', err)
    return NextResponse.json({ error: 'Failed to verify Stripe connection' }, { status: 500 })
  }
}
