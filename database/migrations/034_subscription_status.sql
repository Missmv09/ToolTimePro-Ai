-- Migration: Track subscription_status on companies
--
-- Adds an explicit subscription_status column so we can distinguish:
--   trialing  — in the 14-day no-card free trial
--   active    — paying customer (set by Stripe webhook)
--   past_due  — payment failure recently observed
--   canceled  — subscription canceled
--   expired   — trial ended without converting
--
-- Existing TrialBanner / read-only gating still falls back to deriving state
-- from trial_ends_at + stripe_customer_id when this column is null, so the
-- migration is non-breaking.
--
-- Run this in Supabase SQL Editor.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS subscription_status TEXT;

-- Backfill: anyone with a stripe_customer_id is treated as active; everyone
-- else with a future trial_ends_at is trialing; trial ended without paying is
-- expired.
UPDATE companies
SET subscription_status = CASE
  WHEN stripe_customer_id IS NOT NULL THEN 'active'
  WHEN trial_ends_at IS NOT NULL AND trial_ends_at > NOW() THEN 'trialing'
  WHEN trial_ends_at IS NOT NULL AND trial_ends_at <= NOW() THEN 'expired'
  ELSE NULL
END
WHERE subscription_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_companies_subscription_status
  ON companies (subscription_status);
