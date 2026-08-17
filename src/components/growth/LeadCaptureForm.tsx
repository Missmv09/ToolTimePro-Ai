'use client';

/**
 * Email capture for the free tools.
 *
 * Shown *after* a tool produces a result, never before — the tool works
 * without giving up an email, and this offers to send the result along. A
 * gate in front of the answer converts worse and earns resentment; an offer
 * after a useful answer converts well.
 *
 * The consent checkbox is separate from the submit: sending someone the
 * result they asked for is a transactional follow-up, while adding them to a
 * list is not, and conflating the two is how you end up with CAN-SPAM
 * problems. Consent defaults to unchecked and is only ever an upgrade
 * (see buildLeadUpdate in src/lib/growth-leads.ts).
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle, Loader2, Mail } from 'lucide-react';
import { GROWTH_EVENTS, readAttribution, trackEvent } from '@/lib/analytics';
import type { LeadSource } from '@/lib/growth-leads';

interface LeadCaptureFormProps {
  /** First-touch source recorded against the lead. */
  source: LeadSource;
  /** Optional finer-grained detail, e.g. which result variant was shown. */
  sourceDetail?: string;
  /** Overrides the default headline; falls back to the shared copy. */
  headline?: string;
  /** Overrides the default supporting line. */
  description?: string;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function LeadCaptureForm({
  source,
  sourceDetail,
  headline,
  description,
}: LeadCaptureFormProps) {
  const t = useTranslations('tools.leadCapture');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Fire the impression once per mount, so the funnel has a denominator for
  // the capture rate rather than just a count of submissions.
  const impressionTracked = useRef(false);
  useEffect(() => {
    if (impressionTracked.current) return;
    impressionTracked.current = true;
    trackEvent(GROWTH_EVENTS.LEAD_FORM_VIEWED, { source, source_detail: sourceDetail ?? null });
  }, [source, sourceDetail]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status === 'submitting') return;

    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/growth/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source,
          sourceDetail: sourceDetail ?? null,
          marketingConsent: consent,
          website: honeypot,
          ...readAttribution(),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setErrorMessage(payload.error || t('errorGeneric'));
        setStatus('error');
        return;
      }

      trackEvent(GROWTH_EVENTS.LEAD_CAPTURED, {
        source,
        source_detail: sourceDetail ?? null,
        marketing_consent: consent,
      });
      setStatus('success');
    } catch {
      setErrorMessage(t('errorGeneric'));
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-white rounded-xl border border-green-200 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-gray-900">{t('successTitle')}</p>
            <p className="text-sm text-gray-600 mt-1">{t('successText')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start gap-3 mb-4">
        <Mail className="w-5 h-5 text-[#1FE3C4] flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-gray-900">{headline || t('headline')}</h3>
          <p className="text-sm text-gray-600 mt-1">{description || t('description')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Honeypot: hidden from people, irresistible to scripted spam. */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor={`lc-website-${source}`}>Website</label>
          <input
            id={`lc-website-${source}`}
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <label htmlFor={`lc-email-${source}`} className="sr-only">
            {t('emailLabel')}
          </label>
          <input
            id={`lc-email-${source}`}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('emailPlaceholder')}
            autoComplete="email"
            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1FE3C4] focus:border-transparent"
          />
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="inline-flex items-center justify-center gap-2 bg-[#0A0C11] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#2d2d44] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === 'submitting' && <Loader2 className="w-4 h-4 animate-spin" />}
            {status === 'submitting' ? t('sending') : t('submit')}
          </button>
        </div>

        <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 rounded border-gray-300 text-[#1FE3C4] focus:ring-[#1FE3C4]"
          />
          <span>{t('consentLabel')}</span>
        </label>

        {status === 'error' && errorMessage && (
          <p className="text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        )}

        <p className="text-xs text-gray-400">{t('privacyNote')}</p>
      </form>
    </div>
  );
}
