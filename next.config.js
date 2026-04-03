const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */

// ⚠️  IMPORTANT — READ THIS IF YOU ADD A NEW ENV VAR IN NETLIFY
// ⚠️  Netlify does NOT pass server-side env vars to the function runtime.
// ⚠️  If you add a new env var in Netlify that your API routes need,
// ⚠️  you MUST also add its name to this list, then redeploy.
// ⚠️  (NEXT_PUBLIC_ vars are fine — they don't need to be listed here.)
const serverEnvVars = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'ANTHROPIC_API_KEY',
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

const nextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  webpack(config, { isServer }) {
    if (isServer) {
      const { DefinePlugin } = require('webpack');
      const definitions = {};
      for (const name of serverEnvVars) {
        if (process.env[name]) {
          definitions[`process.env.${name}`] = JSON.stringify(process.env[name]);
        }
      }
      config.plugins.push(new DefinePlugin(definitions));
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};
module.exports = withNextIntl(nextConfig);
