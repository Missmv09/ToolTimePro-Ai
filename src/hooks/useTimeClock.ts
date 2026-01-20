'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { TimeEntry, Break, GeoLocation, ComplianceAlert } from '@/types/database';

// California labor law constants
const CA_MEAL_BREAK_HOURS = 5; // Meal break required after 5 hours
const CA_SECOND_MEAL_HOURS = 10; // Second meal break after 10 hours
const CA_REST_BREAK_HOURS = 4; // Rest break every 4 hours (10 min per 4 hours)
const CA_OVERTIME_HOURS = 8; // Overtime starts at 8 hours
const CA_DOUBLE_TIME_HOURS = 12; // Double time starts at 12 hours

export interface TimeClockState {
  isLoading: boolean;
  error: string | null;
  currentEntry: TimeEntry | null;
  todaysBreaks: Break[];
  hoursWorked: number;
  isOnBreak: boolean;
  currentBreak: Break | null;
  complianceAlerts: ComplianceAlert[];
}

export interface AttestationData {
  missedMealBreak: boolean;
  missedMealReason?: string;
  missedRestBreak: boolean;
  missedRestReason?: string;
  signature: string; // Base64
}

export function useTimeClock() {
  const { dbUser, company } = useAuth();
  const [state, setState] = useState<TimeClockState>({
    isLoading: true,
    error: null,
    currentEntry: null,
    todaysBreaks: [],
    hoursWorked: 0,
    isOnBreak: false,
    currentBreak: null,
    complianceAlerts: [],
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate hours worked from current entry
  const calculateHoursWorked = useCallback((entry: TimeEntry | null): number => {
    if (!entry) return 0;
    const clockIn = new Date(entry.clock_in);
    const now = entry.clock_out ? new Date(entry.clock_out) : new Date();
    const diffMs = now.getTime() - clockIn.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    // Subtract break time
    const breakHours = (entry.break_minutes || 0) / 60;
    return Math.max(0, hours - breakHours);
  }, []);

  // Get current location
  const getCurrentLocation = useCallback((): Promise<GeoLocation | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location: GeoLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
          };

          // Try to get address using reverse geocoding (optional)
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`
            );
            const data = await response.json();
            if (data.display_name) {
              location.address = data.display_name;
            }
          } catch {
            // Address lookup failed, continue without it
          }

          resolve(location);
        },
        () => {
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

  // Fetch current time entry and breaks
  const fetchCurrentEntry = useCallback(async () => {
    if (!dbUser?.id || !company?.id) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // Get active time entry (no clock_out)
      const { data: entry, error: entryError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', dbUser.id)
        .eq('company_id', company.id)
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .single();

      if (entryError && entryError.code !== 'PGRST116') {
        throw entryError;
      }

      // Get today's breaks if there's an active entry
      let breaks: Break[] = [];
      let currentBreak: Break | null = null;

      if (entry) {
        const { data: breaksData } = await supabase
          .from('breaks')
          .select('*')
          .eq('time_entry_id', entry.id)
          .order('break_start', { ascending: true });

        breaks = (breaksData as Break[]) || [];
        currentBreak = breaks.find((b) => !b.break_end) || null;
      }

      // Get unacknowledged compliance alerts for today
      const { data: alerts } = await supabase
        .from('compliance_alerts')
        .select('*')
        .eq('user_id', dbUser.id)
        .eq('acknowledged', false)
        .gte('created_at', `${today}T00:00:00`);

      setState((prev) => ({
        ...prev,
        isLoading: false,
        currentEntry: entry as TimeEntry | null,
        todaysBreaks: breaks,
        hoursWorked: calculateHoursWorked(entry as TimeEntry | null),
        isOnBreak: !!currentBreak,
        currentBreak,
        complianceAlerts: (alerts as ComplianceAlert[]) || [],
      }));
    } catch (err) {
      console.error('Error fetching time entry:', err);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load time clock data',
      }));
    }
  }, [dbUser?.id, company?.id, calculateHoursWorked]);

  // Clock In
  const clockIn = async (
    jobId?: string,
    photoUrl?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!dbUser?.id || !company?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const location = await getCurrentLocation();

      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          company_id: company.id,
          user_id: dbUser.id,
          job_id: jobId || null,
          clock_in: new Date().toISOString(),
          clock_in_location: location,
          clock_in_photo_url: photoUrl || null,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        currentEntry: data as TimeEntry,
        hoursWorked: 0,
        error: null,
      }));

      return { success: true };
    } catch (err) {
      console.error('Clock in error:', err);
      return { success: false, error: 'Failed to clock in' };
    }
  };

  // Clock Out (requires attestation)
  const clockOut = async (
    attestation: AttestationData,
    photoUrl?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!state.currentEntry) {
      return { success: false, error: 'No active time entry' };
    }

    try {
      const location = await getCurrentLocation();

      // Calculate total break minutes from breaks
      let totalBreakMinutes = 0;
      for (const brk of state.todaysBreaks) {
        if (brk.break_end) {
          const start = new Date(brk.break_start);
          const end = new Date(brk.break_end);
          totalBreakMinutes += (end.getTime() - start.getTime()) / 60000;
        }
      }

      const { error } = await supabase
        .from('time_entries')
        .update({
          clock_out: new Date().toISOString(),
          clock_out_location: location,
          clock_out_photo_url: photoUrl || null,
          break_minutes: Math.round(totalBreakMinutes),
          status: 'completed',
          attestation_completed: true,
          attestation_at: new Date().toISOString(),
          attestation_signature: attestation.signature,
          missed_meal_break: attestation.missedMealBreak,
          missed_meal_reason: attestation.missedMealReason || null,
          missed_rest_break: attestation.missedRestBreak,
          missed_rest_reason: attestation.missedRestReason || null,
        })
        .eq('id', state.currentEntry.id);

      if (error) throw error;

      // Create violation alert if missed breaks
      if (attestation.missedMealBreak && company?.id) {
        await supabase.from('compliance_alerts').insert({
          company_id: company.id,
          user_id: dbUser?.id,
          time_entry_id: state.currentEntry.id,
          alert_type: 'meal_break_missed',
          severity: 'violation',
          title: 'Meal Break Violation',
          description: attestation.missedMealReason || 'Employee reported missing meal break',
          hours_worked: state.hoursWorked,
        });
      }

      setState((prev) => ({
        ...prev,
        currentEntry: null,
        todaysBreaks: [],
        hoursWorked: 0,
        isOnBreak: false,
        currentBreak: null,
      }));

      return { success: true };
    } catch (err) {
      console.error('Clock out error:', err);
      return { success: false, error: 'Failed to clock out' };
    }
  };

  // Start Break
  const startBreak = async (
    breakType: 'meal' | 'rest'
  ): Promise<{ success: boolean; error?: string }> => {
    if (!state.currentEntry || !dbUser?.id) {
      return { success: false, error: 'No active time entry' };
    }

    if (state.isOnBreak) {
      return { success: false, error: 'Already on break' };
    }

    try {
      const location = await getCurrentLocation();

      const { data, error } = await supabase
        .from('breaks')
        .insert({
          time_entry_id: state.currentEntry.id,
          user_id: dbUser.id,
          break_type: breakType,
          break_start: new Date().toISOString(),
          location,
        })
        .select()
        .single();

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        isOnBreak: true,
        currentBreak: data as Break,
        todaysBreaks: [...prev.todaysBreaks, data as Break],
      }));

      return { success: true };
    } catch (err) {
      console.error('Start break error:', err);
      return { success: false, error: 'Failed to start break' };
    }
  };

  // End Break
  const endBreak = async (): Promise<{ success: boolean; error?: string }> => {
    if (!state.currentBreak) {
      return { success: false, error: 'Not on break' };
    }

    try {
      const { error } = await supabase
        .from('breaks')
        .update({
          break_end: new Date().toISOString(),
        })
        .eq('id', state.currentBreak.id);

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        isOnBreak: false,
        currentBreak: null,
        todaysBreaks: prev.todaysBreaks.map((b) =>
          b.id === prev.currentBreak?.id
            ? { ...b, break_end: new Date().toISOString() }
            : b
        ),
      }));

      return { success: true };
    } catch (err) {
      console.error('End break error:', err);
      return { success: false, error: 'Failed to end break' };
    }
  };

  // Waive meal break (California allows 30-min meal break waiver for shifts <= 6 hours)
  const waiveMealBreak = async (): Promise<{ success: boolean; error?: string }> => {
    if (!state.currentEntry || !dbUser?.id) {
      return { success: false, error: 'No active time entry' };
    }

    try {
      const { error } = await supabase.from('breaks').insert({
        time_entry_id: state.currentEntry.id,
        user_id: dbUser.id,
        break_type: 'meal',
        break_start: new Date().toISOString(),
        break_end: new Date().toISOString(),
        waived: true,
        notes: 'Meal break waived by employee (shift <= 6 hours)',
      });

      if (error) throw error;

      return { success: true };
    } catch (err) {
      console.error('Waive meal break error:', err);
      return { success: false, error: 'Failed to waive meal break' };
    }
  };

  // Acknowledge compliance alert
  const acknowledgeAlert = async (alertId: string): Promise<void> => {
    if (!dbUser?.id) return;

    await supabase
      .from('compliance_alerts')
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: dbUser.id,
      })
      .eq('id', alertId);

    setState((prev) => ({
      ...prev,
      complianceAlerts: prev.complianceAlerts.filter((a) => a.id !== alertId),
    }));
  };

  // Check for compliance alerts (CA labor law)
  const checkCompliance = useCallback((): ComplianceAlert[] => {
    if (!state.currentEntry) return [];

    const alerts: ComplianceAlert[] = [];
    const hours = state.hoursWorked;

    // Check if meal break taken
    const mealBreakTaken = state.todaysBreaks.some(
      (b) => b.break_type === 'meal' && (b.break_end || b.waived)
    );

    // Meal break warning at 4 hours
    if (hours >= 4 && hours < CA_MEAL_BREAK_HOURS && !mealBreakTaken) {
      alerts.push({
        id: 'meal_warning',
        alert_type: 'meal_break_due',
        severity: 'warning',
        title: 'Meal Break Coming Up',
        description: `Take your 30-minute meal break before ${CA_MEAL_BREAK_HOURS} hours`,
        hours_worked: hours,
      } as ComplianceAlert);
    }

    // Meal break required at 5 hours
    if (hours >= CA_MEAL_BREAK_HOURS && !mealBreakTaken) {
      alerts.push({
        id: 'meal_required',
        alert_type: 'meal_break_missed',
        severity: 'violation',
        title: 'Meal Break Required NOW',
        description: 'CA law requires a 30-minute meal break before 5 hours',
        hours_worked: hours,
      } as ComplianceAlert);
    }

    // Rest break reminders (10 min per 4 hours)
    const restBreaksTaken = state.todaysBreaks.filter(
      (b) => b.break_type === 'rest' && b.break_end
    ).length;
    const restBreaksRequired = Math.floor(hours / CA_REST_BREAK_HOURS);

    if (restBreaksTaken < restBreaksRequired) {
      alerts.push({
        id: 'rest_due',
        alert_type: 'rest_break_due',
        severity: 'warning',
        title: 'Rest Break Due',
        description: 'Take a 10-minute paid rest break',
        hours_worked: hours,
      } as ComplianceAlert);
    }

    // Overtime warning at 8 hours
    if (hours >= CA_OVERTIME_HOURS && hours < CA_DOUBLE_TIME_HOURS) {
      alerts.push({
        id: 'overtime',
        alert_type: 'overtime_warning',
        severity: 'info',
        title: 'Overtime Started',
        description: 'You are now earning 1.5x overtime pay',
        hours_worked: hours,
      } as ComplianceAlert);
    }

    // Double time at 12 hours
    if (hours >= CA_DOUBLE_TIME_HOURS) {
      alerts.push({
        id: 'doubletime',
        alert_type: 'double_time_warning',
        severity: 'warning',
        title: 'Double Time Started',
        description: 'You are now earning 2x double time pay',
        hours_worked: hours,
      } as ComplianceAlert);
    }

    return alerts;
  }, [state.currentEntry, state.hoursWorked, state.todaysBreaks]);

  // Update hours worked every minute
  useEffect(() => {
    if (state.currentEntry && !state.isOnBreak) {
      timerRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          hoursWorked: calculateHoursWorked(prev.currentEntry),
        }));
      }, 60000); // Update every minute
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state.currentEntry, state.isOnBreak, calculateHoursWorked]);

  // Initial fetch
  useEffect(() => {
    fetchCurrentEntry();
  }, [fetchCurrentEntry]);

  // Real-time subscription for time entries
  useEffect(() => {
    if (!dbUser?.id) return;

    const subscription = supabase
      .channel('time-clock-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_entries',
          filter: `user_id=eq.${dbUser.id}`,
        },
        () => {
          fetchCurrentEntry();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [dbUser?.id, fetchCurrentEntry]);

  return {
    ...state,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    waiveMealBreak,
    acknowledgeAlert,
    checkCompliance,
    refetch: fetchCurrentEntry,
  };
}
