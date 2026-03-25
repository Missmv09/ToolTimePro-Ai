/**
 * @jest-environment jsdom
 */
import React from 'react';

// We test the widget logic by extracting key behaviors.
// Since JennyLiteWidget is a 'use client' component with complex state,
// we render it with React Testing Library.

// Mock fetch globally
global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Suppress console.error from expected missing APIs
beforeEach(() => {
  jest.clearAllMocks();
});

// Import after mocks are in place
const { render, screen, fireEvent, act, waitFor } = require('@testing-library/react');
const JennyLiteWidget = require('@/app/site/[slug]/JennyLiteWidget').default;

describe('JennyLiteWidget', () => {
  const defaultProps = {
    businessName: 'Test Plumbing Co',
    phone: '555-123-4567',
    accentColor: '#f5a623',
    position: 'right',
    isBetaTester: false,
    companyId: 'comp-123',
    siteId: 'site-456',
  };

  describe('Rendering', () => {
    it('renders the chat bubble button', () => {
      render(<JennyLiteWidget {...defaultProps} />);
      const bubble = screen.getByLabelText('Open chat');
      expect(bubble).toBeTruthy();
    });

    it('opens chat window when bubble is clicked', () => {
      render(<JennyLiteWidget {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Open chat'));
      // Should show the greeting message
      expect(screen.getByText(/Hi! I'm Jenny/)).toBeTruthy();
    });

    it('closes chat when close button is clicked', () => {
      render(<JennyLiteWidget {...defaultProps} />);
      fireEvent.click(screen.getByLabelText('Open chat'));
      // Both the header X and the bubble say "Close chat", use getAllByLabelText
      const closeButtons = screen.getAllByLabelText('Close chat');
      fireEvent.click(closeButtons[0]); // the header X button
      expect(screen.queryByText(/Hi! I'm Jenny/)).toBeNull();
    });
  });

  describe('Tier: Jenny Lite (non-beta)', () => {
    it('shows "Jenny" header (not Jenny AI)', () => {
      render(<JennyLiteWidget {...defaultProps} isBetaTester={false} />);
      fireEvent.click(screen.getByLabelText('Open chat'));
      expect(screen.getByText('Jenny')).toBeTruthy();
      expect(screen.queryByText('PRO')).toBeNull();
    });

    it('shows Lite quick replies (services, quote, area)', () => {
      render(<JennyLiteWidget {...defaultProps} isBetaTester={false} />);
      fireEvent.click(screen.getByLabelText('Open chat'));
      expect(screen.getByText('What services do you offer?')).toBeTruthy();
      expect(screen.getByText('How do I get a quote?')).toBeTruthy();
      expect(screen.getByText('What areas do you serve?')).toBeTruthy();
      // Should NOT show Pro-only quick replies
      expect(screen.queryByText('Book an appointment')).toBeNull();
    });

    it('does NOT show language switcher', () => {
      render(<JennyLiteWidget {...defaultProps} isBetaTester={false} />);
      fireEvent.click(screen.getByLabelText('Open chat'));
      expect(screen.queryByLabelText('Switch language')).toBeNull();
    });

    it('does NOT auto-detect Spanish', async () => {
      render(<JennyLiteWidget {...defaultProps} isBetaTester={false} />);
      fireEvent.click(screen.getByLabelText('Open chat'));

      const input = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(input, { target: { value: 'Hola' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // Should NOT switch to Spanish greeting (Lite doesn't auto-detect)
      await waitFor(() => {
        expect(screen.queryByText(/Soy Jenny AI/)).toBeNull();
      });
    });

    it('responds to "book appointment" with simple lead capture', async () => {
      render(<JennyLiteWidget {...defaultProps} isBetaTester={false} />);
      fireEvent.click(screen.getByLabelText('Open chat'));

      const input = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(input, { target: { value: 'I want to book an appointment' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText(/help you get an appointment/)).toBeTruthy();
      });
    });

    it('responds to quote request with simple capture', async () => {
      render(<JennyLiteWidget {...defaultProps} isBetaTester={false} />);
      fireEvent.click(screen.getByLabelText('Open chat'));

      const input = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(input, { target: { value: 'How much does it cost?' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText(/free estimate/)).toBeTruthy();
      });
    });
  });

  describe('Tier: Jenny Pro (beta tester)', () => {
    const proProps = { ...defaultProps, isBetaTester: true };

    it('shows "Jenny AI" header with PRO badge', () => {
      render(<JennyLiteWidget {...proProps} />);
      fireEvent.click(screen.getByLabelText('Open chat'));
      expect(screen.getByText('Jenny AI')).toBeTruthy();
      expect(screen.getByText('PRO')).toBeTruthy();
    });

    it('shows Pro quick replies (book, services, quote, talk)', () => {
      render(<JennyLiteWidget {...proProps} />);
      fireEvent.click(screen.getByLabelText('Open chat'));
      expect(screen.getByText('Book an appointment')).toBeTruthy();
      expect(screen.getByText('What services do you offer?')).toBeTruthy();
      expect(screen.getByText('Get a free quote')).toBeTruthy();
      expect(screen.getByText('Talk to someone')).toBeTruthy();
    });

    it('shows language switcher button', () => {
      render(<JennyLiteWidget {...proProps} />);
      fireEvent.click(screen.getByLabelText('Open chat'));
      expect(screen.getByLabelText('Switch language')).toBeTruthy();
      expect(screen.getByText('Español')).toBeTruthy();
    });

    it('switches to Spanish when language button clicked', () => {
      render(<JennyLiteWidget {...proProps} />);
      fireEvent.click(screen.getByLabelText('Open chat'));
      fireEvent.click(screen.getByText('Español'));
      expect(screen.getByText(/Soy Jenny AI/)).toBeTruthy();
      expect(screen.getByText('English')).toBeTruthy();
    });

    it('auto-detects Spanish when user types "Hola"', async () => {
      render(<JennyLiteWidget {...proProps} />);
      fireEvent.click(screen.getByLabelText('Open chat'));

      const input = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(input, { target: { value: 'Hola' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText(/Soy Jenny AI, la asistente inteligente/)).toBeTruthy();
      });
    });

    it('handles emergency intent with phone', async () => {
      render(<JennyLiteWidget {...proProps} />);
      fireEvent.click(screen.getByLabelText('Open chat'));

      const input = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(input, { target: { value: 'I have an emergency!' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText(/urgent needs, please call/)).toBeTruthy();
        expect(screen.getByText(/555-123-4567/)).toBeTruthy();
      });
    });

    it('handles "text me" intent', async () => {
      render(<JennyLiteWidget {...proProps} />);
      fireEvent.click(screen.getByLabelText('Open chat'));

      const input = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(input, { target: { value: 'Can you text me info?' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText(/Leave your phone number/)).toBeTruthy();
      });
    });
  });

  describe('Booking Flow (Pro)', () => {
    const proProps = { ...defaultProps, isBetaTester: true };

    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('starts guided booking when user clicks "Book an appointment"', async () => {
      render(<JennyLiteWidget {...proProps} />);
      fireEvent.click(screen.getByLabelText('Open chat'));

      // Click the quick reply
      fireEvent.click(screen.getByText('Book an appointment'));

      // Advance past the bot reply setTimeout (400ms for Pro)
      act(() => { jest.advanceTimersByTime(500); });

      expect(screen.getByText(/help you schedule a free quote/)).toBeTruthy();
      expect(screen.getByText(/What's your name/)).toBeTruthy();
    });

    it('walks through full booking flow: name → phone → service → urgency → preference', async () => {
      render(<JennyLiteWidget {...proProps} />);
      fireEvent.click(screen.getByLabelText('Open chat'));

      const getInput = () => screen.getByPlaceholderText(/answer|message/i);
      const sendMsg = (text) => {
        const input = getInput();
        fireEvent.change(input, { target: { value: text } });
        fireEvent.keyDown(input, { key: 'Enter' });
        // Advance past bot reply delay
        act(() => { jest.advanceTimersByTime(500); });
      };

      // Trigger booking
      sendMsg('I want to book an appointment');
      expect(screen.getByText(/What's your name/)).toBeTruthy();

      // Step 1: Name
      sendMsg('Maria Garcia');
      expect(screen.getByText(/Thanks Maria Garcia/)).toBeTruthy();

      // Step 2: Phone
      sendMsg('555-987-6543');
      expect(screen.getByText(/What service/)).toBeTruthy();

      // Step 3: Service
      sendMsg('Plumbing repair');
      expect(screen.getByText(/How soon/)).toBeTruthy();

      // Step 4: Urgency
      sendMsg('This week');
      expect(screen.getByText(/schedule a time for a quote/)).toBeTruthy();

      // Step 5: Preference
      sendMsg('Schedule a time please');
      expect(screen.getByText(/submitted your quote request/)).toBeTruthy();

      // Should call the booking API
      expect(global.fetch).toHaveBeenCalledWith('/api/bookings', expect.objectContaining({
        method: 'POST',
      }));
    });
  });

  describe('Lead Capture', () => {
    it('saves lead via API when contact info is provided (Lite)', async () => {
      render(<JennyLiteWidget {...defaultProps} isBetaTester={false} />);
      fireEvent.click(screen.getByLabelText('Open chat'));

      const input = screen.getByPlaceholderText('Type a message...');
      // Trigger a flow that asks for info
      fireEvent.change(input, { target: { value: 'I need a quote' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText(/free estimate/)).toBeTruthy();
      });

      // Provide name and phone
      fireEvent.change(input, { target: { value: 'John Doe 555-111-2222' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText(/passed your info/)).toBeTruthy();
      });

      // Should save lead via website-builder API
      expect(global.fetch).toHaveBeenCalledWith('/api/website-builder/leads/', expect.objectContaining({
        method: 'POST',
      }));
    });
  });

  describe('PublicSiteRenderer integration', () => {
    it('JennyLiteWidget is imported and rendered in PublicSiteRenderer', () => {
      // We verify the import path resolves correctly
      const PSR = require('@/app/site/[slug]/PublicSiteRenderer').default;
      expect(PSR).toBeDefined();

      const mockSite = {
        id: 'site-1',
        business_name: 'Test Biz',
        business_phone: '555-000-0000',
        business_email: 'test@test.com',
        site_content: {},
        company_id: 'comp-1',
      };
      const mockTemplate = {
        layout_config: { sections: ['hero'] },
        default_content: {},
      };

      // Render and check widget appears
      const { container } = render(
        <PSR site={mockSite} template={mockTemplate} isBetaTester={true} />
      );
      // The bubble button should be present
      expect(screen.getByLabelText('Open chat')).toBeTruthy();
    });
  });
});
