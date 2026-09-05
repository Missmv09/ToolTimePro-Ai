import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import { processCheckoutSession, type CheckoutSessionLike } from '@/lib/after-payment'

export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// POST { sessionId } — called by the invoice/quote thank-you page when Stripe
// redirects back with ?session_id={CHECKOUT_SESSION_ID}.
//
// Stripe is the source of truth: the session is retrieved server-side and only
// applied when Stripe says payment_status === 'paid'. The session id is an
// unguessable secret (cs_...) and the metadata Stripe stored decides which
// invoice is touched, so nothing in the request body can redirect a payment.
//
// This makes the paid flip independent of webhook delivery. If the webhook
// already ran, processCheckoutSession reports 'duplicate' and does nothing.
export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId || typeof sessionId !== 'string' || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
      return NextResponse.json({ error: 'Invalid session id' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 })
    }

    const stripe = getStripe()
    const session = (await stripe.checkout.sessions.retrieve(sessionId)) as unknown as CheckoutSessionLike

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ confirmed: false, paymentStatus: session.payment_status || 'unknown' })
    }

    const result = await processCheckoutSession(supabase, session)
    if (!result.handled) {
      return NextResponse.json({ confirmed: false, error: result.reason }, { status: 400 })
    }

    return NextResponse.json({
      confirmed: true,
      type: result.type,
      invoiceId: result.invoiceId,
      quoteId: result.quoteId || null,
      status: result.record.status,
      receipt: result.hooks?.receipt || null,
    })
  } catch (err) {
    console.error('Checkout confirm error:', err)
    return NextResponse.json({ error: 'Failed to confirm payment' }, { status: 500 })
  }
}
