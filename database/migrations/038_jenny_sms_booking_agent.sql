-- Jenny Pro booking agent: track conversation language and the booking it produced.
-- The conversational SMS/voice agent records which appointment (job) it created
-- so the dashboard can show real "Bookings Made" numbers, and which language the
-- customer is using so Jenny stays consistent across a thread.

ALTER TABLE jenny_sms_conversations
  ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',          -- en, es
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_intent VARCHAR(30);                    -- booking, question, emergency, other

CREATE INDEX IF NOT EXISTS idx_jenny_sms_conv_booking ON jenny_sms_conversations(booking_id);

-- Operator notification preference: how the contractor wants to be notified,
-- independent of the language the customer is using with Jenny.
ALTER TABLE jenny_pro_settings
  ADD COLUMN IF NOT EXISTS operator_language VARCHAR(10) DEFAULT 'en'; -- en, es
