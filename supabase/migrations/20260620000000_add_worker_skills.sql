-- Worker Skills & Service Catalog
-- Enables skill-constrained route assignment: jobs are only assigned to workers
-- who are qualified (and, for licensed services, hold a non-expired certification).
--
-- Adds:
--   1. services.requires_license — flag existing service types as licensed
--   2. worker_skills     — which workers can perform which services (+ cert expiry)
--   3. jobs.required_service_id — the service a job requires (null = anyone can do it)
--
-- NOTE: `services` already exists (per-company catalog with name, description,
-- default_price, duration_minutes, is_active). We extend it rather than redefine
-- it, so the existing /dashboard/services page keeps working.

-- 1. Flag services that require a non-expired certification to perform.
ALTER TABLE services ADD COLUMN IF NOT EXISTS requires_license boolean NOT NULL DEFAULT false;

-- 2. worker_skills — capabilities held by each worker
CREATE TABLE IF NOT EXISTS worker_skills (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  -- For licensed services: the date the worker's certification expires.
  -- NULL means no certification on file (worker is NOT eligible for licensed services).
  cert_expiry date,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_worker_skills_company_id ON worker_skills(company_id);
CREATE INDEX IF NOT EXISTS idx_worker_skills_user_id ON worker_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_skills_service_id ON worker_skills(service_id);

ALTER TABLE worker_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view worker skills for their company" ON worker_skills;
CREATE POLICY "Users can view worker skills for their company"
  ON worker_skills FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert worker skills for their company" ON worker_skills;
CREATE POLICY "Users can insert worker skills for their company"
  ON worker_skills FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update worker skills for their company" ON worker_skills;
CREATE POLICY "Users can update worker skills for their company"
  ON worker_skills FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete worker skills for their company" ON worker_skills;
CREATE POLICY "Users can delete worker skills for their company"
  ON worker_skills FOR DELETE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- 3. jobs.required_service_id — the service a job needs (null = no special skill)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS required_service_id uuid REFERENCES services(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_required_service_id ON jobs(required_service_id);
