-- ============================================================
-- ToolTime Pro — Sandbox Supabase combined setup
-- Base schema + all migrations, in chronological order.
-- Paste this entire file into the SQL Editor and click Run.
-- ============================================================

-- >>> BASE SCHEMA (database/schema.sql) <<<
-- ToolTime Pro Database Schema
-- Run this in Supabase SQL Editor (supabase.com > SQL Editor > New Query)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- COMPANIES (Multi-tenant - each customer is a company)
-- ============================================
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50) DEFAULT 'CA',
    zip VARCHAR(20),
    website TEXT,
    logo_url TEXT,
    plan VARCHAR(50) DEFAULT 'starter', -- starter, pro, elite
    addons TEXT[] DEFAULT '{}', -- purchased add-on IDs (jenny_exec_admin, jenny_pro, etc.)
    stripe_customer_id VARCHAR(255),
    -- Professional details (compliance & invoicing)
    license_number VARCHAR(100),          -- Contractor license # (auto-prints on quotes/invoices)
    insurance_policy_number VARCHAR(100),  -- Insurance policy for commercial proposals
    insurance_expiration DATE,             -- Triggers Jenny AI renewal alert
    tax_id VARCHAR(50),                    -- EIN for professional invoicing
    -- Operations & scheduling
    default_quote_terms TEXT,              -- Auto-populate on new quotes
    payment_instructions TEXT,             -- Displayed on invoices
    business_hours JSONB DEFAULT '{}',     -- {"mon":{"open":"08:00","close":"17:00"}, ...}
    service_area_radius INTEGER,           -- Miles from business address
    company_description TEXT,              -- Booking page & customer portal bio
    default_hourly_rate DECIMAL(10,2),     -- Auto-fills on new jobs
    preferred_language VARCHAR(10) DEFAULT 'en', -- en, es
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USERS (Owners, admins, workers)
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL DEFAULT 'worker', -- owner, admin, worker
    hourly_rate DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    avatar_url TEXT,
    pin VARCHAR(10), -- Worker PIN for mobile app authentication
    last_login_at TIMESTAMP WITH TIME ZONE, -- NULL means never logged in (pending activation)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CUSTOMERS (The company's customers)
-- ============================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50) DEFAULT 'CA',
    zip VARCHAR(20),
    notes TEXT,
    source VARCHAR(100), -- website, referral, google, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SERVICES (Service types the company offers)
-- ============================================
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    default_price DECIMAL(10,2),
    price_type VARCHAR(50) DEFAULT 'fixed', -- fixed, hourly, per_sqft
    duration_minutes INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- LEADS (Potential customers / inquiries)
-- ============================================
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    service_requested TEXT,
    message TEXT,
    source VARCHAR(100) DEFAULT 'website', -- website, chatbot, phone, referral
    status VARCHAR(50) DEFAULT 'new', -- new, contacted, quoted, booked, won, lost
    estimated_value DECIMAL(10,2),
    follow_up_date DATE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- JOBS (Scheduled work)
-- ============================================
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    quote_id UUID, -- References quotes table
    title VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50) DEFAULT 'CA',
    zip VARCHAR(20),
    scheduled_date DATE,
    scheduled_time_start TIME,
    scheduled_time_end TIME,
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
    priority VARCHAR(50) DEFAULT 'normal', -- low, normal, high, urgent
    total_amount DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- JOB_SERVICES (Services included in a job)
-- ============================================
CREATE TABLE job_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    service_name VARCHAR(255) NOT NULL, -- Denormalized for history
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2),
    total_price DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- JOB_ASSIGNMENTS (Workers assigned to jobs)
-- ============================================
CREATE TABLE job_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_lead BOOLEAN DEFAULT false, -- Is this person the lead on the job?
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, user_id)
);

-- ============================================
-- JOB_CHECKLISTS (Checklist items for jobs)
-- ============================================
CREATE TABLE job_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    item_text VARCHAR(255) NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- JOB_PHOTOS (Before/after photos)
-- ============================================
CREATE TABLE job_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    photo_url TEXT NOT NULL,
    photo_type VARCHAR(50) DEFAULT 'during', -- before, during, after
    caption TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- JOB_NOTES (Notes/comments on jobs)
