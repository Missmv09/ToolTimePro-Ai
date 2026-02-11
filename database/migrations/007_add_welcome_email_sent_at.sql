-- Add welcome_email_sent_at to companies table
-- Tracks whether the immediate welcome email was already sent (at password-set time)
-- so the daily cron job can skip the Day 1 welcome for those users.
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ DEFAULT NULL;
