-- Multi-tenant phone routing for Jenny Pro.
-- Maps each Twilio phone number to the company that owns it, so an inbound
-- text/call is answered as the right contractor (their name, services, calendar).
-- One number belongs to exactly one company (unique), but a company may have
-- several numbers.

CREATE TABLE IF NOT EXISTS company_phone_numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL UNIQUE,   -- E.164, e.g. +17657895752
    label VARCHAR(50),                          -- optional, e.g. 'main', 'sms'
    capabilities TEXT[] DEFAULT ARRAY['voice', 'sms'],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_phone_numbers_company ON company_phone_numbers(company_id);
CREATE INDEX IF NOT EXISTS idx_company_phone_numbers_number ON company_phone_numbers(phone_number);

ALTER TABLE company_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Each contractor manages only their own company's numbers. The server
-- (service role) bypasses RLS for inbound routing.
DROP POLICY IF EXISTS "Users manage own company phone numbers" ON company_phone_numbers;
CREATE POLICY "Users manage own company phone numbers"
    ON company_phone_numbers FOR ALL
    USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()))
    WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));
