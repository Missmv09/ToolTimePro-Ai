// Netlify Scheduled Function: Supabase Keep-Alive
// Pings the Supabase REST API every 3 days to prevent the free-tier project
// from being paused due to inactivity (Supabase pauses after 7 days).

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
    // Simple health check query against the Supabase REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
    });

    console.log(`[Supabase Keep-Alive] Ping status: ${response.status}`);

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
