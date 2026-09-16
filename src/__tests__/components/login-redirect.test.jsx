/**
 * Post-login navigation must be a single router.push().
 *
 * Both login pages used to call router.push(dest) and then router.refresh()
 * back to back. The two run as concurrent transitions: the refresh re-renders
 * the root layout for the CURRENT url (still the login page) while the push is
 * swapping in the destination, and React then throws
 *   NotFoundError: Failed to execute 'removeChild' on 'Node'
 * which drops the user on the "Something went wrong on our end" error boundary
 * until they reload. It is a timing race, so the Cypress suite can only catch
 * it sometimes; this test pins the shape of the fix so it cannot come back
 * unnoticed.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const router = { push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), back: jest.fn(), prefetch: jest.fn() };
let searchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/auth/login',
  useSearchParams: () => searchParams,
  useParams: () => ({}),
}));

// Minimal Supabase: a signed-in owner whose company finished onboarding.
const USER = { id: 'u1', email: 'owner@example.com' };
const rows = {
  users: { data: { id: 'u1', role: 'owner', company_id: 'co', full_name: 'Owner' }, error: null },
  companies: { data: { onboarding_completed: true }, error: null },
};
const mockSignIn = jest.fn(async () => ({ data: { user: USER, session: { access_token: 'tok' } }, error: null }));
jest.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      signInWithPassword: (...a) => mockSignIn(...a),
      getSession: async () => ({ data: { session: { access_token: 'tok', user: USER } } }),
      getUser: async () => ({ data: { user: USER } }),
      signOut: jest.fn(async () => ({ error: null })),
    },
    from: (table) => {
      const b = {
        select: () => b,
        update: () => b,
        eq: () => b,
        single: async () => rows[table] || { data: null, error: null },
        then: (resolve) => resolve(rows[table] || { data: null, error: null }),
      };
      return b;
    },
  },
}));

jest.mock('@/hooks/useSessionGuard', () => ({ registerSession: jest.fn(async () => {}) }));

jest.mock('@/contexts/AuthContext', () => {
  const { supabase } = require('@/lib/supabase');
  return {
    useAuth: () => ({
      authError: null,
      isConfigured: true,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
      },
      signInWithGoogle: jest.fn(),
    }),
  };
});

global.fetch = jest.fn(async (url) => {
  const ok = (json) => ({ ok: true, status: 200, json: async () => json });
  const u = String(url);
  if (u.includes('/api/auth/2fa/check-device')) return ok({ required: false, trusted: true });
  if (u.includes('/api/auth/check-needs-password')) return ok({ needsPassword: false });
  return ok({});
});

function submit(container, email, password) {
  fireEvent.change(container.querySelector('input[type="email"]'), { target: { value: email } });
  fireEvent.change(container.querySelector('input[type="password"]'), { target: { value: password } });
  fireEvent.click(container.querySelector('button[type="submit"]'));
}

beforeEach(() => {
  jest.clearAllMocks();
  searchParams = new URLSearchParams();
});

describe('owner/admin login (src/app/auth/login)', () => {
  const Page = require('@/app/auth/login/page').default;

  it('redirects to /dashboard with one push and never calls router.refresh()', async () => {
    const { container } = render(<Page />);
    submit(container, 'owner@example.com', 'hunter22');

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/dashboard'));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.refresh).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  it('honours a same-origin ?redirect= target, still without a refresh', async () => {
    searchParams = new URLSearchParams('redirect=/dashboard/invoices');
    const { container } = render(<Page />);
    submit(container, 'owner@example.com', 'hunter22');

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/dashboard/invoices'));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('ignores an off-site ?redirect= target', async () => {
    searchParams = new URLSearchParams('redirect=https://evil.example/phish');
    const { container } = render(<Page />);
    submit(container, 'owner@example.com', 'hunter22');

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/dashboard'));
    expect(router.push).toHaveBeenCalledTimes(1);
  });
});

describe('worker login (src/app/worker/login)', () => {
  const Page = require('@/app/worker/login/page').default;

  it('redirects to /worker/timeclock with one push and never calls router.refresh()', async () => {
    const { container } = render(<Page />);
    submit(container, 'worker@example.com', 'hunter22');

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/worker/timeclock'));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
