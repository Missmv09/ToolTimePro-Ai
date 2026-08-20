// Netlify Scheduled Function: Growth Agent — generate trigger
//
// Scheduled functions cap at 30 seconds, which is not enough for an AI call.
// So this does nothing but fire the matching background function (15-minute
// limit) and return. Schedule lives in netlify.toml.
//
// The trigger is deliberately not awaited for a result — background functions
// answer 202 immediately and discard the body. Outcomes land in growth_tasks
// and the background function's own log.

import { cronAuthHeaders } from '../../src/lib/cron-auth';

export default async function handler() {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:8888';
  const cronSecret = process.env.CRON_SECRET || '';

  try {
    const response = await fetch(
      `${siteUrl}/.netlify/functions/growth-agent-generate-background`,
      {
        method: 'POST',
        // Both headers carry the same secret. Authorization is the conventional
        // one; X-Cron-Secret is the one that survives if the platform consumes
        // or rewrites Authorization on its way to a background function.
        headers: cronAuthHeaders(cronSecret),
      }
    );

    console.log(`[Growth Agent generate Cron] Triggered background function: ${response.status}`);

    return new Response(JSON.stringify({ success: true, triggered: response.status }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Growth Agent generate Cron] Trigger failed:', error);
    return new Response(JSON.stringify({ error: 'Trigger failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
