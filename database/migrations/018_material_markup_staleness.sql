-- ============================================================
-- Migration 018: Material Markup Settings + Price Staleness Tracking
-- Adds company-level markup configuration and price freshness monitoring
-- ============================================================

-- ============================================================
-- COMPANY MARKUP SETTINGS
-- Each company can set default material markup percentages per trade
-- ============================================================
CREATE TABLE IF NOT EXISTS company_markup_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  trade TEXT NOT NULL, -- e.g., 'painting', 'plumbing', or '_default' for all trades
  material_markup_percent NUMERIC(5,2) NOT NULL DEFAULT 20.00, -- % markup on materials
  labor_markup_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,     -- % markup on labor (if any)
  notes TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, trade)
);

-- ============================================================
-- PRICE STALENESS TRACKING
-- Jenny logs price review alerts here; owners approve/dismiss
-- ============================================================
CREATE TABLE IF NOT EXISTS price_staleness_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID, -- NULL = platform-wide alert (admin only)
  trade TEXT NOT NULL,
  material_count INTEGER NOT NULL DEFAULT 0,
  stale_count INTEGER NOT NULL DEFAULT 0,
  avg_price_age_days INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MATERIAL PRICE HISTORY
-- Track actual prices paid by contractors (crowd-sourced data)
-- ============================================================
CREATE TABLE IF NOT EXISTS material_price_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  material_id TEXT NOT NULL,     -- references materials-database.ts IDs
  trade TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('economy', 'standard', 'premium')),
  estimated_price NUMERIC(10,2) NOT NULL,   -- what the estimator predicted
  actual_price NUMERIC(10,2),               -- what the contractor actually paid
  store_name TEXT,                           -- where they bought it
  purchase_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ADD MARKUP FIELDS TO MATERIAL ESTIMATES
-- ============================================================
ALTER TABLE material_estimates
  ADD COLUMN IF NOT EXISTS material_markup_percent NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_markup_percent NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_material_total NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS customer_labor_total NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS customer_grand_total NUMERIC(10,2);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_markup_settings_company ON company_markup_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_markup_settings_trade ON company_markup_settings(company_id, trade);
CREATE INDEX IF NOT EXISTS idx_staleness_alerts_company ON price_staleness_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_staleness_alerts_status ON price_staleness_alerts(status);
CREATE INDEX IF NOT EXISTS idx_price_logs_company ON material_price_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_price_logs_material ON material_price_logs(material_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE company_markup_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_staleness_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_price_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "markup_settings_company_access" ON company_markup_settings
  FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "staleness_alerts_company_access" ON price_staleness_alerts
  FOR ALL USING (
    company_id IS NULL -- platform-wide alerts visible to all
    OR company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "price_logs_company_access" ON material_price_logs
  FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- AUTO-UPDATE TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_markup_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_markup_settings_updated
  BEFORE UPDATE ON company_markup_settings
  FOR EACH ROW EXECUTE FUNCTION update_markup_settings_timestamp();