-- ============================================
CREATE TABLE job_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    note_text TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT true, -- Internal vs customer-facing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TIME_ENTRIES (Clock in/out records)
-- ============================================
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
    clock_out TIMESTAMP WITH TIME ZONE,
    clock_in_location JSONB, -- {lat, lng, address}
    clock_out_location JSONB,
    break_minutes INTEGER DEFAULT 0,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active', -- active, completed, edited
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- BREAKS (Meal/rest break tracking for CA compliance)
-- ============================================
CREATE TABLE breaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    time_entry_id UUID REFERENCES time_entries(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    break_type VARCHAR(50) NOT NULL, -- meal, rest
    break_start TIMESTAMP WITH TIME ZONE NOT NULL,
    break_end TIMESTAMP WITH TIME ZONE,
    waived BOOLEAN DEFAULT false, -- Employee waived meal break
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- QUOTES (Estimates sent to customers)
-- ============================================
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    quote_number VARCHAR(50),
    title VARCHAR(255),
    description TEXT,
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, viewed, approved, rejected, expired
    valid_until DATE,
    sent_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    signature_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Employee who created the quote
    sent_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Employee who sent the quote
    revision_number INTEGER DEFAULT 0, -- Incremented each time a sent quote is edited
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- QUOTE_ITEMS (Line items in quotes)
-- ============================================
CREATE TABLE quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- QUOTE_EDIT_HISTORY (Audit log for quote changes)
-- ============================================
CREATE TABLE quote_edit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    edited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    revision_number INTEGER NOT NULL DEFAULT 1,
    change_summary TEXT NOT NULL,
    changes JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INVOICES (Bills sent to customers)
-- ============================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50),
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, viewed, paid, partial, overdue
    due_date DATE,
    sent_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    stripe_invoice_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INVOICE_ITEMS (Line items in invoices)
-- ============================================
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PAYMENTS (Payment records)
-- ============================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50), -- card, cash, check, stripe, other
    status VARCHAR(50) DEFAULT 'completed', -- completed, failed, refunded
    stripe_payment_id VARCHAR(255),
    notes TEXT,
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INCIDENTS (Incident reports from workers)
-- ============================================
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    incident_type VARCHAR(100) NOT NULL, -- equipment, customer, safety, property_damage, other
    description TEXT NOT NULL,
    severity VARCHAR(50) DEFAULT 'low', -- low, medium, high, critical
    status VARCHAR(50) DEFAULT 'open', -- open, investigating, resolved, closed
    resolution TEXT,
    photo_urls JSONB, -- Array of photo URLs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- REVIEW_REQUESTS (Automated review requests)
-- ============================================
CREATE TABLE review_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_email VARCHAR(255),
    review_link TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, clicked, reviewed
    channel VARCHAR(50) DEFAULT 'sms', -- sms, email
    sent_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    rating INTEGER, -- 1-5
    feedback TEXT,
    review_posted BOOLEAN DEFAULT false,
    review_platform VARCHAR(50), -- google, yelp, facebook
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- COMPLIANCE_ALERTS (California labor compliance alerts)
-- ============================================
CREATE TABLE compliance_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    time_entry_id UUID REFERENCES time_entries(id) ON DELETE SET NULL,
    alert_type VARCHAR(100) NOT NULL, -- missed_meal_break, missed_rest_break, overtime, double_time
    severity VARCHAR(50) DEFAULT 'warning', -- info, warning, violation
    message TEXT NOT NULL,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SMS_LOGS (SMS message history)
