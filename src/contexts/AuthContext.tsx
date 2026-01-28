'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { User as DbUser, Company } from '@/types/database';

interface AuthContextType {
  user: User | null;
  dbUser: DbUser | null;
  company: Company | null;
  session: Session | null;
  isLoading: boolean;
  authError: string | null;
  signUp: (email: string, password: string, fullName: string, companyName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Maximum time to wait for auth initialization (10 seconds)
const AUTH_TIMEOUT_MS = 10000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const initCompleteRef = useRef(false);

  // Fetch user profile and company data
  const fetchUserData = async (userId: string) => {
    try {
      // Fetch user profile
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

        // Fetch company data
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

    // Safety timeout - ensure loading completes within AUTH_TIMEOUT_MS
    const safetyTimeout = setTimeout(() => {
      if (!initCompleteRef.current && mountedRef.current) {
        console.warn('Auth initialization timeout reached, proceeding without auth');
        setIsLoading(false);
        setAuthError('Authentication timed out. Please refresh or try logging in again.');
      }
    }, AUTH_TIMEOUT_MS);

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        if (!mountedRef.current) return;

        if (error) {
          console.error('Error getting session:', error);
          setAuthError(error.message);
          setIsLoading(false);
          initCompleteRef.current = true;
          return;
        }

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          await fetchUserData(initialSession.user.id);
        }

        if (mountedRef.current) {
          setIsLoading(false);
          initCompleteRef.current = true;
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mountedRef.current) {
          setAuthError(error instanceof Error ? error.message : 'Authentication error');
          setIsLoading(false);
          initCompleteRef.current = true;
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mountedRef.current) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setAuthError(null);

        if (currentSession?.user) {
          await fetchUserData(currentSession.user.id);
        } else {
          setDbUser(null);
          setCompany(null);
        }

        setIsLoading(false);
        initCompleteRef.current = true;
      }
    );

    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    companyName: string
  ): Promise<{ error: Error | null }> => {
    try {
      // 1. Sign up the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) {
        return { error: authError };
      }

      if (!authData.user) {
        return { error: new Error('Failed to create user') };
      }

      // 2. Create the company
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          email: email,
        })
        .select()
        .single();

      if (companyError) {
        console.error('Error creating company:', companyError);
        return { error: companyError };
      }

      // 3. Create the user profile with owner role
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: email,
          full_name: fullName,
          company_id: companyData.id,
          role: 'owner',
        });

      if (userError) {
        console.error('Error creating user profile:', userError);
        return { error: userError };
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
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setDbUser(null);
    setCompany(null);
    setSession(null);
  };

  const resetPassword = async (email: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const value = {
    user,
    dbUser,
    company,
    session,
    isLoading,
    authError,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
