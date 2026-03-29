-- ============================================================
-- Migration 020: Google Reviews Integration
-- Adds google_review_link to companies, ensures review_requests
-- table exists, and adds review tracking fields.
-- ============================================================

-- Add review link fields to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS google_review_link TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS yelp_review_link TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS auto_review_request BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS review_delay_hours INTEGER DEFAULT 2;

-- Ensure review_requests table exists with all needed fields
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  review_link TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'clicked', 'reviewed')),
  channel TEXT DEFAULT 'sms' CHECK (channel IN ('sms', 'email')),
  sent_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  tracking_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_requests_company ON review_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_customer ON review_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_job ON review_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_token ON review_requests(tracking_token);
CREATE INDEX IF NOT EXISTS idx_review_requests_status ON review_requests(company_id, status);

ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_requests_company_access" ON review_requests
  FOR ALL USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );
