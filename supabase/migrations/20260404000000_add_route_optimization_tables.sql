-- Route Optimization Tables
-- Adds saved_routes, route_settings, and worker home address fields

-- 1. saved_routes — persist optimized routes
CREATE TABLE IF NOT EXISTS saved_routes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  route_date date NOT NULL,
  worker_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ordered_job_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  route_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for saved_routes
CREATE INDEX idx_saved_routes_company_id ON saved_routes(company_id);
CREATE INDEX idx_saved_routes_route_date ON saved_routes(route_date);
CREATE INDEX idx_saved_routes_worker_id ON saved_routes(worker_id);
CREATE INDEX idx_saved_routes_company_date ON saved_routes(company_id, route_date);

-- RLS for saved_routes
ALTER TABLE saved_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view saved routes for their company"
  ON saved_routes FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert saved routes for their company"
  ON saved_routes FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update saved routes for their company"
  ON saved_routes FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete saved routes for their company"
  ON saved_routes FOR DELETE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- 2. route_settings — per-company optimization configuration
CREATE TABLE IF NOT EXISTS route_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  avg_speed_mph numeric(5,1) NOT NULL DEFAULT 25.0,
  fuel_cost_per_mile numeric(5,2) NOT NULL DEFAULT 0.40,
  road_factor numeric(4,2) NOT NULL DEFAULT 1.35,
  office_lat double precision,
  office_lng double precision,
  office_address text,
  time_window_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS for route_settings
ALTER TABLE route_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view route settings for their company"
  ON route_settings FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert route settings for their company"
  ON route_settings FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update route settings for their company"
  ON route_settings FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- 3. Add worker home address fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_address text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_city text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_lat double precision;
ALTER TABLE users ADD COLUMN IF NOT EXISTS home_lng double precision;

-- Updated_at trigger for saved_routes
CREATE OR REPLACE FUNCTION update_saved_routes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_saved_routes_updated_at
  BEFORE UPDATE ON saved_routes
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_routes_updated_at();

-- Updated_at trigger for route_settings
CREATE OR REPLACE FUNCTION update_route_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_route_settings_updated_at
  BEFORE UPDATE ON route_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_route_settings_updated_at();
