/**
 * Tests for the customer-facing quote view & approval/rejection flow.
 *
 * QuoteViewClient.tsx talks directly to Supabase (no API route) when a
 * customer views, approves, or rejects a quote. This test suite validates
 * those Supabase interactions and the resulting UI state changes.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Canvas mock (jsdom has no canvas support) ────────────────────────────────

const mockContext = {
  scale: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  closePath: jest.fn(),
  clearRect: jest.fn(),
  set lineCap(_v) {},
  set strokeStyle(_v) {},
  set lineWidth(_v) {},
};

HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext);
HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,fakesignature');

// ── Supabase mock ────────────────────────────────────────────────────────────

const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();
const mockOrder = jest.fn();

// Chainable query builder
function chainableQuery(resolvedData, resolvedError = null) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: resolvedData, error: resolvedError }),
    order: jest.fn().mockResolvedValue({ data: resolvedData, error: resolvedError }),
    update: jest.fn().mockReturnThis(),
  };
  return chain;
}

// Build a fresh mock per test
let mockQuoteQuery;
let mockItemsQuery;
let mockUpdateQuery;

function buildSupabaseMock() {
  return {
    from: jest.fn((table) => {
      if (table === 'quotes') {
        // Return different chains depending on whether it's a read or update
        return mockQuoteQuery;
      }
      if (table === 'quote_items') {
        return mockItemsQuery;
      }
      return chainableQuery(null, { message: 'unknown table' });
    }),
  };
}

let mockSupabase;

jest.mock('@/lib/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

// ── Mock next/image (jsdom can't render) ─────────────────────────────────────

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// ── Mock lucide-react icons ──────────────────────────────────────────────────

jest.mock('lucide-react', () => ({
  Loader2: (props) => <div data-testid="loader" {...props} />,
  AlertCircle: (props) => <div data-testid="alert-circle" {...props} />,
}));

// ── Import component AFTER mocks ─────────────────────────────────────────────

import CustomerQuoteView from '@/app/quote/[id]/QuoteViewClient';

// ── Test data ────────────────────────────────────────────────────────────────

const sampleQuote = {
  id: 'q-real-123',
  quote_number: 'QT-2026-050',
  status: 'sent',
  created_at: '2026-03-01',
  valid_until: '2026-04-01',
  subtotal: 500,
  tax_rate: 10,
  tax_amount: 50,
  discount_amount: 0,
  total: 550,
  notes: 'Please call before arriving.',
  approved_at: null,
  signature_url: null,
  company: {
    id: 'comp-1',
    name: 'Acme Services',
    phone: '(555) 111-2222',
    email: 'info@acme.com',
    logo_url: null,
    address: '100 Main St',
    city: 'Austin',
    state: 'TX',
    zip: '73301',
  },
  customer: {
    id: 'cust-1',
    name: 'Alice Johnson',
    phone: '(555) 333-4444',
    email: 'alice@email.com',
    address: '200 Elm St',
    city: 'Austin',
    state: 'TX',
    zip: '73302',
  },
};

const sampleItems = [
  { id: 'i1', description: 'Lawn care', quantity: 2, unit_price: 150, total_price: 300 },
  { id: 'i2', description: 'Hedge trimming', quantity: 1, unit_price: 200, total_price: 200 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function setupQuoteQuery(quoteData, quoteError = null) {
  // The component tries .eq('id', ...).single() first, then falls back to
  // .eq('quote_number', ...).single(). We simulate the primary lookup succeeding.
  mockQuoteQuery = {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: quoteData, error: quoteError }),
      }),
    }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };
}

function setupItemsQuery(itemsData) {
  mockItemsQuery = {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: itemsData, error: null }),
      }),
    }),
  };
}

function renderQuoteView(id = 'q-real-123') {
  return render(<CustomerQuoteView params={{ id }} />);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CustomerQuoteView – customer flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupQuoteQuery(sampleQuote);
    setupItemsQuery(sampleItems);
    mockSupabase = buildSupabaseMock();
  });

  // ── Loading & Fetching ──────────────────────────────────────────────────

  it('shows a loading spinner while fetching the quote', () => {
    // Override to never resolve
    mockQuoteQuery.select = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockReturnValue(new Promise(() => {})),
      }),
    });
    mockSupabase = buildSupabaseMock();

    renderQuoteView();
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('renders quote details after fetch', async () => {
    renderQuoteView();

    await waitFor(() => {
      expect(screen.getByText('Acme Services')).toBeInTheDocument();
    });

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Lawn care')).toBeInTheDocument();
    expect(screen.getByText('Hedge trimming')).toBeInTheDocument();
    expect(screen.getByText('$550.00')).toBeInTheDocument();
    expect(screen.getByText(/Please call before arriving/)).toBeInTheDocument();
  });

  it('shows "Quote Not Found" on fetch error', async () => {
    setupQuoteQuery(null, { message: 'not found' });
    // Also make the fallback (quote_number lookup) fail
    mockQuoteQuery.select = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
      }),
    });
    mockSupabase = buildSupabaseMock();

    renderQuoteView('nonexistent-id');

    await waitFor(() => {
      expect(screen.getByText('Quote Not Found')).toBeInTheDocument();
    });
  });

  // ── Auto "viewed" status update ─────────────────────────────────────────

  it('marks a "sent" quote as "viewed" on load', async () => {
    renderQuoteView();

    await waitFor(() => {
      expect(screen.getByText('Acme Services')).toBeInTheDocument();
    });

    // The component should have called update on the quotes table
    expect(mockSupabase.from).toHaveBeenCalledWith('quotes');
    expect(mockQuoteQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'viewed',
        viewed_at: expect.any(String),
      })
    );
  });

  it('does NOT mark quote as viewed if status is not "sent"', async () => {
    const viewedQuote = { ...sampleQuote, status: 'viewed' };
    setupQuoteQuery(viewedQuote);
    mockSupabase = buildSupabaseMock();

    renderQuoteView();

    await waitFor(() => {
      expect(screen.getByText('Acme Services')).toBeInTheDocument();
    });

    expect(mockQuoteQuery.update).not.toHaveBeenCalled();
  });

  // ── Demo quote handling ─────────────────────────────────────────────────

  it('renders demo quote without hitting Supabase', async () => {
    renderQuoteView('demo');

    await waitFor(() => {
      expect(screen.getByText('Green Valley Landscaping')).toBeInTheDocument();
    });

    expect(screen.getByText('John Smith')).toBeInTheDocument();
    // Supabase should not have been called for demo
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  // ── Approval flow ──────────────────────────────────────────────────────

  it('opens signature modal when approve is clicked without signature', async () => {
    renderQuoteView();

    await waitFor(() => {
      expect(screen.getByText('Acme Services')).toBeInTheDocument();
    });

    // Click approve without a signature → should show signature modal
    const approveBtn = screen.getByText(/Sign & Approve/);
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(screen.getByText('Sign to Approve')).toBeInTheDocument();
    });
  });

  it('approves quote with signature and updates Supabase', async () => {
    renderQuoteView();

    await waitFor(() => {
      expect(screen.getByText('Acme Services')).toBeInTheDocument();
    });

    // Click approve → opens signature modal
    fireEvent.click(screen.getByText(/Sign & Approve/));

    await waitFor(() => {
      expect(screen.getByText('Sign to Approve')).toBeInTheDocument();
    });

    // Save signature (canvas.toDataURL returns empty in jsdom, but the flow still works)
    fireEvent.click(screen.getByText('Save'));

    // Now the approve button should show with the total
    await waitFor(() => {
      expect(screen.getByText(/Approve Quote/)).toBeInTheDocument();
    });

    // Reset update mock to track the approval call specifically
    mockQuoteQuery.update.mockClear();
    mockQuoteQuery.update.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    // Click the final approve
    fireEvent.click(screen.getByText(/Approve Quote/));

    await waitFor(() => {
      expect(screen.getByText('Quote Approved!')).toBeInTheDocument();
    });

    // Verify Supabase was called with correct approval data
    expect(mockQuoteQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved',
        approved_at: expect.any(String),
        signature_url: expect.any(String),
      })
    );
  });

  it('does NOT call Supabase for demo quotes (renders without DB calls)', async () => {
    renderQuoteView('demo');

    await waitFor(() => {
      expect(screen.getByText('Green Valley Landscaping')).toBeInTheDocument();
    });

    // Demo quote has a past valid_until date, so it shows as expired.
    // The key assertion: Supabase was never called for demo data.
    expect(mockSupabase.from).not.toHaveBeenCalled();

    // Verify demo data rendered correctly
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('$303.10')).toBeInTheDocument();
  });

  // ── Rejection flow ─────────────────────────────────────────────────────

  it('shows rejection reason picker when Decline is clicked', async () => {
    renderQuoteView();

    await waitFor(() => {
      expect(screen.getByText('Acme Services')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Decline'));

    await waitFor(() => {
      expect(screen.getByText('Why are you declining?')).toBeInTheDocument();
    });

    // All predefined reasons should be shown
    expect(screen.getByText('Price too high')).toBeInTheDocument();
    expect(screen.getByText('Found another provider')).toBeInTheDocument();
    expect(screen.getByText('Project cancelled')).toBeInTheDocument();
    expect(screen.getByText('Need different services')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('rejects quote with a reason and updates Supabase', async () => {
    renderQuoteView();

    await waitFor(() => {
      expect(screen.getByText('Acme Services')).toBeInTheDocument();
    });

    // Open decline panel
    fireEvent.click(screen.getByText('Decline'));
    await waitFor(() => expect(screen.getByText('Why are you declining?')).toBeInTheDocument());

    // Pick a reason
    fireEvent.click(screen.getByText('Price too high'));

    // Reset update mock to only track the rejection call
    mockQuoteQuery.update.mockClear();
    mockQuoteQuery.update.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    // Confirm decline
    fireEvent.click(screen.getByText('Decline Quote'));

    await waitFor(() => {
      expect(screen.getByText('Quote Declined')).toBeInTheDocument();
    });

    // Verify Supabase was called with rejection data
    expect(mockQuoteQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'rejected',
        notes: expect.stringContaining('Price too high'),
      })
    );
  });

  it('appends rejection reason to existing notes', async () => {
    renderQuoteView();

    await waitFor(() => {
      expect(screen.getByText('Acme Services')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Decline'));
    await waitFor(() => expect(screen.getByText('Why are you declining?')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Project cancelled'));

    mockQuoteQuery.update.mockClear();
    mockQuoteQuery.update.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    fireEvent.click(screen.getByText('Decline Quote'));

    await waitFor(() => {
      expect(screen.getByText('Quote Declined')).toBeInTheDocument();
    });

    // The notes field should contain the original note + rejection reason
    const updateCall = mockQuoteQuery.update.mock.calls[0][0];
    expect(updateCall.notes).toContain('Please call before arriving');
    expect(updateCall.notes).toContain('Rejection reason: Project cancelled');
  });

  it('cancels rejection and returns to action buttons', async () => {
    renderQuoteView();

    await waitFor(() => {
      expect(screen.getByText('Acme Services')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Decline'));
    await waitFor(() => expect(screen.getByText('Why are you declining?')).toBeInTheDocument());

    // Click cancel
    fireEvent.click(screen.getByText('Cancel'));

    // Action buttons should be back
    await waitFor(() => {
      expect(screen.getByText(/Sign & Approve/)).toBeInTheDocument();
    });
  });

  // ── Expired quote ──────────────────────────────────────────────────────

  it('shows expired notice and hides action buttons for expired quotes', async () => {
    const expiredQuote = { ...sampleQuote, status: 'viewed', valid_until: '2020-01-01' };
    setupQuoteQuery(expiredQuote);
    mockSupabase = buildSupabaseMock();

    renderQuoteView();

    await waitFor(() => {
      expect(screen.getByText('This quote has expired')).toBeInTheDocument();
    });

    // Approve/Decline buttons should NOT be present
    expect(screen.queryByText(/Sign & Approve/)).not.toBeInTheDocument();
    expect(screen.queryByText('Decline')).not.toBeInTheDocument();
  });

  // ── Error handling during approval ──────────────────────────────────────

  it('shows alert when Supabase update fails during approval', async () => {
    renderQuoteView();

    await waitFor(() => {
      expect(screen.getByText('Acme Services')).toBeInTheDocument();
    });

    // Sign
    fireEvent.click(screen.getByText(/Sign & Approve/));
    await waitFor(() => expect(screen.getByText('Sign to Approve')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByText(/Approve Quote/)).toBeInTheDocument());

    // Make update fail
    mockQuoteQuery.update.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    });

    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    fireEvent.click(screen.getByText(/Approve Quote/));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to approve quote. Please try again.');
    });

    alertSpy.mockRestore();
  });

  it('shows alert when Supabase update fails during rejection', async () => {
    renderQuoteView();

    await waitFor(() => {
      expect(screen.getByText('Acme Services')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Decline'));
    await waitFor(() => expect(screen.getByText('Why are you declining?')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Other'));

    // Make update fail
    mockQuoteQuery.update.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    });

    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    fireEvent.click(screen.getByText('Decline Quote'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to decline quote. Please try again.');
    });

    alertSpy.mockRestore();
  });
});
