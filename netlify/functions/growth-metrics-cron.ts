// Netlify Scheduled Function: Growth Funnel Snapshot
// Runs daily at 5am UTC via netlify.toml schedule
// Calls the internal API route which computes and upserts the day's row
// in growth_metrics_daily.

export default async function handler() {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:3000';
  const cronSecret = process.env.CRON_SECRET || '';

  try {
    const response = await fetch(`${siteUrl}/api/growth/metrics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
      },
    });

    const data = await response.json();
    console.log('[Growth Metrics Cron] Results:', JSON.stringify(data));

    return new Response(JSON.stringify({ success: true, ...data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Growth Metrics Cron] Error:', error);
    return new Response(JSON.stringify({ error: 'Cron execution failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
