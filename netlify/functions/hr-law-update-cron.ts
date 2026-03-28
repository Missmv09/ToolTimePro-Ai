// Netlify Scheduled Function: HR Law Update Check
// Runs every Monday at 8am UTC via netlify.toml schedule
// Calls the internal API route which checks state compliance rule freshness

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
    console.log('[HR Law Update Cron] Results:', JSON.stringify(data));

    return new Response(JSON.stringify({ success: true, hr_law_update: data.results?.hr_law_update }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[HR Law Update Cron] Error:', error);
    return new Response(JSON.stringify({ error: 'Cron execution failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const config = {
  schedule: "0 8 * * 1",
};
