-- Job checklist: where each item was checked, and running-long alert dedupe.
--
-- completed_lat/lng/accuracy_m: the worker's GPS fix at the moment they checked
--   the item (null if the phone wouldn't give one). Compared with jobs.lat/lng
--   to flag checks made away from the job site.
-- overdue_alerted_at: set when the running-long cron has notified the office
--   that this item (the step in progress) is taking far longer than typical,
--   so each step alerts at most once.
--
-- Auto-applies to production via migrate.yml; run by hand in the sandbox.
-- Idempotent — safe to re-run.

ALTER TABLE job_checklists ADD COLUMN IF NOT EXISTS completed_lat DOUBLE PRECISION;
ALTER TABLE job_checklists ADD COLUMN IF NOT EXISTS completed_lng DOUBLE PRECISION;
ALTER TABLE job_checklists ADD COLUMN IF NOT EXISTS completed_accuracy_m DOUBLE PRECISION;
ALTER TABLE job_checklists ADD COLUMN IF NOT EXISTS overdue_alerted_at TIMESTAMP WITH TIME ZONE;
