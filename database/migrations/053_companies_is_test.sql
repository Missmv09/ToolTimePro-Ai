-- 053: Mark test accounts so they stop counting as customers.
--
-- APPLY THIS BY HAND. This directory is not automated: migrate.yml watches
-- `supabase/migrations/**` and runs `supabase db push`, which never reads
-- `database/migrations/`. README.md calls these "run in order after the base
-- schema", and the numbering makes them look automated when they are not.
--
-- That matters here more than usual, because the code in this same change
-- filters eleven queries on the column below. Deploying it before the column
-- exists breaks the admin stats route and the growth metrics route outright
-- (Postgres 42703, undefined column), so run this against sandbox and
-- production BEFORE the deploy reaches them. It is idempotent — ADD COLUMN IF
-- NOT EXISTS and CREATE INDEX IF NOT EXISTS — so re-running is harmless.
--
-- Every funnel number the platform reports — the admin dashboard's conversion
-- rate, and the growth_metrics_daily snapshot the growth agent planner reads —
-- counted every row in `companies`. With no real customers yet, that meant the
-- planner's first run reasoned over 4 trials and 3 paying accounts that were all
-- created by hand for testing, and proposed a week of work to improve a funnel
-- that does not exist.
--
-- A flag rather than deleting the rows: the test accounts are still needed for
-- testing. A flag rather than matching on email patterns: a heuristic that
-- silently reclassifies a real signup whose address happens to look like a test
-- address is worse than an explicit column.
--
-- Default false so a real signup is counted unless someone deliberately excludes
-- it. The failure mode of the opposite default is invisible: real customers
-- quietly missing from every metric.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN companies.is_test IS
  'True for accounts created for testing or demos. Excluded from growth metrics, '
  'the admin funnel, and the growth agent planner input. Never set this on a real customer.';

-- Every metrics query filters on this, and all of them are "the not-test rows",
-- so the partial index matches the actual access pattern rather than the column.
CREATE INDEX IF NOT EXISTS idx_companies_real_accounts
  ON companies (created_at)
  WHERE is_test = FALSE;
