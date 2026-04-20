-- ============================================================
-- SANDBOX CHUNK 3 of 3 — newer timestamped migrations
-- Run AFTER chunk 2 succeeds. Recent features + fixes.
-- ============================================================

-- >>> SKIPPED: 20260128000000_add_quickbooks_tables.sql (superseded or duplicated by legacy) <<<

-- >>> MIGRATION: 20260201000000_add_worker_notes_table.sql <<<
-- Worker Notes Table Migration
-- Phase 1: Team Management Feature
-- Adds structured notes for tracking worker HR information

-- ============================================
-- WORKER_NOTES (HR notes for team members)
-- ============================================
CREATE TABLE IF NOT EXISTS worker_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    worker_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    note_type VARCHAR(50) NOT NULL CHECK (note_type IN ('injury', 'ada', 'fmla', 'vacation', 'sick')),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    expected_return_date DATE,
    actual_return_date DATE,
    is_active BOOLEAN DEFAULT true,
    is_confidential BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_worker_notes_company_id ON worker_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_worker_notes_worker_id ON worker_notes(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_notes_note_type ON worker_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_worker_notes_is_active ON worker_notes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_worker_notes_created_at ON worker_notes(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE worker_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view notes for workers in their company
DROP POLICY IF EXISTS "Users can view company worker notes" ON worker_notes;
CREATE POLICY "Users can view company worker notes" ON worker_notes
    FOR SELECT USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
    );

-- Policy: Admins and owners can insert notes
DROP POLICY IF EXISTS "Admins can insert worker notes" ON worker_notes;
CREATE POLICY "Admins can insert worker notes" ON worker_notes
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
        AND (
            SELECT u.role FROM users u WHERE u.id = auth.uid()
        ) IN ('owner', 'admin')
    );

-- Policy: Admins and owners can update notes in their company
DROP POLICY IF EXISTS "Admins can update worker notes" ON worker_notes;
CREATE POLICY "Admins can update worker notes" ON worker_notes
    FOR UPDATE USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
        AND (
            SELECT u.role FROM users u WHERE u.id = auth.uid()
        ) IN ('owner', 'admin')
    );

-- Policy: Owners can delete notes in their company
DROP POLICY IF EXISTS "Owners can delete worker notes" ON worker_notes;
CREATE POLICY "Owners can delete worker notes" ON worker_notes
    FOR DELETE USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
        AND (
            SELECT u.role FROM users u WHERE u.id = auth.uid()
        ) = 'owner'
    );

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
DROP TRIGGER IF EXISTS update_worker_notes_updated_at ON worker_notes;
CREATE TRIGGER update_worker_notes_updated_at
    BEFORE UPDATE ON worker_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- >>> MIGRATION: 20260201000001_add_worker_certifications_table.sql <<<
-- Worker Certifications Table Migration
-- Phase 2: Team Management Feature
-- Tracks licenses, certifications, and their expiration dates

-- ============================================
-- WORKER_CERTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS worker_certifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    worker_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Certification details
    cert_type VARCHAR(100) NOT NULL,
    cert_name VARCHAR(255) NOT NULL,
    issuing_authority VARCHAR(255),
    cert_number VARCHAR(100),

    -- Dates
    issue_date DATE,
    expiration_date DATE,

    -- Status
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- COMMON CERTIFICATION TYPES (for reference)
-- ============================================
-- Construction: OSHA 10, OSHA 30, Forklift, Scaffold, Fall Protection
-- Electrical: Journeyman, Master, Low Voltage
-- Plumbing: Journeyman, Master, Backflow
-- HVAC: EPA 608, R-410A, NATE
-- General: CPR/First Aid, Driver's License, CDL

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_worker_certs_company_id ON worker_certifications(company_id);
CREATE INDEX IF NOT EXISTS idx_worker_certs_worker_id ON worker_certifications(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_certs_expiration ON worker_certifications(expiration_date);
CREATE INDEX IF NOT EXISTS idx_worker_certs_active ON worker_certifications(is_active) WHERE is_active = true;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE worker_certifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view certifications for workers in their company
DROP POLICY IF EXISTS "Users can view company worker certifications" ON worker_certifications;
CREATE POLICY "Users can view company worker certifications" ON worker_certifications
    FOR SELECT USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
    );

