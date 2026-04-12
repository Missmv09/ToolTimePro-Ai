-- Add structured payment methods for companies
-- Replaces freeform payment_instructions with structured data

CREATE TABLE IF NOT EXISTS company_payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    method VARCHAR(50) NOT NULL,  -- zelle, venmo, cashapp, paypal, square, stripe, check, cash, other
    handle VARCHAR(255),          -- email, phone, @handle, URL, or payable-to name
    display_name VARCHAR(100),    -- optional custom label (e.g. "Business Zelle")
    is_active BOOLEAN DEFAULT true,
    is_preferred BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by company
CREATE INDEX IF NOT EXISTS idx_company_payment_methods_company
    ON company_payment_methods(company_id);

-- Unique constraint: one method type per company (can have only one Zelle, one Venmo, etc.)
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_payment_methods_unique
    ON company_payment_methods(company_id, method);

-- RLS policies
ALTER TABLE company_payment_methods ENABLE ROW LEVEL SECURITY;

-- Users can view payment methods for their own company
CREATE POLICY "Users can view own company payment methods"
    ON company_payment_methods FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Owners and admins can manage payment methods
CREATE POLICY "Owners and admins can insert payment methods"
    ON company_payment_methods FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM users
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Owners and admins can update payment methods"
    ON company_payment_methods FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM users
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Owners and admins can delete payment methods"
    ON company_payment_methods FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM users
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Public read access for invoice/quote display (customers viewing invoices don't have auth)
CREATE POLICY "Public can view active payment methods"
    ON company_payment_methods FOR SELECT
    USING (is_active = true);
