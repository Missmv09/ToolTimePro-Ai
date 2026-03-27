-- ============================================================
-- Migration 016: Jenny Autonomous Actions
-- Adds action logging, automation configs, and job costing
-- to support Jenny's autonomous "AI that acts" capabilities.
-- ============================================================

-- Jenny Action Log: tracks every autonomous action Jenny takes
CREATE TABLE IF NOT EXISTS jenny_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('auto_dispatch', 'lead_follow_up', 'cash_flow_alert', 'job_costing', 'review_request')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'skipped', 'failed')),
  target_id UUID,
  target_type TEXT, -- 'job', 'lead', 'invoice', 'customer'
  target_name TEXT,
  result TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  executed_at TIMESTAMPTZ
);

-- Jenny Action Configs: per-company automation settings
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

-- Job Costing: tracks actual costs vs. quoted price per job
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
  profit_margin NUMERIC(5,2) DEFAULT 0, -- percentage
  notes TEXT,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (job_id)
);

-- Lead follow-up tracking: which leads have been auto-followed-up
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_action_log_company ON jenny_action_log(company_id);
CREATE INDEX IF NOT EXISTS idx_action_log_type ON jenny_action_log(company_id, action_type);
CREATE INDEX IF NOT EXISTS idx_action_log_status ON jenny_action_log(company_id, status);
CREATE INDEX IF NOT EXISTS idx_action_log_created ON jenny_action_log(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_configs_company ON jenny_action_configs(company_id);
CREATE INDEX IF NOT EXISTS idx_job_costs_company ON job_costs(company_id);
CREATE INDEX IF NOT EXISTS idx_job_costs_job ON job_costs(job_id);
CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_lead ON lead_follow_ups(lead_id);

-- RLS
ALTER TABLE jenny_action_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE jenny_action_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jenny_action_log_company_access" ON jenny_action_log
  FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "jenny_action_configs_company_access" ON jenny_action_configs
  FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "job_costs_company_access" ON job_costs
  FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "lead_follow_ups_company_access" ON lead_follow_ups
  FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Auto-update timestamp on config changes
CREATE TRIGGER jenny_action_config_updated
  BEFORE UPDATE ON jenny_action_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_worker_profile_timestamp();
