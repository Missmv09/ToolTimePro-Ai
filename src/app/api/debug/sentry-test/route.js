// TEMPORARY diagnostic route — verifies that Sentry is receiving events in
// production. Visit `/api/debug/sentry-test/?confirm=yes` once, then check the
// Sentry Issues feed for the test event. This route is meant to be REMOVED once
// Sentry is confirmed working.
//
// It reports an error EXPLICITLY via Sentry.captureException + flush (rather
// than throwing) because on Next.js 14 an uncaught throw in an API route is not
// auto-captured — the onRequestError hook is Next 15+. Explicit capture works
// on every runtime. It also requires an explicit `?confirm=yes` query param so
// a stray crawler can never fill the Issues feed with noise.
import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get('confirm') !== 'yes') {
    return NextResponse.json({
      ok: false,
      message:
        'Sentry test route. Add ?confirm=yes to the URL to send a test event to Sentry.',
    });
  }

  const dsnConfigured = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

  const eventId = Sentry.captureException(
    new Error('Sentry test event from /api/debug/sentry-test — safe to ignore'),
  );

  // On serverless, the function can freeze before the event is sent — flush to
  // make sure it actually leaves the process.
  await Sentry.flush(2000);

  return NextResponse.json({
    ok: true,
    dsnConfigured,
    eventId,
    message: dsnConfigured
      ? 'Test event sent to Sentry. Check your Issues feed in ~1 minute. This route is temporary and should be removed.'
      : 'NEXT_PUBLIC_SENTRY_DSN is not set in this environment, so Sentry is disabled here and nothing was sent.',
  });
}
