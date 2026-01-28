'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { User as DbUser, Company } from '@/types/database';

// Timeout for auth initialization to prevent infinite loading
const AUTH_TIMEOUT_MS = 10000;

interface AuthContextType {
  user: User | null;
  dbUser: DbUser | null;
  company: Company | null;
  session: Session | null;
  isLoading: boolean;
  authError: string | null;
  isConfigured: boolean;
  signUp: (email: string, password: string, fullName: string, companyName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
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
    let timeoutId: NodeJS.Timeout;

    // If Supabase isn't configured, skip auth entirely
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured - running without authentication');
      setIsLoading(false);
      return;
    }

    const initializeAuth = async () => {
      // Set up timeout to prevent infinite loading - this covers the ENTIRE auth flow
      timeoutId = setTimeout(() => {
        if (mountedRef.current && isLoading) {
          console.warn('Auth loading timeout reached, proceeding without session');
          setIsLoading(false);
        }
      }, AUTH_TIMEOUT_MS);

      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        if (!mountedRef.current) return;

        if (error) {
          console.error('Error getting session:', error);
          setAuthError(error.message);
          clearTimeout(timeoutId);
          setIsLoading(false);
          return;
        }

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          await fetchUserData(initialSession.user.id);
        }

        if (mountedRef.current) {
          clearTimeout(timeoutId);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mountedRef.current) {
          setAuthError(error instanceof Error ? error.message : 'Authentication error');
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
        setUser(currentSession?.user ?? null);
        setAuthError(null);

        if (currentSession?.user) {
          // Don't await - let it run in background to avoid blocking
          fetchUserData(currentSession.user.id).catch(console.error);
        } else {
          setDbUser(null);
          setCompany(null);
        }

        setIsLoading(false);
      }
    );

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    companyName: string
  ): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Authentication is not configured') };
    }

    try {
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
    if (!isSupabaseConfigured) {
      return { error: new Error('Authentication is not configured') };
    }

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
    if (!isSupabaseConfigured) return;

    await supabase.auth.signOut();
    setUser(null);
    setDbUser(null);
    setCompany(null);
    setSession(null);
  };

  const resetPassword = async (email: string): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Authentication is not configured') };
    }

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
    isConfigured: isSupabaseConfigured,
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
