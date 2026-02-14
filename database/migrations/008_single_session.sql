-- Single-session enforcement: only one active login per user at a time.
-- When a user logs in, we store a session_id. Other sessions for the same
-- user are detected and signed out on the client side.

ALTER TABLE users ADD COLUMN IF NOT EXISTS active_session_id VARCHAR(255);
