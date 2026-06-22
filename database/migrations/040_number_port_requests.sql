-- "Bring your own number" — port a contractor's existing number into Twilio.
-- Tracks the async port-in lifecycle so the dashboard can show status, and so
-- the number auto-wires to the company (webhooks + A2P + mapping) on completion.

CREATE TABLE IF NOT EXISTS number_port_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,          -- number being ported in (E.164)
    authorized_rep_name VARCHAR(255),
    authorized_rep_email VARCHAR(255),
    current_carrier VARCHAR(120),
    account_number VARCHAR(120),                -- losing-carrier account number
    bill_url TEXT,                              -- recent bill (for the LOA / carrier match)
    -- Mirrors Twilio port-in statuses: submitted, waiting_signature, in_review,
    -- in_progress, action_required, completed, canceled, failed
    status VARCHAR(40) DEFAULT 'submitted',
    twilio_port_in_sid VARCHAR(64),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_number_port_requests_company ON number_port_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_number_port_requests_sid ON number_port_requests(twilio_port_in_sid);

ALTER TABLE number_port_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own company port requests" ON number_port_requests;
CREATE POLICY "Users manage own company port requests"
    ON number_port_requests FOR ALL
    USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
    WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));
