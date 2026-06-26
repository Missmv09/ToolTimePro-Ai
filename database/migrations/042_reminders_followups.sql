-- Appointment reminders + post-job follow-up/review automation.
-- Track per-job whether each automated text has already gone out (so the cron
-- sends exactly once), and per-company toggles to enable/disable each.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS followup_sent_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE jenny_pro_settings
  ADD COLUMN IF NOT EXISTS reminders_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS review_followup_enabled BOOLEAN DEFAULT true;
