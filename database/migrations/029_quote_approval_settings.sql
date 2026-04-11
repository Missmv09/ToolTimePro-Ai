-- Migration 029: Add quote approval settings to companies
-- Allows owners to configure whether quotes require internal approval before sending

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS quote_approval_settings JSONB DEFAULT NULL;

-- Structure:
-- {
--   "required": true/false,          -- whether quotes need approval before sending
--   "approver_ids": ["uuid", ...]    -- user IDs who can approve & send. Empty array = owner only
-- }

COMMENT ON COLUMN companies.quote_approval_settings IS 'Quote approval workflow config: { required: bool, approver_ids: uuid[] }';
