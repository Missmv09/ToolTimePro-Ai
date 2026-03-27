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

// POST - Create a Stripe Checkout session for invoice payment
export async function POST(request: Request) {
  try {
    const { invoiceId } = await request.json()

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 })
    }

    // Validate UUID format to prevent enumeration
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(invoiceId)) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 })
    }

    // Fetch invoice with company info
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, company:companies(id, name, stripe_connect_account_id, stripe_connect_onboarded)')
      .eq('id', invoiceId)
      .single()

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.status === 'paid') {
      return NextResponse.json({ error: 'Invoice is already paid' }, { status: 400 })
    }

    const company = invoice.company as { id: string; name: string; stripe_connect_account_id: string | null; stripe_connect_onboarded: boolean } | null

    if (!company?.stripe_connect_account_id || !company?.stripe_connect_onboarded) {
      return NextResponse.json({
        error: 'Online payments are not set up for this company. Please contact them directly.',
      }, { status: 400 })
    }

    const balanceDue = Math.round(((invoice.total || 0) - (invoice.amount_paid || 0)) * 100) // cents

    if (balanceDue <= 0) {
      return NextResponse.json({ error: 'No balance due' }, { status: 400 })
    }

    const stripe = getStripe()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tooltimepro.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Invoice ${invoice.invoice_number || invoiceId}`,
            description: `Payment to ${company.name}`,
          },
          unit_amount: balanceDue,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        transfer_data: {
          destination: company.stripe_connect_account_id,
        },
      },
      success_url: `${baseUrl}/invoice/${invoiceId}?paid=true`,
      cancel_url: `${baseUrl}/invoice/${invoiceId}`,
      metadata: {
        type: 'invoice_payment',
        invoice_id: invoiceId,
        company_id: company.id,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Invoice pay error:', err)
    return NextResponse.json({ error: 'Failed to create payment session' }, { status: 500 })
  }
}
