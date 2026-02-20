-- Migration: Add addons column to companies table
-- This stores purchased add-on product IDs (e.g., jenny_exec_admin, website_builder)
-- so the dashboard can gate features based on what the owner actually purchased.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS addons TEXT[] DEFAULT '{}';

-- Add a comment for clarity
COMMENT ON COLUMN companies.addons IS 'Array of purchased add-on IDs from Stripe checkout (e.g. jenny_exec_admin, jenny_pro, website_builder)';
