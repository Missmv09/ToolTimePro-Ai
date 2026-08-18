-- ============================================================
-- Migration 048: Growth Agent — Phase 0 (sensing + audience)
--
-- Platform-level marketing infrastructure for Task Iguana's OWN
-- funnel. This is NOT tenant data — no company_id, no tenant RLS
-- policies. Everything here is written and read by server-side
-- routes using the service role key, and surfaced only to platform
-- admins (see src/lib/platform-admin.ts).
--
-- Two tables:
--   growth_leads         — email captures from free tools, blog,
--                          newsletter. First-touch attribution.
--   growth_metrics_daily — one row per day snapshotting the funnel
--                          so the Phase 1 planner has a time series
--                          to reason over.
--
-- Run in Supabase Dashboard -> SQL Editor.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- GROWTH_LEADS — top-of-funnel email captures
-- ============================================================
CREATE TABLE IF NOT EXISTS growth_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identity. Email is stored already-lowercased by the API route;
  -- the unique index below enforces that at the DB level too.
  email TEXT NOT NULL,
  name TEXT,
  company_name TEXT,
  trade TEXT,

  -- First-touch attribution. These are deliberately NOT overwritten
  -- on repeat captures — the first thing that brought someone in is
  -- the number the growth agent needs to optimize. Later touches are
  -- appended to metadata.touches instead.
  source TEXT NOT NULL,
  source_detail TEXT,
  landing_page TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,

  -- Consent. CAN-SPAM allows transactional follow-up on a requested
  -- result, but anything resembling a newsletter needs an explicit
  -- opt-in, so we track it separately rather than assuming it.
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  marketing_consent_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  unsubscribe_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),

  -- Lifecycle. Advanced by the metrics cron when a lead's email shows
  -- up in companies, so the funnel can be measured end to end.
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'nurturing', 'trialing', 'converted', 'unsubscribed', 'bounced')),
  converted_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,

  metadata JSONB NOT NULL DEFAULT '{}',

  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per person. The API route upserts against this.
CREATE UNIQUE INDEX IF NOT EXISTS idx_growth_leads_email
  ON growth_leads (lower(email));

CREATE INDEX IF NOT EXISTS idx_growth_leads_source
  ON growth_leads (source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_growth_leads_status
  ON growth_leads (status);
CREATE INDEX IF NOT EXISTS idx_growth_leads_created
  ON growth_leads (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_growth_leads_unsub_token
  ON growth_leads (unsubscribe_token);
-- Partial index for the nurture-sequence query in Phase 2:
-- "who has opted in and hasn't unsubscribed?"
CREATE INDEX IF NOT EXISTS idx_growth_leads_mailable
  ON growth_leads (created_at DESC)
  WHERE marketing_consent = true AND unsubscribed_at IS NULL;

-- ============================================================
-- GROWTH_METRICS_DAILY — daily funnel snapshot
--
-- One row per calendar day (UTC). The cron recomputes today's row
-- on every run and upserts, so a mid-day run is cheap and a missed
-- run self-heals on the next one.
-- ============================================================
CREATE TABLE IF NOT EXISTS growth_metrics_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_date DATE NOT NULL,

  -- Top of funnel
  leads_captured INTEGER NOT NULL DEFAULT 0,
  leads_total INTEGER NOT NULL DEFAULT 0,
  leads_consented INTEGER NOT NULL DEFAULT 0,

  -- Signup -> activation -> revenue
  signups INTEGER NOT NULL DEFAULT 0,
  trials_active INTEGER NOT NULL DEFAULT 0,
  trials_started INTEGER NOT NULL DEFAULT 0,
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  paid_active INTEGER NOT NULL DEFAULT 0,
  past_due INTEGER NOT NULL DEFAULT 0,
  canceled INTEGER NOT NULL DEFAULT 0,
  expired INTEGER NOT NULL DEFAULT 0,

  -- Derived rates, stored so the planner doesn't recompute them and
  -- so a chart can read them straight out. Percentages, 0-100.
  lead_to_signup_rate NUMERIC(5,2),
  trial_to_paid_rate NUMERIC(5,2),

  -- Per-source breakdown: { "tool_final_wage": { "leads": 4, ... }, ... }
  by_source JSONB NOT NULL DEFAULT '{}',
  -- Per-plan breakdown of paid accounts: { "pro": 3, "elite": 1 }
  by_plan JSONB NOT NULL DEFAULT '{}',

  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_growth_metrics_date
  ON growth_metrics_daily (metric_date);

-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_growth_leads_updated_at ON growth_leads;
CREATE TRIGGER update_growth_leads_updated_at
  BEFORE UPDATE ON growth_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS
--
-- Both tables are platform-private. RLS is enabled with NO policies
-- for anon/authenticated, which denies them everything. The service
-- role bypasses RLS, so the API routes and cron still work. This is
-- the same posture platform_blog_posts uses for writes (migration
-- 006) — the difference is that nothing here is publicly readable.
-- ============================================================
ALTER TABLE growth_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_metrics_daily ENABLE ROW LEVEL SECURITY;

-- Explicitly revoke, in case default grants are broader than expected.
REVOKE ALL ON growth_leads FROM anon, authenticated;
REVOKE ALL ON growth_metrics_daily FROM anon, authenticated;

COMMENT ON TABLE growth_leads IS
  'Platform-level marketing leads for Task Iguana''s own funnel. Not tenant data.';
COMMENT ON TABLE growth_metrics_daily IS
  'Daily funnel snapshot powering the growth agent planner. Not tenant data.';
COMMENT ON COLUMN growth_leads.source IS
  'First-touch source, never overwritten. Repeat touches append to metadata.touches.';

-- ============================================================
-- DONE
-- ============================================================
