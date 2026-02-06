'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Company } from '@/types/database';

interface WorkerAuthState {
  worker: User | null;
  company: Company | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface WorkerAuthContextType extends WorkerAuthState {
  signIn: (phone: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const WorkerAuthContext = createContext<WorkerAuthContextType | undefined>(undefined);

const WORKER_SESSION_KEY = 'tooltime_worker_session';

export function WorkerAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkerAuthState>({
    worker: null,
    company: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Restore session from localStorage
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const stored = localStorage.getItem(WORKER_SESSION_KEY);
        if (stored) {
          const { workerId, companyId } = JSON.parse(stored);

          // Fetch worker data
          const { data: worker } = await supabase
            .from('users')
            .select('*')
            .eq('id', workerId)
            .eq('is_active', true)
            .single();

          if (worker) {
            // Fetch company
            const { data: company } = await supabase
              .from('companies')
              .select('*')
              .eq('id', companyId)
              .single();

            setState({
              worker: worker as User,
              company: company as Company || null,
              isLoading: false,
              isAuthenticated: true,
            });
            return;
          }
        }
      } catch (err) {
        console.error('Failed to restore worker session:', err);
        localStorage.removeItem(WORKER_SESSION_KEY);
      }

      setState(prev => ({ ...prev, isLoading: false }));
    };

    restoreSession();
  }, []);

  const signIn = useCallback(async (phone: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Normalize phone number (remove formatting)
      const normalizedPhone = phone.replace(/\D/g, '');

      // Look up worker by phone number
      const { data: workers, error: lookupError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'worker')
        .eq('is_active', true)
        .or(`phone.ilike.%${normalizedPhone}%,phone.ilike.%${phone}%`);

      if (lookupError) {
        console.error('Worker lookup error:', lookupError);
        return { success: false, error: 'Failed to verify credentials' };
      }

      if (!workers || workers.length === 0) {
        return { success: false, error: 'No worker found with this phone number' };
      }

      const worker = workers[0] as User;

      // Validate PIN against the stored pin on the user record
      if (worker.pin) {
        if (pin !== worker.pin) {
          return { success: false, error: 'Invalid PIN. Please try again.' };
        }
      } else {
        // Worker has no PIN set — allow login but warn them to set one
        console.warn(`Worker ${worker.id} has no PIN set. Allowing login with any valid 4-digit PIN.`);
        if (!/^\d{4}$/.test(pin)) {
          return { success: false, error: 'Please enter a valid 4-digit PIN.' };
        }
      }

      if (!worker.company_id) {
        return { success: false, error: 'Worker not assigned to a company' };
      }

      // Fetch company
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', worker.company_id)
        .single();

      // Store session
      localStorage.setItem(WORKER_SESSION_KEY, JSON.stringify({
        workerId: worker.id,
        companyId: worker.company_id,
      }));

      setState({
        worker,
        company: company as Company || null,
        isLoading: false,
        isAuthenticated: true,
      });

      return { success: true };
    } catch (err) {
      console.error('Worker sign in error:', err);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem(WORKER_SESSION_KEY);
    setState({
      worker: null,
      company: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  return (
    <WorkerAuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </WorkerAuthContext.Provider>
  );
}

export function useWorkerAuth() {
  const context = useContext(WorkerAuthContext);
  if (context === undefined) {
    throw new Error('useWorkerAuth must be used within a WorkerAuthProvider');
  }
  return context;
}
