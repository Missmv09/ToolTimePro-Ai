'use client';

import { Clock } from 'lucide-react';

interface SessionTimeoutWarningProps {
  secondsRemaining: number;
  onStayLoggedIn: () => void;
  onLogOut: () => void;
}

export default function SessionTimeoutWarning({
  secondsRemaining,
  onStayLoggedIn,
  onLogOut,
}: SessionTimeoutWarningProps) {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeDisplay =
    minutes > 0
      ? `${minutes}:${seconds.toString().padStart(2, '0')}`
      : `${seconds}s`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Session Expiring Soon
          </h2>
        </div>

        <p className="text-gray-600 mb-2">
          For your security, you will be automatically logged out due to
          inactivity.
        </p>

        <p className="text-sm text-gray-500 mb-6">
          Time remaining:{' '}
          <span className="font-mono font-semibold text-amber-600">
            {timeDisplay}
          </span>
        </p>

        <div className="flex gap-3">
          <button
            onClick={onStayLoggedIn}
            className="flex-1 px-4 py-2.5 bg-navy-500 text-white rounded-lg font-medium hover:bg-navy-600 transition-colors"
          >
            Stay Logged In
          </button>
          <button
            onClick={onLogOut}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Log Out Now
          </button>
        </div>
      </div>
    </div>
  );
}
