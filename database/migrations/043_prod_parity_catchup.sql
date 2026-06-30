-- ============================================================
-- Migration 043: PROD PARITY CATCH-UP
-- ============================================================
-- One-time script to bring a database that is BEHIND (prod) up to
-- parity with the full schema (sandbox). It creates the 22 tables that
-- prod was missing — the backing tables for: blended workforce mgmt,
-- Jenny autonomous actions, material estimator + markup/staleness,
-- customer portal + portal pro, setup orders, CRM import, quote edit
-- history, saved payment methods, and SMS logs.
--
-- Consolidated faithfully from these existing, sandbox-proven migrations:
--   001 (sms_logs only), 015, 016, 017, 018, 019, 020_portal_pro,
--   022, 028_crm_data_import, 030, and
--   supabase/migrations/20260411000002 (company_payment_methods).
--
-- SAFETY PROPERTIES:
--   * Fully IDEMPOTENT — every CREATE TABLE/INDEX uses IF NOT EXISTS,
--     every CREATE POLICY/TRIGGER is preceded by DROP ... IF EXISTS,
--     functions use CREATE OR REPLACE. Running it on a DB that already
--     has these objects (e.g. sandbox) is a clean no-op.
--   * ATOMIC — wrapped in a single transaction. If anything fails, the
--     whole thing rolls back; the database can never be left half-migrated.
--   * ADDITIVE ONLY — no DROP TABLE, no data deletion, no destructive ALTER.
--
-- HOW TO RUN:
--   1. DRY RUN on the SANDBOX project first (Supabase SQL Editor). It should
--      complete with no errors and change nothing (proof it is safe).
--   2. Take a backup/snapshot of PROD (Supabase: Database > Backups).
--   3. Run it on PROD.
--   4. Re-run the schema fingerprint in both projects — table counts should
--      now match.
-- ============================================================

BEGIN;

-- Extensions used by the table defaults below (no-ops if already present)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Shared trigger function used by 015 + 016 (created before its first use)
CREATE OR REPLACE FUNCTION update_worker_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 015: Blended Workforce Management (worker_profiles,
--      classification_guardrails, contractor_invoices)
-- ============================================================
CREATE TABLE IF NOT EXISTS worker_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  classification TEXT NOT NULL CHECK (classification IN ('w2_employee', '1099_contractor')),
  hourly_rate NUMERIC(10,2),
  overtime_eligible BOOLEAN DEFAULT true,
  pay_frequency TEXT CHECK (pay_frequency IN ('weekly', 'biweekly', 'semimonthly', 'monthly')),
  withholding_allowances INTEGER,
  filing_status TEXT CHECK (filing_status IN ('single', 'married', 'head_of_household')),
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
  classified_at TIMESTAMPTZ DEFAULT now(),
  classified_by UUID REFERENCES auth.users(id),
  classification_method TEXT DEFAULT 'manual' CHECK (classification_method IN ('abc_test', 'manual', 'imported')),
  last_review_date TIMESTAMPTZ,
  next_review_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, company_id)
);

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

CREATE INDEX IF NOT EXISTS idx_worker_profiles_company ON worker_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_user ON worker_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_classification ON worker_profiles(company_id, classification);
CREATE INDEX IF NOT EXISTS idx_guardrails_company ON classification_guardrails(company_id);
CREATE INDEX IF NOT EXISTS idx_guardrails_worker ON classification_guardrails(worker_id);
CREATE INDEX IF NOT EXISTS idx_guardrails_unresolved ON classification_guardrails(company_id, resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_contractor_invoices_company ON contractor_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_contractor_invoices_contractor ON contractor_invoices(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_invoices_status ON contractor_invoices(company_id, status);

ALTER TABLE worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classification_guardrails ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "worker_profiles_company_access" ON worker_profiles;
CREATE POLICY "worker_profiles_company_access" ON worker_profiles
  FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "classification_guardrails_company_access" ON classification_guardrails;
CREATE POLICY "classification_guardrails_company_access" ON classification_guardrails
  FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "contractor_invoices_company_access" ON contractor_invoices;
CREATE POLICY "contractor_invoices_company_access" ON contractor_invoices
  FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS worker_profile_updated ON worker_profiles;
CREATE TRIGGER worker_profile_updated
  BEFORE UPDATE ON worker_profiles
  FOR EACH ROW EXECUTE FUNCTION update_worker_profile_timestamp();

DROP TRIGGER IF EXISTS contractor_invoice_updated ON contractor_invoices;
CREATE TRIGGER contractor_invoice_updated
  BEFORE UPDATE ON contractor_invoices
  FOR EACH ROW EXECUTE FUNCTION update_worker_profile_timestamp();

-- ============================================================
-- 016: Jenny Autonomous Actions
-- ============================================================
CREATE TABLE IF NOT EXISTS jenny_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('auto_dispatch', 'lead_follow_up', 'cash_flow_alert', 'job_costing', 'review_request')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'skipped', 'failed')),
  target_id UUID,
  target_type TEXT,
  target_name TEXT,
  result TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  executed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS jenny_action_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('auto_dispatch', 'lead_follow_up', 'cash_flow_alert', 'job_costing', 'review_request')),
  enabled BOOLEAN DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, action_type)
);

