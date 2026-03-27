-- ============================================================
-- Migration 015: Blended Workforce Management (W-2 + 1099)
-- Adds worker classification profiles, compliance guardrails,
-- and contractor invoicing to support mixed workforces.
-- ============================================================

-- Worker Profiles: stores classification and type-specific data for each worker
CREATE TABLE IF NOT EXISTS worker_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  classification TEXT NOT NULL CHECK (classification IN ('w2_employee', '1099_contractor')),

  -- W-2 fields
  hourly_rate NUMERIC(10,2),
  overtime_eligible BOOLEAN DEFAULT true,
  pay_frequency TEXT CHECK (pay_frequency IN ('weekly', 'biweekly', 'semimonthly', 'monthly')),
  withholding_allowances INTEGER,
  filing_status TEXT CHECK (filing_status IN ('single', 'married', 'head_of_household')),

  -- 1099 fields
  business_name TEXT,
  ein_or_ssn_on_file BOOLEAN DEFAULT false,
  w9_received BOOLEAN DEFAULT false,
  w9_received_date TIMESTAMPTZ,
  contractor_rate NUMERIC(10,2),
  contractor_rate_type TEXT CHECK (contractor_rate_type IN ('hourly', 'per_job', 'daily')),
  payment_method TEXT CHECK (payment_method IN ('invoice', 'direct_deposit', 'check')),
  payment_terms_days INTEGER DEFAULT 30,
  insurance_verified BOOLEAN DEFAULT false,
  insurance_expiry TIMESTAMPTZ,
  license_number TEXT,
  license_verified BOOLEAN DEFAULT false,
  contract_start_date TIMESTAMPTZ,
  contract_end_date TIMESTAMPTZ,

  -- Classification audit trail
  classified_at TIMESTAMPTZ DEFAULT now(),
  classified_by UUID REFERENCES auth.users(id),
  classification_method TEXT DEFAULT 'manual' CHECK (classification_method IN ('abc_test', 'manual', 'imported')),
  last_review_date TIMESTAMPTZ,
  next_review_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id, company_id)
);

-- Classification Guardrails: auto-detected misclassification risk alerts
CREATE TABLE IF NOT EXISTS classification_guardrails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  worker_name TEXT NOT NULL,
  rule_code TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'violation')),
  description TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT now(),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT
);

-- Contractor Invoices: separate payment tracking for 1099 workers
CREATE TABLE IF NOT EXISTS contractor_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contractor_name TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  description TEXT NOT NULL,
  hours_worked NUMERIC(10,2),
  rate NUMERIC(10,2) NOT NULL,
  rate_type TEXT DEFAULT 'hourly' CHECK (rate_type IN ('hourly', 'per_job', 'daily')),
  subtotal NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'paid', 'disputed')),
  submitted_date TIMESTAMPTZ,
  approved_date TIMESTAMPTZ,
  paid_date TIMESTAMPTZ,
  payment_method TEXT CHECK (payment_method IN ('invoice', 'direct_deposit', 'check')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_worker_profiles_company ON worker_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_user ON worker_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_classification ON worker_profiles(company_id, classification);
CREATE INDEX IF NOT EXISTS idx_guardrails_company ON classification_guardrails(company_id);
CREATE INDEX IF NOT EXISTS idx_guardrails_worker ON classification_guardrails(worker_id);
CREATE INDEX IF NOT EXISTS idx_guardrails_unresolved ON classification_guardrails(company_id, resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_contractor_invoices_company ON contractor_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_contractor_invoices_contractor ON contractor_invoices(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_invoices_status ON contractor_invoices(company_id, status);

-- Row Level Security
ALTER TABLE worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classification_guardrails ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies: company members can read/write their own company's data
CREATE POLICY "worker_profiles_company_access" ON worker_profiles
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "classification_guardrails_company_access" ON classification_guardrails
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "contractor_invoices_company_access" ON contractor_invoices
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Trigger: auto-update updated_at on worker_profiles
CREATE OR REPLACE FUNCTION update_worker_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER worker_profile_updated
  BEFORE UPDATE ON worker_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_worker_profile_timestamp();

-- Trigger: auto-update updated_at on contractor_invoices
CREATE TRIGGER contractor_invoice_updated
  BEFORE UPDATE ON contractor_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_worker_profile_timestamp();
