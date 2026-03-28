// Netlify Scheduled Function: Workforce Compliance Checks
// Runs every Monday at 7am UTC via netlify.toml schedule
// Covers: cert expiration, insurance expiry, W-9 compliance,
// classification reviews, contract end dates

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
      cert_expiration: data.results?.cert_expiration,
      insurance_expiry: data.results?.insurance_expiry,
      w9_compliance: data.results?.w9_compliance,
      classification_review: data.results?.classification_review,
      contract_end_date: data.results?.contract_end_date,
    };
    console.log('[Workforce Compliance Cron] Results:', JSON.stringify(relevant));

    return new Response(JSON.stringify({ success: true, ...relevant }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Workforce Compliance Cron] Error:', error);
    return new Response(JSON.stringify({ error: 'Cron execution failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const config = {
  schedule: "0 7 * * 1",
};
