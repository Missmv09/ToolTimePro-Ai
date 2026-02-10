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
    logo_url TEXT,
    plan VARCHAR(50) DEFAULT 'starter', -- starter, pro, elite
    stripe_customer_id VARCHAR(255),
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
    status VARCHAR(50) DEFAULT 'new', -- new, contacted, quoted, won, lost
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
CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_compliance_alerts_company ON compliance_alerts(company_id);
CREATE INDEX idx_compliance_alerts_user ON compliance_alerts(user_id);
CREATE INDEX idx_sms_logs_company ON sms_logs(company_id);
CREATE INDEX idx_qbo_connections_company ON qbo_connections(company_id);
CREATE INDEX idx_qbo_sync_log_company ON qbo_sync_log(company_id);

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
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbo_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbo_sync_log ENABLE ROW LEVEL SECURITY;

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
    FOR ALL USING (
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
