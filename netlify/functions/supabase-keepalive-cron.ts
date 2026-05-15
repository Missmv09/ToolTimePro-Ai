// Netlify Scheduled Function: Supabase Keep-Alive
// Runs an actual database query every 3 days to prevent the free-tier project
// from being paused due to inactivity (Supabase pauses after 7 days).
//
// IMPORTANT: Supabase determines inactivity based on real database queries,
// not API-gateway hits. A HEAD request to /rest/v1/ touches PostgREST but
// never executes SQL, so it does NOT reset the pause timer. This function
// performs a lightweight SELECT against a real table to generate genuine
// database activity.

export default async function handler() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase Keep-Alive] Missing environment variables');
    return new Response(JSON.stringify({ error: 'Missing Supabase config' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Lightweight SELECT against a core table. This forces PostgREST to
    // execute real SQL against the database, which counts as activity.
    const response = await fetch(
      `${supabaseUrl}/rest/v1/companies?select=id&limit=1`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const body = await response.text();
      console.error(
        `[Supabase Keep-Alive] Query failed: ${response.status} ${body}`
      );
      return new Response(
        JSON.stringify({ error: 'Keep-alive query failed', status: response.status }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Supabase Keep-Alive] DB query OK: ${response.status}`);

    return new Response(JSON.stringify({ success: true, status: response.status }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Supabase Keep-Alive] Error:', error);
    return new Response(JSON.stringify({ error: 'Keep-alive ping failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
