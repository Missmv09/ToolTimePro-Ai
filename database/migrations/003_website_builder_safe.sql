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
