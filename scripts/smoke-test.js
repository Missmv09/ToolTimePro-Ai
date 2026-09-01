#!/usr/bin/env node
/**
 * Post-deploy smoke test.
 *
 * Hits the diagnostic health endpoint plus every critical public page against a
 * running deployment and asserts each responds without an error status. This is
 * the fast, browser-less first line of defence after a deploy — run it against
 * the sandbox URL before promoting `sandbox -> main`, and against prod after a
 * release.
 *
 * Usage:
 *   node scripts/smoke-test.js [baseUrl]
 *   SMOKE_BASE_URL=https://sandbox--<site>.netlify.app node scripts/smoke-test.js
 *   HEALTH_CHECK_TOKEN=… node scripts/smoke-test.js https://www.taskiguana.com
 *
 * Resolution order for the base URL: CLI arg > SMOKE_BASE_URL env > localhost.
 *
 * Exit code is 0 only if every check passes, so it doubles as a CI gate.
 */

const baseUrl = (process.argv[2] || process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const healthToken = process.env.HEALTH_CHECK_TOKEN || '';
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 30000);
const CONCURRENCY = Number(process.env.SMOKE_CONCURRENCY || 4);
// Netlify serverless cold-starts the first hit to a heavy page, which can blow
// past the timeout or reset the connection. Retry a failed check (the function
// is warm by then) before declaring it down, backing off between attempts —
// a fixed 1.5s retry just lands in the same cold start that failed the first.
const MAX_ATTEMPTS = Number(process.env.SMOKE_MAX_ATTEMPTS || 3);
const RETRY_DELAY_MS = Number(process.env.SMOKE_RETRY_DELAY_MS || 3000);
// How long to let the very first request take before giving up on warming.
const WARMUP_BUDGET_MS = Number(process.env.SMOKE_WARMUP_BUDGET_MS || 90000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Public routes that must render for prospects and trial users. None of these
// require auth or seeded data — auth'd flows (dashboard, real booking,
// quote->invoice creation) need a human or a seeded test account and are not
// covered here.
const PAGES = [
  // Marketing + conversion
  '/',
  '/pricing',
  '/jenny',
  '/sms',
  '/blog',
  '/industries',
  '/privacy',
  '/terms',
  // Competitor comparison (SEO)
  '/compare',
  '/compare/jobber',
  '/compare/housecall-pro',
  // Free tools (lead magnets)
  '/tools',
  '/tools/calculator',
  '/tools/classification',
  '/tools/checklist',
  '/tools/final-wage',
  // Auth entry points
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  // Self-contained product demos (no backend)
  '/demo/booking',
  '/demo/dashboard',
  '/demo/invoicing',
  '/demo/estimator',
  '/demo/reviews',
  '/demo/scheduling',
  // Customer-facing quote (built-in demo record)
  '/quote/demo',
];

// Netlify serves this API route from a DIFFERENT lambda than the page handler
// above, so warming a page does nothing for it — see warmUp().
const HEALTH_PATH = '/api/website-builder/health';

// The Smoke workflow warms every one of these before Cypress runs. It shells
// out to `--list-paths` rather than keeping its own copy, so the warm-up cannot
// silently drift out of step with what we actually check.
if (process.argv.includes('--list-paths')) {
  for (const p of PAGES) console.log(p);
  process.exit(0);
}

function color(code, s) {
  return process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s;
}
const green = (s) => color('32', s);
const red = (s) => color('31', s);
const yellow = (s) => color('33', s);
const dim = (s) => color('2', s);

// undici reports every socket-level failure as the bare string "fetch failed"
// and hides the real reason (ECONNRESET, ETIMEDOUT, DNS) on `err.cause`. Walk
// the cause chain so a red run names its own cause instead of costing a
// debugging round to reproduce.
function describeError(err) {
  const parts = [];
  let e = err;
  const seen = new Set();
  while (e && !seen.has(e)) {
    seen.add(e);
    const code = e.code ? ` (${e.code})` : '';
    const text = `${e.message || e}${code}`;
    if (!parts.includes(text)) parts.push(text);
    e = e.cause;
  }
  return parts.join(' ← ');
}

async function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal, redirect: 'follow', ...opts });
  } finally {
    clearTimeout(timer);
  }
}

