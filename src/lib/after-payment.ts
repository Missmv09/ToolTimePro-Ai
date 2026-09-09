// After-payment pipeline shared by every path a payment can arrive on:
//
//   - Stripe Connect webhook (checkout.session.completed)
//   - the thank-you page's confirm call (/api/stripe/checkout/confirm), which
//     retrieves the Checkout Session server-side so a paid invoice flips to
//     "paid" even when the webhook endpoint is not configured or is delayed
//   - card-on-file charges for recurring services (chargeCardOnFile)
//   - the dashboard "Mark Paid" button, via /api/invoice/receipt
//
// One payment is recorded exactly once (unique index on
// payments.stripe_payment_id, plus a pre-check), then the hooks run:
// receipt email + SMS, the review request queued for
// companies.review_delay_hours later, and leads marked won.
//
// Every Supabase write checks `error`. supabase-js resolves with { error }
// instead of throwing, so an unchecked insert (a missing column, a constraint)
// vanishes silently — which is exactly how payments.customer_id inserts were
// failing before migration 054.

import type { SupabaseClient } from '@supabase/supabase-js'
import { sendPaymentReceiptEmail } from '@/lib/email'
import { sendSMS, SMS_TEMPLATES } from '@/lib/twilio'
import { getStripe } from '@/lib/stripe'

type SB = SupabaseClient<any, any, any>

export const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://taskiguana.com'

export interface CardDetails {
  brand?: string | null
  last4?: string | null
  expMonth?: number | null
  expYear?: number | null
}

export type PaymentMethodKind = 'stripe' | 'card_on_file' | 'manual' | 'cash' | 'check' | 'other'

export interface InvoiceRow {
  id: string
  company_id: string | null
  customer_id: string | null
  job_id: string | null
  quote_id: string | null
  invoice_number: string | null
  total: number | null
  amount_paid: number | null
  status: string | null
}

export interface RecordPaymentInput {
  invoiceId: string
  amount: number
  paymentMethod: PaymentMethodKind
  stripePaymentId?: string | null
  card?: CardDetails | null
  notes?: string | null
}

export type RecordPaymentResult =
  | { status: 'recorded'; invoice: InvoiceRow; paymentId: string | null; paidInFull: boolean; newAmountPaid: number }
  | { status: 'duplicate'; invoice: InvoiceRow }
  | { status: 'not_found' }
  | { status: 'error'; error: string }

export interface HookResult {
  receipt: { email: boolean; sms: boolean }
  reviewScheduled: boolean
  reviewReason?: string
}

/** The only fields the pipeline needs from a Stripe Checkout Session. */
export interface CheckoutSessionLike {
  id?: string
  payment_intent?: string | { id: string } | null
  amount_total?: number | null
  customer?: string | { id: string } | null
  payment_status?: string | null
  metadata?: Record<string, string | undefined> | null
}

/** Minimal Stripe surface used here, so tests can pass a stub. */
export interface StripeLike {
  paymentIntents: {
    retrieve: (id: string, params?: any) => Promise<any>
    create: (params: any) => Promise<any>
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100

function idOf(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null
  return typeof ref === 'string' ? ref : ref.id
}

/** Human label for the receipt: "Visa ending in 4242", "Card", "Cash", ... */
export function paymentLabel(method: PaymentMethodKind, card?: CardDetails | null): string {
  if (card?.last4) {
    const brand = card.brand ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1) : 'Card'
    return `${brand} ending in ${card.last4}`
  }
  switch (method) {
    case 'stripe':
    case 'card_on_file':
      return 'Card'
    case 'cash':
      return 'Cash'
    case 'check':
      return 'Check'
    default:
      return 'Payment'
  }
}

/** True when a Postgres error says a column in the payload does not exist. */
function isMissingColumnError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  return err.code === '42703' || /column .* does not exist/i.test(err.message || '') || /schema cache/i.test(err.message || '')
}

// ============================================================
// 1. Record the payment (idempotent) and update the invoice
// ============================================================

