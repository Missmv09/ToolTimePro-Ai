import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * Unsubscribe.
 *
 * The consent checkbox on the free tools says "unsubscribe anytime", so this
 * has to exist before anything marketing-flavoured is ever sent — a promise
 * with no mechanism behind it is the thing CAN-SPAM actually penalizes.
 *
 * POST rather than GET on the write: mail clients and security scanners
 * pre-fetch links in email, and a GET that unsubscribes would opt people out
 * who never clicked anything. The page at /u/[token] confirms first.
 */

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Tokens are hex from gen_random_bytes(24) — 48 characters, nothing else. */
const TOKEN_PATTERN = /^[a-f0-9]{48}$/;

export async function POST(request: NextRequest) {
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const token = typeof body.token === 'string' ? body.token.trim().toLowerCase() : '';
  if (!TOKEN_PATTERN.test(token)) {
    return NextResponse.json({ error: 'That unsubscribe link is not valid' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Unsubscribe is not configured' }, { status: 503 });
  }

  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('growth_leads')
      .update({
        marketing_consent: false,
        unsubscribed_at: now,
        status: 'unsubscribed',
      })
      .eq('unsubscribe_token', token)
      .select('id');

    if (error) {
      console.error('[Unsubscribe] Update failed:', error.message);
      return NextResponse.json({ error: 'Could not process that' }, { status: 500 });
    }

    // Report success even for an unknown token. Distinguishing "unsubscribed"
    // from "no such token" would let someone test tokens to learn who is on
    // the list, and the outcome the caller wants — not being emailed — is true
    // either way.
    if (!data?.length) {
      console.warn('[Unsubscribe] Token not found');
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Unsubscribe] Error:', error);
    return NextResponse.json({ error: 'Could not process that' }, { status: 500 });
  }
}
