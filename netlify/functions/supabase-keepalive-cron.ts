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
//   - Sandbox: SUPABASE_SANDBOX_URL / SUPABASE_SANDBOX_KEY (optional — the
//     sandbox target is simply skipped if these are unset).

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
};

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
      const body = await response.text();
      console.error(
        `[Supabase Keep-Alive] Query failed for ${target.label} (${host}): ${response.status} ${body}`
      );
      return { label: target.label, host, ok: false, status: response.status };
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

export default async function handler() {
  const targets: Target[] = [];

  // Production target (dedicated vars preferred, NEXT_PUBLIC_* fallback).
  const prodUrl =
    process.env.SUPABASE_KEEPALIVE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const prodKey =
    process.env.SUPABASE_KEEPALIVE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (prodUrl && prodKey) {
    targets.push({
      label: 'production',
      url: prodUrl,
      key: prodKey,
      source: process.env.SUPABASE_KEEPALIVE_URL
        ? 'SUPABASE_KEEPALIVE_URL'
        : 'NEXT_PUBLIC_SUPABASE_URL',
    });
  }

  // Sandbox target (optional).
  const sandboxUrl = process.env.SUPABASE_SANDBOX_URL;
  const sandboxKey = process.env.SUPABASE_SANDBOX_KEY;
  if (sandboxUrl && sandboxKey) {
    targets.push({
      label: 'sandbox',
      url: sandboxUrl,
      key: sandboxKey,
      source: 'SUPABASE_SANDBOX_URL',
    });
  }

  if (targets.length === 0) {
    console.error('[Supabase Keep-Alive] No targets configured');
    return new Response(
      JSON.stringify({ error: 'Missing Supabase config' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const results = await Promise.all(targets.map(pingTarget));
  const allOk = results.every((r) => r.ok);

  return new Response(
    JSON.stringify({ success: allOk, results }),
    {
      // 502 if any target failed so the failure surfaces in Netlify logs,
      // but all targets are always attempted regardless of one another.
      status: allOk ? 200 : 502,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
