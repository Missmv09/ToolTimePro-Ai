-- ============================================================
-- Migration 049: Ad platform click IDs on growth_leads
--
-- Google Ads requires exactly one click identifier on an uploaded
-- conversion — gclid (ordinary web clicks), gbraid (iOS app-to-web),
-- or wbraid (iOS web-to-web). Without one stored at capture time,
-- a lead that later becomes a paying customer cannot be reported
-- back to Google, and Smart Bidding keeps optimizing for whatever
-- it can see (free-tool email captures) instead of for revenue.
--
-- The click ID exists in the URL only on the landing page, so it is
-- captured and persisted client-side on first sight
-- (see captureAttribution in src/lib/analytics.ts) and submitted
-- with the lead.
--
-- Run in Supabase Dashboard -> SQL Editor.
-- ============================================================

ALTER TABLE growth_leads
  ADD COLUMN IF NOT EXISTS gclid TEXT,
  ADD COLUMN IF NOT EXISTS gbraid TEXT,
  ADD COLUMN IF NOT EXISTS wbraid TEXT;

-- Set when a conversion for this lead has been reported to the ad
-- platform, so an upload job can find the backlog and — more
-- importantly — never send the same conversion twice. Duplicate
-- uploads inflate reported conversions and corrupt the bidding
-- signal, which is worse than not uploading at all.
ALTER TABLE growth_leads
  ADD COLUMN IF NOT EXISTS conversion_uploaded_at TIMESTAMPTZ;

-- The upload job's working query: converted leads that carry a click
-- ID and haven't been reported yet. Partial, because that is a small
-- slice of the table and the only slice this query ever wants.
CREATE INDEX IF NOT EXISTS idx_growth_leads_pending_upload
  ON growth_leads (converted_at)
  WHERE conversion_uploaded_at IS NULL
    AND converted_at IS NOT NULL
    AND (gclid IS NOT NULL OR gbraid IS NOT NULL OR wbraid IS NOT NULL);

COMMENT ON COLUMN growth_leads.gclid IS
  'Google Ads click ID, captured from the landing URL. Last ad click wins (Google attributes last-click), unlike the first-touch utm_* columns.';
COMMENT ON COLUMN growth_leads.conversion_uploaded_at IS
  'When this lead''s conversion was reported to the ad platform. Guards against double-reporting.';

-- ============================================================
-- DONE
-- ============================================================
