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
