/**
 * Tests for AuthContext
 * Validates auth provider behavior, sign-in/up flows, and error handling
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';

// Use require-style references inside factory to avoid hoisting issues
jest.mock('@/lib/supabase', () => {
  const mockGetSession = jest.fn().mockResolvedValue({
    data: { session: null },
    error: null,
  });
  const mockOnAuthStateChange = jest.fn().mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } },
  });
  const mockSignUp = jest.fn();
  const mockSignInWithPassword = jest.fn();
  const mockSignOut = jest.fn().mockResolvedValue({ error: null });
  const mockResetPasswordForEmail = jest.fn();

  return {
    supabase: {
      auth: {
        getSession: mockGetSession,
        onAuthStateChange: mockOnAuthStateChange,
        signUp: mockSignUp,
        signInWithPassword: mockSignInWithPassword,
        signOut: mockSignOut,
        resetPasswordForEmail: mockResetPasswordForEmail,
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      }),
      rpc: jest.fn().mockResolvedValue({ error: null }),
    },
    isSupabaseConfigured: true,
  };
});

// Import after mock is set up
const { AuthProvider, useAuth } = require('@/contexts/AuthContext');
const { supabase } = require('@/lib/supabase');

function wrapper({ children }) {
  return React.createElement(AuthProvider, null, children);
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset default behaviors
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    supabase.auth.signOut.mockResolvedValue({ error: null });
  });

  it('initializes with loading state and resolves', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.isConfigured).toBe(true);
  });

  it('loads existing session on mount', async () => {
    const mockUser = { id: 'user-123', email: 'test@test.com' };
    const mockSession = { user: mockUser, access_token: 'token' };

    supabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.session).toEqual(mockSession);
  });

  it('signIn calls supabase auth', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'user-123' }, session: null }, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const { error } = await result.current.signIn('test@test.com', 'password');

    expect(error).toBeNull();
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: 'password',
    });
  });

  it('signIn returns error on failure', async () => {
    const authError = new Error('Invalid credentials');
    supabase.auth.signInWithPassword.mockResolvedValue({ error: authError });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const { error } = await result.current.signIn('bad@test.com', 'wrong');
    expect(error).toEqual(authError);
  });

  it('signOut clears all user state', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await result.current.signOut();

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.dbUser).toBeNull();
    expect(result.current.company).toBeNull();
  });

  it('resetPassword calls server-side reset endpoint', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const { error } = await result.current.resetPassword('test@test.com');

    expect(error).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/reset-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'test@test.com' }),
      })
    );

    delete global.fetch;
  });

  it('handles auth initialization error gracefully', async () => {
    supabase.auth.getSession.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.authError).toBeTruthy();
  });

  it('throws when useAuth is called outside AuthProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');

    spy.mockRestore();
  });
});
