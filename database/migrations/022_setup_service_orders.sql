-- Setup Service Orders: Assisted Onboarding ($149) & White Glove ($349)
-- Tracks purchase, fulfillment status, and checklist progress

CREATE TABLE IF NOT EXISTS setup_service_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL, -- assisted_onboarding, white_glove
    status VARCHAR(30) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    stripe_payment_intent_id VARCHAR(255),
    assigned_to VARCHAR(255), -- support team member name/email

    -- Checklist items (JSONB for flexibility)
    checklist JSONB DEFAULT '[]',

    -- Key dates
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    kickoff_call_at TIMESTAMP WITH TIME ZONE,

    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_setup_orders_company ON setup_service_orders(company_id);

-- ROW LEVEL SECURITY
ALTER TABLE setup_service_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own company setup orders"
    ON setup_service_orders FOR SELECT
    USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));
