-- Migration: CRM Data Import tracking
-- Tracks bulk customer import jobs from other CRMs (HouseCall Pro, Jobber, etc.)

CREATE TABLE IF NOT EXISTS import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Import source info
    source_crm VARCHAR(100) NOT NULL,       -- housecall_pro, jobber, servicetitan, etc.
    file_name VARCHAR(500),
    total_rows INTEGER DEFAULT 0,
    imported_rows INTEGER DEFAULT 0,
    skipped_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,

    -- Field mapping used (stored for audit/re-import)
    field_mapping JSONB DEFAULT '{}',

    -- Status tracking
    status VARCHAR(30) DEFAULT 'pending',   -- pending, validating, previewing, importing, completed, failed
    error_log JSONB DEFAULT '[]',           -- Array of { row, field, message }

    -- Who ran it
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_company ON import_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);

-- ROW LEVEL SECURITY
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own company import jobs"
    ON import_jobs FOR SELECT
    USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users create own company import jobs"
    ON import_jobs FOR INSERT
    WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users update own company import jobs"
    ON import_jobs FOR UPDATE
    USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));
