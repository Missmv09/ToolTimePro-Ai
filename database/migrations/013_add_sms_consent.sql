-- Migration: Add SMS consent tracking to customers
-- This adds opt-in tracking for TCPA compliance before sending text messages

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sms_consent_date TIMESTAMP WITH TIME ZONE;

-- Add a comment explaining the fields
COMMENT ON COLUMN customers.sms_consent IS 'Whether the customer has opted in to receive SMS/text messages';
COMMENT ON COLUMN customers.sms_consent_date IS 'Timestamp when the customer gave or revoked SMS consent';
