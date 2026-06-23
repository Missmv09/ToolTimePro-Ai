// Netlify Scheduled Function: Appointment Reminders + Post-Job Follow-ups
// Runs hourly via netlify.toml schedule. Sends:
//  - reminder texts the day before a scheduled job
//  - a thank-you + review-request text after a job is completed
// The route only sends once per job and only to SMS-consented customers.

export default async function handler() {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:3000';
  const cronSecret = process.env.CRON_SECRET || '';

  try {
    const response = await fetch(`${siteUrl}/api/jenny-pro/reminders`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    const data = await response.json();
    console.log('[Appointment Reminders Cron] Results:', JSON.stringify(data));

    return new Response(JSON.stringify({ success: true, ...data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Appointment Reminders Cron] Error:', error);
    return new Response(JSON.stringify({ error: 'Cron execution failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
