-- Add granular admin permissions column to users table.
-- When NULL, admins have full access (backwards compatible).
-- When set, contains a JSON object like:
--   {"team_management": true, "quotes": false, "invoices": true, ...}
-- Only relevant for admin and worker_admin roles.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS admin_permissions JSONB DEFAULT NULL;

COMMENT ON COLUMN users.admin_permissions IS
  'Granular permission toggles for admin/worker_admin roles. NULL = full access.';
