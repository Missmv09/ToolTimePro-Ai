-- Worker Skills & Service Catalog
-- Enables skill-constrained route assignment: jobs are only assigned to workers
-- who are qualified (and, for licensed services, hold a non-expired certification).
--
-- Adds:
--   1. services         — per-company catalog of service types
--   2. worker_skills     — which workers can perform which services (+ cert expiry)
--   3. jobs.required_service_id — the service a job requires (null = anyone can do it)

-- 1. services — company-defined catalog of service types
CREATE TABLE IF NOT EXISTS services (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  -- When true, a worker must hold a non-expired certification (worker_skills.cert_expiry)
  -- to be eligible for jobs requiring this service.
  requires_license boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_services_company_id ON services(company_id);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view services for their company" ON services;
CREATE POLICY "Users can view services for their company"
  ON services FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert services for their company" ON services;
CREATE POLICY "Users can insert services for their company"
  ON services FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update services for their company" ON services;
CREATE POLICY "Users can update services for their company"
  ON services FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete services for their company" ON services;
CREATE POLICY "Users can delete services for their company"
  ON services FOR DELETE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

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

-- Updated_at trigger for services
CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_services_updated_at ON services;
CREATE TRIGGER set_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_services_updated_at();
