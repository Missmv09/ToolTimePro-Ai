-- ============================================================
-- Migration 052: Jenny weekly digest send log
--
-- Tracks which company received which weekly digest, so a re-run of the cron
-- (retry, redeploy, manual trigger) cannot send the same week twice. The
-- unique constraint on (company_id, period_start) is the idempotency guard —
-- the route relies on it rather than on the cron firing exactly once.
-- ============================================================

CREATE TABLE IF NOT EXISTS jenny_digest_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  -- First day of the seven-day window the digest covered.
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  -- Denormalized so the send history stays meaningful after log rows age out.
  total_completed INTEGER NOT NULL DEFAULT 0,
  total_awaiting INTEGER NOT NULL DEFAULT 0,
  sent_to TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_digest_sends_company
  ON jenny_digest_sends(company_id, period_start DESC);

ALTER TABLE jenny_digest_sends ENABLE ROW LEVEL SECURITY;

-- Owners can see their own send history; all writes are service-role (cron).
DROP POLICY IF EXISTS "jenny_digest_sends_company_access" ON jenny_digest_sends;
CREATE POLICY "jenny_digest_sends_company_access" ON jenny_digest_sends
  FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

GRANT SELECT ON jenny_digest_sends TO authenticated;
GRANT ALL ON jenny_digest_sends TO service_role;
