-- ============================================================
-- Migration 050: Growth Agent — Phase 1 (decide + generate)
--
-- Phase 0 gave the agent senses (growth_metrics_daily) and an
-- audience (growth_leads). This gives it a memory and a work queue,
-- which is what separates an agent from a content mill on a timer:
--
--   growth_experiments — what was tried, and what came of it. The
--                        planner reads closed experiments back in as
--                        prompt context, so next week's plan is
--                        informed by last month's outcomes.
--   growth_tasks       — what the planner decided to do. Proposed by
--                        the agent, approved by a human.
--   growth_assets      — the generated work product for a task.
--
-- Platform-private, same posture as migration 048: RLS on, no
-- anon/authenticated policies, service-role access only.
--
-- Run in Supabase Dashboard -> SQL Editor.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- GROWTH_EXPERIMENTS — the agent's memory
-- ============================================================
CREATE TABLE IF NOT EXISTS growth_experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  hypothesis TEXT NOT NULL,
  channel TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'won', 'lost', 'inconclusive', 'abandoned')),

  -- What we expected, and what actually happened. Both matter: the
  -- gap between them is the signal worth learning from.
  metric TEXT,
  baseline_value NUMERIC(12,2),
  target_value NUMERIC(12,2),
  actual_value NUMERIC(12,2),

  -- One or two sentences the planner reads back verbatim. Written by
  -- whoever closes the experiment, not generated, so the memory stays
  -- grounded in what a human actually observed.
  learning TEXT,

  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_growth_experiments_status
  ON growth_experiments (status, concluded_at DESC);

-- ============================================================
-- GROWTH_TASKS — what the planner decided to do
-- ============================================================
CREATE TABLE IF NOT EXISTS growth_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  channel TEXT NOT NULL,
  task_type TEXT NOT NULL,

  -- The planner's own ranking, 1 = do this first. Stored rather than
  -- recomputed so the approval queue shows the order the agent chose.
  priority INTEGER NOT NULL DEFAULT 5,
  expected_impact TEXT,

  -- proposed -> approved -> generated -> published, or rejected at any
  -- point. Nothing reaches the public without passing through approved.
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'approved', 'generated', 'published', 'rejected', 'failed')),

  experiment_id UUID REFERENCES growth_experiments(id) ON DELETE SET NULL,

  -- Which planner run produced this, so a bad week's plan can be
  -- identified and discarded as a batch.
  plan_run_id UUID,

  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,

  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_growth_tasks_status
  ON growth_tasks (status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_growth_tasks_run
  ON growth_tasks (plan_run_id);

-- ============================================================
-- GROWTH_ASSETS — generated work product
-- ============================================================
CREATE TABLE IF NOT EXISTS growth_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES growth_tasks(id) ON DELETE CASCADE,

  asset_type TEXT NOT NULL,
  title TEXT,
  body TEXT NOT NULL,

  -- SEO fields, populated for page and post assets.
  meta_title TEXT,
  meta_description TEXT,
  slug TEXT,

  -- Which model wrote it. Worth keeping: when output quality shifts,
  -- the first question is what changed, and this answers it.
  generated_by TEXT,

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'published', 'rejected')),

  -- Set once the asset actually reaches its destination (a blog post
  -- row, an email send), so re-running the publisher is idempotent.
  published_at TIMESTAMPTZ,
  published_ref TEXT,

  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_growth_assets_task
  ON growth_assets (task_id);
CREATE INDEX IF NOT EXISTS idx_growth_assets_status
  ON growth_assets (status, created_at DESC);

-- ============================================================
-- Triggers + RLS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_growth_experiments_updated_at ON growth_experiments;
CREATE TRIGGER update_growth_experiments_updated_at
  BEFORE UPDATE ON growth_experiments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_growth_tasks_updated_at ON growth_tasks;
CREATE TRIGGER update_growth_tasks_updated_at
  BEFORE UPDATE ON growth_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_growth_assets_updated_at ON growth_assets;
CREATE TRIGGER update_growth_assets_updated_at
  BEFORE UPDATE ON growth_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE growth_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_assets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON growth_experiments FROM anon, authenticated;
REVOKE ALL ON growth_tasks FROM anon, authenticated;
REVOKE ALL ON growth_assets FROM anon, authenticated;

COMMENT ON TABLE growth_experiments IS
  'The growth agent''s memory. Closed experiments feed back into the planner prompt.';
COMMENT ON COLUMN growth_tasks.status IS
  'proposed -> approved -> generated -> published. Nothing publishes without passing approved.';

-- ============================================================
-- DONE
-- ============================================================
