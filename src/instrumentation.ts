// Next.js instrumentation hook — loads the correct Sentry server/edge config
// for the runtime this process is executing in. Enabled via
// `experimental.instrumentationHook` in next.config.js (required on Next 14).
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

// Captures errors thrown while rendering/serving a request. This hook is only
// invoked on Next.js 15+; on Next 14 it is harmless dead code, ready for when
// the app upgrades.
export const onRequestError = Sentry.captureRequestError;
