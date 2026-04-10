-- Add payment_instructions column to companies table
-- Allows contractors to display alternative payment details (Zelle, Venmo, check info, etc.)
-- on customer-facing invoices

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS payment_instructions TEXT DEFAULT NULL;
