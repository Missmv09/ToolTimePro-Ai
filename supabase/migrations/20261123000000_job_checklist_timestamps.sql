-- Per-item job checklist persistence with completion timestamps.
--
-- job_checklists has existed since the base schema (with completed_by and
-- completed_at) but nothing ever wrote to it: the worker app rebuilt the
-- checklist in memory on every page load, so checks vanished on refresh and the
-- office never saw them. The worker app now saves each tap here, stamped with
-- who checked it and when.
--
-- The one thing the table could not represent was which items are required
-- before a job can be completed, so that is added below.
--
-- The app degrades to the old in-memory checklist if this has not run yet.
-- This file auto-applies to production via migrate.yml on push to main; run it
-- by hand in the sandbox SQL editor. Idempotent — safe to re-run.

-- Base schema creates this table; guard for environments built another way.
CREATE TABLE IF NOT EXISTS job_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    item_text VARCHAR(255) NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE job_checklists ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_job_checklists_job_id ON job_checklists(job_id, sort_order);

ALTER TABLE job_checklists ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'job_checklists' AND policyname = 'Job checklists for company jobs'
  ) THEN
    CREATE POLICY "Job checklists for company jobs" ON job_checklists
      FOR ALL USING (
        job_id IN (
          SELECT j.id FROM jobs j
          WHERE j.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
      );
  END IF;
END $$;
