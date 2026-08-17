/**
 * Product analytics — provider-agnostic wrapper.
 *
 * Everything the app calls goes through `trackEvent` / `trackPageview`, so the
 * underlying provider is a single-file swap. Today that provider is PostHog,
 * loaded by src/components/Analytics.tsx only when NEXT_PUBLIC_POSTHOG_KEY is
 * set. With no key configured every function here is a no-op, which keeps local
 * dev, CI, and preview deploys free of analytics noise.
 *
 * Two rules this module enforces:
 *   1. Never throw. A broken analytics call must not break a page. Every entry
 *      point is wrapped, and failures are swallowed (logged in dev only).
 *   2. Never send PII. Emails go to growth_leads via the server, not to the
 *      analytics provider. Events carry categorical properties only.
 */

/** Event names. Centralized so the Phase 1 planner queries known strings. */
export const GROWTH_EVENTS = {
  // Free tools — the top of the funnel
  TOOL_VIEWED: 'tool_viewed',
  TOOL_COMPLETED: 'tool_completed',
  LEAD_FORM_VIEWED: 'lead_form_viewed',
  LEAD_CAPTURED: 'lead_captured',
  // Commercial intent
  PRICING_VIEWED: 'pricing_viewed',
  COMPARE_VIEWED: 'compare_viewed',
  DEMO_VIEWED: 'demo_viewed',
  SIGNUP_STARTED: 'signup_started',
} as const;

export type GrowthEvent = (typeof GROWTH_EVENTS)[keyof typeof GROWTH_EVENTS];

export type EventProperties = Record<string, string | number | boolean | null | undefined>;

/** Minimal shape of the provider we depend on, so we aren't tied to its types. */
interface AnalyticsProvider {
  capture: (event: string, properties?: EventProperties) => void;
  reset?: () => void;
}

declare global {
  interface Window {
    posthog?: AnalyticsProvider;
  }
}

/** True when a provider key is configured. Safe to call on the server. */
export function isAnalyticsEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

function getProvider(): AnalyticsProvider | null {
  if (typeof window === 'undefined') return null;
  const provider = window.posthog;
  // The snippet stubs methods before the library loads, so a present-but-not-
  // ready provider still queues calls correctly. We only need `capture`.
  return provider && typeof provider.capture === 'function' ? provider : null;
}

function onError(context: string, error: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[analytics] ${context} failed:`, error);
  }
}

/**
 * Record an event. No-ops when analytics is disabled or the provider hasn't
 * loaded (ad blockers are common in this audience — contractors browsing on
 * mobile with content blockers are a real slice of traffic).
 */
export function trackEvent(event: GrowthEvent | string, properties?: EventProperties): void {
  try {
    const provider = getProvider();
    if (!provider) return;
    provider.capture(event, properties);
  } catch (error) {
    onError(`trackEvent(${event})`, error);
  }
}

/**
 * Record a pageview. PostHog's snippet captures the initial load itself; this
 * exists for client-side route changes, which it does not see by default.
 */
export function trackPageview(path: string): void {
  try {
    const provider = getProvider();
    if (!provider) return;
    provider.capture('$pageview', { $current_path: path });
  } catch (error) {
    onError('trackPageview', error);
  }
}

/**
 * Read UTM parameters and referrer from the current browser location.
 *
 * Used by the lead capture form so first-touch attribution is recorded against
 * the lead row server-side, independent of whether the analytics provider
 * loaded at all. That independence is the point: attribution has to survive an
 * ad blocker, because the growth agent's decisions depend on it.
 */
export interface AttributionParams {
  landingPage?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export function readAttribution(): AttributionParams {
  if (typeof window === 'undefined') return {};
  try {
    const params = new URLSearchParams(window.location.search);
    const value = (key: string) => params.get(key) || undefined;
    return {
      landingPage: window.location.pathname,
      // Same-origin referrers are internal navigation, not acquisition.
      referrer: document.referrer && !document.referrer.startsWith(window.location.origin)
        ? document.referrer
        : undefined,
      utmSource: value('utm_source'),
      utmMedium: value('utm_medium'),
      utmCampaign: value('utm_campaign'),
      utmTerm: value('utm_term'),
      utmContent: value('utm_content'),
    };
  } catch (error) {
    onError('readAttribution', error);
    return {};
  }
}