CREATE TABLE IF NOT EXISTS job_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  quoted_amount NUMERIC(10,2),
  labor_cost NUMERIC(10,2) DEFAULT 0,
  labor_hours NUMERIC(10,2) DEFAULT 0,
  material_cost NUMERIC(10,2) DEFAULT 0,
  other_cost NUMERIC(10,2) DEFAULT 0,
  total_cost NUMERIC(10,2) DEFAULT 0,
  profit NUMERIC(10,2) DEFAULT 0,
  profit_margin NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (job_id)
);

CREATE TABLE IF NOT EXISTS lead_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email')),
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'replied')),
  UNIQUE (lead_id, attempt_number, channel)
);

CREATE TABLE IF NOT EXISTS jenny_cron_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ran_at TIMESTAMPTZ DEFAULT now(),
  results JSONB,
  UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS idx_action_log_company ON jenny_action_log(company_id);
CREATE INDEX IF NOT EXISTS idx_action_log_type ON jenny_action_log(company_id, action_type);
CREATE INDEX IF NOT EXISTS idx_action_log_status ON jenny_action_log(company_id, status);
CREATE INDEX IF NOT EXISTS idx_action_log_created ON jenny_action_log(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_configs_company ON jenny_action_configs(company_id);
CREATE INDEX IF NOT EXISTS idx_job_costs_company ON job_costs(company_id);
CREATE INDEX IF NOT EXISTS idx_job_costs_job ON job_costs(job_id);
CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_lead ON lead_follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_jenny_cron_runs_company ON jenny_cron_runs(company_id);

ALTER TABLE jenny_action_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE jenny_action_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE jenny_cron_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jenny_action_log_company_access" ON jenny_action_log;
CREATE POLICY "jenny_action_log_company_access" ON jenny_action_log
  FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "jenny_action_configs_company_access" ON jenny_action_configs;
CREATE POLICY "jenny_action_configs_company_access" ON jenny_action_configs
  FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "job_costs_company_access" ON job_costs;
CREATE POLICY "job_costs_company_access" ON job_costs
  FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "lead_follow_ups_company_access" ON lead_follow_ups;
CREATE POLICY "lead_follow_ups_company_access" ON lead_follow_ups
  FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "jenny_cron_runs_company_access" ON jenny_cron_runs;
CREATE POLICY "jenny_cron_runs_company_access" ON jenny_cron_runs
  FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS jenny_action_config_updated ON jenny_action_configs;
CREATE TRIGGER jenny_action_config_updated
  BEFORE UPDATE ON jenny_action_configs
  FOR EACH ROW EXECUTE FUNCTION update_worker_profile_timestamp();

-- ============================================================
-- 017: Material Estimator (material_estimates, estimate_items)
-- ============================================================
CREATE TABLE IF NOT EXISTS material_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  trade TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('economy', 'standard', 'premium')),
  specs JSONB NOT NULL,
  material_total NUMERIC(10,2) NOT NULL,
  labor_estimate NUMERIC(10,2) NOT NULL,
  labor_hours NUMERIC(10,2) NOT NULL,
  grand_total NUMERIC(10,2) NOT NULL,
  notes TEXT[],
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

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

