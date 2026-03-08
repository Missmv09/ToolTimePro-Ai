-- Migration: Add follow-up tracking to quotes
-- Adds follow_up_date and last_followed_up_at columns for quote follow-up alerts

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS follow_up_date DATE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS last_followed_up_at TIMESTAMP WITH TIME ZONE;

-- Index for efficiently querying quotes needing follow-up
CREATE INDEX IF NOT EXISTS idx_quotes_follow_up_date ON quotes(follow_up_date)
    WHERE follow_up_date IS NOT NULL AND status IN ('sent', 'viewed');
