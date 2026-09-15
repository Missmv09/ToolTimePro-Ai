-- Add sync_status to qbo_connections on databases built from database/schema.sql
-- or database/sandbox-*.sql, whose qbo_connections definition lacked it.
-- The dashboard's QuickBooks status check selects last_sync_at, sync_status;
-- without the column PostgREST answers 400 on every dashboard load.
-- Safe to re-run.
ALTER TABLE qbo_connections
  ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'active';
