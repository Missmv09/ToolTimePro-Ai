-- Customer tracking link
-- Each job gets a stable, unguessable token used for a public "your technician
-- is on the way" tracking page (no login required). Existing rows are
-- backfilled with unique tokens by the column default.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tracking_token uuid DEFAULT gen_random_uuid();

-- Ensure any pre-existing rows that somehow lack a token get one.
UPDATE jobs SET tracking_token = gen_random_uuid() WHERE tracking_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_tracking_token ON jobs(tracking_token);
