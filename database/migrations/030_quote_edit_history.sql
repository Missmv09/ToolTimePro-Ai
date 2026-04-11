-- Quote Edit Audit Trail
-- Tracks every edit made to a quote after it has been sent, providing
-- accountability on the business side and revision transparency for customers.

-- Add revision_number to quotes (starts at 0, bumped each edit-after-send)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS revision_number INTEGER DEFAULT 0;

-- ============================================
-- QUOTE_EDIT_HISTORY (Audit log for quote changes)
-- ============================================
CREATE TABLE IF NOT EXISTS quote_edit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    edited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    revision_number INTEGER NOT NULL DEFAULT 1,
    change_summary TEXT NOT NULL,        -- Human-readable summary, e.g. "Updated total from $500 to $650"
    changes JSONB NOT NULL DEFAULT '{}', -- Structured diff: { field: { old: X, new: Y } }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quote_edit_history_quote ON quote_edit_history(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_edit_history_company ON quote_edit_history(company_id);

-- RLS
ALTER TABLE quote_edit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quote edit history belongs to company" ON quote_edit_history
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