CREATE INDEX IF NOT EXISTS idx_estimates_company ON material_estimates(company_id);
CREATE INDEX IF NOT EXISTS idx_estimates_quote ON material_estimates(quote_id);
CREATE INDEX IF NOT EXISTS idx_estimate_items ON estimate_items(estimate_id);

ALTER TABLE material_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "material_estimates_company_access" ON material_estimates;
CREATE POLICY "material_estimates_company_access" ON material_estimates
  FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "estimate_items_access" ON estimate_items;
CREATE POLICY "estimate_items_access" ON estimate_items
  FOR ALL USING (estimate_id IN (SELECT id FROM material_estimates WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())));

-- ============================================================
-- 018: Material Markup Settings + Price Staleness
-- ============================================================
CREATE TABLE IF NOT EXISTS company_markup_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  trade TEXT NOT NULL,
  material_markup_percent NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  labor_markup_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, trade)
);

CREATE TABLE IF NOT EXISTS price_staleness_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
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

CREATE TABLE IF NOT EXISTS material_price_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  material_id TEXT NOT NULL,
  trade TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('economy', 'standard', 'premium')),
  estimated_price NUMERIC(10,2) NOT NULL,
  actual_price NUMERIC(10,2),
  store_name TEXT,
  purchase_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE material_estimates
  ADD COLUMN IF NOT EXISTS material_markup_percent NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_markup_percent NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_material_total NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS customer_labor_total NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS customer_grand_total NUMERIC(10,2);

CREATE INDEX IF NOT EXISTS idx_markup_settings_company ON company_markup_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_markup_settings_trade ON company_markup_settings(company_id, trade);
CREATE INDEX IF NOT EXISTS idx_staleness_alerts_company ON price_staleness_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_staleness_alerts_status ON price_staleness_alerts(status);
CREATE INDEX IF NOT EXISTS idx_price_logs_company ON material_price_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_price_logs_material ON material_price_logs(material_id);

ALTER TABLE company_markup_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_staleness_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_price_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "markup_settings_company_access" ON company_markup_settings;
CREATE POLICY "markup_settings_company_access" ON company_markup_settings
  FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "staleness_alerts_company_access" ON price_staleness_alerts;
