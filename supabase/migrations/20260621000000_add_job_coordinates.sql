-- Persisted job coordinates
-- Stores geocoded/manual lat-lng on each job so the Route Optimizer doesn't
-- re-geocode live every run, and so approximate locations can be corrected
-- once (by dragging the map pin) and stay fixed.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS lng double precision;
-- How the coordinates were obtained:
--   'exact'       — geocoder pinpointed the full street address
--   'approximate' — fell back to city/zip centroid (needs correction)
--   'manual'      — a human dragged the pin to the correct spot
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS geo_precision text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS geocoded_at timestamptz;
