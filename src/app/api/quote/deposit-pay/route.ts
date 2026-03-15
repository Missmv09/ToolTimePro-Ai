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

// POST - Create a Stripe Checkout session for quote deposit
export async function POST(request: Request) {
  try {
    const { quoteId } = await request.json()

    if (!quoteId) {
      return NextResponse.json({ error: 'Quote ID required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 })
    }

    // Fetch quote with company info
    const { data: quote } = await supabase
      .from('quotes')
      .select('*, company:companies(id, name, stripe_connect_account_id, stripe_connect_onboarded)')
      .eq('id', quoteId)
      .single()

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    if (quote.deposit_paid) {
      return NextResponse.json({ error: 'Deposit already paid' }, { status: 400 })
    }

    if (!quote.deposit_required) {
      return NextResponse.json({ error: 'No deposit required for this quote' }, { status: 400 })
    }

    const company = quote.company as { id: string; name: string; stripe_connect_account_id: string | null; stripe_connect_onboarded: boolean } | null

    if (!company?.stripe_connect_account_id || !company?.stripe_connect_onboarded) {
      return NextResponse.json({
        error: 'Online payments are not set up for this company. Please contact them directly.',
      }, { status: 400 })
    }

    // Calculate deposit amount
    let depositAmount: number
    if (quote.deposit_amount) {
      depositAmount = quote.deposit_amount
    } else if (quote.deposit_percentage && quote.total) {
      depositAmount = (quote.deposit_percentage / 100) * quote.total
    } else {
      return NextResponse.json({ error: 'No deposit amount configured' }, { status: 400 })
    }

    const depositCents = Math.round(depositAmount * 100)

    if (depositCents <= 0) {
      return NextResponse.json({ error: 'Invalid deposit amount' }, { status: 400 })
    }

    const stripe = getStripe()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tooltimepro.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Deposit for Quote ${quote.quote_number || quoteId}`,
            description: `Deposit payment to ${company.name}`,
          },
          unit_amount: depositCents,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        transfer_data: {
          destination: company.stripe_connect_account_id,
        },
      },
      success_url: `${baseUrl}/quote/${quoteId}?deposit_paid=true`,
      cancel_url: `${baseUrl}/quote/${quoteId}`,
      metadata: {
        type: 'quote_deposit',
        quote_id: quoteId,
        company_id: company.id,
        deposit_amount: depositAmount.toString(),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Quote deposit pay error:', err)
    return NextResponse.json({ error: 'Failed to create payment session' }, { status: 500 })
  }
}
