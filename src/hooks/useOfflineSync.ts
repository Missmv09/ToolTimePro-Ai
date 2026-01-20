'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  initOfflineDB,
  addToSyncQueue,
  getUnsyncedItems,
  markAsSynced,
  cleanupSyncedItems,
  isOnline,
  setupConnectivityListeners,
} from '@/lib/offlineStorage';

interface OfflineSyncState {
  isOnline: boolean;
  pendingSync: number;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  error: string | null;
}

export function useOfflineSync() {
  const { dbUser, company } = useAuth();
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: true,
    pendingSync: 0,
    isSyncing: false,
    lastSyncAt: null,
    error: null,
  });

  // Initialize offline DB on mount
  useEffect(() => {
    initOfflineDB().catch(console.error);
    setState((prev) => ({ ...prev, isOnline: isOnline() }));
  }, []);

  // Sync pending items to Supabase
  const syncToServer = useCallback(async () => {
    if (!dbUser?.id || !company?.id || !isOnline()) return;

    setState((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      const unsyncedItems = await getUnsyncedItems();

      for (const item of unsyncedItems) {
        try {
          switch (item.action) {
            case 'clock_in': {
              const { error } = await supabase.from('time_entries').insert({
                company_id: company.id,
                user_id: dbUser.id,
                clock_in: item.payload.clock_in,
                clock_in_location: item.payload.location,
                clock_in_photo_url: item.payload.photo_url,
                job_id: item.payload.job_id || null,
                status: 'active',
              });
              if (error) throw error;
              break;
            }

            case 'clock_out': {
              const { error } = await supabase
                .from('time_entries')
                .update({
                  clock_out: item.payload.clock_out,
                  clock_out_location: item.payload.location,
                  clock_out_photo_url: item.payload.photo_url,
                  break_minutes: item.payload.break_minutes,
                  status: 'completed',
                  attestation_completed: item.payload.attestation_completed,
                  attestation_at: item.payload.attestation_at,
                  attestation_signature: item.payload.attestation_signature,
                  missed_meal_break: item.payload.missed_meal_break,
                  missed_meal_reason: item.payload.missed_meal_reason,
                  missed_rest_break: item.payload.missed_rest_break,
                  missed_rest_reason: item.payload.missed_rest_reason,
                })
                .eq('id', item.payload.time_entry_id);
              if (error) throw error;
              break;
            }

            case 'break_start': {
              const { error } = await supabase.from('breaks').insert({
                time_entry_id: item.payload.time_entry_id,
                user_id: dbUser.id,
                break_type: item.payload.break_type,
                break_start: item.payload.break_start,
                location: item.payload.location,
              });
              if (error) throw error;
              break;
            }

            case 'break_end': {
              const { error } = await supabase
                .from('breaks')
                .update({
                  break_end: item.payload.break_end,
                })
                .eq('id', item.payload.break_id);
              if (error) throw error;
              break;
            }
          }

          await markAsSynced(item.id);
        } catch (err) {
          console.error(`Failed to sync item ${item.id}:`, err);
          // Continue with next item
        }
      }

      // Cleanup old synced items
      await cleanupSyncedItems();

      // Update state
      const remaining = await getUnsyncedItems();
      setState((prev) => ({
        ...prev,
        isSyncing: false,
        pendingSync: remaining.length,
        lastSyncAt: new Date(),
      }));
    } catch (err) {
      console.error('Sync error:', err);
      setState((prev) => ({
        ...prev,
        isSyncing: false,
        error: 'Sync failed. Will retry when online.',
      }));
    }
  }, [dbUser?.id, company?.id]);

  // Queue clock in for offline
  const queueClockIn = async (
    jobId?: string,
    photoUrl?: string,
    location?: Record<string, unknown>
  ): Promise<string> => {
    const id = await addToSyncQueue('clock_in', {
      clock_in: new Date().toISOString(),
      job_id: jobId,
      photo_url: photoUrl,
      location,
    });

    setState((prev) => ({ ...prev, pendingSync: prev.pendingSync + 1 }));
    return id;
  };

  // Queue clock out for offline
  const queueClockOut = async (
    timeEntryId: string,
    attestation: Record<string, unknown>,
    photoUrl?: string,
    location?: Record<string, unknown>,
    breakMinutes?: number
  ): Promise<string> => {
    const id = await addToSyncQueue('clock_out', {
      time_entry_id: timeEntryId,
      clock_out: new Date().toISOString(),
      photo_url: photoUrl,
      location,
      break_minutes: breakMinutes,
      ...attestation,
    });

    setState((prev) => ({ ...prev, pendingSync: prev.pendingSync + 1 }));
    return id;
  };

  // Queue break start for offline
  const queueBreakStart = async (
    timeEntryId: string,
    breakType: 'meal' | 'rest',
    location?: Record<string, unknown>
  ): Promise<string> => {
    const id = await addToSyncQueue('break_start', {
      time_entry_id: timeEntryId,
      break_type: breakType,
      break_start: new Date().toISOString(),
      location,
    });

    setState((prev) => ({ ...prev, pendingSync: prev.pendingSync + 1 }));
    return id;
  };

  // Queue break end for offline
  const queueBreakEnd = async (breakId: string): Promise<string> => {
    const id = await addToSyncQueue('break_end', {
      break_id: breakId,
      break_end: new Date().toISOString(),
    });

    setState((prev) => ({ ...prev, pendingSync: prev.pendingSync + 1 }));
    return id;
  };

  // Setup connectivity listeners
  useEffect(() => {
    const cleanup = setupConnectivityListeners(
      () => {
        setState((prev) => ({ ...prev, isOnline: true }));
        // Auto-sync when coming online
        syncToServer();
      },
      () => {
        setState((prev) => ({ ...prev, isOnline: false }));
      }
    );

    return cleanup;
  }, [syncToServer]);

  // Check for pending items on mount
  useEffect(() => {
    const checkPending = async () => {
      try {
        const unsynced = await getUnsyncedItems();
        setState((prev) => ({ ...prev, pendingSync: unsynced.length }));

        // Try to sync if online and there are pending items
        if (isOnline() && unsynced.length > 0) {
          syncToServer();
        }
      } catch (err) {
        console.error('Error checking pending items:', err);
      }
    };

    checkPending();
  }, [syncToServer]);

  return {
    ...state,
    syncToServer,
    queueClockIn,
    queueClockOut,
    queueBreakStart,
    queueBreakEnd,
  };
}