async function checkPage(path, attempt = 1) {
  const url = `${baseUrl}${path}`;
  const started = Date.now();
  try {
    const res = await fetchWithTimeout(url);
    const ms = Date.now() - started;
    // A page is healthy if it returns a non-error status after following
    // redirects (locale proxy may 307 before settling on 200).
    const ok = res.status >= 200 && res.status < 400;
    if (!ok && attempt < MAX_ATTEMPTS) {
      await sleep(RETRY_DELAY_MS * attempt);
      return checkPage(path, attempt + 1);
    }
    return { path, ok, status: res.status, ms, attempt };
  } catch (err) {
    // Cold start / transient reset — retry once against the now-warm function.
    if (attempt < MAX_ATTEMPTS) {
      await sleep(RETRY_DELAY_MS * attempt);
      return checkPage(path, attempt + 1);
    }
    return { path, ok: false, status: 'ERR', ms: Date.now() - started, error: describeError(err), attempt };
  }
}

// Netlify serves every page in PAGES from a SINGLE Next.js handler function, so
// the very first request to a cold deploy pays the whole container boot and the
// rest are free. Firing four of them at once (CONCURRENCY) means four requests
// race that boot and some lose: the handler answers ECONNRESET, or nothing at
// all until the 30s timeout aborts it.
//
// That is not a hypothesis. Every failure this script has ever reported sits in
// the first concurrent batch — PAGES[0..3], `/` `/pricing` `/jenny` `/sms` —
// and nothing past index 3 has ever failed:
//   run 83  `/`               ECONNRESET after 7.6s   (while /pricing passed at 8.4s)
//   run 80  `/jenny` `/sms`   aborted at the 30s timeout
//   run 75  `/sms`            fetch failed
// The per-check retry did not save them because it fired 1.5s later, still
// inside the same cold start.
//
// So serialise one request before the pool and let it take as long as it needs.
// This CANNOT hide a broken deployment: the result is reported, never asserted,
// and every path is still checked for real afterwards — a page that 500s warms
// the handler and then fails its own check exactly as before. All it removes is
// the race.
//
// Warm BOTH lambdas. Netlify splits the Next.js app across more than one
// function, and `/api/*` is not the one that serves pages — so warming `/`
// leaves the health route as cold as if nothing had run. Run #84 is the proof:
// warm-up got `/` in 2747ms, every page then passed, and the health probe --
// the first and only request to touch the API lambda -- still burned 7004ms
// and died on ECONNRESET. Two lambdas, two warm-ups.
async function warmOne(path, deadline) {
  const started = Date.now();
  let attempt = 0;
  let lastError = null;
  while (Date.now() < deadline) {
    attempt++;
    try {
      // Any answer means the container booted. 401/503 warm it exactly as well
      // as 200 does, so this deliberately does not care about the status — the
      // real check afterwards is what judges it.
      const res = await fetchWithTimeout(`${baseUrl}${path}`);
      return { path, ok: true, status: res.status, ms: Date.now() - started, attempt };
    } catch (err) {
      lastError = describeError(err);
      if (Date.now() >= deadline) break;
      await sleep(RETRY_DELAY_MS);
    }
  }
  return { path, ok: false, status: 'ERR', ms: Date.now() - started, attempt, error: lastError };
}

async function warmUp() {
  const deadline = Date.now() + WARMUP_BUDGET_MS;
  // Deliberately token-less: this only needs to boot the lambda, and a warm-up
  // must never be the thing that leaks the token into a log line.
  return [await warmOne('/', deadline), await warmOne(HEALTH_PATH, deadline)];
}

