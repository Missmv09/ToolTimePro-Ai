// Netlify Scheduled Function: Supabase Keep-Alive
// Runs an actual database query every 3 days to prevent free-tier projects
// from being paused due to inactivity (Supabase pauses after 7 days).
//
// IMPORTANT: Supabase determines inactivity based on real database queries,
// not API-gateway hits. A HEAD request to /rest/v1/ touches PostgREST but
// never executes SQL, so it does NOT reset the pause timer. This function
// performs a lightweight SELECT against a real table to generate genuine
// database activity.
//
// TARGETING: This keep-alive pings EVERY configured project in a single run,
// so both Production and Sandbox stay warm regardless of which Netlify deploy
// context the cron happens to fire in.
//
//   - Production: SUPABASE_KEEPALIVE_URL / SUPABASE_KEEPALIVE_KEY
//     (falls back to NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
//      for backwards compatibility). Pinning the dedicated vars keeps Prod from
//      drifting if NEXT_PUBLIC_* is ever repointed at Sandbox during testing.
//   - Sandbox: SUPABASE_SANDBOX_URL / SUPABASE_SANDBOX_KEY
//
// A MISSING TARGET IS A FAILURE, NOT A SKIP. The sandbox project paused in
// August 2026 because these two vars were never set in Netlify: the cron
// skipped the sandbox, reported `success: true` for production alone, and
// nothing anywhere said the sandbox had gone a week without a query. Silence
// and success looked identical, which is the only reason it went unnoticed
// until the authenticated E2E suite started failing to log in.
//
// So an unconfigured or half-configured target is now reported as a problem
// and returns 502. If a deployment genuinely has no sandbox project, opt out
// deliberately with SUPABASE_SANDBOX_KEEPALIVE=off — that is a decision
// someone made on purpose, and it reads as one in the logs.

type Target = {
  label: string;
  url: string;
  key: string;
  source: string;
};

type TargetResult = {
  label: string;
  host: string;
  ok: boolean;
  status?: number;
  error?: string;
  body?: string;
};

// A target that could not even be attempted, and why. These are configuration
// faults rather than ping failures, so they are reported separately — "nobody
// told me where the sandbox is" and "the sandbox did not answer" need
// different fixes and must not look the same.
type ConfigProblem = {
  label: string;
  problem: string;
};

// Values that mean "this deployment has no such project, stop asking".
const OPT_OUT_VALUES = new Set(['off', 'false', '0', 'no', 'none', 'disabled']);

function isOptedOut(raw: string | undefined): boolean {
  return OPT_OUT_VALUES.has((raw || '').trim().toLowerCase());
}

// Normalize a configured base URL so a stray trailing slash, surrounding
// whitespace, or an accidental "/rest/v1" suffix can't produce a malformed
// request path (PostgREST rejects "//rest/v1/..." with a 404 PGRST125).
function normalizeBaseUrl(raw: string): string {
  return raw
    .trim()
    .replace(/\/+$/, '')        // drop trailing slash(es)
    .replace(/\/rest\/v1$/, ''); // drop an accidental REST path suffix
}

async function pingTarget(target: Target): Promise<TargetResult> {
  const baseUrl = normalizeBaseUrl(target.url);

  let host = baseUrl;
  try {
    host = new URL(baseUrl).host;
  } catch {
    // keep raw value if it isn't a parseable URL
  }

  console.log(
    `[Supabase Keep-Alive] Pinging ${target.label} host: ${host} (source: ${target.source})`
  );

  try {
    // Lightweight SELECT against a core table. This forces PostgREST to
    // execute real SQL against the database, which counts as activity.
    const response = await fetch(
      `${baseUrl}/rest/v1/companies?select=id&limit=1`,
      {
        method: 'GET',
        headers: {
          'apikey': target.key,
          'Authorization': `Bearer ${target.key}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      // Carry a slice of the body into the result, not just the log. A paused
      // project, a rotated key and a dropped table all fail here, and the body
      // is the only thing that tells them apart.
      const body = (await response.text()).slice(0, 200);
      console.error(
        `[Supabase Keep-Alive] Query failed for ${target.label} (${host}): ${response.status} ${body}`
      );
      return {
        label: target.label,
        host,
        ok: false,
        status: response.status,
        body,
      };
    }

    console.log(
      `[Supabase Keep-Alive] DB query OK for ${target.label} (${host}): ${response.status}`
    );
    return { label: target.label, host, ok: true, status: response.status };
  } catch (error) {
    console.error(
      `[Supabase Keep-Alive] Error pinging ${target.label} (${host}):`,
      error
    );
    return {
      label: target.label,
      host,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Turn a (url, key) pair into either a target to ping or a problem to report.
// Half-configured is always a fault: one var set and the other missing is a
// typo or a half-finished setup, never an intentional state.
function resolveTarget(
  label: string,
  url: string | undefined,
  key: string | undefined,
  urlVar: string,
  keyVar: string,
  source: string
): { target?: Target; problem?: ConfigProblem } {
  if (url && key) {
    return { target: { label, url, key, source } };
  }

  const missing = [!url && urlVar, !key && keyVar].filter(Boolean).join(' and ');
  return {
    problem: {
      label,
      problem: `${missing} not set — ${label} is never pinged and will pause after 7 days of inactivity`,
    },
  };
}

export default async function handler() {
  const targets: Target[] = [];
  const problems: ConfigProblem[] = [];

  // Production target (dedicated vars preferred, NEXT_PUBLIC_* fallback).
  const prod = resolveTarget(
    'production',
    process.env.SUPABASE_KEEPALIVE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_KEEPALIVE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'SUPABASE_KEEPALIVE_URL (or NEXT_PUBLIC_SUPABASE_URL)',
    'SUPABASE_KEEPALIVE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)',
    process.env.SUPABASE_KEEPALIVE_URL
      ? 'SUPABASE_KEEPALIVE_URL'
      : 'NEXT_PUBLIC_SUPABASE_URL'
  );
  if (prod.target) targets.push(prod.target);
  if (prod.problem) problems.push(prod.problem);

  // Sandbox target. Required unless someone opted out on purpose.
  if (isOptedOut(process.env.SUPABASE_SANDBOX_KEEPALIVE)) {
    console.log(
      '[Supabase Keep-Alive] Sandbox keep-alive is explicitly disabled ' +
        '(SUPABASE_SANDBOX_KEEPALIVE=off) — skipping.'
    );
  } else {
    const sandbox = resolveTarget(
      'sandbox',
      process.env.SUPABASE_SANDBOX_URL,
      process.env.SUPABASE_SANDBOX_KEY,
      'SUPABASE_SANDBOX_URL',
      'SUPABASE_SANDBOX_KEY',
      'SUPABASE_SANDBOX_URL'
    );
    if (sandbox.target) targets.push(sandbox.target);
    if (sandbox.problem) problems.push(sandbox.problem);
  }

  for (const { label, problem } of problems) {
    console.error(`[Supabase Keep-Alive] MISCONFIGURED ${label}: ${problem}`);
  }

  if (targets.length === 0) {
    console.error('[Supabase Keep-Alive] No targets configured');
    return new Response(
      JSON.stringify({ error: 'Missing Supabase config', problems }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const results = await Promise.all(targets.map(pingTarget));
  const allOk = results.every((r) => r.ok) && problems.length === 0;

  return new Response(
    JSON.stringify({ success: allOk, results, problems }),
    {
      // 502 if any target failed OR any target was never configured, so both
      // failure modes surface in Netlify logs. All configured targets are
      // always attempted regardless of one another.
      status: allOk ? 200 : 502,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
