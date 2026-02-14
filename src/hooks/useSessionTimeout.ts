'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Default: 30 minutes of inactivity before logout
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
// Show warning 5 minutes before logout
const DEFAULT_WARNING_MS = 5 * 60 * 1000;

const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
] as const;

// Throttle activity resets to once per 30 seconds to avoid performance overhead
const THROTTLE_MS = 30_000;

interface UseSessionTimeoutOptions {
  /** Total inactivity duration before auto-logout (ms). Default: 30 min */
  timeoutMs?: number;
  /** How long before timeout to show the warning (ms). Default: 5 min */
  warningMs?: number;
  /** Called when the session expires */
  onTimeout: () => void;
  /** Whether the hook is active (e.g. only when user is authenticated) */
  enabled?: boolean;
}

interface UseSessionTimeoutReturn {
  /** Whether the warning modal should be shown */
  showWarning: boolean;
  /** Seconds remaining before auto-logout (only meaningful when showWarning is true) */
  secondsRemaining: number;
  /** Call this to dismiss the warning and reset the timer (user chose "Stay Logged In") */
  resetTimeout: () => void;
}

export function useSessionTimeout({
  timeoutMs = DEFAULT_TIMEOUT_MS,
  warningMs = DEFAULT_WARNING_MS,
  onTimeout,
  enabled = true,
}: UseSessionTimeoutOptions): UseSessionTimeoutReturn {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const onTimeoutRef = useRef(onTimeout);

  // Keep callback ref up to date without re-running effects
  onTimeoutRef.current = onTimeout;

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    timeoutRef.current = null;
    warningRef.current = null;
    countdownRef.current = null;
  }, []);

  const startTimers = useCallback(() => {
    clearAllTimers();
    lastActivityRef.current = Date.now();

    // Timer to show the warning
    const warningDelay = timeoutMs - warningMs;
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsRemaining(Math.round(warningMs / 1000));

      // Start a 1-second countdown for the remaining time display
      countdownRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearAllTimers();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warningDelay);

    // Timer to actually log out
    timeoutRef.current = setTimeout(() => {
      clearAllTimers();
      setShowWarning(false);
      onTimeoutRef.current();
    }, timeoutMs);
  }, [timeoutMs, warningMs, clearAllTimers]);

  const resetTimeout = useCallback(() => {
    setShowWarning(false);
    setSecondsRemaining(0);
    startTimers();
  }, [startTimers]);

  // Set up activity listeners
  useEffect(() => {
    if (!enabled) {
      clearAllTimers();
      setShowWarning(false);
      return;
    }

    // Start timers on mount
    startTimers();

    let lastThrottled = Date.now();

    const handleActivity = () => {
      const now = Date.now();
      // Throttle: only reset if enough time has passed since last reset
      if (now - lastThrottled < THROTTLE_MS) return;
      lastThrottled = now;

      // Don't reset if warning is already showing — user must explicitly dismiss it
      if (showWarning) return;

      startTimers();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    // Also handle visibility change: if user returns to the tab, check if we've exceeded timeout
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !showWarning) {
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= timeoutMs) {
          // Already past timeout while tab was hidden
          clearAllTimers();
          onTimeoutRef.current();
        } else if (elapsed >= timeoutMs - warningMs) {
          // Past warning threshold — show warning with correct remaining time
          setShowWarning(true);
          const remaining = Math.round((timeoutMs - elapsed) / 1000);
          setSecondsRemaining(Math.max(remaining, 0));

          clearAllTimers();
          countdownRef.current = setInterval(() => {
            setSecondsRemaining((prev) => {
              if (prev <= 1) {
                clearAllTimers();
                onTimeoutRef.current();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          // Still within active period — just restart timers
          startTimers();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearAllTimers();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, showWarning, timeoutMs, warningMs, startTimers, clearAllTimers]);

  return { showWarning, secondsRemaining, resetTimeout };
}
