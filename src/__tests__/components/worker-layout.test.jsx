/**
 * Worker layout — the blank-page failure mode.
 *
 * The layout gates every /worker page. When its own auth check failed it fell
 * through to `if (!user) return null`, rendering an empty document: no
 * children, no error, no retry. That is invisible to a smoke test — an empty
 * body is still "visible", and body text with nothing in it contains no
 * 24-hour times — so TC-WORK-01 and TC-WORK-02 passed while the app was
 * blank, and only TC-WORK-04 (which needs a real button) caught it.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('next-intl', () => {
  const messages = require('../../../messages/en/worker.json');
  return {
    useTranslations: (namespace) => (key) =>
      `${namespace}.${key}`
        .split('.')
        .reduce((node, part) => (node == null ? node : node[part]), messages) ?? `${namespace}.${key}`,
  };
});

const mockPush = jest.fn();
let pathname = '/worker/timeclock';

jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: mockPush }),
}));

let usersResult = {};
const mockGetUser = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: (...args) => mockGetUser(...args),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    from: () => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        single: () => Promise.resolve(usersResult),
      };
      return builder;
    },
  },
}));

// Children of the layout, not the subject — stub them out.
jest.mock('@/components/auth/SessionTimeoutWarning', () => () => null);
jest.mock('@/hooks/useSessionTimeout', () => ({
  useSessionTimeout: () => ({ showWarning: false, secondsRemaining: 0, resetTimeout: jest.fn() }),
}));
jest.mock('@/contexts/WorkerAuthContext', () => ({
  WorkerAuthProvider: ({ children }) => <>{children}</>,
}));
jest.mock('@/components/worker/OfflineIndicator', () => ({
  OfflineIndicator: () => null,
  OfflineStatusDot: () => null,
}));
jest.mock('@/components/LanguageSwitcher', () => () => null);

import WorkerLayout from '@/app/worker/layout';

const WORKER = {
  id: 'user-1',
  full_name: 'Sam Worker',
  email: 'sam@example.com',
  role: 'worker',
  company_id: 'company-1',
  company: { name: 'Iguana Landscaping' },
};

beforeEach(() => {
  pathname = '/worker/timeclock';
  mockPush.mockClear();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  usersResult = { data: WORKER, error: null };
});

it('renders its children for a signed-in worker', async () => {
  render(<WorkerLayout><p>timeclock goes here</p></WorkerLayout>);

  expect(await screen.findByText('timeclock goes here')).toBeInTheDocument();
});

it('shows an error with a retry — not a blank page — when the profile lookup fails', async () => {
  // The join to `companies` carries its own RLS, so this fails for a worker who
  // can read their own users row perfectly well.
  usersResult = { data: null, error: { code: '42501', message: 'permission denied for table companies' } };

  render(<WorkerLayout><p>timeclock goes here</p></WorkerLayout>);

  expect(await screen.findByText(/couldn't load your account/i)).toBeInTheDocument();
  expect(screen.getByText(/permission denied for table companies/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
});

it('shows an error rather than a blank page when the profile row is missing', async () => {
  usersResult = { data: null, error: null };

  render(<WorkerLayout><p>timeclock goes here</p></WorkerLayout>);

  expect(await screen.findByText(/couldn't load your account/i)).toBeInTheDocument();
  expect(screen.queryByText('timeclock goes here')).not.toBeInTheDocument();
});

it('recovers when the retry succeeds', async () => {
  usersResult = { data: null, error: { code: '42501', message: 'permission denied' } };

  render(<WorkerLayout><p>timeclock goes here</p></WorkerLayout>);
  const retry = await screen.findByRole('button', { name: /try again/i });

  usersResult = { data: WORKER, error: null };
  fireEvent.click(retry);

  expect(await screen.findByText('timeclock goes here')).toBeInTheDocument();
});

it('still redirects to the login page when there is no session', async () => {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

  render(<WorkerLayout><p>timeclock goes here</p></WorkerLayout>);

  await screen.findByText((_, el) => el?.tagName === 'BODY');
  expect(mockPush).toHaveBeenCalledWith('/worker/login');
  expect(screen.queryByText(/couldn't load your account/i)).not.toBeInTheDocument();
});

it('redirects — does not show an error — when Supabase reports the session as missing', async () => {
  // Supabase returns BOTH a null user and an AuthSessionMissingError when there
  // is no session. Treating that error as a fault stranded signed-out workers on
  // an error card reading "Auth session missing!" instead of sending them to
  // the login page, which is exactly what the sandbox run showed.
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { name: 'AuthSessionMissingError', message: 'Auth session missing!', status: 400 },
  });

  render(<WorkerLayout><p>timeclock goes here</p></WorkerLayout>);

  await screen.findByText((_, el) => el?.tagName === 'BODY');
  expect(mockPush).toHaveBeenCalledWith('/worker/login');
  expect(screen.queryByText(/couldn't load your account/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/auth session missing/i)).not.toBeInTheDocument();
});

it('renders the login page itself without the auth gate', async () => {
  pathname = '/worker/login/';

  render(<WorkerLayout><p>login form</p></WorkerLayout>);

  expect(await screen.findByText('login form')).toBeInTheDocument();
});
