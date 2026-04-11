-- Fix QuickBooks schema to use company_id (company-scoped) instead of user_id
-- The API routes expect company_id + realm_id but the original migration used user_id + qbo_realm_id

-- ============================================================
-- 1. Fix qbo_connections table
-- ============================================================

-- Add company_id column (references companies table)
ALTER TABLE qbo_connections ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Rename qbo_realm_id → realm_id to match API code
ALTER TABLE qbo_connections RENAME COLUMN qbo_realm_id TO realm_id;

-- Backfill company_id from the user's company for any existing rows
UPDATE qbo_connections qc
SET company_id = u.company_id
FROM users u
WHERE qc.user_id = u.id
  AND qc.company_id IS NULL;

-- Drop old unique constraint on user_id and add one on company_id
ALTER TABLE qbo_connections DROP CONSTRAINT IF EXISTS qbo_connections_user_id_key;
ALTER TABLE qbo_connections ADD CONSTRAINT qbo_connections_company_id_key UNIQUE (company_id);

-- Add index on company_id
CREATE INDEX IF NOT EXISTS idx_qbo_connections_company_id ON qbo_connections(company_id);

-- Update RLS policies to also allow company-scoped access via service role
-- (Service role bypasses RLS, so existing user_id policies remain valid for
--  direct user queries; no policy changes strictly needed, but let's add
--  company-scoped select so the settings page query works via anon key.)

DROP POLICY IF EXISTS "Users can view own qbo_connections" ON qbo_connections;
CREATE POLICY "Users can view own qbo_connections" ON qbo_connections
  FOR SELECT USING (
    auth.uid() = user_id
    OR company_id IN (
      SELECT u.company_id FROM users u WHERE u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own qbo_connections" ON qbo_connections;
CREATE POLICY "Users can insert own qbo_connections" ON qbo_connections
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR company_id IN (
      SELECT u.company_id FROM users u WHERE u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own qbo_connections" ON qbo_connections;
CREATE POLICY "Users can update own qbo_connections" ON qbo_connections
  FOR UPDATE USING (
    auth.uid() = user_id
    OR company_id IN (
      SELECT u.company_id FROM users u WHERE u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own qbo_connections" ON qbo_connections;
CREATE POLICY "Users can delete own qbo_connections" ON qbo_connections
  FOR DELETE USING (
    auth.uid() = user_id
    OR company_id IN (
      SELECT u.company_id FROM users u WHERE u.id = auth.uid()
    )
  );

-- ============================================================
-- 2. Fix qbo_sync_log table
-- ============================================================

-- Add company_id column
ALTER TABLE qbo_sync_log ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Add records_synced column (used by sync route)
ALTER TABLE qbo_sync_log ADD COLUMN IF NOT EXISTS records_synced INTEGER;

-- Make direction nullable (sync route logs batch results without a direction)
ALTER TABLE qbo_sync_log ALTER COLUMN direction DROP NOT NULL;

-- Backfill company_id from user's company
UPDATE qbo_sync_log sl
SET company_id = u.company_id
FROM users u
WHERE sl.user_id = u.id
  AND sl.company_id IS NULL;

-- Add index on company_id
CREATE INDEX IF NOT EXISTS idx_qbo_sync_log_company_id ON qbo_sync_log(company_id);

-- Update RLS policies for company-scoped access
DROP POLICY IF EXISTS "Users can view own qbo_sync_log" ON qbo_sync_log;
CREATE POLICY "Users can view own qbo_sync_log" ON qbo_sync_log
  FOR SELECT USING (
    auth.uid() = user_id
    OR company_id IN (
      SELECT u.company_id FROM users u WHERE u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own qbo_sync_log" ON qbo_sync_log;
CREATE POLICY "Users can insert own qbo_sync_log" ON qbo_sync_log
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR company_id IN (
      SELECT u.company_id FROM users u WHERE u.id = auth.uid()
    )
  );
