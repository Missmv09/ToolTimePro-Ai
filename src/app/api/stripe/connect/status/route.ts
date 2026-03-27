import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// GET - Check Stripe Connect status for the user's company
export async function GET(request: Request) {
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

    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ connected: false })
    }

    const { data: company } = await supabase
      .from('companies')
      .select('stripe_connect_account_id, stripe_connect_onboarded')
      .eq('id', userData.company_id)
      .single()

    return NextResponse.json({
      connected: !!company?.stripe_connect_account_id,
      onboarded: company?.stripe_connect_onboarded || false,
    })
  } catch (error) {
    console.error('Stripe connect status error:', error);
    return NextResponse.json({ connected: false })
  }
}
