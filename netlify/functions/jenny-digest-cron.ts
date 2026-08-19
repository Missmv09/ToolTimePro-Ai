// Netlify Scheduled Function: Jenny Weekly Digest
// Runs Mondays at 15:00 UTC via netlify.toml schedule (morning across US time zones).
// Emails each company a receipt of what Jenny did autonomously last week.

import { cronAuthHeaders } from '../../src/lib/cron-auth';

export default async function handler() {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:3000';
  const cronSecret = process.env.CRON_SECRET || '';

  try {
    const response = await fetch(`${siteUrl}/api/jenny-digest`, {
      method: 'GET',
      // Both headers carry the same secret — see src/lib/cron-auth.ts.
      headers: cronAuthHeaders(cronSecret),
    });

    const data = await response.json();
    console.log('[Jenny Digest Cron] Results:', JSON.stringify(data));

    return new Response(JSON.stringify({ success: true, ...data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Jenny Digest Cron] Error:', error);
    return new Response(JSON.stringify({ error: 'Cron execution failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
