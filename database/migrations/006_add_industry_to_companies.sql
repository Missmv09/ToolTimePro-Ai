-- Migration: Add industry column to companies table
-- This supports onboarding where users pick their industry
-- and get auto-suggested services based on it.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
