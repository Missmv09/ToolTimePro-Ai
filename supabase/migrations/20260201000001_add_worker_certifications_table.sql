-- Worker Certifications Table Migration
-- Phase 2: Team Management Feature
-- Tracks licenses, certifications, and their expiration dates

-- ============================================
-- WORKER_CERTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS worker_certifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    worker_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Certification details
    cert_type VARCHAR(100) NOT NULL,
    cert_name VARCHAR(255) NOT NULL,
    issuing_authority VARCHAR(255),
    cert_number VARCHAR(100),

    -- Dates
    issue_date DATE,
    expiration_date DATE,

    -- Status
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- COMMON CERTIFICATION TYPES (for reference)
-- ============================================
-- Construction: OSHA 10, OSHA 30, Forklift, Scaffold, Fall Protection
-- Electrical: Journeyman, Master, Low Voltage
-- Plumbing: Journeyman, Master, Backflow
-- HVAC: EPA 608, R-410A, NATE
-- General: CPR/First Aid, Driver's License, CDL

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_worker_certs_company_id ON worker_certifications(company_id);
CREATE INDEX IF NOT EXISTS idx_worker_certs_worker_id ON worker_certifications(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_certs_expiration ON worker_certifications(expiration_date);
CREATE INDEX IF NOT EXISTS idx_worker_certs_active ON worker_certifications(is_active) WHERE is_active = true;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE worker_certifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view certifications for workers in their company
CREATE POLICY "Users can view company worker certifications" ON worker_certifications
    FOR SELECT USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
    );

-- Policy: Admins and owners can insert certifications
CREATE POLICY "Admins can insert worker certifications" ON worker_certifications
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
        AND (
            SELECT u.role FROM users u WHERE u.id = auth.uid()
        ) IN ('owner', 'admin')
    );

-- Policy: Admins and owners can update certifications
CREATE POLICY "Admins can update worker certifications" ON worker_certifications
    FOR UPDATE USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
        AND (
            SELECT u.role FROM users u WHERE u.id = auth.uid()
        ) IN ('owner', 'admin')
    );

-- Policy: Owners can delete certifications
CREATE POLICY "Owners can delete worker certifications" ON worker_certifications
    FOR DELETE USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
        AND (
            SELECT u.role FROM users u WHERE u.id = auth.uid()
        ) = 'owner'
    );

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_worker_certifications_updated_at
    BEFORE UPDATE ON worker_certifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
