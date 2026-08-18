'use client';

/**
 * Unsubscribe confirmation.
 *
 * Deliberately a click rather than an automatic opt-out on page load: email
 * clients and corporate security scanners pre-fetch links, and an unsubscribe
 * that fires on load silently removes people who never opened the mail.
 */

import { use, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle, Loader2, MailX } from 'lucide-react';

export default function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');

  const unsubscribe = async () => {
    setStatus('working');
    try {
      const res = await fetch('/api/growth/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      setStatus(res.ok ? 'done' : 'error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md w-full text-center">
        <Link href="/" className="inline-block mb-6">
          <Image src="/logo-01262026.png" alt="Task Iguana" width={160} height={36} className="h-9 w-auto mx-auto" />
        </Link>

        {status === 'done' ? (
          <>
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900">You&apos;re unsubscribed</h1>
            <p className="text-gray-600 mt-2">
              We won&apos;t send you any more marketing email. You may still get messages you
              specifically ask for, like results from our free tools.
            </p>
          </>
        ) : (
          <>
            <MailX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900">Unsubscribe from emails?</h1>
            <p className="text-gray-600 mt-2">
              You&apos;ll stop receiving marketing email from Task Iguana.
            </p>

            {status === 'error' && (
              <p className="text-sm text-red-600 mt-4">
                Something went wrong. Please email support@taskiguana.com and we&apos;ll take care
                of it.
              </p>
            )}

            <button
              onClick={unsubscribe}
              disabled={status === 'working'}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-[#0A0C11] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#2d2d44] disabled:opacity-60"
            >
              {status === 'working' && <Loader2 className="w-4 h-4 animate-spin" />}
              {status === 'working' ? 'Unsubscribing…' : 'Yes, unsubscribe me'}
            </button>

            <Link href="/" className="block mt-4 text-sm text-gray-500 hover:text-gray-700">
              Never mind, take me back
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