-- ============================================
CREATE TABLE sms_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    to_phone VARCHAR(50) NOT NULL,
    from_phone VARCHAR(50),
    message TEXT NOT NULL,
    message_type VARCHAR(50), -- review_request, invoice_reminder, appointment_reminder, custom
    status VARCHAR(50) DEFAULT 'sent', -- queued, sent, delivered, failed
    external_id VARCHAR(255), -- Twilio SID or similar
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- QBO_CONNECTIONS (QuickBooks Online integration)
-- ============================================
CREATE TABLE qbo_connections (
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

-- ============================================
-- QBO_SYNC_LOG (QuickBooks sync history)
-- ============================================
CREATE TABLE qbo_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL, -- customers, invoices, full
    status VARCHAR(50) DEFAULT 'in_progress', -- in_progress, completed, failed
    records_synced INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- WEBSITE_TEMPLATES (Predefined website templates)
-- ============================================
CREATE TABLE website_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    trade_category VARCHAR(100), -- landscaping, plumbing, electrical, etc.
    style VARCHAR(100) DEFAULT 'modern', -- modern, classic, bold
    preview_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- WEBSITE_SITES (Customer websites)
-- ============================================
CREATE TABLE website_sites (
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
    status VARCHAR(50) DEFAULT 'draft', -- draft, building, live, error
    custom_domain VARCHAR(255),
    domain_status VARCHAR(50), -- pending, active
    wizard_step INTEGER DEFAULT 1,
    wizard_completed BOOLEAN DEFAULT false,
    domain_registered_at TIMESTAMP WITH TIME ZONE,
    domain_expires_at TIMESTAMP WITH TIME ZONE,
    domain_auto_renew BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- WEBSITE_LEADS (Leads from customer websites)
-- ============================================
CREATE TABLE website_leads (
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

-- ============================================
-- WEBSITE_DOMAIN_LOG (Domain registration audit trail)
-- ============================================
CREATE TABLE website_domain_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID REFERENCES website_sites(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    domain_name VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL, -- register, dns_update
    status VARCHAR(50) NOT NULL, -- pending, success, failed
    response_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES (Performance)
-- ============================================
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_customers_company ON customers(company_id);
CREATE INDEX idx_leads_company ON leads(company_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_jobs_company ON jobs(company_id);
CREATE INDEX idx_jobs_date ON jobs(scheduled_date);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_time_entries_user ON time_entries(user_id);
CREATE INDEX idx_time_entries_date ON time_entries(clock_in);
CREATE INDEX idx_quotes_company ON quotes(company_id);
CREATE INDEX idx_quotes_created_by ON quotes(created_by);
CREATE INDEX idx_quotes_sent_by ON quotes(sent_by);
CREATE INDEX idx_quote_edit_history_quote ON quote_edit_history(quote_id);
CREATE INDEX idx_quote_edit_history_company ON quote_edit_history(company_id);
CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_compliance_alerts_company ON compliance_alerts(company_id);
CREATE INDEX idx_compliance_alerts_user ON compliance_alerts(user_id);
CREATE INDEX idx_sms_logs_company ON sms_logs(company_id);
CREATE INDEX idx_qbo_connections_company ON qbo_connections(company_id);
CREATE INDEX idx_qbo_sync_log_company ON qbo_sync_log(company_id);
CREATE INDEX idx_website_sites_user ON website_sites(user_id);
CREATE INDEX idx_website_sites_company ON website_sites(company_id);
CREATE INDEX idx_website_leads_site ON website_leads(site_id);
CREATE INDEX idx_website_leads_company ON website_leads(company_id);
CREATE INDEX idx_website_domain_log_site ON website_domain_log(site_id);

-- ============================================
-- ROW LEVEL SECURITY (Multi-tenant isolation)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_edit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbo_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbo_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_domain_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own row (prevents circular RLS dependency)
CREATE POLICY "Users can read own profile" ON users
    FOR SELECT USING (id = auth.uid());

-- Users can see other users in their company (uses EXISTS to avoid circular dependency)
CREATE POLICY "Users see own company members" ON users
    FOR SELECT USING (
        company_id IN (
            SELECT u.company_id FROM users u WHERE u.id = auth.uid()
        )
    );

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid());

-- Users can insert their own profile (during signup)
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (id = auth.uid());

-- Admins and owners can create new team members in their company
CREATE POLICY "Admins can insert team members" ON users
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT u.company_id
            FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Customers belong to company" ON customers
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Services belong to company" ON services
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Leads belong to company" ON leads
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Jobs belong to company" ON jobs
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Time entries belong to company" ON time_entries
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Quotes belong to company" ON quotes
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Invoices belong to company" ON invoices
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Job assignments: users can manage assignments for jobs in their company
CREATE POLICY "Job assignments for company jobs" ON job_assignments
    FOR ALL USING (
        job_id IN (
            SELECT j.id FROM jobs j
            WHERE j.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- Job services: users can manage services for jobs in their company
CREATE POLICY "Job services for company jobs" ON job_services
    FOR ALL USING (
        job_id IN (
            SELECT j.id FROM jobs j
            WHERE j.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- Job checklists: users can manage checklists for jobs in their company
CREATE POLICY "Job checklists for company jobs" ON job_checklists
    FOR ALL USING (
        job_id IN (
            SELECT j.id FROM jobs j
            WHERE j.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- Job photos: users can manage photos for jobs in their company
CREATE POLICY "Job photos for company jobs" ON job_photos
    FOR ALL USING (
        job_id IN (
            SELECT j.id FROM jobs j
            WHERE j.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- Job notes: users can manage notes for jobs in their company
CREATE POLICY "Job notes for company jobs" ON job_notes
    FOR ALL USING (
        job_id IN (
            SELECT j.id FROM jobs j
            WHERE j.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- Quote edit history: users can view edit history for quotes in their company
CREATE POLICY "Quote edit history belongs to company" ON quote_edit_history
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Quote items: users can manage items for quotes in their company
CREATE POLICY "Quote items for company quotes" ON quote_items
    FOR ALL USING (
        quote_id IN (
            SELECT q.id FROM quotes q
            WHERE q.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- Invoice items: users can manage items for invoices in their company
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

-- Payments: users can manage payments in their company
CREATE POLICY "Payments belong to company" ON payments
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Incidents: users can manage incidents in their company
CREATE POLICY "Incidents belong to company" ON incidents
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Review requests: users can manage review requests in their company
CREATE POLICY "Review requests belong to company" ON review_requests
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Breaks: users can manage breaks for time entries in their company
CREATE POLICY "Breaks for company time entries" ON breaks
    FOR ALL USING (
        time_entry_id IN (
            SELECT t.id FROM time_entries t
            WHERE t.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- Compliance alerts: users can manage alerts in their company
CREATE POLICY "Compliance alerts belong to company" ON compliance_alerts
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- SMS logs: users can view logs in their company
CREATE POLICY "SMS logs belong to company" ON sms_logs
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- QBO connections: users can manage connections in their company
CREATE POLICY "QBO connections belong to company" ON qbo_connections
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- QBO sync log: users can view sync logs in their company
CREATE POLICY "QBO sync logs belong to company" ON qbo_sync_log
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Website templates: readable by all authenticated users
CREATE POLICY "Templates are readable" ON website_templates
    FOR SELECT USING (true);

-- Website sites: users can manage sites in their company
CREATE POLICY "Website sites belong to company" ON website_sites
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Website leads: users can manage leads for their company's sites
CREATE POLICY "Website leads belong to company" ON website_leads
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Website domain log: users can view domain logs for their company
CREATE POLICY "Website domain logs belong to company" ON website_domain_log
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate quote numbers
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quote_number IS NULL THEN
        NEW.quote_number = 'Q-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
            LPAD(CAST((SELECT COUNT(*) + 1 FROM quotes WHERE company_id = NEW.company_id) AS TEXT), 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_quote_number BEFORE INSERT ON quotes
    FOR EACH ROW EXECUTE FUNCTION generate_quote_number();

-- Auto-generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number = 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
            LPAD(CAST((SELECT COUNT(*) + 1 FROM invoices WHERE company_id = NEW.company_id) AS TEXT), 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoice_number BEFORE INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- ============================================
-- SAMPLE DATA (for testing)
-- ============================================

-- NOTE: Don't run this in production! Only for development/testing.
-- Run this AFTER creating a user through auth signup.

-- Instructions for sample data:
-- 1. First sign up a user through the app
-- 2. Then run the sample data script with that user's ID


-- >>> MIGRATION: 20260128000000_add_quickbooks_tables.sql <<<
-- QuickBooks Integration Tables
-- Run this migration in your Supabase SQL editor

-- QuickBooks Connections table
-- Stores OAuth tokens and connection status for each user
CREATE TABLE IF NOT EXISTS qbo_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  qbo_realm_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- QuickBooks Sync Log table
-- Tracks sync operations for debugging and audit
CREATE TABLE IF NOT EXISTS qbo_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- 'customer', 'invoice', 'payment'
  direction TEXT NOT NULL, -- 'push' or 'pull'
  record_id UUID, -- Local record ID
  qbo_id TEXT, -- QuickBooks record ID
  status TEXT NOT NULL, -- 'success', 'error', 'pending'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add QuickBooks ID columns to existing tables
-- This allows us to track which local records are synced to QuickBooks

-- Add qbo_id to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS qbo_id TEXT;

-- Add qbo_id to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS qbo_id TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_qbo_connections_user_id ON qbo_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_qbo_sync_log_user_id ON qbo_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_qbo_sync_log_created_at ON qbo_sync_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_qbo_id ON customers(qbo_id) WHERE qbo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_qbo_id ON invoices(qbo_id) WHERE qbo_id IS NOT NULL;

-- Row Level Security (RLS) policies
-- Users can only see their own QBO connections

ALTER TABLE qbo_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbo_sync_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own connections
DROP POLICY IF EXISTS "Users can view own qbo_connections" ON qbo_connections;
CREATE POLICY "Users can view own qbo_connections" ON qbo_connections
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own connections
DROP POLICY IF EXISTS "Users can insert own qbo_connections" ON qbo_connections;
CREATE POLICY "Users can insert own qbo_connections" ON qbo_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own connections
DROP POLICY IF EXISTS "Users can update own qbo_connections" ON qbo_connections;
CREATE POLICY "Users can update own qbo_connections" ON qbo_connections
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own connections
DROP POLICY IF EXISTS "Users can delete own qbo_connections" ON qbo_connections;
CREATE POLICY "Users can delete own qbo_connections" ON qbo_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Policy: Users can view their own sync logs
DROP POLICY IF EXISTS "Users can view own qbo_sync_log" ON qbo_sync_log;
CREATE POLICY "Users can view own qbo_sync_log" ON qbo_sync_log
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own sync logs
DROP POLICY IF EXISTS "Users can insert own qbo_sync_log" ON qbo_sync_log;
CREATE POLICY "Users can insert own qbo_sync_log" ON qbo_sync_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

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

-- >>> MIGRATION: 20260411000000_fix_quickbooks_schema.sql <<<
-- Fix QuickBooks schema to use company_id (company-scoped) instead of user_id
-- The API routes expect company_id + realm_id but the original migration used user_id + qbo_realm_id

-- ============================================================
-- 1. Fix qbo_connections table
-- ============================================================

-- Add company_id column (references companies table)
ALTER TABLE qbo_connections ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Rename qbo_realm_id → realm_id to match API code (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'qbo_connections' AND column_name = 'qbo_realm_id'
  ) THEN
    ALTER TABLE qbo_connections RENAME COLUMN qbo_realm_id TO realm_id;
  END IF;
END $$;

-- Backfill company_id from the user's company for any existing rows
UPDATE qbo_connections qc
SET company_id = u.company_id
FROM users u
WHERE qc.user_id = u.id
  AND qc.company_id IS NULL;

-- Drop old unique constraint on user_id and add one on company_id
ALTER TABLE qbo_connections DROP CONSTRAINT IF EXISTS qbo_connections_user_id_key;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'qbo_connections_company_id_key'
  ) THEN
    ALTER TABLE qbo_connections ADD CONSTRAINT qbo_connections_company_id_key UNIQUE (company_id);
  END IF;
END $$;

-- Add index on company_id
CREATE INDEX IF NOT EXISTS idx_qbo_connections_company_id ON qbo_connections(company_id);

-- Update RLS policies to also allow company-scoped access via service role
-- (Service role bypasses RLS, so existing user_id policies remain valid for
--  direct user queries; no policy changes strictly needed, but let's add
--  company-scoped select so the settings page query works via anon key.)

DROP POLICY IF EXISTS "Users can view own qbo_connections" ON qbo_connections;
CREATE POLICY "Users can view own qbo_connections" ON qbo_connections
  FOR SELECT USING (
    auth.uid() = user_id
    OR company_id IN (
      SELECT u.company_id FROM users u WHERE u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own qbo_connections" ON qbo_connections;
CREATE POLICY "Users can insert own qbo_connections" ON qbo_connections
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR company_id IN (
      SELECT u.company_id FROM users u WHERE u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own qbo_connections" ON qbo_connections;
CREATE POLICY "Users can update own qbo_connections" ON qbo_connections
  FOR UPDATE USING (
    auth.uid() = user_id
    OR company_id IN (
      SELECT u.company_id FROM users u WHERE u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own qbo_connections" ON qbo_connections;
CREATE POLICY "Users can delete own qbo_connections" ON qbo_connections
  FOR DELETE USING (
    auth.uid() = user_id
    OR company_id IN (
      SELECT u.company_id FROM users u WHERE u.id = auth.uid()
    )
  );

-- ============================================================
-- 2. Fix qbo_sync_log table
-- ============================================================

-- Add company_id column
ALTER TABLE qbo_sync_log ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Add records_synced column (used by sync route)
ALTER TABLE qbo_sync_log ADD COLUMN IF NOT EXISTS records_synced INTEGER;

-- Make direction nullable (sync route logs batch results without a direction)
ALTER TABLE qbo_sync_log ALTER COLUMN direction DROP NOT NULL;

-- Backfill company_id from user's company
UPDATE qbo_sync_log sl
SET company_id = u.company_id
FROM users u
WHERE sl.user_id = u.id
  AND sl.company_id IS NULL;

-- Add index on company_id
CREATE INDEX IF NOT EXISTS idx_qbo_sync_log_company_id ON qbo_sync_log(company_id);

-- Update RLS policies for company-scoped access
DROP POLICY IF EXISTS "Users can view own qbo_sync_log" ON qbo_sync_log;
CREATE POLICY "Users can view own qbo_sync_log" ON qbo_sync_log
  FOR SELECT USING (
    auth.uid() = user_id
    OR company_id IN (
      SELECT u.company_id FROM users u WHERE u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own qbo_sync_log" ON qbo_sync_log;
CREATE POLICY "Users can insert own qbo_sync_log" ON qbo_sync_log
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR company_id IN (
      SELECT u.company_id FROM users u WHERE u.id = auth.uid()
    )
  );

-- >>> MIGRATION: 20260411000001_fix_invoice_items_rls.sql <<<
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

-- >>> MIGRATION: 20260415000000_fix_missing_rls_policies.sql <<<
-- ============================================================
-- Migration: Fix Missing RLS Policies
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
--    Without a policy, RLS blocks ALL access via anon/authenticated roles.
--    The app works because API routes use service_role, but the table
--    still triggers the Supabase security advisor warning.
--    Add a read policy so authenticated users can see their own company,
--    and an update policy for owners/admins.
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

-- >>> MIGRATION: 20260416000000_cascade_delete_company_fks.sql <<<
-- Ensure every foreign key pointing at public.companies(id) cascades on delete.
-- Several older migrations (recurring_jobs, notifications, google_calendar_connections,
-- payment_plans, webhooks) omitted ON DELETE CASCADE, which blocks deletion of a
-- company row for account resets and tenant offboarding.
--
-- This block rewrites any single-column FK referencing companies whose delete rule
-- is NO ACTION ('a') or RESTRICT ('r'). SET NULL ('n') and SET DEFAULT ('d') are
-- left alone — those are intentional design choices (e.g. website_leads preserves
-- lead history after a company is removed).

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
