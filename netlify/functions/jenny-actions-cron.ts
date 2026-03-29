// Netlify Scheduled Function: Jenny Autonomous Actions
// Runs every 15 minutes via netlify.toml schedule
// Calls the internal API route which handles all action logic

export default async function handler() {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:3000';
  const cronSecret = process.env.CRON_SECRET || '';

  try {
    const response = await fetch(`${siteUrl}/api/jenny-actions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
      },
    });

    const data = await response.json();
    console.log('[Jenny Cron] Results:', JSON.stringify(data));

    return new Response(JSON.stringify({ success: true, ...data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Jenny Cron] Error:', error);
    return new Response(JSON.stringify({ error: 'Cron execution failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
