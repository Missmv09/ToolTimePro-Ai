/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor, act } from '@testing-library/react';

// Mock data
const COMPANY_ID = 'company-123';

const mockJobs = [
  {
    id: 'job-1',
    title: 'Fix plumbing',
    scheduled_date: '2026-03-20',
    scheduled_time_start: '09:00',
    scheduled_time_end: '11:00',
    status: 'scheduled',
    priority: 'high',
    customer: { name: 'John Doe' },
  },
  {
    id: 'job-2',
    title: 'Install AC',
    scheduled_date: '2026-03-18',
    scheduled_time_start: null,
    scheduled_time_end: null,
    status: 'in_progress',
    priority: 'urgent',
    customer: { name: 'Jane Smith' },
  },
  {
    id: 'job-3',
    title: 'Paint walls',
    scheduled_date: '2026-03-23',
    scheduled_time_start: '14:00',
    scheduled_time_end: '16:00',
    status: 'scheduled',
    priority: 'normal',
    customer: null,
  },
];

// Build chainable mock query
const mockOrder = jest.fn();
const mockLt = jest.fn(() => ({ order: mockOrder }));
const mockIn = jest.fn(() => ({ lt: mockLt }));
const mockEq = jest.fn(() => ({ in: mockIn }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

const mockSubscribe = jest.fn().mockReturnValue({ id: 'sub-1' });
const mockOn = jest.fn().mockReturnValue({ subscribe: mockSubscribe });
const mockChannel = jest.fn().mockReturnValue({ on: mockOn });
const mockRemoveChannel = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
    channel: (...args) => mockChannel(...args),
    removeChannel: (...args) => mockRemoveChannel(...args),
  },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    company: { id: COMPANY_ID },
  })),
}));

const { useAuth } = require('@/contexts/AuthContext');
const { useOverdueJobs } = require('@/hooks/useOverdueJobs');

describe('useOverdueJobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ company: { id: COMPANY_ID } });
    mockOrder.mockResolvedValue({ data: mockJobs, error: null });
  });

  it('fetches overdue jobs for the company', async () => {
    const { result } = renderHook(() => useOverdueJobs());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFrom).toHaveBeenCalledWith('jobs');
    expect(mockEq).toHaveBeenCalledWith('company_id', COMPANY_ID);
    expect(mockIn).toHaveBeenCalledWith('status', ['scheduled', 'in_progress']);
    expect(result.current.overdueJobs).toHaveLength(3);
  });

  it('calculates stats correctly', async () => {
    const { result } = renderHook(() => useOverdueJobs());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.stats.total).toBe(3);
    expect(result.current.stats.highPriority).toBe(1);
    expect(result.current.stats.urgent).toBe(1);
  });

  it('calculates days_overdue for each job', async () => {
    const { result } = renderHook(() => useOverdueJobs());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.overdueJobs.forEach((job) => {
      expect(job.days_overdue).toBeGreaterThanOrEqual(1);
      expect(typeof job.days_overdue).toBe('number');
    });
  });

  it('handles array customer field from supabase', async () => {
    mockOrder.mockResolvedValue({
      data: [
        {
          ...mockJobs[0],
          customer: [{ name: 'Array Customer' }],
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useOverdueJobs());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.overdueJobs[0].customer).toEqual({ name: 'Array Customer' });
  });

  it('returns empty list when no company', async () => {
    useAuth.mockReturnValue({ company: null });

    const { result } = renderHook(() => useOverdueJobs());

    // Should stay in loading state but have no jobs
    expect(result.current.overdueJobs).toHaveLength(0);
    expect(result.current.stats.total).toBe(0);
  });

  it('handles fetch errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockOrder.mockResolvedValue({ data: null, error: new Error('DB error') });

    const { result } = renderHook(() => useOverdueJobs());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.overdueJobs).toHaveLength(0);
    expect(result.current.stats.total).toBe(0);
    consoleSpy.mockRestore();
  });

  it('returns empty when data is null without error', async () => {
    mockOrder.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useOverdueJobs());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.overdueJobs).toHaveLength(0);
  });

  it('sets up real-time subscription', async () => {
    renderHook(() => useOverdueJobs());

    await waitFor(() => expect(mockChannel).toHaveBeenCalledWith('overdue-jobs-changes'));

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'jobs',
        filter: `company_id=eq.${COMPANY_ID}`,
      }),
      expect.any(Function)
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('cleans up subscription on unmount', async () => {
    const { unmount } = renderHook(() => useOverdueJobs());

    await waitFor(() => expect(mockSubscribe).toHaveBeenCalled());

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('exposes a refetch function', async () => {
    const { result } = renderHook(() => useOverdueJobs());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(typeof result.current.refetch).toBe('function');

    // Reset and refetch
    mockOrder.mockResolvedValue({ data: [], error: null });
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.overdueJobs).toHaveLength(0);
    expect(result.current.stats.total).toBe(0);
  });
});
