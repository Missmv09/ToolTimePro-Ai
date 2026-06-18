-- Grant full beta-tester access to specific accounts.
--
-- What this does (mirrors the admin "toggle_beta_tester" action in
-- src/app/api/admin/companies/[id]/actions/route.ts):
--   • is_beta_tester = true  -> hasFeatureAccess() returns true for EVERY
--     feature/add-on, worker limit becomes Infinity, website page limit 99,
--     and TrialExpiredGate always passes through (see src/lib/plan-features.ts
--     and src/hooks/usePlanGating.ts).
--   • plan = 'elite'         -> highest tier, so anything that reads the raw
--     plan value also shows full access.
--   • trial_ends_at +1 year  -> trial never expires during the beta.
--
-- Beta access is stored on the COMPANY, not the individual user, so we resolve
-- each email to its company via the users table (and also match the company's
-- own email column, in case the owner email lives there).
--
-- Idempotent: safe to re-run. Run in the Supabase SQL Editor (Prod project).

UPDATE companies c
SET
  is_beta_tester  = true,
  plan            = 'elite',
  trial_ends_at   = now() + interval '365 days',
  trial_starts_at = COALESCE(c.trial_starts_at, now()),
  beta_notes      = COALESCE(c.beta_notes, 'Beta tester — granted full access')
WHERE
  lower(c.email) IN (
    'missmv@gmail.com',
    'justinkirksey@hotmail.com',
    'sandbox-test@tooltimepro.com'
  )
  OR c.id IN (
    SELECT u.company_id
    FROM users u
    WHERE lower(u.email) IN (
      'missmv@gmail.com',
      'justinkirksey@hotmail.com',
      'sandbox-test@tooltimepro.com'
    )
  );

-- Verify the result:
SELECT c.id, c.name, c.email, c.plan, c.is_beta_tester, c.trial_ends_at
FROM companies c
WHERE c.is_beta_tester = true
ORDER BY c.email;
