-- ============================================================
-- Migration 017: Material Estimator
-- Stores saved material estimates and links them to quotes
-- ============================================================

-- Material Estimates: saved estimates from the estimator
CREATE TABLE IF NOT EXISTS material_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  trade TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('economy', 'standard', 'premium')),
  specs JSONB NOT NULL, -- the answers from the wizard
  material_total NUMERIC(10,2) NOT NULL,
  labor_estimate NUMERIC(10,2) NOT NULL,
  labor_hours NUMERIC(10,2) NOT NULL,
  grand_total NUMERIC(10,2) NOT NULL,
  notes TEXT[],
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Estimate Items: individual materials in an estimate
CREATE TABLE IF NOT EXISTS estimate_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES material_estimates(id) ON DELETE CASCADE,
  material_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  quantity NUMERIC(10,2) NOT NULL,
  unit TEXT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  tier TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_estimates_company ON material_estimates(company_id);
CREATE INDEX IF NOT EXISTS idx_estimates_quote ON material_estimates(quote_id);
CREATE INDEX IF NOT EXISTS idx_estimate_items ON estimate_items(estimate_id);

-- RLS
ALTER TABLE material_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "material_estimates_company_access" ON material_estimates
  FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "estimate_items_access" ON estimate_items
  FOR ALL USING (estimate_id IN (SELECT id FROM material_estimates WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())));
