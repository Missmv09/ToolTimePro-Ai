// Sentry browser (client) initialization — runs in the visitor's browser and
// captures the errors real users hit (the crashes a contractor sees on their
// phone that you'd otherwise never reproduce). NO-OP until
// NEXT_PUBLIC_SENTRY_DSN is set, so it is safe to ship before Sentry is
// configured. See docs/QA_AUTOMATION_SETUP.md.
//
// This is the Next 15.3+/16 location (`src/instrumentation-client.ts`), which
// works under both webpack and Turbopack (Next 16's default bundler). It
// replaces the old `sentry.client.config.ts`, which Sentry deprecated for
// Turbopack.
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

// Instruments client-side App Router navigations for tracing (Next 15.3+).
// Harmless when tracing/DSN is disabled.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
