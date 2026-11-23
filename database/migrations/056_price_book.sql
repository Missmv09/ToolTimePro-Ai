-- Migration: Price Book
--
-- A company-configurable catalog of reusable services/items with set prices.
-- It replaces the hardcoded "quick add" list in the quote builder so each
-- business quotes from its own approved pricing. Workers can read it (to quote
-- within approved prices); the UI limits editing to owner/admin.
--
-- Run this in Supabase SQL Editor.

-- ============================================
-- 1. Table
-- ============================================

CREATE TABLE IF NOT EXISTS price_book_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    default_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'each',
    category TEXT,
    taxable BOOLEAN NOT NULL DEFAULT true,
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. Row Level Security (company-scoped, same pattern as the rest of the app)
-- ============================================

ALTER TABLE price_book_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Price book items belong to company" ON price_book_items
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- ============================================
-- 3. Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_price_book_items_company ON price_book_items(company_id, active);
CREATE INDEX IF NOT EXISTS idx_price_book_items_category ON price_book_items(company_id, category);
