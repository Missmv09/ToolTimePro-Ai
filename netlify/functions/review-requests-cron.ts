// Netlify Scheduled Function: Review Request Dispatcher
// Runs every 15 minutes via netlify.toml schedule.
// Queues review requests for newly completed jobs and sends every pending
// request (payment- or completion-triggered) whose delay has elapsed.

export default async function handler() {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:3000';
  const cronSecret = process.env.CRON_SECRET || '';

  try {
    const response = await fetch(`${siteUrl}/api/reviews/dispatch`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        'X-Cron-Secret': cronSecret,
      },
    });
    const data = await response.json();
    console.log('[Review Requests Cron] Results:', JSON.stringify(data));

    return new Response(JSON.stringify({ success: true, ...data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Review Requests Cron] Error:', error);
    return new Response(JSON.stringify({ error: 'Cron execution failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
