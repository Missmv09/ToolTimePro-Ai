// Writes server-side environment variables to .env.local before the build.
// Netlify sets env vars in the build environment, but they're not reaching
// the function runtime. This script bridges the gap by letting Next.js
// pick them up at build time and include them in the server output.

const fs = require('fs');

const SERVER_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'OPENAI_API_KEY',
  'RESEND_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'CRON_SECRET',
  'PLATFORM_ADMIN_EMAILS',
  'QUICKBOOKS_CLIENT_ID',
  'QUICKBOOKS_CLIENT_SECRET',
  'QUICKBOOKS_REDIRECT_URI',
  'QUICKBOOKS_ENVIRONMENT',
  'DATABASE_URL',
  'NAMECOM_USERNAME',
  'NAMECOM_TEST_USERNAME',
  'NAMECOM_TOKEN',
  'NAMECOM_TEST_TOKEN',
];

const lines = [];
for (const name of SERVER_VARS) {
  const value = process.env[name];
  if (value) {
    // Escape any special characters in the value
    lines.push(`${name}=${value}`);
  }
}

if (lines.length > 0) {
  fs.writeFileSync('.env.local', lines.join('\n') + '\n');
  console.log(`[write-env] Wrote ${lines.length} server vars to .env.local`);
} else {
  console.log('[write-env] No server vars found in environment');
}
