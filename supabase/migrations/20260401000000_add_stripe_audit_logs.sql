-- Stripe audit logs — tracks all admin price/product management actions
CREATE TABLE IF NOT EXISTS stripe_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_email VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,       -- create_product, update_product, create_price, update_price
    target_type VARCHAR(50) NOT NULL,   -- product, price
    target_id VARCHAR(255),             -- Stripe object ID (prod_xxx, price_xxx)
    details JSONB DEFAULT '{}',         -- full context of the change
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_stripe_audit_logs_admin ON stripe_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_audit_logs_action ON stripe_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_stripe_audit_logs_created ON stripe_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_audit_logs_target ON stripe_audit_logs(target_type, target_id);

-- RLS: Only service role can access (admin operations go through API with service key)
ALTER TABLE stripe_audit_logs ENABLE ROW LEVEL SECURITY;
-- No RLS policies = only service role key can read/write (same pattern as platform_admins)
