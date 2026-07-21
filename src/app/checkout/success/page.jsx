'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useAuth } from '@/contexts/AuthContext';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const t = useTranslations('misc.checkoutSuccess');
  const { user } = useAuth();
  // Existing trial users who upgrade are already logged in — they don't need
  // the "check email / complete profile" onboarding steps.
  const isExistingUser = !!user;

  useEffect(() => {
    if (sessionId) {
      fetch(`/api/checkout/session?session_id=${sessionId}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`Failed to load checkout session (status ${res.status})`);
          }
          return res.json();
        })
        .then(data => setSession(data))
        .catch(err => {
          console.error(err);
          setError(err.message || 'Something went wrong loading your order details.');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  // Safety net: ensure the buyer's account is provisioned and the login /
  // set-password email is sent, even if the Stripe webhook never fired. The
  // endpoint is idempotent — if the webhook already created the company it
  // returns early without sending a duplicate email.
  useEffect(() => {
    if (!sessionId) return;
    fetch('/api/checkout/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    }).catch((err) => {
      // Non-blocking — the user has paid. Webhook or /auth/login can recover.
      console.error('Provision fallback failed:', err);
    });
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('processing')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <p className="text-red-700 font-medium mb-4">{error}</p>
          <Link
            href="/dashboard"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            {t('goToDashboard')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 text-center">

        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isExistingUser ? t('upgradedTitle') : t('checkEmailTitle')}
        </h1>

        <p className="text-gray-600 mb-6">
          {isExistingUser
            ? t('upgradedMessage')
            : session?.customer_email
              ? t('checkEmailMessage', { email: session.customer_email })
              : t('checkEmailMessageNoAddr')}
        </p>

        {session && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-2">{t('orderSummary')}</h3>
            <div className="text-sm text-gray-600 space-y-1">
              {session.metadata?.plan && (
                <p><span className="font-medium">{t('plan')}</span> {session.metadata.plan.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
              )}
              {session.metadata?.billing && (
                <p><span className="font-medium">{t('billing')}</span> {session.metadata.billing.charAt(0).toUpperCase() + session.metadata.billing.slice(1)}</p>
              )}
              {session.metadata?.addons && (
                <p><span className="font-medium">{t('addons')}</span> {session.metadata.addons.replace(/_/g, ' ').replace(/,/g, ', ')}</p>
              )}
            </div>
          </div>
        )}

        {!isExistingUser && (
          <div className="bg-orange-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-orange-900 mb-2">{t('whatsNext')}</h3>
            <ul className="text-sm text-orange-800 space-y-2">
              <li>{t('step1')}</li>
              <li>{t('step2')}</li>
              <li>{t('step3')}</li>
              <li>{t('step4')}</li>
            </ul>
          </div>
        )}

        <div className="space-y-3">
          {/* New buyers have no session yet — they must use the emailed login
              link first, so send them to login, not the dead-end dashboard. */}
          <Link
            href={isExistingUser ? '/dashboard' : '/auth/login'}
            className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isExistingUser ? t('goToDashboard') : t('goToLogin')}
          </Link>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          {t('questions')}{' '}
          <a href="mailto:support@taskiguana.com" className="text-orange-500 hover:underline">
            support@taskiguana.com
          </a>
        </p>

      </div>
    </div>
  );
}

function CheckoutSuccessFallback() {
  const t = useTranslations('misc.checkoutSuccess');
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">{t('loading')}</p>
      </div>
    </div>
  );
}

export default function CheckoutSuccess() {
  return (
    <Suspense fallback={<CheckoutSuccessFallback />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
