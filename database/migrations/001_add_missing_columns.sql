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
