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
-- Change ON DELETE behavior (requires dropping and re-adding the constraint)
-- Only run this if you get errors about job_id being NOT NULL:
-- ALTER TABLE review_requests DROP CONSTRAINT IF EXISTS review_requests_job_id_fkey;
-- ALTER TABLE review_requests ADD CONSTRAINT review_requests_job_id_fkey
--   FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;
