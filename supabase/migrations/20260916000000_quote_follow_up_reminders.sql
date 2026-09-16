-- ============================================================
-- Quote follow-up reminders
--
-- Lives in supabase/migrations so migrate.yml applies it on merge to main
-- (database/migrations/ is hand-run only — see 053). Idempotent.
--
-- Until now "Followed Up" on the Quotes page only stamped a date, and the
-- only automated quote signal (quote_expiration) alerted the owner without
-- ever contacting the customer. This adds:
--   1. Reminder bookkeeping on quotes so a manual "Send Reminder" and the
--      automatic action share one cooldown and one cap.
--   2. A new autonomous action type, quote_follow_up: Jenny texts/emails the
--      customer about an unanswered quote after N days, up to a cap, during
--      the company's daytime hours.
-- ============================================================

-- ── 1. Reminder bookkeeping ──────────────────────────────────────────────────

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS follow_up_date DATE,
  ADD COLUMN IF NOT EXISTS last_followed_up_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reminder_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMP WITH TIME ZONE;

-- The cron scans open quotes per company every run.
CREATE INDEX IF NOT EXISTS idx_quotes_open_for_reminder
  ON quotes(company_id, status)
  WHERE status IN ('sent', 'viewed');

-- ── 2. quote_follow_up action type ───────────────────────────────────────────
-- Same approach as migration 051: drop the CHECK constraints by discovered
-- name, re-add with the widened set. Keep in sync with JennyActionType and
-- CONFIGURABLE_ACTION_TYPES in src/types/jenny-actions.ts and the dispatcher
-- switch in src/app/api/jenny-actions/route.ts. The drift test in
-- src/__tests__/lib/jenny-action-type-drift.test.js reads this file.
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
    'quote_follow_up',
    'contractor_payment',
    'contract_end_date',
    'customer_reactivation',
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
    'quote_follow_up',
    'contractor_payment',
    'contract_end_date',
    'customer_reactivation'
  ));
