'use client';

/**
 * Analytics loader.
 *
 * Injects the product analytics provider (PostHog) and reports client-side
 * route changes. Renders nothing and, with no NEXT_PUBLIC_POSTHOG_KEY set,
 * loads nothing at all — so dev, CI, and preview deploys stay clean.
 *
 * We load PostHog's `array.js` directly rather than pasting their minified
 * bootstrap snippet. Same file the snippet fetches, but the initialization
 * stays readable and typed.
 */

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { trackPageview } from '@/lib/analytics';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

interface PostHogInit {
  init?: (key: string, config: Record<string, unknown>) => void;
}

export default function Analytics() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  // Pageviews are driven here rather than by the library (see capture_pageview
  // below), so this fires for the landing page once the provider is ready and
  // for every client-side navigation after that.
  useEffect(() => {
    if (!ready) return;
    trackPageview(pathname);
  }, [pathname, ready]);

  if (!POSTHOG_KEY) return null;

  return (
    <Script
      id="posthog-js"
      src={`${POSTHOG_HOST}/static/array.js`}
      strategy="afterInteractive"
      onLoad={() => {
        try {
          const posthog = window.posthog as (typeof window.posthog & PostHogInit) | undefined;
          posthog?.init?.(POSTHOG_KEY, {
            api_host: POSTHOG_HOST,
            // Pageviews are driven from the router effect above so App Router
            // client-side navigation is counted. The library's own capture is
            // off to avoid double-counting.
            capture_pageview: false,
            // Contractors browse on mobile with content blockers. Keeping the
            // payload small and skipping session recording keeps the free tier
            // viable and the page fast.
            disable_session_recording: true,
            persistence: 'localStorage+cookie',
          });
          setReady(true);
        } catch {
          // A failed analytics init must never surface to the user.
        }
      }}
    />
  );
}
