-- Migration: Add employee tracking to quotes
-- Adds created_by and sent_by columns to track which employee created/sent each quote

-- Add created_by column (employee who created the quote)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add sent_by column (employee who sent the quote)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_created_by ON quotes(created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_sent_by ON quotes(sent_by);
