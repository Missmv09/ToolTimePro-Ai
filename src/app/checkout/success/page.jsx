'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      fetch(`/api/checkout/session?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => setSession(data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Processing your order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 text-center">

        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to ToolTime Pro!
        </h1>

        <p className="text-gray-600 mb-6">
          Your subscription is now active. Let&apos;s get your business set up.
        </p>

        {session && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-2">Order Summary</h3>
            <div className="text-sm text-gray-600 space-y-1">
              {session.metadata?.plan && (
                <p><span className="font-medium">Plan:</span> {session.metadata.plan.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
              )}
              {session.metadata?.billing && (
                <p><span className="font-medium">Billing:</span> {session.metadata.billing.charAt(0).toUpperCase() + session.metadata.billing.slice(1)}</p>
              )}
              {session.metadata?.addons && (
                <p><span className="font-medium">Add-ons:</span> {session.metadata.addons.replace(/_/g, ' ').replace(/,/g, ', ')}</p>
              )}
            </div>
          </div>
        )}

        <div className="bg-orange-50 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-orange-900 mb-2">What&apos;s Next?</h3>
          <ul className="text-sm text-orange-800 space-y-2">
            <li>1. Check your email for login details</li>
            <li>2. Complete your company profile</li>
            <li>3. Add your services and pricing</li>
            <li>4. Invite your team to the worker app</li>
          </ul>
        </div>

        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          Questions? Email us at{' '}
          <a href="mailto:support@tooltimepro.com" className="text-orange-500 hover:underline">
            support@tooltimepro.com
          </a>
        </p>

      </div>
    </div>
  );
}

export default function CheckoutSuccess() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
