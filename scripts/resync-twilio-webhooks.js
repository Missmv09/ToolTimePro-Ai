#!/usr/bin/env node
/**
 * Task Iguana — Twilio number webhook re-sync.
 *
 * The app writes absolute voice/SMS webhook URLs onto each Twilio number at
 * provision time (src/app/api/jenny-pro/provision-number/route.js) and after a
 * port-in completes (src/lib/jenny-twilio-wire.js). Those URLs are NEVER
 * rewritten afterwards, so any number bought/ported before a domain change
 * still POSTs inbound calls/texts to the OLD host (e.g. www.tooltimepro.com)
 * and silently fails.
 *
 * This script sweeps every IncomingPhoneNumber and repoints any Jenny webhook
 * (path /api/jenny-pro/voice or /api/jenny-pro/sms-webhook) whose host does not
 * match the target host, to `${base}/api/jenny-pro/...`. It only touches numbers
 * that already carry a Jenny webhook, so numbers used for anything else are left
 * alone.
 *
 * Target host resolution (same precedence as the app's baseUrl() helper):
 *   PUBLIC_BASE_URL -> URL (Netlify) -> NEXT_PUBLIC_SITE_URL -> https://www.taskiguana.com
 * Override with --base=https://www.taskiguana.com if needed.
 *
 * Modes:
 *   (default)   Audit only — read-only Twilio API calls, prints what WOULD
 *               change, exits 0 if all numbers are already correct, 1 if any
 *               number needs repointing.
 *   --write     Apply the changes (updates voiceUrl / smsUrl on each stale
 *               number).
 *
 * Usage:
 *   TWILIO_ACCOUNT_SID=AC... TWILIO_AUTH_TOKEN=... node scripts/resync-twilio-webhooks.js
 *   TWILIO_ACCOUNT_SID=AC... TWILIO_AUTH_TOKEN=... node scripts/resync-twilio-webhooks.js --write
 *   ... node scripts/resync-twilio-webhooks.js --base=https://www.taskiguana.com --write
 *
 * NOTE: numbers attached to a Messaging Service receive INBOUND SMS via the
 * Messaging Service's own inbound webhook, not the number's smsUrl. This script
 * fixes the number-level smsUrl (used when no Messaging Service is attached),
 * but you must ALSO verify the Messaging Service inbound request URL in the
 * Twilio Console (Messaging > Services > [service] > Integration). Voice has no
 * such indirection — the number's voiceUrl is authoritative.
 */

const twilio = require('twilio');

const VOICE_PATH = '/api/jenny-pro/voice';
const SMS_PATH = '/api/jenny-pro/sms-webhook';

function resolveBase(argv) {
  const flag = argv.find((a) => a.startsWith('--base='));
  const raw =
    (flag && flag.slice('--base='.length)) ||
    process.env.PUBLIC_BASE_URL ||
    process.env.URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://www.taskiguana.com';
  return raw.replace(/\/+$/, '');
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

function pathOf(url) {
  try {
    return new URL(url).pathname.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const write = argv.includes('--write');
  const base = resolveBase(argv);
  const targetHost = hostOf(base);

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    console.error('Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN in env.');
    process.exit(2);
  }
  if (!targetHost) {
    console.error(`Invalid target base URL: "${base}"`);
    process.exit(2);
  }

  const desiredVoice = `${base}${VOICE_PATH}`;
  const desiredSms = `${base}${SMS_PATH}`;

  console.log(`Target host: ${targetHost}  (base ${base})`);
  console.log(`Mode: ${write ? 'WRITE (applying changes)' : 'AUDIT (read-only)'}\n`);

  const client = twilio(sid, token);
  const numbers = await client.incomingPhoneNumbers.list({ limit: 1000 });

  const stale = [];
  for (const n of numbers) {
    // Only consider numbers that already carry a Jenny webhook, so we never
    // clobber numbers configured for something unrelated.
    const isJennyVoice = pathOf(n.voiceUrl) === VOICE_PATH;
    const isJennySms = pathOf(n.smsUrl) === SMS_PATH;
    if (!isJennyVoice && !isJennySms) continue;

    const update = {};
    if (isJennyVoice && hostOf(n.voiceUrl) !== targetHost) update.voiceUrl = desiredVoice;
    if (isJennySms && hostOf(n.smsUrl) !== targetHost) update.smsUrl = desiredSms;
    if (Object.keys(update).length === 0) continue;

    stale.push({ n, update });
    console.log(`${n.phoneNumber}  (${n.friendlyName || 'no name'})`);
    if (update.voiceUrl) console.log(`   voice: ${n.voiceUrl}  ->  ${update.voiceUrl}`);
    if (update.smsUrl) console.log(`   sms:   ${n.smsUrl}  ->  ${update.smsUrl}`);
  }

  if (stale.length === 0) {
    console.log('All Jenny webhooks already point at the target host. Nothing to do.');
    process.exit(0);
  }

  console.log(`\n${stale.length} number(s) need repointing.`);

  if (!write) {
    console.log('Re-run with --write to apply these changes.');
    process.exit(1);
  }

  let failed = 0;
  for (const { n, update } of stale) {
    try {
      await client.incomingPhoneNumbers(n.sid).update(update);
      console.log(`Updated ${n.phoneNumber}`);
    } catch (err) {
      failed += 1;
      console.error(`FAILED ${n.phoneNumber}: ${err && err.message ? err.message : err}`);
    }
  }

  console.log(
    `\nDone. ${stale.length - failed} updated, ${failed} failed.` +
      '\nReminder: also verify the Messaging Service inbound request URL in the Twilio Console.'
  );
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