-- Policy: Admins and owners can insert certifications
DROP POLICY IF EXISTS "Admins can insert worker certifications" ON worker_certifications;
CREATE POLICY "Admins can insert worker certifications" ON worker_certifications
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
        AND (
            SELECT u.role FROM users u WHERE u.id = auth.uid()
        ) IN ('owner', 'admin')
    );

-- Policy: Admins and owners can update certifications
DROP POLICY IF EXISTS "Admins can update worker certifications" ON worker_certifications;
CREATE POLICY "Admins can update worker certifications" ON worker_certifications
    FOR UPDATE USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
        AND (
            SELECT u.role FROM users u WHERE u.id = auth.uid()
        ) IN ('owner', 'admin')
    );

-- Policy: Owners can delete certifications
DROP POLICY IF EXISTS "Owners can delete worker certifications" ON worker_certifications;
CREATE POLICY "Owners can delete worker certifications" ON worker_certifications
    FOR DELETE USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
        AND (
            SELECT u.role FROM users u WHERE u.id = auth.uid()
        ) = 'owner'
    );

-- ============================================
-- TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS update_worker_certifications_updated_at ON worker_certifications;
CREATE TRIGGER update_worker_certifications_updated_at
    BEFORE UPDATE ON worker_certifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- >>> MIGRATION: 20260201000002_add_last_login_field.sql <<<
-- Add last_login_at field to track user activation status
-- Users who have never logged in will have NULL, indicating pending activation

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient queries on login status
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);

-- >>> MIGRATION: 20260201000003_add_admin_update_users_policy.sql <<<
-- Allow admins and owners to update team members in their company
-- Fixes: toggleMemberStatus was silently failing because the only UPDATE
-- policy on users was "Users can update own profile" (id = auth.uid()).
DROP POLICY IF EXISTS "Admins can update team members" ON users;
CREATE POLICY "Admins can update team members" ON users
    FOR UPDATE USING (
        company_id IN (
            SELECT u.company_id
            FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'owner')
        )
    );

-- >>> MIGRATION: 20260201000005_allow_admin_insert_users.sql <<<
-- Allow admins and owners to create new team members in their company
-- This fixes the RLS error when creating team members from the dashboard

DROP POLICY IF EXISTS "Admins can insert team members" ON users;
CREATE POLICY "Admins can insert team members" ON users
    FOR INSERT WITH CHECK (
        -- Allow if the inserting user is an admin or owner in the same company
        company_id IN (
            SELECT u.company_id
            FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'owner')
        )
    );

-- >>> MIGRATION: 20260315000000_add_2fa_tables.sql <<<
-- Two-Factor Authentication tables and columns

-- Add 2FA fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_phone TEXT;

-- Verification codes (short-lived)
CREATE TABLE IF NOT EXISTS two_fa_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_two_fa_codes_user ON two_fa_codes(user_id, used, expires_at);

-- Trusted devices (remember this device)
CREATE TABLE IF NOT EXISTS trusted_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL UNIQUE,
  device_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_token ON trusted_devices(device_token);

-- RLS - only service role should access these
ALTER TABLE two_fa_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;

-- >>> MIGRATION: 20260315000001_add_payment_features.sql <<<
-- Payment features: Stripe Connect, invoice payments, quote deposits

-- Stripe Connect for companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_connect_account_id VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_connect_onboarded BOOLEAN DEFAULT FALSE;

