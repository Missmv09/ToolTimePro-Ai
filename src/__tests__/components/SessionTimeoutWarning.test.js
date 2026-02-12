import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock lucide-react Clock icon
jest.mock('lucide-react', () => ({
  Clock: (props) => <svg data-testid="clock-icon" {...props} />,
}));

const SessionTimeoutWarning = require('@/components/auth/SessionTimeoutWarning').default;

describe('SessionTimeoutWarning', () => {
  const defaultProps = {
    secondsRemaining: 120,
    onStayLoggedIn: jest.fn(),
    onLogOut: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the warning modal', () => {
    render(<SessionTimeoutWarning {...defaultProps} />);

    expect(screen.getByText('Session Expiring Soon')).toBeInTheDocument();
    expect(
      screen.getByText(/you will be automatically logged out/i)
    ).toBeInTheDocument();
  });

  it('displays time remaining in m:ss format when > 60 seconds', () => {
    render(<SessionTimeoutWarning {...defaultProps} secondsRemaining={125} />);

    expect(screen.getByText('2:05')).toBeInTheDocument();
  });

  it('displays time remaining in seconds format when <= 60 seconds', () => {
    render(<SessionTimeoutWarning {...defaultProps} secondsRemaining={45} />);

    expect(screen.getByText('45s')).toBeInTheDocument();
  });

  it('calls onStayLoggedIn when "Stay Logged In" is clicked', () => {
    const onStayLoggedIn = jest.fn();
    render(
      <SessionTimeoutWarning {...defaultProps} onStayLoggedIn={onStayLoggedIn} />
    );

    fireEvent.click(screen.getByText('Stay Logged In'));
    expect(onStayLoggedIn).toHaveBeenCalledTimes(1);
  });

  it('calls onLogOut when "Log Out Now" is clicked', () => {
    const onLogOut = jest.fn();
    render(
      <SessionTimeoutWarning {...defaultProps} onLogOut={onLogOut} />
    );

    fireEvent.click(screen.getByText('Log Out Now'));
    expect(onLogOut).toHaveBeenCalledTimes(1);
  });

  it('renders with zero seconds remaining', () => {
    render(<SessionTimeoutWarning {...defaultProps} secondsRemaining={0} />);

    expect(screen.getByText('0s')).toBeInTheDocument();
  });

  it('formats exactly 5 minutes correctly', () => {
    render(<SessionTimeoutWarning {...defaultProps} secondsRemaining={300} />);

    expect(screen.getByText('5:00')).toBeInTheDocument();
  });
});
