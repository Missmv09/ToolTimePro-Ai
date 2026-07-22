-- ============================================
-- 047: Add billing frequency to quotes
-- ============================================
-- Lets a quote describe a recurring service (weekly, bi-weekly, monthly) vs a
-- one-time job. Label-only for now: shown on the quote and customer view; does
-- not yet create recurring jobs or invoices.

ALTER TABLE quotes
    ADD COLUMN IF NOT EXISTS frequency VARCHAR(20) DEFAULT 'one_time';
    -- Allowed values: one_time, weekly, biweekly, monthly
