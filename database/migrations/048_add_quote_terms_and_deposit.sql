-- ============================================
-- 048: Add per-quote terms and deposit columns
-- ============================================
-- These columns are written by the quote editor (src/app/dashboard/quotes)
-- but were never added to the quotes table. Without them, saving an edited
-- quote fails with "column ... does not exist" — the app auto-populates
-- `terms` from companies.default_quote_terms on every quote, so the edit save
-- broke for everyone. The create path already strips these fields on a schema
-- error; adding the columns lets the data actually persist.

-- Per-quote terms & conditions (defaults to companies.default_quote_terms in the UI)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS terms TEXT;

-- Deposit configuration (set when "Require deposit before scheduling" is checked)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT FALSE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_percentage DECIMAL(5,2);

-- Deposit payment tracking (populated by the deposit-pay flow)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_stripe_payment_id VARCHAR(255);

COMMENT ON COLUMN quotes.terms IS 'Per-quote terms & conditions; auto-populated from companies.default_quote_terms';
COMMENT ON COLUMN quotes.deposit_required IS 'Whether a deposit is required before scheduling';
COMMENT ON COLUMN quotes.deposit_amount IS 'Fixed deposit amount in dollars (mutually exclusive with deposit_percentage)';
COMMENT ON COLUMN quotes.deposit_percentage IS 'Deposit as a percentage of total (mutually exclusive with deposit_amount)';
COMMENT ON COLUMN quotes.deposit_paid IS 'Whether the deposit has been paid';
COMMENT ON COLUMN quotes.deposit_paid_at IS 'When the deposit was paid';
COMMENT ON COLUMN quotes.deposit_stripe_payment_id IS 'Stripe payment intent/charge ID for the deposit';
