-- Live technician location for the customer tracking page.
-- While a job is in progress, the worker app posts the tech's current position
-- here so the customer's tracking page can show an Uber-style live pin.
-- Only the latest fix is kept (no history).

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tech_lat double precision;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tech_lng double precision;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tech_location_at timestamptz;