// This check gets the same retry budget as checkPage. It did not, originally,
// and that was the whole of run #84: the pages all passed (four of them only on
// attempt 2) while the health probe took the first, coldest hit at 7004ms and
// died on ECONNRESET with no second attempt to fall back on. One unprotected
// path was enough to fail the job.
async function checkHealth(attempt = 1) {
  if (!healthToken) {
    return {
      path: HEALTH_PATH,
      skipped: true,
      note: 'HEALTH_CHECK_TOKEN not set — skipping DB/env diagnostic.',
    };
  }
  const url = `${baseUrl}${HEALTH_PATH}?token=${encodeURIComponent(healthToken)}`;
  const started = Date.now();
  const retry = async () => {
    await sleep(RETRY_DELAY_MS * attempt);
    return checkHealth(attempt + 1);
  };
  try {
    const res = await fetchWithTimeout(url);
    const ms = Date.now() - started;
    let body = null;
    try { body = await res.json(); } catch { /* non-JSON */ }
    const ok = res.status === 200 && body && body.ok === true;
    // Retry only what a cold start can explain. A 401 (token mismatch) or a 503
    // (env var absent) is a settled configuration answer — retrying it just
    // burns 9s to print the same thing, and the report should say it plainly.
    const transient = res.status >= 500 && res.status !== 503;
    if (!ok && transient && attempt < MAX_ATTEMPTS) return retry();
    return {
      path: HEALTH_PATH,
      ok,
      status: res.status,
      ms,
      attempt,
      diagnoses: body && Array.isArray(body.diagnoses) ? body.diagnoses : null,
    };
  } catch (err) {
    if (attempt < MAX_ATTEMPTS) return retry();
    return { path: HEALTH_PATH, ok: false, status: 'ERR', ms: Date.now() - started, error: describeError(err), attempt };
  }
}

// Simple promise pool so we don't open dozens of sockets at once.
async function pool(items, worker, size) {
  const results = [];
  let i = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx]);
    }
  });
  await Promise.all(runners);
  return results;
}

function row(label, result) {
  const ms = result.ms != null ? dim(`${result.ms}ms`) : '';
  if (result.skipped) {
    console.log(`${yellow('○ SKIP')}  ${label.padEnd(34)} ${dim(result.note)}`);
    return;
  }
  const tag = result.ok ? green('✓ PASS') : red('✗ FAIL');
  const status = result.ok ? dim(String(result.status)) : red(String(result.status));
  // A page that only passed on retry is one cold start away from going red.
  // Say so, rather than logging an unqualified PASS that hides the warning.
  const retried = result.attempt > 1 ? yellow(`  (attempt ${result.attempt})`) : '';
  console.log(`${tag}  ${label.padEnd(34)} ${status} ${ms}${retried}${result.error ? '  ' + red(result.error) : ''}`);
  if (result.diagnoses && (!result.ok || result.diagnoses[0] !== 'All checks passed.')) {
    for (const d of result.diagnoses) console.log(`        ${red('↳')} ${d}`);
  }
}

(async () => {
  console.log(`\nSmoke testing ${color('1', baseUrl)}\n`);

  console.log(dim('— Warm-up —'));
  for (const w of await warmUp()) {
    if (w.ok) {
      console.log(dim(`  GET ${w.path.padEnd(32)} -> ${w.status} in ${w.ms}ms (attempt ${w.attempt})`));
    } else {
      console.log(yellow(`  GET ${w.path.padEnd(32)} -> no answer in ${w.ms}ms across ${w.attempt} attempt(s): ${w.error}`));
      console.log(yellow('  Proceeding anyway — the checks below decide whether the deployment is actually down.'));
    }
  }
  console.log('');

  console.log(dim('— Health / environment —'));
  const health = await checkHealth();
  row('GET /api/website-builder/health', health);

  console.log(dim('\n— Public pages —'));
  const pageResults = await pool(PAGES, checkPage, CONCURRENCY);
  for (const r of pageResults) row(`GET ${r.path}`, r);

  const failures = [health, ...pageResults].filter((r) => !r.skipped && !r.ok);
  const skipped = [health].filter((r) => r.skipped).length;
  const total = pageResults.length + 1 - skipped;
  const passed = total - failures.length;

  console.log('');
  if (failures.length === 0) {
    console.log(green(`✓ ${passed}/${total} checks passed`) + (skipped ? dim(` (${skipped} skipped)`) : ''));
    process.exit(0);
  } else {
    console.log(red(`✗ ${failures.length} of ${total} checks failed:`));
    for (const f of failures) console.log(red(`    ${f.path} → ${f.status}${f.error ? ' (' + f.error + ')' : ''}`));
    process.exit(1);
  }
})();
