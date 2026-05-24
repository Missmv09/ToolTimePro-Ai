// Netlify Scheduled Function: Supabase Keep-Alive
// Runs an actual database query every 3 days to prevent the free-tier project
// from being paused due to inactivity (Supabase pauses after 7 days).
//
// IMPORTANT: Supabase determines inactivity based on real database queries,
// not API-gateway hits. A HEAD request to /rest/v1/ touches PostgREST but
// never executes SQL, so it does NOT reset the pause timer. This function
// performs a lightweight SELECT against a real table to generate genuine
// database activity.
//
// TARGETING: The keep-alive must always hit the PRODUCTION project. It is
// deliberately decoupled from NEXT_PUBLIC_SUPABASE_URL — that var is the
// app's runtime pointer and can drift to a Sandbox project during testing,
// which would let Prod pause while Sandbox stays warm. Set
// SUPABASE_KEEPALIVE_URL / SUPABASE_KEEPALIVE_KEY to pin this to Prod. If
// those are unset it falls back to the NEXT_PUBLIC_* vars for compatibility.

export default async function handler() {
  const supabaseUrl =
    process.env.SUPABASE_KEEPALIVE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_KEEPALIVE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[Supabase Keep-Alive] Missing environment variables');
    return new Response(JSON.stringify({ error: 'Missing Supabase config' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Log which project host is actually being kept alive so the target can be
  // verified from Netlify function logs without guessing.
  let targetHost = supabaseUrl;
  try {
    targetHost = new URL(supabaseUrl).host;
  } catch {
    // keep raw value if it isn't a parseable URL
  }
  const usingDedicatedTarget = Boolean(process.env.SUPABASE_KEEPALIVE_URL);
  console.log(
    `[Supabase Keep-Alive] Target host: ${targetHost} (source: ${
      usingDedicatedTarget ? 'SUPABASE_KEEPALIVE_URL' : 'NEXT_PUBLIC_SUPABASE_URL'
    })`
  );

  try {
    // Lightweight SELECT against a core table. This forces PostgREST to
    // execute real SQL against the database, which counts as activity.
    const response = await fetch(
      `${supabaseUrl}/rest/v1/companies?select=id&limit=1`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const body = await response.text();
      console.error(
        `[Supabase Keep-Alive] Query failed for ${targetHost}: ${response.status} ${body}`
      );
      return new Response(
        JSON.stringify({ error: 'Keep-alive query failed', status: response.status }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(
      `[Supabase Keep-Alive] DB query OK for ${targetHost}: ${response.status}`
    );

    return new Response(
      JSON.stringify({ success: true, status: response.status, host: targetHost }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Supabase Keep-Alive] Error:', error);
    return new Response(JSON.stringify({ error: 'Keep-alive ping failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
