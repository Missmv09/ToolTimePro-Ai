-- Add last_login_at field to track user activation status
-- Users who have never logged in will have NULL, indicating pending activation

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient queries on login status
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);
