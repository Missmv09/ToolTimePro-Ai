import React from 'react';
import { renderHook, act } from '@testing-library/react';

// Use fake timers for all tests in this file
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const { useSessionTimeout } = require('@/hooks/useSessionTimeout');

describe('useSessionTimeout', () => {
  const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  const WARNING_MS = 5 * 60 * 1000;  // 5 minutes

  it('does not show warning initially', () => {
    const onTimeout = jest.fn();
    const { result } = renderHook(() =>
      useSessionTimeout({ onTimeout, enabled: true })
    );

    expect(result.current.showWarning).toBe(false);
    expect(result.current.secondsRemaining).toBe(0);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('shows warning after inactivity period (timeout - warning)', () => {
    const onTimeout = jest.fn();
    const { result } = renderHook(() =>
      useSessionTimeout({ onTimeout, enabled: true })
    );

    // Advance to just past the warning threshold (25 minutes)
    act(() => {
      jest.advanceTimersByTime(TIMEOUT_MS - WARNING_MS + 100);
    });

    expect(result.current.showWarning).toBe(true);
    expect(result.current.secondsRemaining).toBe(Math.round(WARNING_MS / 1000));
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('calls onTimeout after full inactivity period', () => {
    const onTimeout = jest.fn();
    renderHook(() =>
      useSessionTimeout({ onTimeout, enabled: true })
    );

    act(() => {
      jest.advanceTimersByTime(TIMEOUT_MS + 100);
    });

    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('does not show warning or timeout when disabled', () => {
    const onTimeout = jest.fn();
    const { result } = renderHook(() =>
      useSessionTimeout({ onTimeout, enabled: false })
    );

    act(() => {
      jest.advanceTimersByTime(TIMEOUT_MS + 100);
    });

    expect(result.current.showWarning).toBe(false);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('resetTimeout dismisses warning and restarts timers', () => {
    const onTimeout = jest.fn();
    const { result } = renderHook(() =>
      useSessionTimeout({ onTimeout, enabled: true })
    );

    // Trigger warning
    act(() => {
      jest.advanceTimersByTime(TIMEOUT_MS - WARNING_MS + 100);
    });
    expect(result.current.showWarning).toBe(true);

    // User clicks "Stay Logged In"
    act(() => {
      result.current.resetTimeout();
    });
    expect(result.current.showWarning).toBe(false);
    expect(result.current.secondsRemaining).toBe(0);

    // Should not timeout at the original timeout time
    act(() => {
      jest.advanceTimersByTime(WARNING_MS);
    });
    expect(onTimeout).not.toHaveBeenCalled();

    // Should timeout after a full new cycle
    act(() => {
      jest.advanceTimersByTime(TIMEOUT_MS);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('countdown decrements every second after warning appears', () => {
    const onTimeout = jest.fn();
    const { result } = renderHook(() =>
      useSessionTimeout({ onTimeout, enabled: true })
    );

    // Trigger warning
    act(() => {
      jest.advanceTimersByTime(TIMEOUT_MS - WARNING_MS + 100);
    });

    const initialSeconds = result.current.secondsRemaining;

    // Advance 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.secondsRemaining).toBe(initialSeconds - 3);
  });

  it('respects custom timeout and warning durations', () => {
    const onTimeout = jest.fn();
    const customTimeout = 60_000; // 1 minute
    const customWarning = 10_000; // 10 seconds

    const { result } = renderHook(() =>
      useSessionTimeout({
        onTimeout,
        enabled: true,
        timeoutMs: customTimeout,
        warningMs: customWarning,
      })
    );

    // Warning should not show before (60s - 10s = 50s)
    act(() => {
      jest.advanceTimersByTime(49_000);
    });
    expect(result.current.showWarning).toBe(false);

    // Warning should show after 50s
    act(() => {
      jest.advanceTimersByTime(2_000);
    });
    expect(result.current.showWarning).toBe(true);

    // Timeout should fire at 60s
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('resets timer on user activity when warning is not showing', () => {
    const onTimeout = jest.fn();
    const customTimeout = 60_000;
    const customWarning = 10_000;

    renderHook(() =>
      useSessionTimeout({
        onTimeout,
        enabled: true,
        timeoutMs: customTimeout,
        warningMs: customWarning,
      })
    );

    // Advance 40 seconds (past throttle window but before warning)
    act(() => {
      jest.advanceTimersByTime(40_000);
    });

    // Simulate user activity
    act(() => {
      window.dispatchEvent(new MouseEvent('mousedown'));
    });

    // Advance 40 more seconds — should NOT timeout because timer was reset
    act(() => {
      jest.advanceTimersByTime(40_000);
    });
    expect(onTimeout).not.toHaveBeenCalled();

    // Now advance to the full timeout from the reset point
    act(() => {
      jest.advanceTimersByTime(21_000);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('handles visibility change — logs out if past timeout while tab was hidden', () => {
    const onTimeout = jest.fn();

    renderHook(() =>
      useSessionTimeout({ onTimeout, enabled: true })
    );

    // Simulate the tab being hidden, then time passing, then coming back
    // We need to advance past the timeout, then fire visibilitychange
    // But since timers pause when we don't advance them, we need to
    // mock Date.now to simulate elapsed time

    const realDateNow = Date.now;
    const startTime = Date.now();

    // Advance timers a bit (but not to timeout)
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Mock Date.now to return a time past the timeout (simulate hidden tab)
    Date.now = jest.fn(() => startTime + TIMEOUT_MS + 5000);

    // Simulate tab becoming visible
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(onTimeout).toHaveBeenCalledTimes(1);

    // Restore
    Date.now = realDateNow;
  });

  it('cleans up timers and listeners on unmount', () => {
    const onTimeout = jest.fn();
    const addSpy = jest.spyOn(window, 'addEventListener');
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() =>
      useSessionTimeout({ onTimeout, enabled: true })
    );

    // Verify listeners were added
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    for (const event of activityEvents) {
      expect(addSpy).toHaveBeenCalledWith(event, expect.any(Function), { passive: true });
    }

    unmount();

    // Verify listeners were removed
    for (const event of activityEvents) {
      expect(removeSpy).toHaveBeenCalledWith(event, expect.any(Function));
    }

    // Advancing time should not trigger onTimeout after unmount
    act(() => {
      jest.advanceTimersByTime(TIMEOUT_MS + 100);
    });
    expect(onTimeout).not.toHaveBeenCalled();

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
