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

// Stripe Connect webhook. Register it in Stripe (Developers → Webhooks) as
//   <site>/api/webhook/stripe-connect  with events:
//   checkout.session.completed, account.updated
// and set STRIPE_CONNECT_WEBHOOK_SECRET to that endpoint's signing secret.
//
// Payment handling lives in @/lib/after-payment so the thank-you page's
// confirm call applies the identical logic when this webhook is late or not
// yet configured — whichever arrives second is a no-op (record.status
// 'duplicate').
export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 })
  }

  let event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as unknown as CheckoutSessionLike
      const result = await processCheckoutSession(supabase, session)
      if (!result.handled) {
        console.log('[stripe-connect webhook] session ignored:', result.reason)
      } else {
        console.log(
          `[stripe-connect webhook] ${result.type} ${result.invoiceId || ''}: ${result.record.status}` +
            (result.hooks ? ` receipt=${JSON.stringify(result.hooks.receipt)} review=${result.hooks.reviewScheduled}` : '')
        )
      }
    }

    if (event.type === 'account.updated') {
      // Update Stripe Connect onboarding status
      const account = event.data.object
      if (account.id) {
        const onboarded = account.charges_enabled && account.details_submitted
        const { error } = await supabase
          .from('companies')
          .update({ stripe_connect_onboarded: onboarded })
          .eq('stripe_connect_account_id', account.id)
        if (error) console.error('[stripe-connect webhook] account.updated failed:', error.message)
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err)
  }

  return NextResponse.json({ received: true })
}
