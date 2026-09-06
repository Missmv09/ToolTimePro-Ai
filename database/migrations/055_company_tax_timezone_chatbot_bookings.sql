-- 055: Per-company tax rate + timezone, and a real home for chatbot demo bookings.
--
-- APPLY THIS BY HAND (see 053 for why: this directory is not automated).
-- Idempotent — safe to re-run.
--
-- 1. companies.default_tax_rate
--    Quotes were taxed at a hardcoded 8.75% ("CA sales tax estimate") for every
--    tenant, and that rate was copied onto the invoice when a quote converted.
--    A Texas or Oregon contractor was sending California tax on customer
--    documents. NULL means "not set": the app then falls back to the customer's
--    state (estimate) and finally 0.
--
-- 2. companies.timezone
--    Google Calendar sync stamped every event America/Los_Angeles, and reminder
--    day boundaries were computed in UTC. IANA name, e.g. 'America/Chicago'.
--    Defaults to Pacific so existing tenants keep their current behaviour until
--    they change it in Settings.
--
-- 3. chatbot_bookings
--    netlify/functions/booking-store.js (the public "Try Jenny Live" demo on the
--    marketing site) has always inserted into this table, which never existed.
--    Every insert failed, the function swallowed the error, kept the row in an
--    in-process array, returned success, and sent the visitor a confirmation
--    text. This is a DEMO lead table: rows are not tenant jobs.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS default_tax_rate DECIMAL(5,2);

COMMENT ON COLUMN companies.default_tax_rate IS
  'Default sales-tax percent applied to new quotes and invoices (e.g. 8.25). '
  'NULL = not set; the app estimates from the customer state, then 0.';

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'America/Los_Angeles';

COMMENT ON COLUMN companies.timezone IS
  'IANA timezone for the business (calendar sync, reminders, business-hours checks).';

CREATE TABLE IF NOT EXISTS chatbot_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  time VARCHAR(20) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  service VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  source VARCHAR(50) NOT NULL DEFAULT 'chatbot',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE chatbot_bookings IS
  'Leads captured by the public marketing-site chatbot demo. Not tenant jobs — '
  'real online bookings go through /api/bookings into jobs.';

CREATE INDEX IF NOT EXISTS idx_chatbot_bookings_date ON chatbot_bookings (date, status);

ALTER TABLE chatbot_bookings ENABLE ROW LEVEL SECURITY;
-- Service-role only: the Netlify function uses the service key. No anon policy.
