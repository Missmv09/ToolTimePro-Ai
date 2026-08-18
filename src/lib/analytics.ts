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
 * Attribution capture.
 *
 * Two problems this solves, both of which lose data if ignored:
 *
 * 1. Ad and campaign parameters exist in the URL only on the landing page.
 *    Someone arrives on /tools/final-wage?gclid=... , reads it, wanders to
 *    /tools/calculator, and submits there — by then window.location.search is
 *    empty and the click is untraceable. So we persist on first sight and read
 *    from storage at submit time.
 *
 * 2. The analytics provider may never load (ad blockers are common in this
 *    audience). Attribution therefore lives in our own storage and is posted to
 *    our own endpoint, independent of PostHog entirely.
 *
 * First-touch vs last-click: campaign parameters keep the FIRST values seen,
 * matching the first-touch semantics of growth_leads.source. Click IDs keep the
 * MOST RECENT, because Google attributes a conversion to the last ad click and
 * expects that click's ID on upload. The two systems want different answers and
 * both are correct for their purpose.
 */

/** Matches Google's default 90-day click attribution window. */
const ATTRIBUTION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const CAMPAIGN_STORAGE_KEY = 'ti_attribution';
const CLICK_ID_STORAGE_KEY = 'ti_click_id';

/**
 * Ad platform click identifiers, in priority order.
 *
 * Google requires exactly one of these on an uploaded conversion — gclid for
 * ordinary web clicks, gbraid for iOS app-to-web, wbraid for iOS web-to-web.
 * They are mutually exclusive in practice; the order here decides the winner
 * in the event a URL somehow carries more than one.
 */
export const CLICK_ID_PARAMS = ['gclid', 'gbraid', 'wbraid'] as const;

export type ClickIdType = (typeof CLICK_ID_PARAMS)[number];

export interface StoredClickId {
  type: ClickIdType;
  value: string;
  at: number;
}

export interface AttributionParams {
  landingPage?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
}

interface StoredCampaign {
  at: number;
  landingPage?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

function readStorage<T>(key: string): T | null {
  try {
    // localStorage throws in Safari private mode and when cookies are blocked.
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T & { at?: number };
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.at !== 'number' || Date.now() - parsed.at > ATTRIBUTION_TTL_MS) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable or full. Attribution degrades to same-page-only,
    // which is strictly better than throwing on a page the user is reading.
  }
}

/** The click ID present in the current URL, if any. */
function clickIdFromUrl(params: URLSearchParams): StoredClickId | null {
  for (const type of CLICK_ID_PARAMS) {
    const value = params.get(type)?.trim();
    if (value) return { type, value, at: Date.now() };
  }
  return null;
}

/**
 * Persist campaign parameters and click IDs from the current URL.
 *
 * Safe to call on every route change — it only writes when there is something
 * new worth keeping. Must run regardless of whether the analytics provider is
 * configured, since a conversion that can't be attributed is wasted ad spend
 * whether or not PostHog is switched on.
 */
export function captureAttribution(): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);

    // Click IDs: newest wins, because Google attributes to the last click.
    const clickId = clickIdFromUrl(params);
    if (clickId) {
      writeStorage(CLICK_ID_STORAGE_KEY, clickId);
    }

    // Campaign parameters: first touch wins, so never overwrite.
    if (readStorage<StoredCampaign>(CAMPAIGN_STORAGE_KEY)) return;

    const value = (key: string) => params.get(key)?.trim() || undefined;
    const utmSource = value('utm_source');
    const referrer =
      document.referrer && !document.referrer.startsWith(window.location.origin)
        ? document.referrer
        : undefined;

    // Nothing worth recording on a direct visit with no referrer — storing an
    // empty first touch would lock out a real one arriving later.
    if (!utmSource && !referrer && !clickId) return;

    writeStorage(CAMPAIGN_STORAGE_KEY, {
      at: Date.now(),
      landingPage: window.location.pathname,
      referrer,
      utmSource,
      utmMedium: value('utm_medium'),
      utmCampaign: value('utm_campaign'),
      utmTerm: value('utm_term'),
      utmContent: value('utm_content'),
    } satisfies StoredCampaign);
  } catch (error) {
    onError('captureAttribution', error);
  }
}

/**
 * Everything known about how this visitor arrived, for submission with a lead.
 *
 * Merges the stored first touch with the current URL, so it works whether the
 * visitor submits on the page they landed on or three pages later.
 */
export function readAttribution(): AttributionParams {
  if (typeof window === 'undefined') return {};
  try {
    // Pick up anything in the current URL that hasn't been stored yet.
    captureAttribution();

    const params = new URLSearchParams(window.location.search);
    const stored = readStorage<StoredCampaign>(CAMPAIGN_STORAGE_KEY);
    const current = (key: string) => params.get(key)?.trim() || undefined;

    const attribution: AttributionParams = {
      // The landing page is where the visit started, not where they submitted.
      landingPage: stored?.landingPage || window.location.pathname,
      referrer:
        stored?.referrer ||
        (document.referrer && !document.referrer.startsWith(window.location.origin)
          ? document.referrer
          : undefined),
      utmSource: stored?.utmSource || current('utm_source'),
      utmMedium: stored?.utmMedium || current('utm_medium'),
      utmCampaign: stored?.utmCampaign || current('utm_campaign'),
      utmTerm: stored?.utmTerm || current('utm_term'),
      utmContent: stored?.utmContent || current('utm_content'),
    };

    const clickId = readStorage<StoredClickId>(CLICK_ID_STORAGE_KEY);
    if (clickId) {
      attribution[clickId.type] = clickId.value;
    }

    return attribution;
  } catch (error) {
    onError('readAttribution', error);
    return {};
  }
}