export async function recordInvoicePayment(supabase: SB, input: RecordPaymentInput): Promise<RecordPaymentResult> {
  const { invoiceId, amount, paymentMethod, stripePaymentId, card, notes } = input

  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .select('id, company_id, customer_id, job_id, quote_id, invoice_number, total, amount_paid, status')
    .eq('id', invoiceId)
    .single()

  if (invErr || !invoice) {
    if (invErr) console.error('[after-payment] invoice lookup failed:', invErr.message)
    return { status: 'not_found' }
  }

  // Pre-check so the common retry (webhook + confirm for the same session)
  // never even attempts the insert.
  if (stripePaymentId) {
    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('stripe_payment_id', stripePaymentId)
      .limit(1)
    if (existing && existing.length > 0) {
      return { status: 'duplicate', invoice }
    }
  }

  const paidAt = new Date().toISOString()
  const basePayment = {
    company_id: invoice.company_id,
    invoice_id: invoice.id,
    amount,
    payment_method: paymentMethod,
    status: 'completed',
    stripe_payment_id: stripePaymentId || null,
    notes: notes || null,
    paid_at: paidAt,
  }
  const fullPayment = {
    ...basePayment,
    customer_id: invoice.customer_id,
    card_brand: card?.brand || null,
    card_last4: card?.last4 || null,
  }

  let paymentId: string | null = null
  let { data: inserted, error: insErr } = await supabase.from('payments').insert(fullPayment).select('id').single()

  // Databases that have not run migration 054 yet lack customer_id/card_*;
  // fall back to the legacy columns rather than losing the payment record.
  if (insErr && isMissingColumnError(insErr)) {
    console.warn('[after-payment] payments table is missing a column (run migration 054); retrying without it')
    ;({ data: inserted, error: insErr } = await supabase.from('payments').insert(basePayment).select('id').single())
  }

  if (insErr) {
    if (insErr.code === '23505') {
      // Unique violation on stripe_payment_id: the other path won the race.
      return { status: 'duplicate', invoice }
    }
    // Do not stop here: the invoice must still flip to paid. The missing
    // payments row is logged loudly instead of failing the customer.
    console.error('[after-payment] failed to insert payment row:', insErr.message)
  } else {
    paymentId = inserted?.id || null
  }

  const newAmountPaid = round2((Number(invoice.amount_paid) || 0) + amount)
  const total = Number(invoice.total) || 0
  // Half a cent of tolerance so 49.99 + 0.01 float noise still counts as paid.
  const paidInFull = newAmountPaid >= total - 0.005

  const update: Record<string, unknown> = {
    amount_paid: newAmountPaid,
    status: paidInFull ? 'paid' : 'partial',
    paid_at: paidInFull ? paidAt : null,
    updated_at: paidAt,
  }
  if (stripePaymentId && paymentMethod !== 'manual') {
    update.stripe_payment_intent_id = stripePaymentId
  }

  const { error: updErr } = await supabase.from('invoices').update(update).eq('id', invoice.id)
  if (updErr) {
    console.error('[after-payment] failed to update invoice:', updErr.message)
    return { status: 'error', error: updErr.message }
  }

  // Booked/quoted leads for this customer are won once the invoice is paid.
  if (paidInFull && invoice.customer_id) {
    const { error: leadErr } = await supabase
      .from('leads')
      .update({ status: 'won', updated_at: paidAt })
      .eq('customer_id', invoice.customer_id)
      .in('status', ['new', 'contacted', 'quoted', 'booked'])
    if (leadErr) console.warn('[after-payment] lead update failed:', leadErr.message)
  }

  return {
    status: 'recorded',
    invoice: { ...invoice, amount_paid: newAmountPaid, status: paidInFull ? 'paid' : 'partial' },
    paymentId,
    paidInFull,
    newAmountPaid,
  }
}

// ============================================================
// 2. Receipt + review request + next steps
// ============================================================

export interface HookInput {
  invoice: InvoiceRow
  amount: number
  paidInFull: boolean
  paymentId?: string | null
  paymentMethod: PaymentMethodKind
  card?: CardDetails | null
  /** 'deposit' changes the receipt copy and does not queue a review. */
  kind?: 'payment' | 'deposit'
  /** Card was saved for future charges during this payment. */
  cardSaved?: boolean
}

