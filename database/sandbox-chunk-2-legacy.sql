-- ============================================================
-- SANDBOX CHUNK 2 of 3 — legacy numbered migrations
-- Run AFTER chunk 1 succeeds. Adds extra tables, columns, policies.
-- ============================================================

-- >>> LEGACY MIGRATION: 001_add_missing_columns.sql <<<
-- Migration: Add missing columns for full feature support
-- Run this in Supabase SQL Editor if you already deployed schema.sql previously

-- 1. Add PIN column to users table (for worker mobile app authentication)
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin VARCHAR(10);

-- 2. Add missing columns to review_requests table (for review tracking UI)
ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS review_link TEXT;
ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'sms';

-- 3. Make review_requests.job_id nullable (not all review requests are tied to a job)
ALTER TABLE review_requests ALTER COLUMN job_id DROP NOT NULL;

-- 4. Make payments.invoice_id nullable (Stripe subscription payments don't tie to app invoices)
ALTER TABLE payments ALTER COLUMN invoice_id DROP NOT NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed';

-- 5. Create compliance_alerts table
CREATE TABLE IF NOT EXISTS compliance_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    time_entry_id UUID REFERENCES time_entries(id) ON DELETE SET NULL,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) DEFAULT 'warning',
    message TEXT NOT NULL,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create sms_logs table
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

-- 7. Create qbo_connections table
CREATE TABLE IF NOT EXISTS qbo_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
    realm_id VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create qbo_sync_log table
CREATE TABLE IF NOT EXISTS qbo_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'in_progress',
    records_synced INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 9. Enable RLS on new tables
ALTER TABLE compliance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbo_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbo_sync_log ENABLE ROW LEVEL SECURITY;

-- 10. Add RLS policies for new tables
CREATE POLICY "Compliance alerts belong to company" ON compliance_alerts
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
CREATE POLICY "SMS logs belong to company" ON sms_logs
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
CREATE POLICY "QBO connections belong to company" ON qbo_connections
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
CREATE POLICY "QBO sync logs belong to company" ON qbo_sync_log
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- 11. Add indexes for new tables
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_company ON compliance_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_company ON sms_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_qbo_connections_company ON qbo_connections(company_id);

-- 12. Create website_templates table
CREATE TABLE IF NOT EXISTS website_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    trade_category VARCHAR(100),
    style VARCHAR(100) DEFAULT 'modern',
    preview_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Create website_sites table
CREATE TABLE IF NOT EXISTS website_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES website_templates(id) ON DELETE SET NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    business_name VARCHAR(255) NOT NULL,
    business_phone VARCHAR(50) NOT NULL,
    business_email VARCHAR(255) NOT NULL,
    business_address TEXT DEFAULT '',
    site_content JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'draft',
    custom_domain VARCHAR(255),
    domain_status VARCHAR(50),
    wizard_step INTEGER DEFAULT 1,
    wizard_completed BOOLEAN DEFAULT false,
    domain_registered_at TIMESTAMP WITH TIME ZONE,
    domain_expires_at TIMESTAMP WITH TIME ZONE,
    domain_auto_renew BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Create website_leads table
