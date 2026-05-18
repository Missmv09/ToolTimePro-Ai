-- ============================================================
-- Migration: Trial Email Idempotency Columns
-- Date: 2026-05-18
--
-- The trial-reminders cron previously fired each email on an EXACT
-- day match (daysLeft === 7 / 3 / 1 / 0 / -3). If the cron did not
-- run on that exact day (e.g. the Supabase Prod project was paused
-- for inactivity), the email was skipped permanently — the next run
-- computed a different daysLeft and the branch never matched again.
--
-- These columns let the cron use resilient "threshold crossed AND
-- not yet sent" windows instead of exact-day equality, so a missed
-- day is caught on the next run and never double-sends.
--
-- companies.welcome_email_sent_at already exists and is unchanged.
-- ============================================================

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS trial_reminder_7_sent_at  timestamptz,
  ADD COLUMN IF NOT EXISTS trial_reminder_3_sent_at  timestamptz,
  ADD COLUMN IF NOT EXISTS trial_reminder_1_sent_at  timestamptz,
  ADD COLUMN IF NOT EXISTS trial_expired_sent_at     timestamptz,
  ADD COLUMN IF NOT EXISTS trial_winback_sent_at     timestamptz;

COMMENT ON COLUMN companies.trial_reminder_7_sent_at IS 'When the 7-days-left trial reminder email was sent (idempotency guard).';
COMMENT ON COLUMN companies.trial_reminder_3_sent_at IS 'When the 3-days-left trial reminder email was sent (idempotency guard).';
COMMENT ON COLUMN companies.trial_reminder_1_sent_at IS 'When the 1-day-left trial reminder email was sent (idempotency guard).';
COMMENT ON COLUMN companies.trial_expired_sent_at    IS 'When the trial-expired email was sent (idempotency guard).';
COMMENT ON COLUMN companies.trial_winback_sent_at    IS 'When the post-expiry "we miss you" email was sent (idempotency guard).';
