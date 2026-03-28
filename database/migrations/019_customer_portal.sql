-- ============================================================
-- Migration 018: Customer Portal
-- Adds customer authentication via magic links and session tracking
-- ============================================================

-- Customer sessions: token-based auth for portal access
CREATE TABLE IF NOT EXISTS customer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_customer_sessions_token ON customer_sessions(token);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer ON customer_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_active ON customer_sessions(is_active, expires_at);

ALTER TABLE customer_sessions ENABLE ROW LEVEL SECURITY;

-- Service role can manage all sessions
CREATE POLICY "customer_sessions_service_access" ON customer_sessions
  FOR ALL USING (true);

-- Customer reschedule requests
CREATE TABLE IF NOT EXISTS reschedule_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  requested_date DATE NOT NULL,
  requested_time_start TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  response_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reschedule_requests_company ON reschedule_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_customer ON reschedule_requests(customer_id);

ALTER TABLE reschedule_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reschedule_requests_service_access" ON reschedule_requests
  FOR ALL USING (true);
