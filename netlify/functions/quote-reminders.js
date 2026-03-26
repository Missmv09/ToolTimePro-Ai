// Netlify Scheduled Function: Daily Quote Follow-Up Reminders
// Runs every day at 8:00 AM Pacific (3:00 PM UTC)
// Calls the /api/quote-reminders endpoint which sends digest emails + SMS

const { schedule } = require('@netlify/functions');

const handler = async () => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.URL || 'https://tooltimepro.com';
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET not configured — skipping quote reminders');
    return { statusCode: 500, body: 'CRON_SECRET not set' };
  }

  try {
    const response = await fetch(`${appUrl}/api/quote-reminders`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
      },
    });

    const result = await response.json();
    console.log('Quote reminders result:', JSON.stringify(result, null, 2));

    return {
      statusCode: response.status,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Quote reminders cron error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// Run daily at 3:00 PM UTC = 8:00 AM Pacific
exports.handler = schedule('0 15 * * *', handler);
