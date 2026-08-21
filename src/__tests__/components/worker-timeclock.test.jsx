/**
 * Worker timeclock page — load-state and button-state regressions.
 *
 * The page renders ONE action button at a time, and TC-WORK-04 (cypress/e2e/
 * worker-flows.cy.js) drives it by that button's label. Every case below is a
 * state where the button the E2E expects is not the one on screen, which is
 * indistinguishable from "the app is broken" when it happens in CI against the
 * sandbox. They are asserted here, where the failure names its own cause.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Real English strings, so a label change that would break the E2E breaks here
// first rather than at 3am against the sandbox.
jest.mock('next-intl', () => {
  const messages = require('../../../messages/en/worker.json');
  return {
    useTranslations: (namespace) => (key) =>
      `${namespace}.${key}`
        .split('.')
        .reduce((node, part) => (node == null ? node : node[part]), messages) ?? `${namespace}.${key}`,
  };
});

// ── Supabase mock ────────────────────────────────────────────────────────────
// Chainable builder: every filter returns itself, `.single()` resolves, and the
// builder is thenable so `await supabase.from(t).select()...` works too.

let results = {};

function makeBuilder(table) {
  let mode = 'select';
  const resolve = () =>
    results[`${table}.${mode}`] ?? results[table] ?? { data: null, error: null };
  const builder = {
    select: () => builder,
    insert: () => {
      mode = 'insert';
      return builder;
    },
    update: () => {
      mode = 'update';
      return builder;
    },
    eq: () => builder,
    is: () => builder,
    gte: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => builder,
    single: () => Promise.resolve(resolve()),
    then: (onFulfilled, onRejected) => Promise.resolve(resolve()).then(onFulfilled, onRejected),
  };
  return builder;
}

const mockGetUser = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: (...args) => mockGetUser(...args) },
    from: (table) => makeBuilder(table),
  },
}));

import TimeclockPage from '@/app/worker/timeclock/page';

// `.single()` with no matching row — the ordinary clocked-out case, not a fault.
const NO_ROWS = { data: null, error: { code: 'PGRST116', message: 'no rows' } };

const OPEN_ENTRY = {
  id: 'entry-1',
  job_id: null,
  clock_in: new Date().toISOString(),
  clock_out: null,
  clock_in_location: null,
  clock_out_location: null,
};

beforeEach(() => {
  jest.spyOn(window, 'alert').mockImplementation(() => {});
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  results = {
    users: { data: { company_id: 'company-1' }, error: null },
    time_entries: NO_ROWS,
    breaks: NO_ROWS,
    job_assignments: { data: [], error: null },
    jobs: { data: [], error: null },
  };
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('worker timeclock — load states', () => {
  it('renders CLOCK IN once the clock state resolves', async () => {
    render(<TimeclockPage />);

    expect(await screen.findByRole('button', { name: /clock in/i })).toBeInTheDocument();
  });

  it('shows an error with a retry instead of spinning forever when the profile lookup fails', async () => {
    // The regression: setLoading(false) used to live only on the happy path, so
    // this left a bare spinner — no error, no button, no way out.
    results.users = { data: null, error: { code: '500', message: 'boom' } };

    render(<TimeclockPage />);

    expect(await screen.findByText(/couldn't load your timeclock/i)).toBeInTheDocument();
    // Supabase rejects with a plain object; the underlying message has to make
    // it to the screen, not "[object Object]".
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clock (in|out)/i })).not.toBeInTheDocument();
  });

  it('recovers when the retry succeeds', async () => {
    results.users = { data: null, error: { code: '500', message: 'boom' } };

    render(<TimeclockPage />);
    const retry = await screen.findByRole('button', { name: /try again/i });

    results.users = { data: { company_id: 'company-1' }, error: null };
    fireEvent.click(retry);

    expect(await screen.findByRole('button', { name: /clock in/i })).toBeInTheDocument();
  });

  it('does not report clocked-out when the time-entry query fails', async () => {
    // Rendering CLOCK IN here is the dangerous wrong answer: the worker taps it
    // and opens a second concurrent entry.
    results.time_entries = { data: null, error: { code: '500', message: 'boom' } };

    render(<TimeclockPage />);

    expect(await screen.findByText(/couldn't load your timeclock/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clock (in|out)/i })).not.toBeInTheDocument();
  });
});

describe('worker timeclock — which action button renders', () => {
  it('renders CLOCK OUT when an entry is open', async () => {
    results.time_entries = { data: OPEN_ENTRY, error: null };

    render(<TimeclockPage />);

    expect(await screen.findByRole('button', { name: /clock out/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clock in/i })).not.toBeInTheDocument();
  });

  it('renders END BREAK — and NEITHER clock button — while on a break', async () => {
    // The third state. TC-WORK-04 has to clear the break before it can clock
    // out, and a reset that only knows clocked-in/clocked-out wedges here.
    results.time_entries = { data: OPEN_ENTRY, error: null };
    results.breaks = {
      data: { id: 'break-1', time_entry_id: 'entry-1', break_type: 'meal', break_start: new Date().toISOString() },
      error: null,
    };

    render(<TimeclockPage />);

    expect(await screen.findByRole('button', { name: /end break/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clock (in|out)/i })).not.toBeInTheDocument();
  });

  it('surfaces a failed clock-in instead of silently doing nothing', async () => {
    results['time_entries.insert'] = { data: null, error: { code: '500', message: 'insert denied' } };

    render(<TimeclockPage />);
    fireEvent.click(await screen.findByRole('button', { name: /clock in/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('insert denied'));
    });
    // Still clocked out, and now the worker knows why.
    expect(screen.getByRole('button', { name: /clock in/i })).toBeInTheDocument();
  });
});