-- Quote deposits
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT FALSE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_percentage DECIMAL(5,2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT FALSE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_stripe_payment_id VARCHAR(255);

-- Invoice deposit tracking
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS quote_id UUID;

-- >>> MIGRATION: 20260401000000_add_stripe_audit_logs.sql <<<
-- Stripe audit logs — tracks all admin price/product management actions
CREATE TABLE IF NOT EXISTS stripe_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_email VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,       -- create_product, update_product, create_price, update_price
    target_type VARCHAR(50) NOT NULL,   -- product, price
    target_id VARCHAR(255),             -- Stripe object ID (prod_xxx, price_xxx)
    details JSONB DEFAULT '{}',         -- full context of the change
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_stripe_audit_logs_admin ON stripe_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_audit_logs_action ON stripe_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_stripe_audit_logs_created ON stripe_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_audit_logs_target ON stripe_audit_logs(target_type, target_id);

-- RLS: Only service role can access (admin operations go through API with service key)
ALTER TABLE stripe_audit_logs ENABLE ROW LEVEL SECURITY;
-- No RLS policies = only service role key can read/write (same pattern as platform_admins)

-- >>> MIGRATION: 20260404000000_add_route_optimization_tables.sql <<<
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

DROP POLICY IF EXISTS "Users can view saved routes for their company" ON saved_routes;
CREATE POLICY "Users can view saved routes for their company"
  ON saved_routes FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert saved routes for their company" ON saved_routes;
CREATE POLICY "Users can insert saved routes for their company"
  ON saved_routes FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update saved routes for their company" ON saved_routes;
CREATE POLICY "Users can update saved routes for their company"
  ON saved_routes FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete saved routes for their company" ON saved_routes;
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

DROP POLICY IF EXISTS "Users can view route settings for their company" ON route_settings;
CREATE POLICY "Users can view route settings for their company"
  ON route_settings FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert route settings for their company" ON route_settings;
CREATE POLICY "Users can insert route settings for their company"
  ON route_settings FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update route settings for their company" ON route_settings;
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

DROP TRIGGER IF EXISTS set_saved_routes_updated_at ON saved_routes;
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

DROP TRIGGER IF EXISTS set_route_settings_updated_at ON route_settings;
CREATE TRIGGER set_route_settings_updated_at
  BEFORE UPDATE ON route_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_route_settings_updated_at();

-- >>> MIGRATION: 20260410000000_add_payment_instructions.sql <<<
-- Add payment_instructions column to companies table
-- Allows contractors to display alternative payment details (Zelle, Venmo, check info, etc.)
-- on customer-facing invoices

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS payment_instructions TEXT DEFAULT NULL;

-- >>> SKIPPED: 20260411000000_fix_quickbooks_schema.sql (superseded or duplicated by legacy) <<<

-- >>> SKIPPED: 20260411000001_fix_invoice_items_rls.sql (superseded or duplicated by legacy) <<<

-- >>> MIGRATION: 20260411000002_add_company_payment_methods.sql <<<
-- Add structured payment methods for companies
-- Replaces freeform payment_instructions with structured data

CREATE TABLE IF NOT EXISTS company_payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    method VARCHAR(50) NOT NULL,  -- zelle, venmo, cashapp, paypal, square, stripe, check, cash, other
    handle VARCHAR(255),          -- email, phone, @handle, URL, or payable-to name
    display_name VARCHAR(100),    -- optional custom label (e.g. "Business Zelle")
    is_active BOOLEAN DEFAULT true,
    is_preferred BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by company
CREATE INDEX IF NOT EXISTS idx_company_payment_methods_company
    ON company_payment_methods(company_id);

-- Unique constraint: one method type per company (can have only one Zelle, one Venmo, etc.)
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_payment_methods_unique
    ON company_payment_methods(company_id, method);

-- RLS policies
ALTER TABLE company_payment_methods ENABLE ROW LEVEL SECURITY;

-- Users can view payment methods for their own company
CREATE POLICY "Users can view own company payment methods"
    ON company_payment_methods FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Owners and admins can manage payment methods
CREATE POLICY "Owners and admins can insert payment methods"
    ON company_payment_methods FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM users
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Owners and admins can update payment methods"
    ON company_payment_methods FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM users
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Owners and admins can delete payment methods"
    ON company_payment_methods FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM users
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Public read access for invoice/quote display (customers viewing invoices don't have auth)
CREATE POLICY "Public can view active payment methods"
    ON company_payment_methods FOR SELECT
    USING (is_active = true);

-- >>> SKIPPED: 20260415000000_fix_missing_rls_policies.sql (superseded or duplicated by legacy) <<<

-- >>> SKIPPED: 20260416000000_cascade_delete_company_fks.sql (superseded or duplicated by legacy) <<<
