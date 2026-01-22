-- Migration: Add SMS-related columns to quotes table
-- Description: Adds columns for SMS tracking and customer info denormalization
-- Date: 2024-01-22

-- Add SMS tracking columns
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS sms_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS sms_message_sid TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS sent_via TEXT; -- 'sms', 'email', 'both'

-- Add denormalized customer info for easier access and historical tracking
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);

-- Add index for faster SMS tracking queries
CREATE INDEX IF NOT EXISTS idx_quotes_sms_sent ON quotes(sms_sent);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);

-- Update RLS policies to allow public viewing of quotes by ID (for customer view page)
-- First drop the existing policy if it exists
DROP POLICY IF EXISTS "Anyone can view quotes by ID" ON quotes;

-- Create policy for public quote viewing
CREATE POLICY "Anyone can view quotes by ID" ON quotes
  FOR SELECT USING (true);

-- Ensure the existing company-based policy still works for management
DROP POLICY IF EXISTS "Users can manage their company quotes" ON quotes;
DROP POLICY IF EXISTS "Quotes belong to company" ON quotes;

CREATE POLICY "Users can manage their company quotes" ON quotes
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Add comment for documentation
COMMENT ON COLUMN quotes.sms_sent IS 'Whether SMS was successfully sent for this quote';
COMMENT ON COLUMN quotes.sms_message_sid IS 'Twilio message SID for tracking delivery';
COMMENT ON COLUMN quotes.sent_via IS 'Channel used to send quote: sms, email, or both';
COMMENT ON COLUMN quotes.customer_name IS 'Denormalized customer name for historical tracking';
COMMENT ON COLUMN quotes.customer_phone IS 'Denormalized customer phone for SMS sending';
COMMENT ON COLUMN quotes.customer_email IS 'Denormalized customer email for email sending';