CREATE TABLE IF NOT EXISTS website_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID REFERENCES website_sites(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    message TEXT,
    service_requested TEXT,
    source VARCHAR(100) DEFAULT 'website_contact_form',
    status VARCHAR(50) DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Create website_domain_log table
CREATE TABLE IF NOT EXISTS website_domain_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID REFERENCES website_sites(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    domain_name VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    response_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Enable RLS on website tables
ALTER TABLE website_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_domain_log ENABLE ROW LEVEL SECURITY;

-- 17. RLS policies for website tables
CREATE POLICY "Templates are readable" ON website_templates FOR SELECT USING (true);
CREATE POLICY "Website sites belong to company" ON website_sites
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Website leads belong to company" ON website_leads
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Website domain logs belong to company" ON website_domain_log
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- 18. Indexes for website tables
CREATE INDEX IF NOT EXISTS idx_website_sites_user ON website_sites(user_id);
CREATE INDEX IF NOT EXISTS idx_website_sites_company ON website_sites(company_id);
CREATE INDEX IF NOT EXISTS idx_website_leads_site ON website_leads(site_id);
CREATE INDEX IF NOT EXISTS idx_website_leads_company ON website_leads(company_id);
CREATE INDEX IF NOT EXISTS idx_website_domain_log_site ON website_domain_log(site_id);

-- >>> LEGACY MIGRATION: 001_timeclock_compliance.sql <<<
-- ============================================
-- Time Clock & California Compliance Migration
-- Run this in Supabase SQL Editor AFTER initial schema
-- ============================================

-- Add photo verification to time_entries
ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS clock_in_photo_url TEXT,
ADD COLUMN IF NOT EXISTS clock_out_photo_url TEXT;

-- Add attestation fields to time_entries (for end-of-day attestation)
ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS attestation_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS attestation_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS attestation_signature TEXT, -- Base64 signature image
ADD COLUMN IF NOT EXISTS missed_meal_break BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS missed_meal_reason TEXT,
ADD COLUMN IF NOT EXISTS missed_rest_break BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS missed_rest_reason TEXT;

-- Add location tracking to breaks
ALTER TABLE breaks
ADD COLUMN IF NOT EXISTS location JSONB; -- {lat, lng, address}

-- ============================================
-- COMPLIANCE_ALERTS (Track violations and warnings)
-- ============================================
CREATE TABLE IF NOT EXISTS compliance_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    time_entry_id UUID REFERENCES time_entries(id) ON DELETE SET NULL,
    alert_type VARCHAR(50) NOT NULL, -- meal_break_due, meal_break_missed, rest_break_due, overtime_warning, double_time_warning
    severity VARCHAR(20) DEFAULT 'warning', -- info, warning, violation
    title VARCHAR(255) NOT NULL,
    description TEXT,
    hours_worked DECIMAL(5,2), -- Hours at time of alert
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for compliance alerts
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_company ON compliance_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_user ON compliance_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_date ON compliance_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_type ON compliance_alerts(alert_type);

-- Enable RLS
ALTER TABLE compliance_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policy for compliance_alerts
DROP POLICY IF EXISTS "Compliance alerts belong to company" ON compliance_alerts;
CREATE POLICY "Compliance alerts belong to company" ON compliance_alerts
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- ============================================
-- OFFLINE_SYNC_QUEUE (For offline mode)
-- ============================================
CREATE TABLE IF NOT EXISTS offline_sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- clock_in, clock_out, break_start, break_end
    payload JSONB NOT NULL,
    created_offline_at TIMESTAMP WITH TIME ZONE NOT NULL, -- When action was taken offline
    synced_at TIMESTAMP WITH TIME ZONE, -- When synced to server
    sync_status VARCHAR(20) DEFAULT 'pending', -- pending, synced, failed
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for sync queue
CREATE INDEX IF NOT EXISTS idx_offline_sync_company ON offline_sync_queue(company_id);
CREATE INDEX IF NOT EXISTS idx_offline_sync_user ON offline_sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_sync_status ON offline_sync_queue(sync_status);

-- Enable RLS
ALTER TABLE offline_sync_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policy for offline_sync_queue
DROP POLICY IF EXISTS "Sync queue belongs to company" ON offline_sync_queue;
CREATE POLICY "Sync queue belongs to company" ON offline_sync_queue
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- ============================================
-- Helper function: Calculate hours worked
-- ============================================
CREATE OR REPLACE FUNCTION calculate_hours_worked(entry_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    hours DECIMAL;
    entry_record RECORD;
    total_break_minutes INTEGER;
BEGIN
    SELECT clock_in, clock_out, break_minutes INTO entry_record
    FROM time_entries WHERE id = entry_id;

    IF entry_record.clock_out IS NULL THEN
        hours := EXTRACT(EPOCH FROM (NOW() - entry_record.clock_in)) / 3600;
    ELSE
        hours := EXTRACT(EPOCH FROM (entry_record.clock_out - entry_record.clock_in)) / 3600;
    END IF;

    -- Subtract breaks
    total_break_minutes := COALESCE(entry_record.break_minutes, 0);
    hours := hours - (total_break_minutes::DECIMAL / 60);

    RETURN ROUND(hours::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger: Auto-create compliance alerts
-- ============================================
CREATE OR REPLACE FUNCTION check_compliance_on_update()
RETURNS TRIGGER AS $$
DECLARE
    hours_worked DECIMAL;
    alert_exists BOOLEAN;
BEGIN
    -- Only check if entry is active (no clock_out yet)
    IF NEW.clock_out IS NULL THEN
        hours_worked := EXTRACT(EPOCH FROM (NOW() - NEW.clock_in)) / 3600;

        -- Check for 5-hour meal break requirement
        IF hours_worked >= 5 THEN
            SELECT EXISTS(
                SELECT 1 FROM compliance_alerts
                WHERE time_entry_id = NEW.id
                AND alert_type = 'meal_break_due'
            ) INTO alert_exists;

            IF NOT alert_exists THEN
                -- Check if they took a meal break
                IF NOT EXISTS(SELECT 1 FROM breaks WHERE time_entry_id = NEW.id AND break_type = 'meal' AND break_end IS NOT NULL) THEN
                    INSERT INTO compliance_alerts (company_id, user_id, time_entry_id, alert_type, severity, title, description, hours_worked)
                    VALUES (
                        NEW.company_id,
                        NEW.user_id,
                        NEW.id,
                        'meal_break_missed',
                        'violation',
                        'Meal Break Violation',
                        'Employee worked over 5 hours without a 30-minute meal break',
                        hours_worked
                    );
                END IF;
            END IF;
        END IF;

        -- Check for overtime (8 hours)
        IF hours_worked >= 8 THEN
            SELECT EXISTS(
                SELECT 1 FROM compliance_alerts
                WHERE time_entry_id = NEW.id
                AND alert_type = 'overtime_warning'
            ) INTO alert_exists;

            IF NOT alert_exists THEN
                INSERT INTO compliance_alerts (company_id, user_id, time_entry_id, alert_type, severity, title, description, hours_worked)
                VALUES (
                    NEW.company_id,
                    NEW.user_id,
                    NEW.id,
                    'overtime_warning',
                    'info',
                    'Overtime Started',
                    'Employee has worked 8+ hours - overtime pay applies',
                    hours_worked
                );
            END IF;
        END IF;

        -- Check for double time (12 hours)
        IF hours_worked >= 12 THEN
            SELECT EXISTS(
                SELECT 1 FROM compliance_alerts
                WHERE time_entry_id = NEW.id
                AND alert_type = 'double_time_warning'
            ) INTO alert_exists;

            IF NOT alert_exists THEN
                INSERT INTO compliance_alerts (company_id, user_id, time_entry_id, alert_type, severity, title, description, hours_worked)
                VALUES (
                    NEW.company_id,
                    NEW.user_id,
                    NEW.id,
                    'double_time_warning',
                    'warning',
                    'Double Time Started',
                    'Employee has worked 12+ hours - double time pay applies',
                    hours_worked
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger would run on every update which may not be ideal
-- Consider using a scheduled function instead for production
-- CREATE TRIGGER check_compliance_trigger AFTER UPDATE ON time_entries
--     FOR EACH ROW EXECUTE FUNCTION check_compliance_on_update();

-- >>> LEGACY MIGRATION: 002_add_missing_rls_policies.sql <<<
-- Migration: Add missing RLS policies for job-related tables
-- Run this in Supabase SQL Editor to fix job assignment functionality

-- Job assignments: users can manage assignments for jobs in their company
DROP POLICY IF EXISTS "Job assignments for company jobs" ON job_assignments;
CREATE POLICY "Job assignments for company jobs" ON job_assignments
    FOR ALL USING (
        job_id IN (
            SELECT j.id FROM jobs j
            WHERE j.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- Job services: users can manage services for jobs in their company
DROP POLICY IF EXISTS "Job services for company jobs" ON job_services;
CREATE POLICY "Job services for company jobs" ON job_services
    FOR ALL USING (
        job_id IN (
            SELECT j.id FROM jobs j
            WHERE j.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- Job checklists: users can manage checklists for jobs in their company
DROP POLICY IF EXISTS "Job checklists for company jobs" ON job_checklists;
CREATE POLICY "Job checklists for company jobs" ON job_checklists
    FOR ALL USING (
        job_id IN (
            SELECT j.id FROM jobs j
            WHERE j.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- Job photos: users can manage photos for jobs in their company
DROP POLICY IF EXISTS "Job photos for company jobs" ON job_photos;
CREATE POLICY "Job photos for company jobs" ON job_photos
    FOR ALL USING (
        job_id IN (
            SELECT j.id FROM jobs j
            WHERE j.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- Job notes: users can manage notes for jobs in their company
DROP POLICY IF EXISTS "Job notes for company jobs" ON job_notes;
CREATE POLICY "Job notes for company jobs" ON job_notes
    FOR ALL USING (
        job_id IN (
            SELECT j.id FROM jobs j
            WHERE j.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- Quote items: users can manage items for quotes in their company
DROP POLICY IF EXISTS "Quote items for company quotes" ON quote_items;
CREATE POLICY "Quote items for company quotes" ON quote_items
    FOR ALL USING (
        quote_id IN (
            SELECT q.id FROM quotes q
            WHERE q.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- Invoice items: users can manage items for invoices in their company
DROP POLICY IF EXISTS "Invoice items for company invoices" ON invoice_items;
CREATE POLICY "Invoice items for company invoices" ON invoice_items
    FOR ALL USING (
        invoice_id IN (
            SELECT i.id FROM invoices i
            WHERE i.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- Payments: users can manage payments in their company
DROP POLICY IF EXISTS "Payments belong to company" ON payments;
CREATE POLICY "Payments belong to company" ON payments
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Incidents: users can manage incidents in their company
DROP POLICY IF EXISTS "Incidents belong to company" ON incidents;
CREATE POLICY "Incidents belong to company" ON incidents
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Review requests: users can manage review requests in their company
DROP POLICY IF EXISTS "Review requests belong to company" ON review_requests;
CREATE POLICY "Review requests belong to company" ON review_requests
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Breaks: users can manage breaks for time entries in their company
DROP POLICY IF EXISTS "Breaks for company time entries" ON breaks;
CREATE POLICY "Breaks for company time entries" ON breaks
    FOR ALL USING (
        time_entry_id IN (
            SELECT t.id FROM time_entries t
            WHERE t.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- >>> LEGACY MIGRATION: 003_platform_admin.sql <<<
-- Platform Admin table
-- Tracks which users have vendor-level (platform) admin access to manage all companies
-- This is separate from the per-company admin/owner roles

CREATE TABLE IF NOT EXISTS platform_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) DEFAULT 'admin', -- admin, super_admin
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_platform_admins_email ON platform_admins(email);
CREATE INDEX IF NOT EXISTS idx_platform_admins_user_id ON platform_admins(user_id);

-- RLS: Only service role can access this table (no client-side access)
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- No RLS policies = only service role key can read/write
-- This is intentional: platform admin checks happen server-side only

-- Auto-update timestamp
CREATE TRIGGER update_platform_admins_updated_at BEFORE UPDATE ON platform_admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- >>> LEGACY MIGRATION: 003_website_builder.sql <<<
-- ============================================
-- TOOLTIME PRO — Website Builder Phase 1
-- Migration: 003_website_builder.sql
-- Creates: website_templates, website_sites, website_leads, website_domain_log
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================

-- Enable UUID extension (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- WEBSITE_TEMPLATES (Starter templates for trades)
-- ============================================
CREATE TABLE IF NOT EXISTS website_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trade_category VARCHAR(100) NOT NULL,  -- painter, landscaper, plumber, electrician, general, etc.
    style VARCHAR(50) DEFAULT 'modern',     -- modern, classic, bold, clean, minimal
    primary_color VARCHAR(20) DEFAULT '#2563eb',
    secondary_color VARCHAR(20) DEFAULT '#1e40af',
    accent_color VARCHAR(20) DEFAULT '#f59e0b',
    font_heading VARCHAR(100) DEFAULT 'Inter',
    font_body VARCHAR(100) DEFAULT 'Inter',
    layout_config JSONB DEFAULT '{}',       -- Header style, section order, etc.
    default_content JSONB DEFAULT '{}',     -- Hero text, about text, services list, etc.
    thumbnail_url TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- WEBSITE_SITES (User's actual website instance)
-- ============================================
CREATE TABLE IF NOT EXISTS website_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES website_templates(id) ON DELETE SET NULL,
    slug VARCHAR(100) UNIQUE,               -- tooltimepro.com/site/{slug}
    business_name VARCHAR(255),
    business_phone VARCHAR(50),
    business_email VARCHAR(255),
    business_address TEXT,
    site_content JSONB DEFAULT '{}',        -- User-customized content overrides
    status VARCHAR(50) DEFAULT 'draft',     -- draft, published, suspended
    custom_domain VARCHAR(255),
    domain_status VARCHAR(50) DEFAULT 'none', -- none, pending, active, expired, failed
    domain_registered_at TIMESTAMP WITH TIME ZONE,
    domain_expires_at TIMESTAMP WITH TIME ZONE,
    domain_auto_renew BOOLEAN DEFAULT true,
    wizard_step INTEGER DEFAULT 1,          -- 1=template, 2=content, 3=review, 4=domain, 5=publish
    wizard_completed BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- WEBSITE_LEADS (Contact form submissions from published sites)
-- ============================================
CREATE TABLE IF NOT EXISTS website_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID REFERENCES website_sites(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    message TEXT,
    service_requested VARCHAR(255),
    source VARCHAR(100) DEFAULT 'contact_form', -- contact_form, phone_click, quote_request
    status VARCHAR(50) DEFAULT 'new',            -- new, contacted, converted, archived
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- WEBSITE_DOMAIN_LOG (Audit trail for all domain operations)
-- ============================================
CREATE TABLE IF NOT EXISTS website_domain_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID REFERENCES website_sites(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    domain_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,           -- register, dns_update, renew, transfer, cancel
    status VARCHAR(50) NOT NULL,            -- pending, success, failed
    response_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_website_templates_trade ON website_templates(trade_category);
CREATE INDEX IF NOT EXISTS idx_website_templates_active ON website_templates(is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_website_sites_user ON website_sites(user_id);
CREATE INDEX IF NOT EXISTS idx_website_sites_company ON website_sites(company_id);
CREATE INDEX IF NOT EXISTS idx_website_sites_slug ON website_sites(slug);
CREATE INDEX IF NOT EXISTS idx_website_sites_domain ON website_sites(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_website_sites_status ON website_sites(status);

CREATE INDEX IF NOT EXISTS idx_website_leads_site ON website_leads(site_id);
CREATE INDEX IF NOT EXISTS idx_website_leads_company ON website_leads(company_id);
CREATE INDEX IF NOT EXISTS idx_website_leads_status ON website_leads(status);
CREATE INDEX IF NOT EXISTS idx_website_leads_created ON website_leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_website_domain_log_site ON website_domain_log(site_id);
CREATE INDEX IF NOT EXISTS idx_website_domain_log_domain ON website_domain_log(domain_name);
CREATE INDEX IF NOT EXISTS idx_website_domain_log_created ON website_domain_log(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE website_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_domain_log ENABLE ROW LEVEL SECURITY;

-- Templates: anyone can read active templates (public catalog)
CREATE POLICY "Anyone can read active templates"
    ON website_templates FOR SELECT
    USING (is_active = true);

-- Sites: users can manage their own sites
CREATE POLICY "Users can read own sites"
    ON website_sites FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sites"
    ON website_sites FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sites"
    ON website_sites FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own sites"
    ON website_sites FOR DELETE
    USING (user_id = auth.uid());

-- Company members can see sites in their company
CREATE POLICY "Company members can read company sites"
    ON website_sites FOR SELECT
    USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
    );

-- Leads: company members can read leads for their company
CREATE POLICY "Company members can read leads"
    ON website_leads FOR SELECT
    USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
    );

-- Leads: anonymous inserts allowed (website contact forms)
CREATE POLICY "Anonymous can insert leads"
    ON website_leads FOR INSERT
    WITH CHECK (true);

-- Company members can update lead status
CREATE POLICY "Company members can update leads"
    ON website_leads FOR UPDATE
    USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
    );

-- Domain log: users can read their own domain logs
CREATE POLICY "Users can read own domain logs"
    ON website_domain_log FOR SELECT
    USING (user_id = auth.uid());

-- Domain log: company members can read company logs
CREATE POLICY "Company members can read domain logs"
    ON website_domain_log FOR SELECT
    USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
    );

-- Service role bypass for API routes that write data
-- (service_role key already bypasses RLS by default in Supabase)

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at for website_templates
CREATE TRIGGER update_website_templates_updated_at
    BEFORE UPDATE ON website_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update updated_at for website_sites
CREATE TRIGGER update_website_sites_updated_at
    BEFORE UPDATE ON website_sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED DATA: 10 Starter Templates
-- ============================================

INSERT INTO website_templates (slug, name, description, trade_category, style, primary_color, secondary_color, accent_color, font_heading, font_body, sort_order, layout_config, default_content)
VALUES
    (
        'painter-bold',
        'Bold Strokes',
        'Eye-catching design for painting contractors who want to stand out. Bold colors and large hero images.',
        'painter',
        'bold',
        '#dc2626',
        '#991b1b',
        '#fbbf24',
        'Montserrat',
        'Open Sans',
        1,
        '{"heroStyle": "full-width", "sections": ["hero", "services", "gallery", "testimonials", "contact"], "navStyle": "fixed"}',
        '{"heroTitle": "Professional Painting Services", "heroSubtitle": "Transform your space with expert craftsmanship", "services": ["Interior Painting", "Exterior Painting", "Cabinet Refinishing", "Deck Staining", "Color Consultation"], "ctaText": "Get a Free Estimate"}'
    ),
    (
        'painter-clean',
        'Clean Canvas',
        'Minimalist, clean design that lets your work speak for itself. Perfect for high-end residential painters.',
        'painter',
        'clean',
        '#3b82f6',
        '#1d4ed8',
        '#10b981',
        'Playfair Display',
        'Lato',
        2,
        '{"heroStyle": "split", "sections": ["hero", "about", "services", "before-after", "reviews", "contact"], "navStyle": "transparent"}',
        '{"heroTitle": "Precision Painting", "heroSubtitle": "Where quality meets attention to detail", "services": ["Interior Painting", "Exterior Painting", "Wallpaper Installation", "Faux Finishes", "Popcorn Ceiling Removal"], "ctaText": "Schedule a Consultation"}'
    ),
    (
        'landscaper-green',
        'Green Thumb',
        'Natural, earthy design for landscaping and lawn care businesses. Features outdoor imagery and organic shapes.',
        'landscaper',
        'modern',
        '#16a34a',
        '#15803d',
        '#ca8a04',
        'Nunito',
        'Source Sans Pro',
        3,
        '{"heroStyle": "full-width", "sections": ["hero", "services", "gallery", "seasonal", "testimonials", "contact"], "navStyle": "fixed"}',
        '{"heroTitle": "Beautiful Landscapes, Built to Last", "heroSubtitle": "Professional landscaping and lawn care for your home", "services": ["Lawn Maintenance", "Landscape Design", "Irrigation Systems", "Tree Trimming", "Hardscaping", "Seasonal Cleanup"], "ctaText": "Get Your Free Quote"}'
    ),
    (
        'landscaper-modern',
        'Modern Grounds',
        'Sleek, contemporary design for modern landscaping companies. Dark theme with vibrant green accents.',
        'landscaper',
        'modern',
        '#059669',
        '#047857',
        '#f97316',
        'Poppins',
        'Inter',
        4,
        '{"heroStyle": "video", "sections": ["hero", "services", "process", "gallery", "reviews", "contact"], "navStyle": "fixed"}',
        '{"heroTitle": "Modern Outdoor Living", "heroSubtitle": "Design. Build. Maintain.", "services": ["Landscape Architecture", "Outdoor Living Spaces", "Water Features", "Lighting Design", "Maintenance Plans"], "ctaText": "Start Your Project"}'
    ),
    (
        'plumber-pro',
        'PipePro',
        'Professional and trustworthy design for plumbing businesses. Emphasizes reliability and fast service.',
        'plumber',
        'modern',
        '#2563eb',
        '#1e40af',
        '#ef4444',
        'Roboto',
        'Roboto',
        5,
        '{"heroStyle": "split", "sections": ["hero", "emergency-banner", "services", "service-area", "testimonials", "contact"], "navStyle": "fixed"}',
        '{"heroTitle": "Fast & Reliable Plumbing", "heroSubtitle": "Licensed, insured, and ready when you need us", "services": ["Emergency Repairs", "Drain Cleaning", "Water Heater Installation", "Pipe Repair", "Bathroom Remodeling", "Sewer Line Service"], "ctaText": "Call Now", "emergencyText": "24/7 Emergency Service Available"}'
    ),
    (
        'electrician-spark',
        'SparkWorks',
        'High-energy design for electrical contractors. Yellow accents on dark backgrounds for maximum impact.',
        'electrician',
        'bold',
        '#eab308',
        '#ca8a04',
        '#1f2937',
        'Oswald',
        'Nunito Sans',
        6,
        '{"heroStyle": "full-width", "sections": ["hero", "services", "safety-badges", "gallery", "reviews", "contact"], "navStyle": "dark"}',
        '{"heroTitle": "Expert Electrical Services", "heroSubtitle": "Safe, reliable, up to code — every time", "services": ["Panel Upgrades", "Wiring & Rewiring", "EV Charger Installation", "Lighting Design", "Surge Protection", "Smart Home Wiring"], "ctaText": "Get a Free Estimate"}'
    ),
    (
        'hvac-comfort',
        'ComfortZone',
        'Clean, professional design for HVAC companies. Emphasizes comfort, efficiency, and seasonal services.',
        'hvac',
        'clean',
        '#0891b2',
        '#0e7490',
        '#f97316',
        'Raleway',
        'Open Sans',
        7,
        '{"heroStyle": "split", "sections": ["hero", "services", "brands", "maintenance-plans", "testimonials", "contact"], "navStyle": "fixed"}',
        '{"heroTitle": "Your Comfort Is Our Priority", "heroSubtitle": "Heating, cooling, and air quality solutions", "services": ["AC Installation & Repair", "Furnace Service", "Heat Pumps", "Duct Cleaning", "Indoor Air Quality", "Maintenance Plans"], "ctaText": "Schedule Service"}'
    ),
    (
        'general-contractor',
        'BuildRight',
        'Strong, professional design for general contractors and remodelers. Showcases project portfolios.',
        'general',
        'modern',
        '#78350f',
        '#92400e',
        '#2563eb',
        'Merriweather',
        'Source Sans Pro',
        8,
        '{"heroStyle": "full-width", "sections": ["hero", "services", "portfolio", "process", "testimonials", "contact"], "navStyle": "transparent"}',
        '{"heroTitle": "Quality Construction You Can Trust", "heroSubtitle": "From concept to completion — your vision, our expertise", "services": ["Kitchen Remodeling", "Bathroom Renovation", "Room Additions", "Deck Building", "Whole Home Renovation", "New Construction"], "ctaText": "Get a Free Consultation"}'
    ),
    (
        'roofing-solid',
        'SolidRoof',
        'Sturdy, dependable design for roofing companies. Emphasizes protection, warranties, and storm damage expertise.',
        'roofer',
        'bold',
        '#374151',
        '#1f2937',
        '#dc2626',
        'Archivo',
        'Inter',
        9,
        '{"heroStyle": "full-width", "sections": ["hero", "storm-banner", "services", "materials", "gallery", "reviews", "contact"], "navStyle": "dark"}',
        '{"heroTitle": "Protecting What Matters Most", "heroSubtitle": "Expert roofing installation, repair, and inspection", "services": ["Roof Replacement", "Storm Damage Repair", "Roof Inspection", "Gutter Installation", "Commercial Roofing", "Emergency Tarping"], "ctaText": "Free Roof Inspection", "stormText": "Storm Damage? We work with all insurance companies."}'
    ),
    (
        'cleaning-fresh',
        'FreshStart',
        'Bright, fresh design for cleaning and janitorial businesses. Light colors convey cleanliness and trust.',
        'cleaner',
        'clean',
        '#7c3aed',
        '#6d28d9',
        '#06b6d4',
        'Quicksand',
        'Nunito',
        10,
        '{"heroStyle": "split", "sections": ["hero", "services", "checklist", "pricing", "testimonials", "contact"], "navStyle": "fixed"}',
        '{"heroTitle": "A Cleaner Space, A Happier Life", "heroSubtitle": "Residential and commercial cleaning you can count on", "services": ["House Cleaning", "Deep Cleaning", "Move In/Out Cleaning", "Office Cleaning", "Post-Construction Cleanup", "Window Cleaning"], "ctaText": "Book Your Cleaning"}'
    )
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name LIKE 'website_%';
--
-- SELECT id, trade_category, name FROM website_templates ORDER BY sort_order;

-- >>> LEGACY MIGRATION: 003_website_builder_safe.sql <<<
-- ============================================
-- TOOLTIME PRO — Website Builder Phase 1 (Safe Re-run Version)
-- Creates: website_templates, website_sites, website_leads, website_domain_log
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================

-- Ensure UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS website_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trade_category VARCHAR(100) NOT NULL,
    style VARCHAR(50) DEFAULT 'modern',
    primary_color VARCHAR(20) DEFAULT '#2563eb',
    secondary_color VARCHAR(20) DEFAULT '#1e40af',
    accent_color VARCHAR(20) DEFAULT '#f59e0b',
    font_heading VARCHAR(100) DEFAULT 'Inter',
    font_body VARCHAR(100) DEFAULT 'Inter',
    layout_config JSONB DEFAULT '{}',
    default_content JSONB DEFAULT '{}',
    thumbnail_url TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS website_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES website_templates(id) ON DELETE SET NULL,
    slug VARCHAR(100) UNIQUE,
    business_name VARCHAR(255),
    business_phone VARCHAR(50),
    business_email VARCHAR(255),
    business_address TEXT,
    site_content JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'draft',
    custom_domain VARCHAR(255),
    domain_status VARCHAR(50) DEFAULT 'none',
    domain_registered_at TIMESTAMP WITH TIME ZONE,
    domain_expires_at TIMESTAMP WITH TIME ZONE,
    domain_auto_renew BOOLEAN DEFAULT true,
    wizard_step INTEGER DEFAULT 1,
    wizard_completed BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS website_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID REFERENCES website_sites(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    message TEXT,
    service_requested VARCHAR(255),
    source VARCHAR(100) DEFAULT 'contact_form',
    status VARCHAR(50) DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS website_domain_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID REFERENCES website_sites(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    domain_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    response_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_website_templates_trade ON website_templates(trade_category);
CREATE INDEX IF NOT EXISTS idx_website_templates_active ON website_templates(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_website_sites_user ON website_sites(user_id);
CREATE INDEX IF NOT EXISTS idx_website_sites_company ON website_sites(company_id);
CREATE INDEX IF NOT EXISTS idx_website_sites_slug ON website_sites(slug);
CREATE INDEX IF NOT EXISTS idx_website_sites_domain ON website_sites(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_website_sites_status ON website_sites(status);
CREATE INDEX IF NOT EXISTS idx_website_leads_site ON website_leads(site_id);
CREATE INDEX IF NOT EXISTS idx_website_leads_company ON website_leads(company_id);
CREATE INDEX IF NOT EXISTS idx_website_leads_status ON website_leads(status);
CREATE INDEX IF NOT EXISTS idx_website_leads_created ON website_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_website_domain_log_site ON website_domain_log(site_id);
CREATE INDEX IF NOT EXISTS idx_website_domain_log_domain ON website_domain_log(domain_name);
CREATE INDEX IF NOT EXISTS idx_website_domain_log_created ON website_domain_log(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE website_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_domain_log ENABLE ROW LEVEL SECURITY;

-- Templates: anyone can read active templates
DROP POLICY IF EXISTS "Anyone can read active templates" ON website_templates;
CREATE POLICY "Anyone can read active templates"
    ON website_templates FOR SELECT
    USING (is_active = true);

-- Sites: users can manage their own sites
DROP POLICY IF EXISTS "Users can read own sites" ON website_sites;
CREATE POLICY "Users can read own sites"
    ON website_sites FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own sites" ON website_sites;
CREATE POLICY "Users can insert own sites"
    ON website_sites FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own sites" ON website_sites;
CREATE POLICY "Users can update own sites"
    ON website_sites FOR UPDATE
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own sites" ON website_sites;
CREATE POLICY "Users can delete own sites"
    ON website_sites FOR DELETE
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Company members can read company sites" ON website_sites;
CREATE POLICY "Company members can read company sites"
    ON website_sites FOR SELECT
    USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
    );

-- Leads: company members can read leads
DROP POLICY IF EXISTS "Company members can read leads" ON website_leads;
CREATE POLICY "Company members can read leads"
    ON website_leads FOR SELECT
    USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Anonymous can insert leads" ON website_leads;
CREATE POLICY "Anonymous can insert leads"
    ON website_leads FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Company members can update leads" ON website_leads;
CREATE POLICY "Company members can update leads"
    ON website_leads FOR UPDATE
    USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
    );

-- Domain log
DROP POLICY IF EXISTS "Users can read own domain logs" ON website_domain_log;
CREATE POLICY "Users can read own domain logs"
    ON website_domain_log FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Company members can read domain logs" ON website_domain_log;
CREATE POLICY "Company members can read domain logs"
    ON website_domain_log FOR SELECT
    USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
    );

-- ============================================
-- TRIGGERS (safe: drop first)
-- ============================================
DROP TRIGGER IF EXISTS update_website_templates_updated_at ON website_templates;
CREATE TRIGGER update_website_templates_updated_at
    BEFORE UPDATE ON website_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_website_sites_updated_at ON website_sites;
CREATE TRIGGER update_website_sites_updated_at
    BEFORE UPDATE ON website_sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEED DATA: Starter Templates (one per trade + extras)
-- ============================================
INSERT INTO website_templates (slug, name, description, trade_category, style, primary_color, secondary_color, accent_color, font_heading, font_body, sort_order, layout_config, default_content)
VALUES
    ('painter-bold', 'Bold Strokes', 'Eye-catching design for painting contractors who want to stand out.', 'painter', 'bold', '#dc2626', '#991b1b', '#fbbf24', 'Montserrat', 'Open Sans', 1,
     '{"heroStyle": "full-width", "sections": ["hero", "services", "gallery", "testimonials", "contact"], "navStyle": "fixed"}',
     '{"heroTitle": "Professional Painting Services", "heroSubtitle": "Transform your space with expert craftsmanship", "services": ["Interior Painting", "Exterior Painting", "Cabinet Refinishing", "Deck Staining", "Color Consultation"], "ctaText": "Get a Free Estimate"}'),

    ('painter-clean', 'Clean Canvas', 'Minimalist design that lets your work speak for itself.', 'painter', 'clean', '#3b82f6', '#1d4ed8', '#10b981', 'Playfair Display', 'Lato', 2,
     '{"heroStyle": "split", "sections": ["hero", "about", "services", "before-after", "reviews", "contact"], "navStyle": "transparent"}',
     '{"heroTitle": "Precision Painting", "heroSubtitle": "Where quality meets attention to detail", "services": ["Interior Painting", "Exterior Painting", "Wallpaper Installation", "Faux Finishes", "Popcorn Ceiling Removal"], "ctaText": "Schedule a Consultation"}'),

    ('landscaper-green', 'Green Thumb', 'Natural, earthy design for landscaping and lawn care.', 'landscaper', 'modern', '#16a34a', '#15803d', '#ca8a04', 'Nunito', 'Source Sans Pro', 3,
     '{"heroStyle": "full-width", "sections": ["hero", "services", "gallery", "seasonal", "testimonials", "contact"], "navStyle": "fixed"}',
     '{"heroTitle": "Beautiful Landscapes, Built to Last", "heroSubtitle": "Professional landscaping and lawn care", "services": ["Lawn Maintenance", "Landscape Design", "Irrigation Systems", "Tree Trimming", "Hardscaping", "Seasonal Cleanup"], "ctaText": "Get Your Free Quote"}'),

    ('landscaper-modern', 'Modern Grounds', 'Sleek design for modern landscaping companies.', 'landscaper', 'modern', '#059669', '#047857', '#f97316', 'Poppins', 'Inter', 4,
     '{"heroStyle": "video", "sections": ["hero", "services", "process", "gallery", "reviews", "contact"], "navStyle": "fixed"}',
     '{"heroTitle": "Modern Outdoor Living", "heroSubtitle": "Design. Build. Maintain.", "services": ["Landscape Architecture", "Outdoor Living Spaces", "Water Features", "Lighting Design", "Maintenance Plans"], "ctaText": "Start Your Project"}'),

    ('handyman-pro', 'HandyPro', 'Trustworthy, professional design for handyman and repair services.', 'handyman', 'modern', '#2563eb', '#1e40af', '#ef4444', 'Roboto', 'Roboto', 5,
     '{"heroStyle": "split", "sections": ["hero", "services", "service-area", "testimonials", "contact"], "navStyle": "fixed"}',
     '{"heroTitle": "Fast & Reliable Repairs", "heroSubtitle": "Licensed, insured, and ready when you need us", "services": ["General Repairs", "Plumbing Fixes", "Electrical Work", "Drywall Repair", "Furniture Assembly", "Deck & Fence Repair"], "ctaText": "Book a Handyman"}'),

    ('pool-splash', 'SplashZone', 'Fresh, inviting design for pool service and maintenance companies.', 'pool', 'modern', '#0891b2', '#0e7490', '#f97316', 'Poppins', 'Inter', 6,
     '{"heroStyle": "full-width", "sections": ["hero", "services", "maintenance-plans", "gallery", "testimonials", "contact"], "navStyle": "fixed"}',
     '{"heroTitle": "Crystal Clear Pool Service", "heroSubtitle": "Weekly maintenance, repairs, and renovations", "services": ["Weekly Pool Cleaning", "Chemical Balancing", "Equipment Repair", "Pool Renovation", "Leak Detection", "Green Pool Recovery"], "ctaText": "Get a Free Quote"}'),

    ('plumber-pro', 'PipePro', 'Professional design for plumbing businesses. Emphasizes reliability and fast service.', 'plumber', 'modern', '#2563eb', '#1e40af', '#ef4444', 'Roboto', 'Roboto', 7,
     '{"heroStyle": "split", "sections": ["hero", "emergency-banner", "services", "service-area", "testimonials", "contact"], "navStyle": "fixed"}',
     '{"heroTitle": "Fast & Reliable Plumbing", "heroSubtitle": "Licensed, insured, and ready when you need us", "services": ["Emergency Repairs", "Drain Cleaning", "Water Heater Installation", "Pipe Repair", "Bathroom Remodeling", "Sewer Line Service"], "ctaText": "Call Now"}'),

    ('electrician-spark', 'SparkWorks', 'High-energy design for electrical contractors.', 'electrician', 'bold', '#eab308', '#ca8a04', '#1f2937', 'Oswald', 'Nunito Sans', 8,
     '{"heroStyle": "full-width", "sections": ["hero", "services", "safety-badges", "gallery", "reviews", "contact"], "navStyle": "dark"}',
     '{"heroTitle": "Expert Electrical Services", "heroSubtitle": "Safe, reliable, up to code — every time", "services": ["Panel Upgrades", "Wiring & Rewiring", "EV Charger Installation", "Lighting Design", "Surge Protection", "Smart Home Wiring"], "ctaText": "Get a Free Estimate"}'),

    ('hvac-comfort', 'ComfortZone', 'Clean, professional design for HVAC companies.', 'hvac', 'clean', '#0891b2', '#0e7490', '#f97316', 'Raleway', 'Open Sans', 9,
     '{"heroStyle": "split", "sections": ["hero", "services", "brands", "maintenance-plans", "testimonials", "contact"], "navStyle": "fixed"}',
     '{"heroTitle": "Your Comfort Is Our Priority", "heroSubtitle": "Heating, cooling, and air quality solutions", "services": ["AC Installation & Repair", "Furnace Service", "Heat Pumps", "Duct Cleaning", "Indoor Air Quality", "Maintenance Plans"], "ctaText": "Schedule Service"}'),

    ('pest-shield', 'PestShield', 'Trustworthy design for pest control companies.', 'pest', 'modern', '#16a34a', '#15803d', '#dc2626', 'Poppins', 'Inter', 10,
     '{"heroStyle": "full-width", "sections": ["hero", "services", "pests", "service-area", "testimonials", "contact"], "navStyle": "fixed"}',
     '{"heroTitle": "Pest-Free Guaranteed", "heroSubtitle": "Fast, safe, and effective pest control", "services": ["General Pest Control", "Termite Treatment", "Rodent Removal", "Bed Bug Treatment", "Mosquito Control", "Wildlife Removal"], "ctaText": "Get a Free Inspection"}'),

    ('pressure-power', 'PowerWash Pro', 'Bold design for pressure washing and exterior cleaning.', 'pressure-washer', 'bold', '#1e40af', '#1e3a8a', '#06b6d4', 'Montserrat', 'Inter', 11,
     '{"heroStyle": "full-width", "sections": ["hero", "services", "before-after", "gallery", "testimonials", "contact"], "navStyle": "fixed"}',
     '{"heroTitle": "Restore Your Property''s Shine", "heroSubtitle": "Professional pressure washing for homes and businesses", "services": ["House Washing", "Driveway Cleaning", "Deck Restoration", "Roof Cleaning", "Commercial Pressure Washing", "Graffiti Removal"], "ctaText": "Get a Free Quote"}'),

    ('flooring-foundation', 'FloorCraft', 'Elegant design for flooring installation companies.', 'flooring', 'modern', '#78350f', '#92400e', '#f59e0b', 'Playfair Display', 'Inter', 12,
     '{"heroStyle": "split", "sections": ["hero", "services", "materials", "gallery", "testimonials", "contact"], "navStyle": "transparent"}',
     '{"heroTitle": "Beautiful Floors, Expert Installation", "heroSubtitle": "Hardwood, tile, vinyl & more", "services": ["Hardwood Flooring", "Tile Installation", "Luxury Vinyl Plank", "Carpet Installation", "Floor Refinishing", "Epoxy Flooring"], "ctaText": "Get a Free Estimate"}'),

    ('mover-swift', 'SwiftMove', 'Energetic design for moving and junk removal companies.', 'mover', 'bold', '#7c3aed', '#6d28d9', '#f97316', 'Archivo', 'Inter', 13,
     '{"heroStyle": "full-width", "sections": ["hero", "services", "pricing", "service-area", "testimonials", "contact"], "navStyle": "fixed"}',
     '{"heroTitle": "Moving Made Easy", "heroSubtitle": "Professional moving & junk removal you can trust", "services": ["Local Moving", "Long Distance Moving", "Junk Removal", "Furniture Delivery", "Storage Solutions", "Estate Cleanouts"], "ctaText": "Get a Free Quote"}'),

    ('auto-detail', 'DetailKing', 'Sleek design for auto detailing and mobile wash businesses.', 'auto', 'modern', '#1f2937', '#111827', '#ef4444', 'Poppins', 'Inter', 14,
     '{"heroStyle": "full-width", "sections": ["hero", "services", "packages", "gallery", "testimonials", "contact"], "navStyle": "dark"}',
     '{"heroTitle": "Premium Auto Detailing", "heroSubtitle": "Your car deserves the best", "services": ["Full Detail", "Interior Cleaning", "Exterior Wash & Wax", "Ceramic Coating", "Paint Correction", "Mobile Detailing"], "ctaText": "Book Now"}'),

    ('tree-canopy', 'Canopy Care', 'Natural, strong design for tree service companies.', 'tree', 'modern', '#166534', '#14532d', '#ca8a04', 'Nunito', 'Inter', 15,
     '{"heroStyle": "full-width", "sections": ["hero", "services", "gallery", "emergency-banner", "testimonials", "contact"], "navStyle": "fixed"}',
     '{"heroTitle": "Expert Tree Care", "heroSubtitle": "Licensed, insured arborists you can trust", "services": ["Tree Trimming", "Tree Removal", "Stump Grinding", "Emergency Service", "Land Clearing", "Tree Health Assessment"], "ctaText": "Get a Free Estimate"}'),

    ('general-contractor', 'BuildRight', 'Professional design for general contractors and remodelers.', 'general', 'modern', '#78350f', '#92400e', '#2563eb', 'Merriweather', 'Source Sans Pro', 16,
     '{"heroStyle": "full-width", "sections": ["hero", "services", "portfolio", "process", "testimonials", "contact"], "navStyle": "transparent"}',
     '{"heroTitle": "Quality Construction You Can Trust", "heroSubtitle": "From concept to completion", "services": ["Kitchen Remodeling", "Bathroom Renovation", "Room Additions", "Deck Building", "Whole Home Renovation", "New Construction"], "ctaText": "Get a Free Consultation"}'),

    ('roofing-solid', 'SolidRoof', 'Sturdy design for roofing companies. Emphasizes protection and warranties.', 'roofer', 'bold', '#374151', '#1f2937', '#dc2626', 'Archivo', 'Inter', 17,
     '{"heroStyle": "full-width", "sections": ["hero", "storm-banner", "services", "materials", "gallery", "reviews", "contact"], "navStyle": "dark"}',
     '{"heroTitle": "Protecting What Matters Most", "heroSubtitle": "Expert roofing installation, repair, and inspection", "services": ["Roof Replacement", "Storm Damage Repair", "Roof Inspection", "Gutter Installation", "Commercial Roofing", "Emergency Tarping"], "ctaText": "Free Roof Inspection"}'),

    ('cleaning-fresh', 'FreshStart', 'Bright, fresh design for cleaning businesses.', 'cleaner', 'clean', '#7c3aed', '#6d28d9', '#06b6d4', 'Quicksand', 'Nunito', 18,
     '{"heroStyle": "split", "sections": ["hero", "services", "checklist", "pricing", "testimonials", "contact"], "navStyle": "fixed"}',
     '{"heroTitle": "A Cleaner Space, A Happier Life", "heroSubtitle": "Residential and commercial cleaning you can count on", "services": ["House Cleaning", "Deep Cleaning", "Move In/Out Cleaning", "Office Cleaning", "Post-Construction Cleanup", "Window Cleaning"], "ctaText": "Book Your Cleaning"}'),

    ('cleaning-modern', 'SparkleClean', 'Modern, minimalist design for premium cleaning services.', 'cleaner', 'modern', '#059669', '#047857', '#8b5cf6', 'Poppins', 'Inter', 19,
     '{"heroStyle": "full-width", "sections": ["hero", "services", "process", "pricing", "reviews", "contact"], "navStyle": "fixed"}',
     '{"heroTitle": "Premium Cleaning Services", "heroSubtitle": "Spotless results, every time", "services": ["Residential Cleaning", "Commercial Cleaning", "Carpet Cleaning", "Window Cleaning", "Pressure Washing", "Post-Renovation Cleanup"], "ctaText": "Get an Instant Quote"}')
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    trade_category = EXCLUDED.trade_category,
    style = EXCLUDED.style,
    primary_color = EXCLUDED.primary_color,
    secondary_color = EXCLUDED.secondary_color,
    accent_color = EXCLUDED.accent_color,
    font_heading = EXCLUDED.font_heading,
    font_body = EXCLUDED.font_body,
    sort_order = EXCLUDED.sort_order,
    layout_config = EXCLUDED.layout_config,
    default_content = EXCLUDED.default_content,
    updated_at = NOW();

-- ============================================
-- DONE! Verify with:
-- SELECT slug, name, trade_category FROM website_templates ORDER BY sort_order;
-- ============================================

-- >>> LEGACY MIGRATION: 004_fix_signup_company_creation.sql <<<
-- Migration: Fix signup flow - add missing companies RLS policies and atomic signup function
--
-- ROOT CAUSE: The companies table has RLS enabled but no policies defined,
-- which blocks all operations including the INSERT during signup.
-- This leaves users in a broken state: auth account created but no company.
--
-- Run this in Supabase SQL Editor to fix the signup flow.

-- ============================================
-- 1. Add missing RLS policies for companies table
-- ============================================

-- Users can view their own company
DROP POLICY IF EXISTS "Users can view own company" ON companies;
CREATE POLICY "Users can view own company" ON companies
    FOR SELECT USING (
        id IN (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Owners and admins can update their company
DROP POLICY IF EXISTS "Owners can update company" ON companies;
CREATE POLICY "Owners can update company" ON companies
    FOR UPDATE USING (
        id IN (
            SELECT company_id FROM users
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- ============================================
-- 2. Create atomic signup function (SECURITY DEFINER)
-- ============================================
-- This function bypasses RLS and runs in a transaction so that
-- company + user profile creation either both succeed or both fail.
-- This avoids the broken state where auth user exists but company doesn't.

CREATE OR REPLACE FUNCTION public.handle_new_signup(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_company_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id UUID;
BEGIN
    -- Create the company
    INSERT INTO companies (name, email)
    VALUES (p_company_name, p_email)
    RETURNING id INTO v_company_id;

    -- Create the user profile linked to the company
    INSERT INTO users (id, email, full_name, company_id, role)
    VALUES (p_user_id, p_email, p_full_name, v_company_id, 'owner');

    -- Return the created IDs
    RETURN json_build_object(
        'company_id', v_company_id,
        'user_id', p_user_id
    );
END;
$$;

-- Revoke direct execute from anon, only authenticated users should call this
REVOKE EXECUTE ON FUNCTION public.handle_new_signup FROM anon;
GRANT EXECUTE ON FUNCTION public.handle_new_signup TO authenticated;

-- >>> LEGACY MIGRATION: 005_blog_posts.sql <<<
-- ============================================
-- TOOLTIME PRO — Blog Posts (AI Content Generator)
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID REFERENCES website_sites(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500),
    excerpt TEXT,
    content TEXT NOT NULL,
    meta_title VARCHAR(200),
    meta_description VARCHAR(500),
    meta_keywords TEXT,
    trade VARCHAR(100),
    location VARCHAR(255),
    topic VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
    published_at TIMESTAMP WITH TIME ZONE,
    word_count INTEGER DEFAULT 0,
    ai_generated BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_company ON blog_posts(company_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);

-- RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Company members can read their blog posts
DROP POLICY IF EXISTS "Company members can read blog posts" ON blog_posts;
CREATE POLICY "Company members can read blog posts"
    ON blog_posts FOR SELECT
    USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
    );

-- Users can insert blog posts for their company
DROP POLICY IF EXISTS "Users can insert blog posts" ON blog_posts;
CREATE POLICY "Users can insert blog posts"
    ON blog_posts FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
    );

-- Users can update their company blog posts
DROP POLICY IF EXISTS "Users can update blog posts" ON blog_posts;
CREATE POLICY "Users can update blog posts"
    ON blog_posts FOR UPDATE
    USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
    );

-- Users can delete their company blog posts
DROP POLICY IF EXISTS "Users can delete blog posts" ON blog_posts;
CREATE POLICY "Users can delete blog posts"
    ON blog_posts FOR DELETE
    USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
    );

-- Public can read published posts (for the live website blog)
DROP POLICY IF EXISTS "Public can read published blog posts" ON blog_posts;
CREATE POLICY "Public can read published blog posts"
    ON blog_posts FOR SELECT
    USING (status = 'published');

-- Trigger
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
    BEFORE UPDATE ON blog_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- DONE! Verify with:
-- SELECT count(*) FROM blog_posts;
-- ============================================

-- >>> LEGACY MIGRATION: 005_trial_system.sql <<<
-- Migration: Add 14-day Pro trial system
--
-- New users get a 14-day free trial of the Pro plan.
-- After trial expires, they must pick a paid plan to continue.
--
-- Run this in Supabase SQL Editor.

-- ============================================
-- 1. Add trial tracking columns to companies
-- ============================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_starts_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- ============================================
-- 2. Update handle_new_signup to set Pro trial
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_signup(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_company_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id UUID;
BEGIN
    -- Create the company with Pro trial (14 days)
    INSERT INTO companies (name, email, plan, trial_starts_at, trial_ends_at, onboarding_completed)
    VALUES (p_company_name, p_email, 'pro', NOW(), NOW() + INTERVAL '14 days', false)
    RETURNING id INTO v_company_id;

    -- Create the user profile linked to the company
    INSERT INTO users (id, email, full_name, company_id, role)
    VALUES (p_user_id, p_email, p_full_name, v_company_id, 'owner');

    -- Return the created IDs
    RETURN json_build_object(
        'company_id', v_company_id,
        'user_id', p_user_id
    );
END;
$$;

-- Revoke direct execute from anon, only authenticated users should call this
REVOKE EXECUTE ON FUNCTION public.handle_new_signup FROM anon;
GRANT EXECUTE ON FUNCTION public.handle_new_signup TO authenticated;

-- >>> LEGACY MIGRATION: 006_add_industry_to_companies.sql <<<
-- Migration: Add industry column to companies table
-- This supports onboarding where users pick their industry
-- and get auto-suggested services based on it.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry VARCHAR(100);

-- >>> LEGACY MIGRATION: 006_platform_blog.sql <<<
-- ============================================
-- TOOLTIME PRO — Platform Blog (Marketing Site)
-- Separate from customer blog_posts table
-- Run in Supabase Dashboard → SQL Editor
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS platform_blog_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    cover_image TEXT,
    author_name VARCHAR(255) DEFAULT 'ToolTime Pro Team',
    category VARCHAR(100), -- e.g. 'tips', 'guides', 'industry-news', 'product-updates'
    tags TEXT[], -- array of tags
    meta_title VARCHAR(200),
    meta_description VARCHAR(500),
    meta_keywords TEXT,
    status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
    featured BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    word_count INTEGER DEFAULT 0,
    read_time_minutes INTEGER DEFAULT 0,
    ai_generated BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_platform_blog_status ON platform_blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_platform_blog_slug ON platform_blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_platform_blog_category ON platform_blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_platform_blog_published ON platform_blog_posts(published_at DESC);

-- RLS
ALTER TABLE platform_blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
DROP POLICY IF EXISTS "Public can read published platform posts" ON platform_blog_posts;
CREATE POLICY "Public can read published platform posts"
    ON platform_blog_posts FOR SELECT
    USING (status = 'published');

-- Service role can do everything (admin operations go through API with service key)
-- No INSERT/UPDATE/DELETE policies for anon/authenticated — admin only via service role

-- Trigger
DROP TRIGGER IF EXISTS update_platform_blog_updated_at ON platform_blog_posts;
CREATE TRIGGER update_platform_blog_updated_at
    BEFORE UPDATE ON platform_blog_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- DONE!
-- ============================================

-- >>> LEGACY MIGRATION: 007_add_welcome_email_sent_at.sql <<<
-- Add welcome_email_sent_at to companies table
-- Tracks whether the immediate welcome email was already sent (at password-set time)
-- so the daily cron job can skip the Day 1 welcome for those users.
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ DEFAULT NULL;

-- >>> LEGACY MIGRATION: 008_single_session.sql <<<
-- Single-session enforcement: only one active login per user at a time.
-- When a user logs in, we store a session_id. Other sessions for the same
-- user are detected and signed out on the client side.

ALTER TABLE users ADD COLUMN IF NOT EXISTS active_session_id VARCHAR(255);

-- >>> LEGACY MIGRATION: 009_beta_tester_flag.sql <<<
-- Migration: Add beta tester flag to companies
--
-- Beta testers get Elite plan access with all add-ons.
-- Their trial never expires automatically.
-- They can be identified and filtered in the admin dashboard.
--
-- Run this in Supabase SQL Editor.

-- ============================================
-- 1. Add beta tester columns to companies
-- ============================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_beta_tester BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS beta_notes TEXT;

-- ============================================
-- 2. Index for filtering beta testers
-- ============================================

CREATE INDEX IF NOT EXISTS idx_companies_beta_tester ON companies(is_beta_tester) WHERE is_beta_tester = true;

-- >>> LEGACY MIGRATION: 010_add_quote_employee_tracking.sql <<<
-- Migration: Add employee tracking to quotes
-- Adds created_by and sent_by columns to track which employee created/sent each quote

-- Add created_by column (employee who created the quote)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add sent_by column (employee who sent the quote)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_created_by ON quotes(created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_sent_by ON quotes(sent_by);

-- >>> LEGACY MIGRATION: 011_add_addons_to_companies.sql <<<
-- Migration: Add addons column to companies table
-- This stores purchased add-on product IDs (e.g., jenny_exec_admin, website_builder)
-- so the dashboard can gate features based on what the owner actually purchased.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS addons TEXT[] DEFAULT '{}';

-- Add a comment for clarity
COMMENT ON COLUMN companies.addons IS 'Array of purchased add-on IDs from Stripe checkout (e.g. jenny_exec_admin, jenny_pro, website_builder)';

-- >>> LEGACY MIGRATION: 012_add_quote_follow_up.sql <<<
-- Migration: Add follow-up tracking to quotes
-- Adds follow_up_date and last_followed_up_at columns for quote follow-up alerts

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS follow_up_date DATE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS last_followed_up_at TIMESTAMP WITH TIME ZONE;

-- Index for efficiently querying quotes needing follow-up
CREATE INDEX IF NOT EXISTS idx_quotes_follow_up_date ON quotes(follow_up_date)
    WHERE follow_up_date IS NOT NULL AND status IN ('sent', 'viewed');

-- >>> LEGACY MIGRATION: 013_add_sms_consent.sql <<<
-- Migration: Add SMS consent tracking to customers
-- This adds opt-in tracking for TCPA compliance before sending text messages

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sms_consent_date TIMESTAMP WITH TIME ZONE;

-- Add a comment explaining the fields
COMMENT ON COLUMN customers.sms_consent IS 'Whether the customer has opted in to receive SMS/text messages';
COMMENT ON COLUMN customers.sms_consent_date IS 'Timestamp when the customer gave or revoked SMS consent';

-- >>> LEGACY MIGRATION: 014_add_admin_permissions.sql <<<
-- Add granular admin permissions column to users table.
-- When NULL, admins have full access (backwards compatible).
-- When set, contains a JSON object like:
--   {"team_management": true, "quotes": false, "invoices": true, ...}
-- Only relevant for admin and worker_admin roles.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS admin_permissions JSONB DEFAULT NULL;

COMMENT ON COLUMN users.admin_permissions IS
  'Granular permission toggles for admin/worker_admin roles. NULL = full access.';

-- >>> LEGACY MIGRATION: 015_blended_workforce_management.sql <<<
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

-- >>> LEGACY MIGRATION: 016_jenny_autonomous_actions.sql <<<
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

-- Jenny cron run log: tracks when the cron last ran per company
CREATE TABLE IF NOT EXISTS jenny_cron_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ran_at TIMESTAMPTZ DEFAULT now(),
  results JSONB,
  UNIQUE (company_id)
);

ALTER TABLE jenny_cron_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jenny_cron_runs_company_access" ON jenny_cron_runs
  FOR ALL USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_jenny_cron_runs_company ON jenny_cron_runs(company_id);

-- Auto-update timestamp on config changes
CREATE TRIGGER jenny_action_config_updated
  BEFORE UPDATE ON jenny_action_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_worker_profile_timestamp();

-- >>> LEGACY MIGRATION: 017_material_estimator.sql <<<
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

-- >>> LEGACY MIGRATION: 018_material_markup_staleness.sql <<<
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

-- >>> LEGACY MIGRATION: 019_customer_portal.sql <<<
-- ============================================================
-- Migration 018: Customer Portal
-- Adds customer authentication via magic links and session tracking
-- ============================================================

-- Customer sessions: token-based auth for portal access
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

CREATE INDEX IF NOT EXISTS idx_customer_sessions_token ON customer_sessions(token);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer ON customer_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_active ON customer_sessions(is_active, expires_at);

ALTER TABLE customer_sessions ENABLE ROW LEVEL SECURITY;

-- Service role can manage all sessions
CREATE POLICY "customer_sessions_service_access" ON customer_sessions
  FOR ALL USING (true);

-- Customer reschedule requests
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

CREATE INDEX IF NOT EXISTS idx_reschedule_requests_company ON reschedule_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_customer ON reschedule_requests(customer_id);

ALTER TABLE reschedule_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reschedule_requests_service_access" ON reschedule_requests
  FOR ALL USING (true);

-- >>> LEGACY MIGRATION: 020_google_reviews.sql <<<
-- ============================================================
-- Migration 020: Google Reviews Integration
-- Adds google_review_link to companies, ensures review_requests
-- table exists, and adds review tracking fields.
-- ============================================================

-- Add review link fields to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS google_review_link TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS yelp_review_link TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS auto_review_request BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS review_delay_hours INTEGER DEFAULT 2;

-- Ensure review_requests table exists with all needed fields
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  review_link TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'clicked', 'reviewed')),
  channel TEXT DEFAULT 'sms' CHECK (channel IN ('sms', 'email')),
  sent_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  tracking_token TEXT UNIQUE,
  review_platform VARCHAR(50) DEFAULT 'google', -- google, yelp, facebook
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add review_platform if table already exists
ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS review_platform VARCHAR(50) DEFAULT 'google';

CREATE INDEX IF NOT EXISTS idx_review_requests_company ON review_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_customer ON review_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_job ON review_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_token ON review_requests(tracking_token);
CREATE INDEX IF NOT EXISTS idx_review_requests_status ON review_requests(company_id, status);

ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_requests_company_access" ON review_requests
  FOR ALL USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- >>> LEGACY MIGRATION: 020_portal_pro.sql <<<
-- ============================================================
-- Migration 020: Customer Portal Pro
-- Messages (customer-contractor threads) and Documents vault
-- ============================================================

-- ============================================================
-- PORTAL MESSAGES: Customer-contractor message threads per job
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

-- ============================================================
-- PORTAL DOCUMENTS: Contracts, warranties, permits, receipts
-- ============================================================
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
  file_size INTEGER, -- bytes
  uploaded_by_type TEXT NOT NULL CHECK (uploaded_by_type IN ('customer', 'contractor')),
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_portal_messages_company ON portal_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_customer ON portal_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_job ON portal_messages(job_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_unread ON portal_messages(customer_id, is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_portal_documents_company ON portal_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_portal_documents_customer ON portal_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_documents_job ON portal_documents(job_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE portal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_documents ENABLE ROW LEVEL SECURITY;

-- Service role (API) can access all
CREATE POLICY "portal_messages_service_access" ON portal_messages
  FOR ALL USING (true);

CREATE POLICY "portal_documents_service_access" ON portal_documents
  FOR ALL USING (true);

-- >>> LEGACY MIGRATION: 021_jenny_pro_sms_conversations.sql <<<
-- Jenny Pro: SMS Conversations & Voice Call Tracking
-- Tracks two-way SMS conversations and (future) inbound call logs

-- ============================================
-- SMS CONVERSATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS jenny_sms_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL DEFAULT 'Unknown',
    customer_phone VARCHAR(50) NOT NULL,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(30) DEFAULT 'active', -- active, resolved, needs_response
    message_count INTEGER DEFAULT 0,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    source VARCHAR(50) DEFAULT 'inbound', -- inbound, booking_confirm, lead_followup, review_request
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jenny_sms_conv_company ON jenny_sms_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_jenny_sms_conv_phone ON jenny_sms_conversations(customer_phone);

-- ============================================
-- SMS MESSAGES (individual messages in a conversation)
-- ============================================
CREATE TABLE IF NOT EXISTS jenny_sms_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES jenny_sms_conversations(id) ON DELETE CASCADE,
    direction VARCHAR(10) NOT NULL, -- inbound, outbound
    body TEXT NOT NULL,
    twilio_sid VARCHAR(100),
    status VARCHAR(30) DEFAULT 'sent', -- sent, delivered, failed, received
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jenny_sms_msg_conv ON jenny_sms_messages(conversation_id);

-- ============================================
-- VOICE CALL LOG (for future use when Twilio approved)
-- ============================================
CREATE TABLE IF NOT EXISTS jenny_voice_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    caller_phone VARCHAR(50) NOT NULL,
    caller_name VARCHAR(255),
    duration_seconds INTEGER DEFAULT 0,
    call_type VARCHAR(30) DEFAULT 'inbound', -- inbound, outbound
    status VARCHAR(30) DEFAULT 'completed', -- ringing, in_progress, completed, missed, voicemail
    transcript TEXT,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    booking_created BOOLEAN DEFAULT false,
    emergency BOOLEAN DEFAULT false,
    twilio_sid VARCHAR(100),
    recording_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jenny_voice_company ON jenny_voice_calls(company_id);

-- ============================================
-- JENNY PRO SETTINGS (per-company configuration)
-- ============================================
CREATE TABLE IF NOT EXISTS jenny_pro_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    business_hours_greeting TEXT,
    after_hours_greeting TEXT,
    emergency_keywords TEXT[] DEFAULT ARRAY['emergency', 'urgent', 'burst', 'leak', 'flood', 'fire', 'broken'],
    escalation_phone VARCHAR(50),
    language VARCHAR(10) DEFAULT 'en', -- en, es, both
    auto_booking BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE jenny_sms_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE jenny_sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE jenny_voice_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE jenny_pro_settings ENABLE ROW LEVEL SECURITY;

-- Conversations: users can only see their company's conversations
CREATE POLICY "Users see own company conversations"
    ON jenny_sms_conversations FOR SELECT
    USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Messages: users can see messages from their company's conversations
CREATE POLICY "Users see own company messages"
    ON jenny_sms_messages FOR SELECT
    USING (conversation_id IN (
        SELECT id FROM jenny_sms_conversations
        WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    ));

-- Voice calls: users can only see their company's calls
CREATE POLICY "Users see own company calls"
    ON jenny_voice_calls FOR SELECT
    USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Settings: users can view/edit their company's settings
CREATE POLICY "Users manage own company jenny pro settings"
    ON jenny_pro_settings FOR ALL
    USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- >>> LEGACY MIGRATION: 022_setup_service_orders.sql <<<
-- Setup Service Orders: Assisted Onboarding ($149) & White Glove ($349)
-- Tracks purchase, fulfillment status, and checklist progress

CREATE TABLE IF NOT EXISTS setup_service_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL, -- assisted_onboarding, white_glove
    status VARCHAR(30) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    stripe_payment_intent_id VARCHAR(255),
    assigned_to VARCHAR(255), -- support team member name/email

    -- Checklist items (JSONB for flexibility)
    checklist JSONB DEFAULT '[]',

    -- Key dates
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    kickoff_call_at TIMESTAMP WITH TIME ZONE,

    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_setup_orders_company ON setup_service_orders(company_id);

-- ROW LEVEL SECURITY
ALTER TABLE setup_service_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own company setup orders"
    ON setup_service_orders FOR SELECT
    USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- >>> LEGACY MIGRATION: 023_recurring_jobs.sql <<<
-- Recurring job templates
CREATE TABLE IF NOT EXISTS recurring_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  customer_id UUID REFERENCES customers(id),
  assigned_worker_ids UUID[] DEFAULT '{}',
  total_amount DECIMAL(10,2),
  priority VARCHAR(20) DEFAULT 'normal',
  -- Recurrence config
  frequency VARCHAR(20) NOT NULL, -- 'weekly', 'biweekly', 'monthly', 'custom'
  interval_days INTEGER, -- for custom frequency
  day_of_week INTEGER, -- 0=Sun, 1=Mon, ... 6=Sat (for weekly/biweekly)
  day_of_month INTEGER, -- 1-28 (for monthly)
  preferred_time_start TIME DEFAULT '09:00',
  preferred_time_end TIME DEFAULT '10:00',
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  next_scheduled_date DATE,
  last_generated_date DATE,
  starts_at DATE NOT NULL DEFAULT CURRENT_DATE,
  ends_at DATE, -- null = no end
  max_occurrences INTEGER, -- null = unlimited
  occurrences_generated INTEGER DEFAULT 0,
  -- Invoicing
  auto_invoice BOOLEAN DEFAULT FALSE,
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_recurring_jobs_company ON recurring_jobs(company_id);
CREATE INDEX idx_recurring_jobs_next_date ON recurring_jobs(next_scheduled_date) WHERE is_active = TRUE;

-- >>> LEGACY MIGRATION: 024_notifications.sql <<<
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'new_lead', 'job_assigned', 'invoice_paid', 'invoice_overdue', 'compliance_alert', 'review_received', 'booking_received', 'worker_clock_in', 'quote_accepted', 'quote_expired'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500), -- where to navigate on click
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_company ON notifications(company_id);

-- >>> LEGACY MIGRATION: 025_google_calendar.sql <<<
-- Google Calendar integration: connection tokens and job sync tracking
CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  calendar_id VARCHAR(255) DEFAULT 'primary',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add gcal_event_id to jobs for sync tracking
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS gcal_event_id VARCHAR(255);

-- >>> LEGACY MIGRATION: 026_payment_plans.sql <<<
-- Payment plans for installment payments on invoices
CREATE TABLE IF NOT EXISTS payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  customer_id UUID REFERENCES customers(id),
  total_amount DECIMAL(10,2) NOT NULL,
  number_of_installments INTEGER NOT NULL DEFAULT 2,
  frequency VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'weekly', 'biweekly', 'monthly'
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'completed', 'cancelled', 'defaulted'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_plan_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_plan_id UUID NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'waived'
  paid_at TIMESTAMP WITH TIME ZONE,
  stripe_payment_intent_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_plans_company ON payment_plans(company_id);
CREATE INDEX idx_payment_plans_invoice ON payment_plans(invoice_id);
CREATE INDEX idx_installments_plan ON payment_plan_installments(payment_plan_id);
CREATE INDEX idx_installments_due ON payment_plan_installments(due_date) WHERE status = 'pending';

-- >>> LEGACY MIGRATION: 027_webhooks.sql <<<
-- Outbound webhook subscriptions for Zapier/integration support
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  url VARCHAR(2000) NOT NULL,
  secret VARCHAR(255), -- HMAC secret for signature verification
  events TEXT[] NOT NULL DEFAULT '{}', -- array of event types to subscribe to
  is_active BOOLEAN DEFAULT TRUE,
  description VARCHAR(255),
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhooks_company ON webhooks(company_id);
CREATE INDEX idx_webhook_logs_webhook ON webhook_logs(webhook_id, created_at DESC);

-- >>> LEGACY MIGRATION: 028_company_profile_fields.sql <<<
-- Migration: 028_company_profile_fields.sql
-- Adds missing company profile columns (website, default_quote_terms, payment_instructions)
-- and new fields for competitive advantage (license, insurance, tax ID, business hours, service area, etc.)

-- ============================================
-- FIX: Add columns referenced in code but missing from DB
-- ============================================

-- website - referenced in settings page, causes schema cache error
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website TEXT;

-- default_quote_terms - auto-populate on new quotes
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_quote_terms TEXT;

-- payment_instructions - displayed on invoices
ALTER TABLE companies ADD COLUMN IF NOT EXISTS payment_instructions TEXT;

-- ============================================
-- NEW: Compliance & Professional fields
-- (Plugs gaps vs Jobber, Housecall Pro, ServiceTitan)
-- ============================================

-- License number - required on invoices/quotes in CA, FL, TX, etc.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);

-- Insurance policy number - for commercial job proposals
ALTER TABLE companies ADD COLUMN IF NOT EXISTS insurance_policy_number VARCHAR(100);

-- Insurance expiration - enables expiry alerts via Jenny AI
ALTER TABLE companies ADD COLUMN IF NOT EXISTS insurance_expiration DATE;

-- Tax ID / EIN - auto-populate on professional invoices
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);

-- ============================================
-- NEW: Operations & Scheduling fields
-- (Addresses "missed leads after hours" and "out-of-area dispatch" complaints)
-- ============================================

-- Business hours as JSON: {"mon":{"open":"08:00","close":"17:00"},...}
ALTER TABLE companies ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{}';

-- Service area radius in miles (for booking page & Jenny AI filtering)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS service_area_radius INTEGER;

-- Company description/bio for customer portal & booking page
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_description TEXT;

-- Default hourly rate - auto-populate on new jobs (avoids re-entry complaint from Kickserv/GorillaDesk users)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_hourly_rate DECIMAL(10,2);

-- Preferred language for customer-facing documents (en, es)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en';

-- ============================================
-- COMMENTS (for schema documentation)
-- ============================================
COMMENT ON COLUMN companies.license_number IS 'Contractor license number - auto-prints on quotes/invoices';
COMMENT ON COLUMN companies.insurance_policy_number IS 'Insurance policy number for commercial job proposals';
COMMENT ON COLUMN companies.insurance_expiration IS 'Insurance expiration date - triggers Jenny AI renewal alert';
COMMENT ON COLUMN companies.tax_id IS 'EIN/Tax ID for professional invoicing';
COMMENT ON COLUMN companies.business_hours IS 'JSON object with daily hours: {"mon":{"open":"08:00","close":"17:00"}, ...}';
COMMENT ON COLUMN companies.service_area_radius IS 'Service area radius in miles from business address';
COMMENT ON COLUMN companies.company_description IS 'Business description for customer portal and booking page';
COMMENT ON COLUMN companies.default_hourly_rate IS 'Default hourly rate auto-populated on new jobs';
COMMENT ON COLUMN companies.preferred_language IS 'Preferred language for customer-facing documents (en, es)';

-- >>> LEGACY MIGRATION: 028_crm_data_import.sql <<<
-- Migration: CRM Data Import tracking
-- Tracks bulk customer import jobs from other CRMs (HouseCall Pro, Jobber, etc.)

CREATE TABLE IF NOT EXISTS import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Import source info
    source_crm VARCHAR(100) NOT NULL,       -- housecall_pro, jobber, servicetitan, etc.
    file_name VARCHAR(500),
    total_rows INTEGER DEFAULT 0,
    imported_rows INTEGER DEFAULT 0,
    skipped_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,

    -- Field mapping used (stored for audit/re-import)
    field_mapping JSONB DEFAULT '{}',

    -- Status tracking
    status VARCHAR(30) DEFAULT 'pending',   -- pending, validating, previewing, importing, completed, failed
    error_log JSONB DEFAULT '[]',           -- Array of { row, field, message }

    -- Who ran it
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_company ON import_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);

-- ROW LEVEL SECURITY
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own company import jobs"
    ON import_jobs FOR SELECT
    USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users create own company import jobs"
    ON import_jobs FOR INSERT
    WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users update own company import jobs"
    ON import_jobs FOR UPDATE
    USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- >>> LEGACY MIGRATION: 029_quote_approval_settings.sql <<<
-- Migration 029: Add quote approval settings to companies
-- Allows owners to configure whether quotes require internal approval before sending

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS quote_approval_settings JSONB DEFAULT NULL;

-- Structure:
-- {
--   "required": true/false,          -- whether quotes need approval before sending
--   "approver_ids": ["uuid", ...]    -- user IDs who can approve & send. Empty array = owner only
-- }

COMMENT ON COLUMN companies.quote_approval_settings IS 'Quote approval workflow config: { required: bool, approver_ids: uuid[] }';

-- >>> LEGACY MIGRATION: 030_quote_edit_history.sql <<<
-- Quote Edit Audit Trail
-- Tracks every edit made to a quote after it has been sent, providing
-- accountability on the business side and revision transparency for customers.

-- Add revision_number to quotes (starts at 0, bumped each edit-after-send)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS revision_number INTEGER DEFAULT 0;

-- ============================================
-- QUOTE_EDIT_HISTORY (Audit log for quote changes)
-- ============================================
CREATE TABLE IF NOT EXISTS quote_edit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    edited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    revision_number INTEGER NOT NULL DEFAULT 1,
    change_summary TEXT NOT NULL,        -- Human-readable summary, e.g. "Updated total from $500 to $650"
    changes JSONB NOT NULL DEFAULT '{}', -- Structured diff: { field: { old: X, new: Y } }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quote_edit_history_quote ON quote_edit_history(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_edit_history_company ON quote_edit_history(company_id);

-- RLS
ALTER TABLE quote_edit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quote edit history belongs to company" ON quote_edit_history
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- >>> LEGACY MIGRATION: 031_fix_invoice_items_rls.sql <<<
-- Migration: Fix invoice_items RLS policy for INSERT operations
-- The existing FOR ALL USING(...) policy fails on INSERT because
-- it lacks an explicit WITH CHECK clause. Adding WITH CHECK ensures
-- new rows are validated against the same company ownership check.

DROP POLICY IF EXISTS "Invoice items for company invoices" ON invoice_items;

CREATE POLICY "Invoice items for company invoices" ON invoice_items
    FOR ALL
    USING (
        invoice_id IN (
            SELECT i.id FROM invoices i
            WHERE i.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    )
    WITH CHECK (
        invoice_id IN (
            SELECT i.id FROM invoices i
            WHERE i.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- >>> LEGACY MIGRATION: 032_fix_missing_rls_policies.sql <<<
-- ============================================================
-- Migration 032: Fix Missing RLS Policies
-- Date: 2026-04-15
--
-- Fixes critical Supabase security advisor warnings:
--   1. "Table publicly accessible" (rls_disabled_in_public)
--   2. "Sensitive data publicly accessible" (sensitive_columns_exposed)
--
-- Tables fixed:
--   - recurring_jobs (no RLS)
--   - notifications (no RLS)
--   - google_calendar_connections (no RLS — contains OAuth tokens)
--   - payment_plans (no RLS)
--   - payment_plan_installments (no RLS — contains Stripe payment intents)
--   - webhooks (no RLS — contains HMAC secrets)
--   - webhook_logs (no RLS)
--   - companies (RLS enabled but no policies defined)
-- ============================================================

-- ============================================
-- 1. recurring_jobs — company-scoped job templates
-- ============================================
ALTER TABLE recurring_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recurring jobs belong to company"
    ON recurring_jobs FOR ALL
    USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
    WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- ============================================
-- 2. notifications — per-user, company-scoped
-- ============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "System inserts notifications for company users"
    ON notifications FOR INSERT
    WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users update own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users delete own notifications"
    ON notifications FOR DELETE
    USING (user_id = auth.uid());

-- ============================================
-- 3. google_calendar_connections — CRITICAL: contains OAuth tokens
-- ============================================
ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own calendar connection"
    ON google_calendar_connections FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- 4. payment_plans — company-scoped financial data
-- ============================================
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payment plans belong to company"
    ON payment_plans FOR ALL
    USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
    WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- ============================================
-- 5. payment_plan_installments — linked to payment_plans
-- ============================================
ALTER TABLE payment_plan_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Installments belong to company payment plans"
    ON payment_plan_installments FOR ALL
    USING (
        payment_plan_id IN (
            SELECT id FROM payment_plans
            WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    )
    WITH CHECK (
        payment_plan_id IN (
            SELECT id FROM payment_plans
            WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- ============================================
-- 6. webhooks — CRITICAL: contains HMAC secrets and endpoint URLs
-- ============================================
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Webhooks belong to company"
    ON webhooks FOR ALL
    USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
    WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- ============================================
-- 7. webhook_logs — linked to webhooks
-- ============================================
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Webhook logs belong to company webhooks"
    ON webhook_logs FOR ALL
    USING (
        webhook_id IN (
            SELECT id FROM webhooks
            WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    )
    WITH CHECK (
        webhook_id IN (
            SELECT id FROM webhooks
            WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- ============================================
-- 8. companies — RLS enabled since schema.sql but NO policies exist
-- ============================================
CREATE POLICY "Users can view their own company"
    ON companies FOR SELECT
    USING (id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Owners and admins can update their company"
    ON companies FOR UPDATE
    USING (
        id IN (
            SELECT company_id FROM users
            WHERE id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- >>> LEGACY MIGRATION: 033_cascade_delete_company_fks.sql <<<
-- Mirror of supabase/migrations/20260416000000_cascade_delete_company_fks.sql
-- See that file for rationale.

DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN
    SELECT
      c.conname     AS constraint_name,
      n.nspname     AS schema_name,
      t.relname     AS table_name,
      a.attname     AS column_name
    FROM pg_constraint c
    JOIN pg_class      t  ON t.oid  = c.conrelid
    JOIN pg_namespace  n  ON n.oid  = t.relnamespace
    JOIN pg_class      r  ON r.oid  = c.confrelid
    JOIN pg_namespace  rn ON rn.oid = r.relnamespace
    JOIN pg_attribute  a  ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f'
      AND rn.nspname = 'public'
      AND r.relname  = 'companies'
      AND c.confdeltype IN ('a', 'r')
      AND array_length(c.conkey, 1) = 1
  LOOP
    RAISE NOTICE 'Rewriting FK % on %.%(%) to ON DELETE CASCADE',
      fk.constraint_name, fk.schema_name, fk.table_name, fk.column_name;

    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT %I',
      fk.schema_name, fk.table_name, fk.constraint_name
    );

    EXECUTE format(
      'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.companies(id) ON DELETE CASCADE',
      fk.schema_name, fk.table_name, fk.constraint_name, fk.column_name
    );
  END LOOP;
END $$;
