-- ============================================================
-- Migration 051: Widen Jenny action types + allow platform-wide log rows
--
-- Migration 016 created jenny_action_log and jenny_action_configs with a
-- CHECK constraint permitting only the five action types that existed then.
-- Migration 043 re-asserted the same five. Since then the cron in
-- src/app/api/jenny-actions/route.ts grew to fifteen action types.
--
-- The dispatcher iterates over *enabled config rows*, so a type that cannot
-- be written to jenny_action_configs can never run. Ten of the fifteen were
-- therefore dead in production, and the matching log inserts were rejected
-- too. Nothing surfaced because supabase-js returns { error } instead of
-- throwing and the call sites did not check it.
--
-- This migration widens both constraints to the full set and relaxes
-- jenny_action_log.company_id, which platform-wide alerts (price staleness,
-- HR law updates) intentionally write as NULL.
-- ============================================================

-- Drop the existing CHECK constraints by discovered name. They were created
-- inline, so the name is Postgres-generated and differs if a table was ever
-- recreated. Look them up rather than guessing.
DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT c.conname, c.conrelid::regclass AS tbl
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname IN ('jenny_action_log', 'jenny_action_configs')
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%action_type%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', con.tbl, con.conname);
  END LOOP;
END $$;

-- Re-add with the full set the cron actually dispatches. Keep these in sync
-- with the switch in src/app/api/jenny-actions/route.ts — a type missing here
-- silently disables that action rather than failing loudly.
ALTER TABLE jenny_action_log
  ADD CONSTRAINT jenny_action_log_action_type_check
  CHECK (action_type IN (
    'auto_dispatch',
    'lead_follow_up',
    'cash_flow_alert',
    'job_costing',
    'review_request',
    'cert_expiration',
    'insurance_expiry',
    'w9_compliance',
    'classification_review',
    'compliance_escalation',
    'quote_expiration',
    'contractor_payment',
    'contract_end_date',
    'price_staleness',
    'hr_law_update'
  ));

ALTER TABLE jenny_action_configs
  ADD CONSTRAINT jenny_action_configs_action_type_check
  CHECK (action_type IN (
    'auto_dispatch',
    'lead_follow_up',
    'cash_flow_alert',
    'job_costing',
    'review_request',
    'cert_expiration',
    'insurance_expiry',
    'w9_compliance',
    'classification_review',
    'compliance_escalation',
    'quote_expiration',
    'contractor_payment',
    'contract_end_date'
  ));

-- Platform-wide alerts (price staleness, HR law updates) are not scoped to a
-- company and write company_id NULL. The column was NOT NULL, so every one of
-- those inserts was rejected.
ALTER TABLE jenny_action_log ALTER COLUMN company_id DROP NOT NULL;

-- The existing indexes all lead with company_id, so platform-wide rows (NULL
-- company_id) are not served well by them. The weekly digest and the admin
-- view both read these by type and recency.
CREATE INDEX IF NOT EXISTS idx_action_log_platform_wide
  ON jenny_action_log(action_type, created_at DESC)
  WHERE company_id IS NULL;
