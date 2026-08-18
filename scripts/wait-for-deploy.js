#!/usr/bin/env node
/**
 * Wait until a deployment is finished publishing and is serving traffic.
 *
 * WHY THIS EXISTS
 * A push to `main` fans out into two things that race each other:
 *   1. `backsync-sandbox.yml` pushes main -> sandbox, which starts a Netlify
 *      sandbox build.
 *   2. `e2e.yml`'s authenticated job starts hitting that same sandbox URL.
 * Netlify keeps the previous deploy live until the new one publishes, so a
 * plain 200 means nothing: CI warms up the old build, and the atomic swap then
 * lands mid-run. Requests in flight during the swap hang or reset, the login
 * chain (Supabase auth -> /api/auth/2fa/check-device -> /dashboard) blows its
 * budget, and the suite fails in `cy.login()`'s `before each` hook with
 * "expected '/auth/login/' to include '/dashboard'" — a deploy race wearing a
 * test failure's clothes.
 *
 * This gate polls /api/health (which reports the build's COMMIT_REF) and only
 * returns once the deployment has settled:
 *   • EXPECT_COMMIT set  -> wait for that exact commit to be live, then confirm
 *                           it stays live and responsive across a few probes.
 *   • EXPECT_COMMIT unset -> wait for any commit to hold steady and respond
 *                           quickly across a few consecutive probes.
 *
 * Usage:
 *   BASE_URL=https://sandbox--<site>.netlify.app node scripts/wait-for-deploy.js
 *   BASE_URL=… EXPECT_COMMIT=<sha> node scripts/wait-for-deploy.js
 *
 * Exits 0 when the deployment is ready, 1 when it never became ready — a real
 * failure worth a red X (the deploy broke, or took longer than any deploy
 * should).
 */

const baseUrl = (process.argv[2] || process.env.BASE_URL || '').replace(/\/$/, '');
// Mutable: a build that doesn't report its commit (COMMIT_REF unset in the
// deploy environment) can't be matched, so the gate drops back to waiting for
// a steady build rather than failing on something it cannot verify.
let expectCommit = (process.env.EXPECT_COMMIT || '').trim();
const TIMEOUT_MS = Number(process.env.WAIT_TIMEOUT_MS || 900000); // 15 min
const POLL_INTERVAL_MS = Number(process.env.WAIT_POLL_INTERVAL_MS || 10000);
const PROBE_TIMEOUT_MS = Number(process.env.WAIT_PROBE_TIMEOUT_MS || 30000);
// How many consecutive good probes mean "settled". Netlify's swap is atomic but
// the first hits afterwards are cold, so one good response isn't proof.
const REQUIRED_STREAK = Number(process.env.WAIT_REQUIRED_STREAK || 3);
// A probe this slow means the function is still cold — it counts as not-ready
// rather than ready, so the streak restarts.
const SLOW_PROBE_MS = Number(process.env.WAIT_SLOW_PROBE_MS || 15000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const short = (sha) => (sha && sha !== 'unknown' ? sha.slice(0, 8) : sha);

async function probe(path) {
  const started = Date.now();
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      redirect: 'follow',
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    const text = await res.text();
    return { status: res.status, ms: Date.now() - started, text };
  } catch (err) {
    return { status: 0, ms: Date.now() - started, error: err.message };
  }
}

// The health endpoint is new; a deployment built before it existed 404s. Fall
// back to probing the login page so this gate still helps on older builds
// instead of blocking forever on a route that will never appear.
async function probeFallback() {
  const res = await probe('/auth/login');
  const ok = res.status >= 200 && res.status < 400 && res.ms < SLOW_PROBE_MS;
  return { ok, commit: 'unknown', detail: `/auth/login -> ${res.status || res.error} in ${res.ms}ms` };
}

async function probeHealth() {
  const res = await probe('/api/health');
  if (res.status === 404) return { missing: true };
  if (res.status !== 200) {
    return { ok: false, commit: null, detail: `/api/health -> ${res.status || res.error} in ${res.ms}ms` };
  }
  let body;
  try {
    body = JSON.parse(res.text);
  } catch {
    return { ok: false, commit: null, detail: `/api/health -> 200 but unparseable body in ${res.ms}ms` };
  }
  const commit = body.commit || 'unknown';
  const fast = res.ms < SLOW_PROBE_MS;
  const matches = !expectCommit || commit === expectCommit;
  return {
    ok: fast && matches,
    commit,
    detail: `/api/health -> 200 in ${res.ms}ms, serving ${short(commit)} (${body.branch || '?'})`
      + (matches ? '' : `, waiting for ${short(expectCommit)}`)
      + (fast ? '' : ', still cold'),
  };
}

async function main() {
  if (!baseUrl) {
    console.error('wait-for-deploy: no BASE_URL given — nothing to wait for.');
    process.exit(1);
  }

  console.log(`Waiting for ${baseUrl} to finish deploying`);
  console.log(
    expectCommit
      ? `  target commit: ${short(expectCommit)} (${expectCommit})`
      : '  target commit: any (no expected commit given — waiting for a steady, responsive build)'
  );
  console.log(`  need ${REQUIRED_STREAK} consecutive good probes, giving up after ${Math.round(TIMEOUT_MS / 60000)} min\n`);

  const deadline = Date.now() + TIMEOUT_MS;
  let streak = 0;
  let lastCommit = null;
  let useFallback = false;

  while (Date.now() < deadline) {
    const result = useFallback ? await probeFallback() : await probeHealth();

    if (result.missing) {
      console.log('  /api/health is not on this deployment yet — falling back to a plain reachability check.');
      useFallback = true;
      continue;
    }

    // A build that doesn't know its own commit can't be matched against the
    // expected one — say so once and fall back instead of burning the timeout.
    if (expectCommit && result.commit === 'unknown') {
      console.log(
        '  this deployment does not report a commit (COMMIT_REF unset at build time) — '
          + 'cannot verify which build is live, waiting for a steady one instead.'
      );
      expectCommit = '';
    }

    // A commit change mid-streak means the swap just happened; start over so we
    // never hand Cypress a deployment that is still moving underneath it.
    if (result.commit && lastCommit && result.commit !== lastCommit) {
      console.log(`  deploy swapped: ${short(lastCommit)} -> ${short(result.commit)} — restarting the streak.`);
      streak = 0;
    }
    lastCommit = result.commit || lastCommit;

    streak = result.ok ? streak + 1 : 0;
    console.log(`  ${result.ok ? 'ok  ' : 'wait'} ${result.detail} [${streak}/${REQUIRED_STREAK}]`);

    if (streak >= REQUIRED_STREAK) {
      console.log(`\nDeployment is ready${lastCommit && lastCommit !== 'unknown' ? ` (serving ${short(lastCommit)})` : ''}.`);
      process.exit(0);
    }

    await sleep(POLL_INTERVAL_MS);
  }

  console.error(
    `\nwait-for-deploy: ${baseUrl} never became ready within ${Math.round(TIMEOUT_MS / 60000)} minutes.`
  );
  if (expectCommit) {
    console.error(
      `Expected commit ${short(expectCommit)}; last seen ${short(lastCommit) || 'nothing'}. `
        + 'Check the Netlify deploy for that commit — a failed or stuck build looks exactly like this.'
    );
  }
  process.exit(1);
}

main().catch((err) => {
  console.error(`wait-for-deploy: ${err.message}`);
  process.exit(1);
});