CREATE POLICY "staleness_alerts_company_access" ON price_staleness_alerts
  FOR ALL USING (
    company_id IS NULL
    OR company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "price_logs_company_access" ON material_price_logs;
CREATE POLICY "price_logs_company_access" ON material_price_logs
  FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE OR REPLACE FUNCTION update_markup_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_markup_settings_updated ON company_markup_settings;
CREATE TRIGGER trg_markup_settings_updated
  BEFORE UPDATE ON company_markup_settings
  FOR EACH ROW EXECUTE FUNCTION update_markup_settings_timestamp();

-- ============================================================
-- 019: Customer Portal (customer_sessions, reschedule_requests)
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS reschedule_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  requested_date DATE NOT NULL,
  requested_time_start TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  response_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_customer_sessions_token ON customer_sessions(token);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer ON customer_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_active ON customer_sessions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_company ON reschedule_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_customer ON reschedule_requests(customer_id);

ALTER TABLE customer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reschedule_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_sessions_service_access" ON customer_sessions;
CREATE POLICY "customer_sessions_service_access" ON customer_sessions
  FOR ALL USING (true);

DROP POLICY IF EXISTS "reschedule_requests_service_access" ON reschedule_requests;
CREATE POLICY "reschedule_requests_service_access" ON reschedule_requests
  FOR ALL USING (true);

-- ============================================================
-- 020: Customer Portal Pro (portal_messages, portal_documents)
-- ============================================================
CREATE TABLE IF NOT EXISTS portal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'contractor')),
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN ('contract', 'warranty', 'permit', 'receipt', 'photo', 'other')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by_type TEXT NOT NULL CHECK (uploaded_by_type IN ('customer', 'contractor')),
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_messages_company ON portal_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_customer ON portal_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_job ON portal_messages(job_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_unread ON portal_messages(customer_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_portal_documents_company ON portal_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_portal_documents_customer ON portal_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_documents_job ON portal_documents(job_id);

ALTER TABLE portal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portal_messages_service_access" ON portal_messages;
CREATE POLICY "portal_messages_service_access" ON portal_messages
  FOR ALL USING (true);

DROP POLICY IF EXISTS "portal_documents_service_access" ON portal_documents;
CREATE POLICY "portal_documents_service_access" ON portal_documents
  FOR ALL USING (true);

-- ============================================================
-- 022: Setup Service Orders
-- ============================================================
CREATE TABLE IF NOT EXISTS setup_service_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  service_type VARCHAR(50) NOT NULL,
  status VARCHAR(30) DEFAULT 'pending',
  stripe_payment_intent_id VARCHAR(255),
  assigned_to VARCHAR(255),
  checklist JSONB DEFAULT '[]',
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  kickoff_call_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_setup_orders_company ON setup_service_orders(company_id);

ALTER TABLE setup_service_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own company setup orders" ON setup_service_orders;
CREATE POLICY "Users see own company setup orders"
  ON setup_service_orders FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- 028: CRM Data Import (import_jobs)
-- ============================================================
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  source_crm VARCHAR(100) NOT NULL,
  file_name VARCHAR(500),
  total_rows INTEGER DEFAULT 0,
  imported_rows INTEGER DEFAULT 0,
  skipped_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  field_mapping JSONB DEFAULT '{}',
  status VARCHAR(30) DEFAULT 'pending',
  error_log JSONB DEFAULT '[]',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_company ON import_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);

ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own company import jobs" ON import_jobs;
CREATE POLICY "Users see own company import jobs"
  ON import_jobs FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users create own company import jobs" ON import_jobs;
CREATE POLICY "Users create own company import jobs"
  ON import_jobs FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users update own company import jobs" ON import_jobs;
CREATE POLICY "Users update own company import jobs"
  ON import_jobs FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- 030: Quote Edit History
-- ============================================================
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS revision_number INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS quote_edit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  edited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  revision_number INTEGER NOT NULL DEFAULT 1,
  change_summary TEXT NOT NULL,
  changes JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_edit_history_quote ON quote_edit_history(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_edit_history_company ON quote_edit_history(company_id);

ALTER TABLE quote_edit_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Quote edit history belongs to company" ON quote_edit_history;
CREATE POLICY "Quote edit history belongs to company" ON quote_edit_history
  FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- company_payment_methods (supabase/migrations/20260411000002)
-- ============================================================
CREATE TABLE IF NOT EXISTS company_payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  method VARCHAR(50) NOT NULL,
  handle VARCHAR(255),
  display_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  is_preferred BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_payment_methods_company ON company_payment_methods(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_payment_methods_unique ON company_payment_methods(company_id, method);

ALTER TABLE company_payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own company payment methods" ON company_payment_methods;
CREATE POLICY "Users can view own company payment methods"
  ON company_payment_methods FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Owners and admins can insert payment methods" ON company_payment_methods;
CREATE POLICY "Owners and admins can insert payment methods"
  ON company_payment_methods FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')));

DROP POLICY IF EXISTS "Owners and admins can update payment methods" ON company_payment_methods;
CREATE POLICY "Owners and admins can update payment methods"
  ON company_payment_methods FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')));

DROP POLICY IF EXISTS "Owners and admins can delete payment methods" ON company_payment_methods;
CREATE POLICY "Owners and admins can delete payment methods"
  ON company_payment_methods FOR DELETE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')));

DROP POLICY IF EXISTS "Public can view active payment methods" ON company_payment_methods;
CREATE POLICY "Public can view active payment methods"
  ON company_payment_methods FOR SELECT
  USING (is_active = true);

-- ============================================================
-- sms_logs (from 001_add_missing_columns)
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  to_phone VARCHAR(50) NOT NULL,
  from_phone VARCHAR(50),
  message TEXT NOT NULL,
  message_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'sent',
  external_id VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_company ON sms_logs(company_id);

ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SMS logs belong to company" ON sms_logs;
CREATE POLICY "SMS logs belong to company" ON sms_logs
  FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

COMMIT;

-- ============================================================
-- VERIFY (run after COMMIT, in each project, compare):
--   select count(*) from information_schema.tables
--   where table_schema='public' and table_type='BASE TABLE';
-- Prod should now equal sandbox.
-- ============================================================
