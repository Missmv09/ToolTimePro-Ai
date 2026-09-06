-- ============================================================
-- Migration 054: After-payment experience
--
-- Receipts, scheduled review requests, and card-on-file for
-- recurring services. Everything here is additive and idempotent.
-- ============================================================

-- ------------------------------------------------------------
-- payments: the Stripe webhook and the dashboard "Mark Paid"
-- button both insert customer_id, but no migration ever added
-- the column, so those inserts were failing silently (the
-- result's `error` was never checked). Add it, plus the card
-- details shown on the receipt.
-- ------------------------------------------------------------
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS card_brand VARCHAR(20);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS card_last4 VARCHAR(4);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_channels TEXT[] DEFAULT '{}';

-- One Stripe payment can only be recorded once. The webhook and the
-- thank-you page's confirm call can race for the same Checkout Session;
-- whichever inserts second gets a unique violation and stops.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_stripe_payment_id_unique
  ON payments(stripe_payment_id)
  WHERE stripe_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

-- ------------------------------------------------------------
-- review_requests: becomes a queue. A request is inserted as
-- 'pending' with a scheduled_for time (payment or job completion
-- plus companies.review_delay_hours) and the review-requests cron
-- sends it when due.
-- ------------------------------------------------------------
ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;
ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP WITH TIME ZONE;
ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS trigger VARCHAR(30) DEFAULT 'manual'; -- payment, job_completed, manual, jenny
ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS error TEXT;

-- Widen the status check so a queued request can end as skipped
-- (no consented channel, automation off) or failed (send error).
ALTER TABLE review_requests DROP CONSTRAINT IF EXISTS review_requests_status_check;
ALTER TABLE review_requests ADD CONSTRAINT review_requests_status_check
  CHECK (status IN ('pending', 'sent', 'clicked', 'reviewed', 'skipped', 'failed'));

CREATE INDEX IF NOT EXISTS idx_review_requests_due
  ON review_requests(scheduled_for)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_review_requests_invoice ON review_requests(invoice_id);

-- Migration 020 added these; repeat for databases that were built
-- from schema.sql without it. review_delay_hours drives the queue.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS google_review_link TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS yelp_review_link TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS review_delay_hours INTEGER DEFAULT 2;

-- ------------------------------------------------------------
-- customers: card on file. Saved from Stripe Checkout when the
-- customer ticks "save my card" (setup_future_usage=off_session),
-- charged later for recurring services or by the contractor from
-- the invoice list.
-- ------------------------------------------------------------
ALTER TABLE customers ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS stripe_payment_method_id VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS card_brand VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS card_last4 VARCHAR(4);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS card_exp_month INTEGER;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS card_exp_year INTEGER;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS card_on_file_at TIMESTAMP WITH TIME ZONE;

-- Recurring services: charge the saved card when each occurrence is invoiced.
ALTER TABLE recurring_jobs ADD COLUMN IF NOT EXISTS auto_charge BOOLEAN DEFAULT false;

COMMENT ON COLUMN customers.stripe_payment_method_id IS 'Card saved with customer consent at Stripe Checkout; charged off-session for recurring services';
COMMENT ON COLUMN review_requests.scheduled_for IS 'When the review-requests cron should send this pending request';
COMMENT ON COLUMN recurring_jobs.auto_charge IS 'Charge the customer card on file when an occurrence is invoiced (requires customers.stripe_payment_method_id)';
