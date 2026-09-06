# After-Payment Experience

What happens the moment a customer pays, and how to configure it.

## Flow

```
Customer pays (Stripe Checkout / card on file / Mark Paid)
        │
        ▼
src/lib/after-payment.ts
  1. recordInvoicePayment   → payments row (once per Stripe id), invoice → paid/partial, leads → won
  2. runAfterPaymentHooks   → receipt email (Resend) + receipt SMS (consented customers)
                            → review request queued, due `companies.review_delay_hours` later (default 2h)
        │
        ▼
/api/reviews/dispatch (every 15 min, netlify/functions/review-requests-cron.ts)
  - queues a request for each job completed in the last 48h with none yet
  - sends every pending request whose scheduled_for has passed
    SMS (consented) → else email → else marked 'skipped'
  - links are tracked: /r/<token> → /api/reviews/track → Google/Yelp
```

Two paths feed a Stripe Checkout payment into the pipeline, and either may arrive first:

| Path | When | Notes |
|---|---|---|
| `POST /api/webhook/stripe-connect` | Stripe delivers `checkout.session.completed` | Needs the endpoint registered in Stripe and `STRIPE_CONNECT_WEBHOOK_SECRET` set |
| `POST /api/stripe/checkout/confirm` | The thank-you page loads with `?session_id=` | Retrieves the session from Stripe server-side; applies only when `payment_status === 'paid'` |

The second one to run sees `record.status === 'duplicate'` (unique index on `payments.stripe_payment_id`) and does nothing. So a paid invoice flips to **Paid** the moment the customer lands back on the invoice page, even if the webhook is not configured yet. Keep the webhook anyway: it covers customers who close the tab before the redirect.

## Payment-timing model

| Model | How | Receipt | Review |
|---|---|---|---|
| Deposit up front (quoted jobs) | Quote → "Pay deposit" → Checkout (`metadata.type = quote_deposit`) | Deposit receipt with remaining balance | Not yet (job not done) |
| Pay on completion (service calls) | Invoice link → "Pay now" → Checkout (`metadata.type = invoice_payment`) | Full receipt + next steps | Queued when paid in full |
| Card on file (recurring) | Customer ticks "Save my card" at Checkout → `setup_future_usage: off_session`; later `POST /api/invoice/charge-card` or `chargeCardOnFile()` | Full receipt | Queued when paid in full |
| Cash / check | Dashboard "Mark Paid" → `POST /api/invoice/receipt` | Full receipt | Queued |

Card on file is consent-first: nothing is saved unless the customer ticks the box on the invoice page. The saved PaymentMethod lives on a platform Customer (`customers.stripe_customer_id` / `stripe_payment_method_id`); charges go through `paymentIntents.create` with `off_session: true` and the same `transfer_data.destination` as Checkout. `recurring_jobs.auto_charge` is the flag for charging automatically when an occurrence is invoiced; there is no recurring-invoice generator yet, so today the contractor triggers it from the invoice list ("Charge card ••••4242").

## Setup checklist (sandbox and production)

1. **Run migration** `database/migrations/054_after_payment_experience.sql` in the Supabase SQL editor. It adds `payments.customer_id` (the webhook and "Mark Paid" were inserting it into a column that never existed, so those inserts were silently failing), the review queue columns, and the card-on-file columns. Everything degrades gracefully before the migration runs, but receipts will not show card details and review requests will not queue.
2. **Register the Connect webhook** in Stripe → Developers → Webhooks (test mode for sandbox, live mode for prod):
   - Endpoint: `https://<site>/api/webhook/stripe-connect`
   - Events: `checkout.session.completed`, `account.updated`
   - Copy the signing secret into `STRIPE_CONNECT_WEBHOOK_SECRET` (branch-scoped for sandbox) and redeploy. Netlify functions only pick up env changes on deploy.
3. **Review links**: Dashboard → Jenny Actions → Review request config (or `companies.google_review_link` / `yelp_review_link`). Without a link the request still goes out as a thank-you asking for a reply.
4. **Delay**: `companies.review_delay_hours` (default 2, clamped 0–72).
5. **Toggle**: Dashboard → Jenny Pro → "Post-job review follow-up" (`jenny_pro_settings.review_followup_enabled`). Off = nothing is queued or sent.
6. `CRON_SECRET` must be visible to functions; the dispatcher sends it as both `Authorization: Bearer` and `X-Cron-Secret`.

## Verifying on sandbox

1. Pay a sent invoice with `4242 4242 4242 4242`. On return the page shows "Confirming your payment…", then the green receipt block with amount, date, "Visa •••• 4242", and the What's next cards. The invoice list shows **Paid**.
2. Check the inbox for "Receipt from <Company> - $X paid" and, for a consented customer, the receipt text.
3. `review_requests` has a `pending` row with `scheduled_for` ≈ now + 2h and `trigger = payment`. Set `scheduled_for` to now and hit `/api/reviews/dispatch` with the cron secret to send it immediately.
4. Repeat with "Save my card" ticked: `customers.card_last4` fills in and the invoice list gains a "Charge card ••••4242" action on the customer's next unpaid invoice.
5. Pay the same session twice (reload the `?session_id=` URL): only one `payments` row exists.

## Dedupe rules

- One `payments` row per Stripe PaymentIntent.
- One review request per job, per invoice, and per customer per 7 days.
- The daily follow-up in `/api/jenny-pro/reminders` skips any job that already has a `review_requests` row, and Jenny's `review_request` action already did. A job the dispatcher sends stamps `jobs.followup_sent_at`.
