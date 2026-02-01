-- Worker Notes Table Migration
-- Phase 1: Team Management Feature
-- Adds structured notes for tracking worker HR information

-- ============================================
-- WORKER_NOTES (HR notes for team members)
-- ============================================
CREATE TABLE IF NOT EXISTS worker_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    worker_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    note_type VARCHAR(50) NOT NULL CHECK (note_type IN ('injury', 'ada', 'fmla', 'vacation', 'sick')),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    expected_return_date DATE,
    actual_return_date DATE,
    is_active BOOLEAN DEFAULT true,
    is_confidential BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_worker_notes_company_id ON worker_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_worker_notes_worker_id ON worker_notes(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_notes_note_type ON worker_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_worker_notes_is_active ON worker_notes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_worker_notes_created_at ON worker_notes(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE worker_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view notes for workers in their company
CREATE POLICY "Users can view company worker notes" ON worker_notes
    FOR SELECT USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
    );

-- Policy: Admins and owners can insert notes
CREATE POLICY "Admins can insert worker notes" ON worker_notes
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
        AND (
            SELECT u.role FROM users u WHERE u.id = auth.uid()
        ) IN ('owner', 'admin')
    );

-- Policy: Admins and owners can update notes in their company
CREATE POLICY "Admins can update worker notes" ON worker_notes
    FOR UPDATE USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
        AND (
            SELECT u.role FROM users u WHERE u.id = auth.uid()
        ) IN ('owner', 'admin')
    );

-- Policy: Owners can delete notes in their company
CREATE POLICY "Owners can delete worker notes" ON worker_notes
    FOR DELETE USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
        AND (
            SELECT u.role FROM users u WHERE u.id = auth.uid()
        ) = 'owner'
    );

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_worker_notes_updated_at
    BEFORE UPDATE ON worker_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
