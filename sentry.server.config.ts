// Sentry Node.js (server) initialization.
//
// Captures unhandled errors thrown inside API routes and server components.
// NO-OP until NEXT_PUBLIC_SENTRY_DSN is set. The DSN is public by design, so we
// reuse the NEXT_PUBLIC_ var and avoid adding a server-only env var to the
// next.config.js `serverEnvVars` DefinePlugin list.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  debug: false,
});
