// Netlify Scheduled Function: Daily Trial Reminders
// Runs every day at 9:00 AM Pacific (4:00 PM UTC)
// Calls the /api/trial-reminders endpoint which sends trial lifecycle emails

const { schedule } = require('@netlify/functions');

const handler = async () => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.URL || 'https://tooltimepro.com';
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET not configured — skipping trial reminders');
    return { statusCode: 500, body: 'CRON_SECRET not set' };
  }

  try {
    const response = await fetch(`${appUrl}/api/trial-reminders`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
      },
    });

    const result = await response.json();
    console.log('Trial reminders result:', JSON.stringify(result, null, 2));

    return {
      statusCode: response.status,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Trial reminders cron error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// Run daily at 4:00 PM UTC = 9:00 AM Pacific
exports.handler = schedule('0 16 * * *', handler);
