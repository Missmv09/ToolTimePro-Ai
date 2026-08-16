// Sentry browser (client) initialization.
//
// This runs in the visitor's browser and captures the errors real users hit —
// the crashes a contractor sees on their phone that you'd otherwise never
// reproduce. It is a NO-OP until NEXT_PUBLIC_SENTRY_DSN is set, so it is safe
// to ship before Sentry is configured. See docs/QA_AUTOMATION_SETUP.md.
//
// NOTE: On Next 14 + webpack this `sentry.client.config.ts` is the correct file
// and Sentry injects it into the client bundle. When this app upgrades to Next
// 15 and/or Turbopack, move this content to `src/instrumentation-client.ts`
// (Sentry prints a deprecation notice about this at build time).
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  // Disabled entirely until a DSN is provided — no network calls, no overhead.
  enabled: Boolean(dsn),
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,

  // Performance tracing. Keep low to control quota; tune via env.
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),

  // Session Replay is opt-in (both default to 0). Set
  // NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE=1 to record a replay of the
  // session whenever an error happens — very useful for a solo team.
  replaysSessionSampleRate: Number(
    process.env.NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE ?? 0,
  ),
  replaysOnErrorSampleRate: Number(
    process.env.NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE ?? 0,
  ),

  debug: false,
});
