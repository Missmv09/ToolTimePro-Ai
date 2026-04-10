/**
 * Tests for the customer-facing quote view & approval/rejection flow.
 *
 * QuoteViewClient.tsx uses API routes (/api/quote/public and /api/quote/respond)
 * for fetching and responding to quotes. This test suite validates those
 * interactions and the resulting UI state changes.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

// ── Supabase mock (still imported but no longer used for fetching) ───────────

jest.mock('@/lib/supabase', () => ({
  supabase: {},
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
  valid_until: '2027-12-31',
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

let fetchMock;

function mockFetchSuccess(quote = sampleQuote, items = sampleItems) {
  fetchMock = jest.fn((url) => {
    if (typeof url === 'string' && url.includes('/api/quote/public')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ quote, lineItems: items }),
      });
    }
    if (typeof url === 'string' && url.includes('/api/quote/respond')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'unknown' }) });
  });
  global.fetch = fetchMock;
}

function mockFetchNotFound() {
  fetchMock = jest.fn(() =>
    Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ error: 'Quote not found' }),
    })
  );
  global.fetch = fetchMock;
}

function mockFetchRespondError() {
  fetchMock = jest.fn((url) => {
    if (typeof url === 'string' && url.includes('/api/quote/public')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ quote: sampleQuote, lineItems: sampleItems }),
      });
    }
    if (typeof url === 'string' && url.includes('/api/quote/respond')) {
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'DB error' }),
      });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'unknown' }) });
  });
  global.fetch = fetchMock;
}

function renderQuoteView(id = 'q-real-123') {
  return render(<CustomerQuoteView params={{ id }} />);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CustomerQuoteView – customer flow', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchSuccess();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ── Loading & Fetching ──────────────────────────────────────────────────

  it('shows a loading spinner while fetching the quote', () => {
    // Override to never resolve
    global.fetch = jest.fn(() => new Promise(() => {}));

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
    mockFetchNotFound();

    renderQuoteView('nonexistent-id');

    await waitFor(() => {
      expect(screen.getByText('Quote Not Found')).toBeInTheDocument();
    });
  });

  it('calls the public API with the correct quote ID', async () => {
    renderQuoteView('my-quote-id');

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/quote/public?id=my-quote-id')
      );
    });
  });

  // ── Approval flow ──────────────────────────────────────────────────────

  it('opens signature modal when approve is clicked without signature', async () => {
    renderQuoteView();

    await waitFor(() => {
      expect(screen.getByText('Acme Services')).toBeInTheDocument();
    });

    const approveBtn = screen.getByText(/Sign & Approve/);
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(screen.getByText('Sign to Approve')).toBeInTheDocument();
    });
  });

  it('approves quote with signature and calls respond API', async () => {
    renderQuoteView();

    await waitFor(() => {
      expect(screen.getByText('Acme Services')).toBeInTheDocument();
    });

    // Click approve → opens signature modal
    fireEvent.click(screen.getByText(/Sign & Approve/));

    await waitFor(() => {
      expect(screen.getByText('Sign to Approve')).toBeInTheDocument();
    });

    // Save signature
    fireEvent.click(screen.getByText('Save'));

    // Now the approve button should show with the total
    await waitFor(() => {
      expect(screen.getByText(/Approve Quote/)).toBeInTheDocument();
    });

    // Click the final approve
    fireEvent.click(screen.getByText(/Approve Quote/));

    await waitFor(() => {
      expect(screen.getByText('Quote Approved!')).toBeInTheDocument();
    });

    // Verify respond API was called with correct data
    const respondCall = fetchMock.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('/api/quote/respond')
    );
    expect(respondCall).toBeTruthy();

    const body = JSON.parse(respondCall[1].body);
    expect(body.quoteId).toBe('q-real-123');
    expect(body.action).toBe('approve');
    expect(body.signature).toBe('data:image/png;base64,fakesignature');
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

    expect(screen.getByText('Price too high')).toBeInTheDocument();
    expect(screen.getByText('Found another provider')).toBeInTheDocument();
    expect(screen.getByText('Project cancelled')).toBeInTheDocument();
    expect(screen.getByText('Need different services')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('rejects quote with a reason and calls respond API', async () => {
    renderQuoteView();

    await waitFor(() => {
      expect(screen.getByText('Acme Services')).toBeInTheDocument();
    });

    // Open decline panel
    fireEvent.click(screen.getByText('Decline'));
    await waitFor(() => expect(screen.getByText('Why are you declining?')).toBeInTheDocument());

    // Pick a reason
    fireEvent.click(screen.getByText('Price too high'));

    // Confirm decline
    fireEvent.click(screen.getByText('Decline Quote'));

    await waitFor(() => {
      expect(screen.getByText('Quote Declined')).toBeInTheDocument();
    });

    // Verify respond API was called with rejection data
    const respondCall = fetchMock.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('/api/quote/respond')
    );
    expect(respondCall).toBeTruthy();

    const body = JSON.parse(respondCall[1].body);
    expect(body.quoteId).toBe('q-real-123');
    expect(body.action).toBe('reject');
    expect(body.rejectReason).toBe('Price too high');
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
    mockFetchSuccess(expiredQuote);

    renderQuoteView();

    await waitFor(() => {
      expect(screen.getByText('This quote has expired')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Sign & Approve/)).not.toBeInTheDocument();
    expect(screen.queryByText('Decline')).not.toBeInTheDocument();
  });

  // ── Already-approved / already-rejected quotes ────────────────────────

  it('shows approved state and hides action buttons for already-approved quotes', async () => {
    const approvedQuote = { ...sampleQuote, status: 'approved', approved_at: '2026-03-15' };
    mockFetchSuccess(approvedQuote);

    renderQuoteView();

    await waitFor(() => {
      expect(screen.getByText('Quote Approved!')).toBeInTheDocument();
    });

    // Action buttons should not be visible
    expect(screen.queryByText(/Sign & Approve/)).not.toBeInTheDocument();
    expect(screen.queryByText('Decline')).not.toBeInTheDocument();

    // Status badge should show approved
    expect(screen.getByText('✓ Approved')).toBeInTheDocument();
  });

  it('shows declined state and hides action buttons for already-rejected quotes', async () => {
    const rejectedQuote = { ...sampleQuote, status: 'rejected' };
    mockFetchSuccess(rejectedQuote);

    renderQuoteView();

    await waitFor(() => {
      expect(screen.getByText('Quote Declined')).toBeInTheDocument();
    });

    // Action buttons should not be visible
    expect(screen.queryByText(/Sign & Approve/)).not.toBeInTheDocument();
    expect(screen.queryByText('Decline')).not.toBeInTheDocument();
  });

  // ── Timezone-safe expiration ───────────────────────────────────────────

  it('does not falsely expire a quote valid until today', async () => {
    // valid_until = today → should NOT be expired
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const todayQuote = { ...sampleQuote, valid_until: todayStr };
    mockFetchSuccess(todayQuote);

    renderQuoteView();

    await waitFor(() => {
      expect(screen.getByText('Acme Services')).toBeInTheDocument();
    });

    // Should NOT show expired notice
    expect(screen.queryByText('This quote has expired')).not.toBeInTheDocument();

    // Action buttons should still be visible
    expect(screen.getByText(/Sign & Approve/)).toBeInTheDocument();
    expect(screen.getByText('Decline')).toBeInTheDocument();
  });

  // ── Inline error handling during approval ──────────────────────────────

  it('shows inline error when respond API fails during approval', async () => {
    mockFetchRespondError();

    renderQuoteView();

    await waitFor(() => {
      expect(screen.getByText('Acme Services')).toBeInTheDocument();
    });

    // Sign
    fireEvent.click(screen.getByText(/Sign & Approve/));
    await waitFor(() => expect(screen.getByText('Sign to Approve')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByText(/Approve Quote/)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Approve Quote/));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to approve quote. Please try again.')).toBeInTheDocument();
    });
  });

  it('shows inline error when respond API fails during rejection', async () => {
    mockFetchRespondError();

    renderQuoteView();

    await waitFor(() => {
      expect(screen.getByText('Acme Services')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Decline'));
    await waitFor(() => expect(screen.getByText('Why are you declining?')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Other'));

    fireEvent.click(screen.getByText('Decline Quote'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to decline quote. Please try again.')).toBeInTheDocument();
    });
  });

  it('dismisses inline error when dismiss button is clicked', async () => {
    mockFetchRespondError();

    renderQuoteView();

    await waitFor(() => {
      expect(screen.getByText('Acme Services')).toBeInTheDocument();
    });

    // Trigger an error
    fireEvent.click(screen.getByText(/Sign & Approve/));
    await waitFor(() => expect(screen.getByText('Sign to Approve')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByText(/Approve Quote/)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Approve Quote/));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Dismiss the error
    fireEvent.click(screen.getByLabelText('Dismiss error'));

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
