-- ============================================================
-- Owner inbox, instant lead alerts, customer reactivation
--
-- Lives in supabase/migrations so migrate.yml applies it on merge to main
-- (database/migrations/ is hand-run only — see 053). Idempotent.
--
-- Closes the three gaps a contractor otherwise buys GoHighLevel for:
--   1. Two-way inbox — the owner can reply to any Jenny SMS thread from the
--      dashboard. Jenny steps back for a takeover window so she does not talk
--      over the human.
--   2. Speed-to-lead — a website contact form submission pings the owner
--      (in-app + SMS) and can text the lead back immediately.
--   3. Reactivation — Jenny texts consented customers who have not booked in
--      N months. New autonomous action type: customer_reactivation.
-- ============================================================

-- ── 1. Inbox ─────────────────────────────────────────────────────────────────

-- Who authored an outbound message: Jenny (AI), the owner (dashboard reply),
-- or the system (reminders, alerts). Inbound rows are 'customer'.
ALTER TABLE jenny_sms_messages
  ADD COLUMN IF NOT EXISTS sender VARCHAR(20) DEFAULT 'jenny',
  ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- While set and in the future, the SMS webhook logs inbound texts and
-- notifies the operator instead of letting Jenny reply. Set when the owner
-- replies; cleared when they hand the thread back to Jenny.
ALTER TABLE jenny_sms_conversations
  ADD COLUMN IF NOT EXISTS human_takeover_until TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_jenny_sms_conv_company_status
  ON jenny_sms_conversations(company_id, status, last_message_at DESC);

-- ── 2. Lead alerts ───────────────────────────────────────────────────────────

ALTER TABLE jenny_pro_settings
  ADD COLUMN IF NOT EXISTS lead_alerts_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS lead_auto_reply_enabled BOOLEAN DEFAULT false;

-- ── 3. customer_reactivation action type ─────────────────────────────────────
-- Same approach as migration 051: drop the CHECK constraints by discovered
-- name, re-add with the widened set. Keep in sync with JennyActionType and
-- CONFIGURABLE_ACTION_TYPES in src/types/jenny-actions.ts and the dispatcher
-- switch in src/app/api/jenny-actions/route.ts.
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
    'contractor_payment',
    'contract_end_date',
    'customer_reactivation'
  ));
