'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const SESSION_KEY = 'ttp_session_id';
const CHECK_INTERVAL_MS = 30_000; // Check every 30 seconds

/**
 * Generates a random session ID and stores it in localStorage.
 * Returns the new ID.
 */
export function generateSessionId(): string {
  const id = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, id);
  return id;
}

/**
 * Returns the current session ID from localStorage (or null).
 */
export function getSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

/**
 * Registers the current session ID with the server.
 * Call this immediately after login or signup verification.
 */
export async function registerSession(): Promise<void> {
  const sid = generateSessionId();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    await fetch('/api/auth/session-guard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ sessionId: sid }),
    });
  } catch {
    // Non-critical — don't block the login flow
  }
}

/**
 * Hook: periodically validates that this browser still holds the active
 * session. If another device has logged in, calls `onKicked`.
 */
export function useSessionGuard({
  enabled,
  onKicked,
}: {
  enabled: boolean;
  onKicked: () => void;
}) {
  const onKickedRef = useRef(onKicked);
  onKickedRef.current = onKicked;

  const validate = useCallback(async () => {
    const sid = getSessionId();
    if (!sid) return; // No session to validate yet

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(
        `/api/auth/session-guard?sid=${encodeURIComponent(sid)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      if (res.ok) {
        const { valid } = await res.json();
        if (valid === false) {
          onKickedRef.current();
        }
      }
    } catch {
      // Network error — don't kick the user
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Run first check after a short delay (let the page settle)
    const initialTimeout = setTimeout(validate, 5_000);

    // Then check periodically
    const interval = setInterval(validate, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [enabled, validate]);
}
