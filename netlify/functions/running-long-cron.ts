// Netlify Scheduled Function: Job steps running long
// Schedule lives in netlify.toml (every 15 minutes). Tells owners/admins when
// the checklist step a worker is on has run far past its typical time.

import { cronAuthHeaders } from '../../src/lib/cron-auth';

export default async function handler() {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:3000';
  const cronSecret = process.env.CRON_SECRET || '';

  try {
    // Trailing slash: next.config.js has trailingSlash: true, and a 308 would drop the request.
    const response = await fetch(`${siteUrl}/api/crew/running-long/`, {
      method: 'GET',
      headers: cronAuthHeaders(cronSecret),
    });
    const data = await response.json();
    console.log('[Running Long Cron] Results:', JSON.stringify(data));
    return new Response(JSON.stringify({ success: response.ok, ...data }), {
      status: response.ok ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Running Long Cron] Error:', error);
    return new Response(JSON.stringify({ error: 'Cron execution failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
