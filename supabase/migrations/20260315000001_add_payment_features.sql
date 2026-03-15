-- Payment features: Stripe Connect, invoice payments, quote deposits

-- Stripe Connect for companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_connect_account_id VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_connect_onboarded BOOLEAN DEFAULT FALSE;

-- Quote deposits
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT FALSE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_percentage DECIMAL(5,2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_stripe_payment_id VARCHAR(255);

-- Invoice deposit tracking
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS quote_id UUID;
