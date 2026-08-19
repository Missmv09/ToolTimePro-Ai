// Shared authorization for cron-triggered Netlify functions.
//
// This exists because a whole debugging session was lost to an auth check that
// could only say "no". Three separate failures — the variable not reaching the
// function, the value not matching, and the header never arriving — all printed
// the same line, so there was no way to tell them apart from the log.
//
// It also accepts the secret from a second header. Netlify background functions
// are queued and re-dispatched rather than served inline, and `Authorization`
// is the one header most likely to be consumed or rewritten in transit. Sending
// the same secret under a non-standard name costs nothing and survives that.

export interface CronAuthResult {
  ok: boolean;
  /** Human-readable cause, safe to log. Never contains the secret. */
  reason?: string;
}

/** Header names checked, in order. First one present wins. */
const SECRET_HEADERS = ['authorization', 'x-cron-secret'] as const;

/**
 * Strips a `Bearer ` prefix if present, case-insensitively, and trims.
 * Values pasted into a dashboard routinely carry a trailing newline, and the
 * scheme is capitalized inconsistently across callers.
 */
function normalizeSecret(raw: string): string {
  return stripWrappingQuotes(raw.replace(/^\s*bearer\s+/i, '').trim());
}

/**
 * Removes one matched pair of wrapping quotes.
 *
 * Copying a value out of a JS console yields `'abc'`, quotes included, and
 * pasting that into a dashboard field stores the quotes as part of the secret.
 * They are invisible in a masked input and survive trim(), so the mismatch that
 * follows looks like a wrong secret rather than a wrapped one. Only a matched
 * pair is stripped, so a secret that genuinely contains a quote is untouched.
 */
function stripWrappingQuotes(value: string): string {
  const match = /^(['"`])([\s\S]*)\1$/.exec(value);
  return match ? match[2] : value;
}

/** Describes a value without revealing it: length plus a 4-char prefix. */
function describe(value: string): string {
  if (value.length === 0) return 'empty';
  return `${value.length} chars starting "${value.slice(0, 4)}"`;
}

/**
 * Checks a cron/background function request against CRON_SECRET.
 *
 * Accepts the secret as `Authorization: Bearer <secret>` or as
 * `X-Cron-Secret: <secret>`, with or without the Bearer prefix, and tolerates
 * surrounding whitespace on both the header and the environment variable.
 *
 * On failure `reason` says which of the three distinct problems occurred, using
 * only lengths and 4-character prefixes — these logs are readable by anyone
 * with Netlify access, so the secret itself must never appear in them.
 */
export function authorizeCronRequest(request: Request): CronAuthResult {
  const expected = stripWrappingQuotes((process.env.CRON_SECRET || '').trim());

  if (!expected) {
    return {
      ok: false,
      reason:
        'CRON_SECRET is not visible to this function. The variable is either unset, ' +
        'or its Netlify scopes exclude Functions. Note that saving a variable in the ' +
        'Netlify UI does not affect running functions until the site is redeployed.',
    };
  }

  const present: string[] = [];
  for (const name of SECRET_HEADERS) {
    const raw = request.headers.get(name);
    if (raw === null || raw === '') continue;
    present.push(name);
    if (normalizeSecret(raw) === expected) return { ok: true };
  }

  if (present.length === 0) {
    return {
      ok: false,
      reason:
        `No secret header arrived. Looked for: ${SECRET_HEADERS.join(', ')}. ` +
        `Expected ${describe(expected)}. If the caller did send Authorization, the ` +
        'platform stripped it in transit — use X-Cron-Secret instead.',
    };
  }

  const received = present
    .map((name) => `${name}=${describe(normalizeSecret(request.headers.get(name) || ''))}`)
    .join(', ');

  return {
    ok: false,
    reason: `Secret mismatch. Expected ${describe(expected)}; received ${received}.`,
  };
}

/** Headers a caller should send so the check above passes under either path. */
export function cronAuthHeaders(secret: string): Record<string, string> {
  const clean = stripWrappingQuotes(secret.trim());
  return {
    Authorization: `Bearer ${clean}`,
    'X-Cron-Secret': clean,
  };
}
