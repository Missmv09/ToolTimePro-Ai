-- Migration: Add beta tester flag to companies
--
-- Beta testers get Elite plan access with all add-ons.
-- Their trial never expires automatically.
-- They can be identified and filtered in the admin dashboard.
--
-- Run this in Supabase SQL Editor.

-- ============================================
-- 1. Add beta tester columns to companies
-- ============================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_beta_tester BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS beta_notes TEXT;

-- ============================================
-- 2. Index for filtering beta testers
-- ============================================

CREATE INDEX IF NOT EXISTS idx_companies_beta_tester ON companies(is_beta_tester) WHERE is_beta_tester = true;
