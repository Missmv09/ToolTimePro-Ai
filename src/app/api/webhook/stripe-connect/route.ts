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
      const session = event.data.object
      const metadata = session.metadata || {}

      if (metadata.type === 'invoice_payment') {
        // Handle invoice payment
        const invoiceId = metadata.invoice_id
        const amountPaid = (session.amount_total || 0) / 100

        // Update invoice
        const { data: invoice } = await supabase
          .from('invoices')
          .select('total, amount_paid, customer_id')
          .eq('id', invoiceId)
          .single()

        if (invoice) {
          const newAmountPaid = (invoice.amount_paid || 0) + amountPaid
          const isPaidInFull = newAmountPaid >= (invoice.total || 0)

          await supabase
            .from('invoices')
            .update({
              amount_paid: newAmountPaid,
              status: isPaidInFull ? 'paid' : 'partial',
              paid_at: isPaidInFull ? new Date().toISOString() : null,
              stripe_payment_intent_id: session.payment_intent as string,
            })
            .eq('id', invoiceId)

          // Record payment
          await supabase.from('payments').insert({
            company_id: metadata.company_id,
            invoice_id: invoiceId,
            customer_id: invoice.customer_id,
            amount: amountPaid,
            payment_method: 'stripe',
            status: 'completed',
            stripe_payment_id: session.payment_intent as string,
            paid_at: new Date().toISOString(),
          })

          // Update related leads to won
          if (isPaidInFull && invoice.customer_id) {
            await supabase
              .from('leads')
              .update({ status: 'won' })
              .eq('customer_id', invoice.customer_id)
              .in('status', ['new', 'contacted', 'quoted', 'booked'])
          }
        }
      } else if (metadata.type === 'quote_deposit') {
        // Handle quote deposit payment
        const quoteId = metadata.quote_id
        const depositAmount = parseFloat(metadata.deposit_amount || '0')

        await supabase
          .from('quotes')
          .update({
            deposit_paid: true,
            deposit_paid_at: new Date().toISOString(),
            deposit_stripe_payment_id: session.payment_intent as string,
          })
          .eq('id', quoteId)

        // Auto-create invoice from approved quote with deposit recorded
        const { data: quote } = await supabase
          .from('quotes')
          .select('*, items:quote_items(*)')
          .eq('id', quoteId)
          .single()

        if (quote) {
          // Check if invoice already exists for this quote
          const { data: existingInvoice } = await supabase
            .from('invoices')
            .select('id')
            .eq('quote_id', quoteId)
            .single()

          if (!existingInvoice) {
            // Generate invoice number
            const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
            const { count } = await supabase
              .from('invoices')
              .select('*', { count: 'exact', head: true })
              .eq('company_id', quote.company_id)

            const invoiceNumber = `INV-${today}-${String((count || 0) + 1).padStart(4, '0')}`

            const { data: newInvoice } = await supabase
              .from('invoices')
              .insert({
                company_id: quote.company_id,
                customer_id: quote.customer_id,
                quote_id: quoteId,
                invoice_number: invoiceNumber,
                subtotal: quote.subtotal,
                tax_rate: quote.tax_rate,
                tax_amount: quote.tax_amount,
                discount_amount: quote.discount_amount || 0,
                total: quote.total,
                amount_paid: depositAmount,
                deposit_amount: depositAmount,
                status: depositAmount >= quote.total ? 'paid' : 'partial',
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                paid_at: depositAmount >= quote.total ? new Date().toISOString() : null,
              })
              .select()
              .single()

            // Copy line items
            if (newInvoice && quote.items?.length) {
              const invoiceItems = quote.items.map((item: { description: string; quantity: number; unit_price: number; total_price: number; sort_order: number }, index: number) => ({
                invoice_id: newInvoice.id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price || item.quantity * item.unit_price,
                sort_order: item.sort_order || index,
              }))

              await supabase.from('invoice_items').insert(invoiceItems)
            }

            // Record deposit payment
            if (newInvoice) {
              await supabase.from('payments').insert({
                company_id: quote.company_id,
                invoice_id: newInvoice.id,
                customer_id: quote.customer_id,
                amount: depositAmount,
                payment_method: 'stripe',
                status: 'completed',
                stripe_payment_id: session.payment_intent as string,
                notes: 'Quote deposit',
                paid_at: new Date().toISOString(),
              })
            }
          }
        }
      }
    }

    if (event.type === 'account.updated') {
      // Update Stripe Connect onboarding status
      const account = event.data.object
      if (account.id) {
        const onboarded = account.charges_enabled && account.details_submitted
        await supabase
          .from('companies')
          .update({ stripe_connect_onboarded: onboarded })
          .eq('stripe_connect_account_id', account.id)
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err)
  }

  return NextResponse.json({ received: true })
}
