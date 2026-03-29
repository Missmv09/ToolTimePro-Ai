// Netlify Scheduled Function: Daily Business Checks
// Runs every day at 7am UTC via netlify.toml schedule
// Covers: quote expiration, contractor payments, compliance escalation,
// review requests

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
    const relevant = {
      quote_expiration: data.results?.quote_expiration,
      contractor_payment: data.results?.contractor_payment,
      compliance_escalation: data.results?.compliance_escalation,
      review_request: data.results?.review_request,
    };
    console.log('[Daily Business Cron] Results:', JSON.stringify(relevant));

    return new Response(JSON.stringify({ success: true, ...relevant }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Daily Business Cron] Error:', error);
    return new Response(JSON.stringify({ error: 'Cron execution failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
