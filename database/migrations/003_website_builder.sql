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
