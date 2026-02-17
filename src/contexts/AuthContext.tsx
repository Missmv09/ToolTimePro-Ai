'use client';

import { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { User as DbUser, Company } from '@/types/database';

// Timeout for auth initialization to prevent infinite loading
const AUTH_TIMEOUT_MS = 5000;

// Grace period before clearing user state on null-session auth events.
// Supabase can briefly fire SIGNED_OUT during token refresh before the new
// session arrives.  Without this delay, ProtectedRoute sees user === null,
// unmounts the entire dashboard (including in-progress wizard state), then
// immediately re-mounts when the valid session event follows.
const AUTH_NULL_GRACE_MS = 2000;

interface AuthContextType {
  user: User | null;
  dbUser: DbUser | null;
  company: Company | null;
  session: Session | null;
  isLoading: boolean;
  authError: string | null;
  isConfigured: boolean;
  signUp: (email: string, fullName: string, companyName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const initCompleteRef = useRef(false);
  const nullGraceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch user profile and company data
  const fetchUserData = async (userId: string) => {
    if (!isSupabaseConfigured) return;

    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!mountedRef.current) return;

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error fetching user:', userError);
        return;
      }

      if (userData) {
        setDbUser(userData as DbUser);

        if (userData.company_id) {
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', userData.company_id)
            .single();

          if (!mountedRef.current) return;

          if (companyError) {
            console.error('Error fetching company:', companyError);
          } else if (companyData) {
            setCompany(companyData as Company);
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    initCompleteRef.current = false;

    // If Supabase isn't configured, skip auth entirely
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured - running without authentication');
      setIsLoading(false);
      initCompleteRef.current = true;
      return;
    }

    // Set up timeout FIRST - this will force loading to stop no matter what
    const timeoutId = setTimeout(() => {
      if (mountedRef.current && !initCompleteRef.current) {
        console.warn('Auth loading timeout reached, proceeding without session');
        initCompleteRef.current = true;
        setIsLoading(false);
      }
    }, AUTH_TIMEOUT_MS);

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        // Check if we've already timed out or unmounted
        if (!mountedRef.current || initCompleteRef.current) {
          return;
        }

        if (error) {
          console.error('Error getting session:', error);
          setAuthError(error.message);
        } else {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);

          if (initialSession?.user) {
            await fetchUserData(initialSession.user.id);
          }
        }

        // Mark as complete and stop loading
        initCompleteRef.current = true;
        clearTimeout(timeoutId);
        if (mountedRef.current) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mountedRef.current && !initCompleteRef.current) {
          const message = error instanceof Error ? error.message : 'Authentication error';
          if (message.toLowerCase().includes('failed to fetch')) {
            setAuthError('Unable to connect to the server. Please check your internet connection and try again.');
          } else {
            setAuthError(message);
          }
          initCompleteRef.current = true;
          clearTimeout(timeoutId);
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mountedRef.current) return;

        setSession(currentSession);
        setAuthError(null);

        if (currentSession?.user) {
          // Valid session — cancel any pending null-user grace timeout
          if (nullGraceRef.current) {
            clearTimeout(nullGraceRef.current);
            nullGraceRef.current = null;
          }
          setUser(currentSession.user);
          // Don't await - let it run in background to avoid blocking
          fetchUserData(currentSession.user.id).catch(console.error);
        } else {
          // Null session — could be a genuine sign-out OR a transient blip
          // during a Supabase token refresh.  Delay clearing user/dbUser/company
          // so ProtectedRoute doesn't briefly unmount the entire component tree.
          // The explicit signOut() function already clears state synchronously,
          // so this path only matters for automatic auth events.
          if (nullGraceRef.current) clearTimeout(nullGraceRef.current);
          nullGraceRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setUser(null);
              setDbUser(null);
              setCompany(null);
            }
            nullGraceRef.current = null;
          }, AUTH_NULL_GRACE_MS);
        }

        // Only set loading false if init is already complete
        if (initCompleteRef.current) {
          setIsLoading(false);
        }
      }
    );

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
      if (nullGraceRef.current) clearTimeout(nullGraceRef.current);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    fullName: string,
    companyName: string
  ): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Authentication is not configured') };
    }

    try {
      // All signup logic runs server-side via /api/signup. This uses the admin
      // API to create the user (which does NOT send Supabase's default plain
      // confirmation email) and instead sends only our branded email with full
      // context about the account, trial, and next steps.
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName, companyName }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.error || 'Signup failed';
        if (msg.includes('companies_email_key') || msg.includes('duplicate key') || msg.includes('already registered')) {
          return { error: new Error('An account with this email already exists. Please sign in instead.') };
        }
        return { error: new Error(msg) };
      }

      return { error: null };
    } catch (error) {
      console.error('Signup error:', error);
      return { error: error as Error };
    }
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Authentication is not configured') };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      // Update last_login_at to clear "Pending Activation" status
      if (data.user?.id) {
        await supabase
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.user.id);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return;

    await supabase.auth.signOut();
    setUser(null);
    setDbUser(null);
    setCompany(null);
    setSession(null);
  };

  const refreshUserData = async () => {
    if (!isSupabaseConfigured) return;
    const currentUser = user;
    if (currentUser) {
      await fetchUserData(currentUser.id);
    }
  };

  const resetPassword = async (email: string): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Authentication is not configured') };
    }

    try {
      // Use the server-side /api/reset-password route which calls the admin
      // API's generateLink({ type: 'recovery' }). This works even when the
      // user was created with email_confirm: false (the client-side
      // resetPasswordForEmail silently skips unconfirmed users).
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        return { error: new Error(data.error || 'Failed to send reset email') };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Memoize the context value so consumers only re-render when actual auth
  // data changes — not on every AuthProvider render.
  const value = useMemo(() => ({
    user,
    dbUser,
    company,
    session,
    isLoading,
    authError,
    isConfigured: isSupabaseConfigured,
    signUp,
    signIn,
    signOut,
    resetPassword,
    refreshUserData,
  }), [user, dbUser, company, session, isLoading, authError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
