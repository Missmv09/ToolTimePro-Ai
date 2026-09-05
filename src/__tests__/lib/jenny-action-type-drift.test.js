/**
 * Guards the constraint that went wrong once already.
 *
 * jenny_action_log and jenny_action_configs each carry a CHECK constraint
 * listing the allowed action_type values. The cron dispatches from a switch,
 * writes log rows from ~23 call sites, and the settings page renders from
 * CONFIGURABLE_ACTION_TYPES. Those four lists must agree.
 *
 * They did not. Migration 016 listed five types; the cron grew to fifteen.
 * Because the dispatcher iterates over *enabled config rows*, a type the
 * constraint rejects can never be configured and therefore never runs — and
 * because supabase-js resolves with { error } instead of throwing, the
 * rejected writes said nothing. Ten of fifteen actions were dead in
 * production while the whole suite stayed green.
 *
 * No mocked-Supabase test can catch that: a CHECK constraint does not exist
 * in a mock. So this reads the migration SQL as text and compares it to the
 * source of truth in the code. It is the only check here that would have
 * failed on the original bug.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..', '..');
// The most recent migration that (re)defines both CHECK constraints. Each
// widening drops and re-adds them, so the latest one is the whole truth.
const MIGRATION = path.join(
  REPO_ROOT,
  'supabase/migrations/20260905000000_jenny_inbox_lead_alerts_reactivation.sql'
);
const ROUTE = path.join(REPO_ROOT, 'src/app/api/jenny-actions/route.ts');
const TYPES = path.join(REPO_ROOT, 'src/types/jenny-actions.ts');

const read = (p) => fs.readFileSync(p, 'utf8');

/** Pull the quoted values out of one `ADD CONSTRAINT <name> ... CHECK (...)`. */
function constraintValues(sql, constraintName) {
  const start = sql.indexOf(`ADD CONSTRAINT ${constraintName}`);
  if (start === -1) throw new Error(`constraint ${constraintName} not found in ${path.basename(MIGRATION)}`);

  // The CHECK list ends at the first `));` after the constraint name.
  const end = sql.indexOf('));', start);
  if (end === -1) throw new Error(`could not find the end of ${constraintName}`);

  const body = sql.slice(start, end);
  return new Set((body.match(/'([a-z0-9_]+)'/g) || []).map((s) => s.slice(1, -1)));
}

/** Every `action_type: 'x'` the cron writes to jenny_action_log. */
function actionTypesWritten(routeSource) {
  const matches = routeSource.match(/action_type:\s*'([a-z0-9_]+)'/g) || [];
  return new Set(matches.map((m) => m.replace(/.*'([a-z0-9_]+)'.*/, '$1')));
}

/** Every `case 'x':` the dispatcher switches on. */
function actionTypesDispatched(routeSource) {
  const matches = routeSource.match(/case\s+'([a-z0-9_]+)':/g) || [];
  return new Set(matches.map((m) => m.replace(/.*'([a-z0-9_]+)'.*/, '$1')));
}

/** The values of a `Record<JennyActionType, ...>` or a string-union type. */
function declaredUnionMembers(typesSource) {
  const start = typesSource.indexOf('export type JennyActionType');
  const end = typesSource.indexOf(';', start);
  const body = typesSource.slice(start, end);
  return new Set((body.match(/'([a-z0-9_]+)'/g) || []).map((s) => s.slice(1, -1)));
}

function declaredConfigurable(typesSource) {
  const start = typesSource.indexOf('export const CONFIGURABLE_ACTION_TYPES');
  const end = typesSource.indexOf('];', start);
  const body = typesSource.slice(start, end);
  return new Set((body.match(/'([a-z0-9_]+)'/g) || []).map((s) => s.slice(1, -1)));
}

const sorted = (set) => [...set].sort();

describe('Jenny action_type lists agree across code and schema', () => {
  const migrationSql = read(MIGRATION);
  const routeSource = read(ROUTE);
  const typesSource = read(TYPES);

  const logAllowed = constraintValues(migrationSql, 'jenny_action_log_action_type_check');
  const configsAllowed = constraintValues(migrationSql, 'jenny_action_configs_action_type_check');

  it('every action_type the cron writes is permitted by the log constraint', () => {
    const written = actionTypesWritten(routeSource);
    expect(written.size).toBeGreaterThan(0);

    const rejected = sorted(written).filter((t) => !logAllowed.has(t));
    expect(rejected).toEqual([]);
  });

  it('every action_type the dispatcher switches on is permitted by the configs constraint', () => {
    const dispatched = actionTypesDispatched(routeSource);
    expect(dispatched.size).toBeGreaterThan(0);

    // A type the configs constraint rejects cannot have an enabled row, so the
    // dispatcher can never reach its case. That is silent dead code.
    const unreachable = sorted(dispatched).filter((t) => !configsAllowed.has(t));
    expect(unreachable).toEqual([]);
  });

  it('the JennyActionType union matches the log constraint exactly', () => {
    expect(sorted(declaredUnionMembers(typesSource))).toEqual(sorted(logAllowed));
  });

  it('CONFIGURABLE_ACTION_TYPES matches the configs constraint exactly', () => {
    expect(sorted(declaredConfigurable(typesSource))).toEqual(sorted(configsAllowed));
  });

  it('configurable types are a subset of what the log accepts', () => {
    const notLoggable = sorted(configsAllowed).filter((t) => !logAllowed.has(t));
    expect(notLoggable).toEqual([]);
  });

  it('the platform-wide types are loggable but deliberately not configurable', () => {
    // These run unconditionally in the cron rather than from a config row.
    for (const t of ['price_staleness', 'hr_law_update']) {
      expect(logAllowed.has(t)).toBe(true);
      expect(configsAllowed.has(t)).toBe(false);
    }
  });
});
