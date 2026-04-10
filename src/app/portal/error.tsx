'use client';

import { useEffect } from 'react';

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Portal error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm p-8 max-w-sm w-full text-center">
        <div className="text-4xl mb-4">!</div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-gray-500 mb-6">
          We encountered an unexpected error. Please try again.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-navy-500 text-white rounded-xl font-medium hover:bg-navy-600 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