export async function runAfterPaymentHooks(supabase: SB, input: HookInput): Promise<HookResult> {
  const { invoice, amount, paidInFull, paymentId, paymentMethod, card, cardSaved } = input
  const kind = input.kind || 'payment'
  const result: HookResult = { receipt: { email: false, sms: false }, reviewScheduled: false }

  const [{ data: company }, { data: customer }, { data: items }] = await Promise.all([
    invoice.company_id
      ? supabase
          .from('companies')
          .select('id, name, phone, email, logo_url, google_review_link, yelp_review_link')
          .eq('id', invoice.company_id)
          .single()
      : Promise.resolve({ data: null }),
    invoice.customer_id
      ? supabase
          .from('customers')
          .select('id, name, email, phone, sms_consent, business_name')
          .eq('id', invoice.customer_id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from('invoice_items')
      .select('description, quantity, unit_price, total_price')
      .eq('invoice_id', invoice.id)
      .order('sort_order', { ascending: true }),
  ])

  const companyName = company?.name || 'Your service provider'
  const invoiceNumber = invoice.invoice_number || `INV-${invoice.id.slice(0, 8).toUpperCase()}`
  const invoiceLink = `${BASE_URL}/invoice/${invoice.id}`
  const bookingLink = company?.id ? `${BASE_URL}/book/${company.id}` : null
  const total = Number(invoice.total) || 0
  const amountPaidToDate = Number(invoice.amount_paid) || 0
  const balanceDue = Math.max(0, round2(total - amountPaidToDate))
  const label = paymentLabel(paymentMethod, card)
  const channels: string[] = []

  // ── Receipt email ──────────────────────────────────────────────────────────
  if (customer?.email) {
    try {
      await sendPaymentReceiptEmail({
        to: customer.email,
        customerName: customer.name || 'there',
        companyName,
        companyPhone: company?.phone || null,
        companyEmail: company?.email || null,
        invoiceNumber,
        amountPaid: amount,
        paidAt: new Date().toISOString(),
        paymentLabel: label,
        total,
        amountPaidToDate,
        balanceDue,
        kind,
        items: (items || []) as { description: string; quantity: number; unit_price: number; total_price?: number }[],
        invoiceLink,
        bookingLink,
        cardSaved: !!cardSaved,
        cardLast4: card?.last4 || null,
      })
      result.receipt.email = true
      channels.push('email')
    } catch (err) {
      console.error('[after-payment] receipt email failed:', err instanceof Error ? err.message : err)
    }
  }

  // ── Receipt SMS (consented customers only) ─────────────────────────────────
  if (customer?.phone && customer.sms_consent) {
    try {
      const body =
        kind === 'deposit' || !paidInFull
          ? SMS_TEMPLATES.depositReceipt({
              customerName: customer.name || 'there',
              companyName,
              amount,
              balanceDue,
              invoiceNumber,
              receiptLink: invoiceLink,
            })
          : SMS_TEMPLATES.paymentReceipt({
              customerName: customer.name || 'there',
              companyName,
              amount,
              invoiceNumber,
              receiptLink: invoiceLink,
            })
      const r = await sendSMS({ to: customer.phone, body })
      if (r.success) {
        result.receipt.sms = true
        channels.push('sms')
      } else if (r.error) {
        console.warn('[after-payment] receipt SMS failed:', r.error)
      }
    } catch (err) {
      console.error('[after-payment] receipt SMS threw:', err instanceof Error ? err.message : err)
    }
  }

  if (paymentId && channels.length > 0) {
    const { error } = await supabase
      .from('payments')
      .update({ receipt_sent_at: new Date().toISOString(), receipt_channels: channels })
      .eq('id', paymentId)
    if (error && !isMissingColumnError(error)) {
      console.warn('[after-payment] could not stamp receipt on payment:', error.message)
    }
  }

  // ── Review request, delayed ────────────────────────────────────────────────
  if (kind === 'payment' && paidInFull && invoice.company_id && invoice.customer_id) {
    const r = await scheduleReviewRequest(supabase, {
      companyId: invoice.company_id,
      customerId: invoice.customer_id,
      jobId: invoice.job_id,
      invoiceId: invoice.id,
      trigger: 'payment',
    })
    result.reviewScheduled = r.scheduled
    result.reviewReason = r.reason
  }

  return result
}

// ============================================================
// 3. Review request queue
// ============================================================

export interface ScheduleReviewInput {
  companyId: string
  customerId: string
  jobId?: string | null
  invoiceId?: string | null
  trigger: 'payment' | 'job_completed' | 'manual'
  /** Delay counts from here (default now). Job completion passes updated_at. */
  baseTime?: Date | string | null
}

export type ScheduleReviewResult = { scheduled: boolean; reason?: string; id?: string | null; scheduledFor?: string }

export function makeTrackingToken(): string {
  return `rv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Queues one review request per job/invoice/customer-week. Returns
 * `scheduled: false` with a reason instead of throwing so a hook never breaks
 * the payment that triggered it.
 */
export async function scheduleReviewRequest(supabase: SB, input: ScheduleReviewInput): Promise<ScheduleReviewResult> {
  const { companyId, customerId, jobId, invoiceId, trigger } = input

  // Per-company toggle (same switch the daily follow-up cron honours).
  const { data: settings } = await supabase
    .from('jenny_pro_settings')
    .select('review_followup_enabled')
    .eq('company_id', companyId)
    .maybeSingle()
  if (settings && settings.review_followup_enabled === false) {
    return { scheduled: false, reason: 'disabled' }
  }

  // Dedupe: one request per job, per invoice, and per customer per week.
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const orParts: string[] = [`and(customer_id.eq.${customerId},created_at.gte.${weekAgo})`]
  if (jobId) orParts.push(`job_id.eq.${jobId}`)
  if (invoiceId) orParts.push(`invoice_id.eq.${invoiceId}`)

  const { data: existing, error: existErr } = await supabase
    .from('review_requests')
    .select('id, job_id, invoice_id, status')
    .eq('company_id', companyId)
    .or(orParts.join(','))
    .limit(1)
  if (existErr) {
    console.warn('[after-payment] review dedupe query failed:', existErr.message)
    return { scheduled: false, reason: 'query_failed' }
  }
  if (existing && existing.length > 0) {
    return { scheduled: false, reason: 'already_requested', id: existing[0].id }
  }

  const [{ data: customer }, { data: company }] = await Promise.all([
    supabase.from('customers').select('name, phone, email, sms_consent').eq('id', customerId).single(),
    supabase.from('companies').select('review_delay_hours').eq('id', companyId).single(),
  ])
  if (!customer) return { scheduled: false, reason: 'no_customer' }

  const canSms = !!(customer.phone && customer.sms_consent)
  const canEmail = !!customer.email
  if (!canSms && !canEmail) {
    return { scheduled: false, reason: 'no_channel' }
  }

  const rawDelay = Number(company?.review_delay_hours)
  const delayHours = Number.isFinite(rawDelay) ? Math.min(Math.max(rawDelay, 0), 72) : 2
  const base = input.baseTime ? new Date(input.baseTime).getTime() : Date.now()
  const scheduledFor = new Date(Math.max(Date.now(), base + delayHours * 3600 * 1000)).toISOString()

  const { data: row, error } = await supabase
    .from('review_requests')
    .insert({
      company_id: companyId,
      job_id: jobId || null,
      invoice_id: invoiceId || null,
      customer_id: customerId,
      customer_name: customer.name || 'Customer',
      customer_phone: customer.phone || null,
      customer_email: customer.email || null,
      status: 'pending',
      channel: canSms ? 'sms' : 'email',
      scheduled_for: scheduledFor,
      trigger,
      tracking_token: makeTrackingToken(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('[after-payment] failed to queue review request:', error.message)
    return { scheduled: false, reason: 'insert_failed' }
  }
  return { scheduled: true, id: row?.id || null, scheduledFor }
}

// ============================================================
// 4. Checkout Session → everything above
// ============================================================

export type ProcessSessionResult =
  | { handled: false; reason: string }
  | {
      handled: true
      type: 'invoice_payment' | 'quote_deposit'
      invoiceId: string | null
      quoteId?: string | null
      record: RecordPaymentResult
      hooks?: HookResult
    }

async function fetchCardDetails(stripe: StripeLike | null, paymentIntentId: string | null): Promise<{ card: CardDetails | null; paymentMethodId: string | null }> {
  if (!stripe || !paymentIntentId) return { card: null, paymentMethodId: null }
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['payment_method'] })
    const pm = pi?.payment_method
    if (!pm || typeof pm === 'string') return { card: null, paymentMethodId: typeof pm === 'string' ? pm : null }
    const c = pm.card
    return {
      paymentMethodId: pm.id || null,
      card: c ? { brand: c.brand || null, last4: c.last4 || null, expMonth: c.exp_month || null, expYear: c.exp_year || null } : null,
    }
  } catch (err) {
    console.warn('[after-payment] could not read card details:', err instanceof Error ? err.message : err)
    return { card: null, paymentMethodId: null }
  }
}

/**
 * Applies a completed Checkout Session. Safe to call from both the webhook and
 * the thank-you page: the second caller sees `record.status === 'duplicate'`
 * and runs no hooks.
 */
export async function processCheckoutSession(
  supabase: SB,
  session: CheckoutSessionLike,
  opts: { stripe?: StripeLike | null } = {}
): Promise<ProcessSessionResult> {
  const metadata = session.metadata || {}
  const paymentIntentId = idOf(session.payment_intent)
  const stripeCustomerId = idOf(session.customer)
  let stripe: StripeLike | null = opts.stripe ?? null
  if (!stripe && opts.stripe === undefined) {
    try {
      stripe = getStripe() as unknown as StripeLike
    } catch {
      stripe = null
    }
  }

  if (metadata.type === 'invoice_payment') {
    const invoiceId = metadata.invoice_id || null
    if (!invoiceId) return { handled: false, reason: 'missing invoice_id' }
    const amount = round2((session.amount_total || 0) / 100)

    const { card, paymentMethodId } = await fetchCardDetails(stripe, paymentIntentId)

    const record = await recordInvoicePayment(supabase, {
      invoiceId,
      amount,
      paymentMethod: 'stripe',
      stripePaymentId: paymentIntentId,
      card,
    })

    if (record.status !== 'recorded') {
      return { handled: true, type: 'invoice_payment', invoiceId, record }
    }

    // Card on file: the customer ticked "save my card" at checkout, so the
    // PaymentMethod is attached to a platform Customer for off-session use.
    let cardSaved = false
    if (metadata.save_card === '1' && stripeCustomerId && paymentMethodId && record.invoice.customer_id) {
      const { error } = await supabase
        .from('customers')
        .update({
          stripe_customer_id: stripeCustomerId,
          stripe_payment_method_id: paymentMethodId,
          card_brand: card?.brand || null,
          card_last4: card?.last4 || null,
          card_exp_month: card?.expMonth || null,
          card_exp_year: card?.expYear || null,
          card_on_file_at: new Date().toISOString(),
        })
        .eq('id', record.invoice.customer_id)
      if (error) console.error('[after-payment] failed to save card on file:', error.message)
      else cardSaved = true
    }

    const hooks = await runAfterPaymentHooks(supabase, {
      invoice: record.invoice,
      amount,
      paidInFull: record.paidInFull,
      paymentId: record.paymentId,
      paymentMethod: 'stripe',
      card,
      kind: 'payment',
      cardSaved,
    })
    return { handled: true, type: 'invoice_payment', invoiceId, record, hooks }
  }

  if (metadata.type === 'quote_deposit') {
    const quoteId = metadata.quote_id || null
    if (!quoteId) return { handled: false, reason: 'missing quote_id' }
    const depositAmount = round2(parseFloat(metadata.deposit_amount || '0') || (session.amount_total || 0) / 100)

    const { error: qErr } = await supabase
      .from('quotes')
      .update({
        deposit_paid: true,
        deposit_paid_at: new Date().toISOString(),
        deposit_stripe_payment_id: paymentIntentId,
      })
      .eq('id', quoteId)
    if (qErr) console.error('[after-payment] failed to mark quote deposit paid:', qErr.message)

    const invoiceId = await ensureInvoiceForQuote(supabase, quoteId, depositAmount)
    if (!invoiceId) {
      return { handled: true, type: 'quote_deposit', invoiceId: null, quoteId, record: { status: 'not_found' } }
    }

    const { card } = await fetchCardDetails(stripe, paymentIntentId)
    const record = await recordInvoicePayment(supabase, {
      invoiceId,
      amount: depositAmount,
      paymentMethod: 'stripe',
      stripePaymentId: paymentIntentId,
      card,
      notes: 'Quote deposit',
    })
    if (record.status !== 'recorded') {
      return { handled: true, type: 'quote_deposit', invoiceId, quoteId, record }
    }

    const hooks = await runAfterPaymentHooks(supabase, {
      invoice: record.invoice,
      amount: depositAmount,
      paidInFull: record.paidInFull,
      paymentId: record.paymentId,
      paymentMethod: 'stripe',
      card,
      kind: 'deposit',
    })
    return { handled: true, type: 'quote_deposit', invoiceId, quoteId, record, hooks }
  }

  return { handled: false, reason: `unhandled metadata.type "${metadata.type || ''}"` }
}

/**
 * Returns the invoice for a quote, creating it (with line items) if none
 * exists yet. The deposit itself is recorded by recordInvoicePayment, so the
 * new invoice starts with amount_paid = 0.
 */
async function ensureInvoiceForQuote(supabase: SB, quoteId: string, depositAmount: number): Promise<string | null> {
  const { data: existing } = await supabase.from('invoices').select('id').eq('quote_id', quoteId).limit(1)
  if (existing && existing.length > 0) return existing[0].id

  const { data: quote, error: qErr } = await supabase.from('quotes').select('*, items:quote_items(*)').eq('id', quoteId).single()
  if (qErr || !quote) {
    console.error('[after-payment] quote not found for deposit:', qErr?.message)
    return null
  }

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('company_id', quote.company_id)
  const invoiceNumber = `INV-${today}-${String((count || 0) + 1).padStart(4, '0')}`

  const { data: newInvoice, error: insErr } = await supabase
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
      amount_paid: 0,
      deposit_amount: depositAmount,
      status: 'sent',
      sent_at: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    })
    .select('id')
    .single()

  if (insErr || !newInvoice) {
    console.error('[after-payment] failed to create invoice from quote:', insErr?.message)
    return null
  }

  const items = (quote.items || []) as { description: string; quantity: number; unit_price: number; total_price?: number; sort_order?: number }[]
  if (items.length) {
    const { error: itemErr } = await supabase.from('invoice_items').insert(
      items.map((item, index) => ({
        invoice_id: newInvoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price || item.quantity * item.unit_price,
        sort_order: item.sort_order ?? index,
      }))
    )
    if (itemErr) console.error('[after-payment] failed to copy quote items:', itemErr.message)
  }

  return newInvoice.id
}

// ============================================================
// 5. Card on file → off-session charge (recurring services)
// ============================================================

export type ChargeCardResult =
  | { ok: true; paymentIntentId: string; amount: number; record: RecordPaymentResult; hooks?: HookResult }
  | { ok: false; error: string; code?: string; declineCode?: string; status?: number }

/**
 * Charges an invoice's balance to the customer's saved card. Used for
 * recurring services (auto_charge) and the dashboard "Charge card" action.
 * Only runs when the customer saved a card through Checkout with consent.
 */
interface ChargeCustomer {
  id: string
  name: string
  stripe_customer_id: string | null
  stripe_payment_method_id: string | null
  card_brand: string | null
  card_last4: string | null
}
interface ChargeCompany {
  id: string
  name: string
  stripe_connect_account_id: string | null
  stripe_connect_onboarded: boolean
}
interface ChargeInvoiceRow {
  id: string
  company_id: string | null
  customer_id: string | null
  invoice_number: string | null
  total: number | null
  amount_paid: number | null
  status: string | null
  customer: ChargeCustomer | ChargeCustomer[] | null
  company: ChargeCompany | ChargeCompany[] | null
}

export async function chargeCardOnFile(supabase: SB, stripe: StripeLike, input: { invoiceId: string; companyId?: string }): Promise<ChargeCardResult> {
  // Cast: supabase-js cannot infer the joined shape from this select string and
  // falls back to GenericStringError, which fails `next build`'s type check.
  const { data: invoice, error } = (await supabase
    .from('invoices')
    .select(
      'id, company_id, customer_id, invoice_number, total, amount_paid, status, ' +
        'customer:customers(id, name, stripe_customer_id, stripe_payment_method_id, card_brand, card_last4), ' +
        'company:companies(id, name, stripe_connect_account_id, stripe_connect_onboarded)'
    )
    .eq('id', input.invoiceId)
    .single()) as unknown as { data: ChargeInvoiceRow | null; error: { message: string } | null }

  if (error || !invoice) return { ok: false, error: 'Invoice not found', status: 404 }
  if (input.companyId && invoice.company_id !== input.companyId) return { ok: false, error: 'Invoice not found', status: 404 }
  if (invoice.status === 'paid') return { ok: false, error: 'Invoice is already paid', status: 400 }

  const customer = Array.isArray(invoice.customer) ? invoice.customer[0] || null : invoice.customer
  const company = Array.isArray(invoice.company) ? invoice.company[0] || null : invoice.company

  if (!customer?.stripe_customer_id || !customer.stripe_payment_method_id) {
    return { ok: false, error: 'This customer has no card on file', status: 400 }
  }
  if (!company?.stripe_connect_account_id || !company.stripe_connect_onboarded) {
    return { ok: false, error: 'Online payments are not set up for this company', status: 400 }
  }

  const balanceCents = Math.round(((Number(invoice.total) || 0) - (Number(invoice.amount_paid) || 0)) * 100)
  if (balanceCents <= 0) return { ok: false, error: 'No balance due', status: 400 }
  const amount = balanceCents / 100

  let pi
  try {
    pi = await stripe.paymentIntents.create({
      amount: balanceCents,
      currency: 'usd',
      customer: customer.stripe_customer_id,
      payment_method: customer.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      description: `Invoice ${invoice.invoice_number || invoice.id} - ${company.name}`,
      transfer_data: { destination: company.stripe_connect_account_id },
      metadata: {
        type: 'invoice_payment',
        invoice_id: invoice.id,
        company_id: company.id,
        source: 'card_on_file',
      },
    })
  } catch (err) {
    const e = err as { message?: string; code?: string; decline_code?: string; raw?: { decline_code?: string } }
    return {
      ok: false,
      error: e.message || 'Card charge failed',
      code: e.code,
      declineCode: e.decline_code || e.raw?.decline_code,
      status: 402,
    }
  }

  if (pi.status !== 'succeeded') {
    return { ok: false, error: `Payment not completed (status: ${pi.status})`, code: pi.status, status: 402 }
  }

  const card: CardDetails = { brand: customer.card_brand, last4: customer.card_last4 }
  const record = await recordInvoicePayment(supabase, {
    invoiceId: invoice.id,
    amount,
    paymentMethod: 'card_on_file',
    stripePaymentId: pi.id,
    card,
    notes: 'Charged card on file',
  })
  if (record.status !== 'recorded') {
    return { ok: true, paymentIntentId: pi.id, amount, record }
  }
  const hooks = await runAfterPaymentHooks(supabase, {
    invoice: record.invoice,
    amount,
    paidInFull: record.paidInFull,
    paymentId: record.paymentId,
    paymentMethod: 'card_on_file',
    card,
    kind: 'payment',
  })
  return { ok: true, paymentIntentId: pi.id, amount, record, hooks }
}
