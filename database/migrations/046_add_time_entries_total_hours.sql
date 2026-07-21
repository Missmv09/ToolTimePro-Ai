-- ============================================================
-- 046: Add missing total_hours column to public.time_entries
-- ============================================================
-- WHY: Clock-out writes `total_hours` (computed shift length) to time_entries,
-- and the worker Hours view reads it, but the column was never added to the
-- schema. Result: clocking out failed with
--   "Could not find the 'total_hours' column of 'time_entries' in the schema cache".
-- Idempotent — safe to run repeatedly.
-- ============================================================

ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS total_hours DECIMAL(10,2);

-- Reload PostgREST's schema cache so the column is usable immediately.
NOTIFY pgrst, 'reload schema';
