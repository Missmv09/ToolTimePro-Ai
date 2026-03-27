'use client';

import { useState, useEffect } from 'react';
import { WifiOff, Wifi, CloudOff, RefreshCw, Check } from 'lucide-react';
import { isOnline, setupConnectivityListeners, getUnsyncedItems } from '@/lib/offlineStorage';

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [showBanner, setShowBanner] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    setOnline(isOnline());

    const cleanup = setupConnectivityListeners(
      () => {
        setOnline(true);
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 3000);
      },
      () => {
        setOnline(false);
        setShowBanner(true);
      }
    );

    // Check pending items periodically
    const checkPending = async () => {
      try {
        const items = await getUnsyncedItems();
        setPendingCount(items.length);
      } catch { /* ignore */ }
    };

    checkPending();
    const interval = setInterval(checkPending, 10000);

    return () => {
      cleanup();
      clearInterval(interval);
    };
  }, []);

  // Don't show anything if online with no pending items and no recent events
  if (online && pendingCount === 0 && !justSynced && !showBanner) return null;

  return (
    <>
      {/* Offline Banner */}
      {!online && (
        <div className="bg-yellow-500 text-yellow-900 px-4 py-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span className="font-medium">You&apos;re offline</span>
            <span className="text-yellow-800">— your work is being saved locally</span>
          </div>
          {pendingCount > 0 && (
            <span className="bg-yellow-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">
              {pendingCount} queued
            </span>
          )}
        </div>
      )}

      {/* Just came back online */}
      {online && justSynced && (
        <div className="bg-green-500 text-white px-4 py-2 flex items-center gap-2 text-sm">
          <Check className="w-4 h-4" />
          <span className="font-medium">Back online!</span>
          <span>Syncing your data now...</span>
        </div>
      )}

      {/* Online but pending sync */}
      {online && !justSynced && pendingCount > 0 && (
        <div className="bg-blue-500 text-white px-4 py-2 flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Syncing {pendingCount} queued item{pendingCount > 1 ? 's' : ''}...</span>
        </div>
      )}
    </>
  );
}

// Compact status dot for the nav bar
export function OfflineStatusDot() {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setOnline(isOnline());

    const cleanup = setupConnectivityListeners(
      () => setOnline(true),
      () => setOnline(false)
    );

    const checkPending = async () => {
      try {
        const items = await getUnsyncedItems();
        setPendingCount(items.length);
      } catch { /* ignore */ }
    };
    checkPending();
    const interval = setInterval(checkPending, 10000);

    return () => { cleanup(); clearInterval(interval); };
  }, []);

  if (online && pendingCount === 0) {
    return (
      <div className="flex items-center gap-1.5" title="Connected">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
      </div>
    );
  }

  if (!online) {
    return (
      <div className="flex items-center gap-1.5 text-yellow-500" title="Offline — data saved locally">
        <WifiOff className="w-3.5 h-3.5" />
        {pendingCount > 0 && (
          <span className="text-xs font-bold">{pendingCount}</span>
        )}
      </div>
    );
  }

  // Online with pending
  return (
    <div className="flex items-center gap-1.5 text-blue-500" title="Syncing...">
      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      <span className="text-xs font-bold">{pendingCount}</span>
    </div>
  );
}
