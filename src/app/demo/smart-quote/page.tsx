'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import {
  FileText,
  DollarSign,
  CheckCircle,
  TrendingUp,
  ArrowRight,
  Zap,
  Sparkles,
  Mail,
  X,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';

const demoStats = {
  sent: 124,
  accepted: 89,
  avgValue: 1250,
  closeRate: 72,
};

const unitLabels: Record<string, string> = {
  each: 'ea',
  hour: 'hr',
  sqft: 'sqft',
  linear_ft: 'lf',
  cubic_yard: 'cy',
};

interface QuoteService {
  name: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  marketRange: { min: number; max: number };
  reason: string;
}

interface QuoteTier {
  name: string;
  description: string;
  multiplier: number;
  extras: string[];
}

interface QuoteResponse {
  services: QuoteService[];
  upsells: { name: string; description: string; price: number; value: string }[];
  tiers?: { good: QuoteTier; better: QuoteTier; best: QuoteTier };
  notes?: string;
  warnings?: string[];
}

const TAX_RATE = 0.0825;

export default function SmartQuoteDemo() {
  const t = useTranslations('demo.smartQuote');

  const [businessType, setBusinessType] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [zip, setZip] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [selectedTier, setSelectedTier] = useState(1);

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [leadStatus, setLeadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const businessTypes = [
    { value: 'landscaping', label: t('businessTypeLandscaping') },
    { value: 'plumbing', label: t('businessTypePlumbing') },
    { value: 'hvac', label: t('businessTypeHvac') },
    { value: 'electrical', label: t('businessTypeElectrical') },
    { value: 'cleaning', label: t('businessTypeCleaning') },
    { value: 'handyman', label: t('businessTypeHandyman') },
    { value: 'painting', label: t('businessTypePainting') },
    { value: 'pool', label: t('businessTypePool') },
    { value: 'other', label: t('businessTypeOther') },
  ];

  const subtotal = quote
    ? quote.services.reduce((sum, s) => sum + s.quantity * s.price, 0)
    : 0;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = subtotal + tax;

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!jobDescription.trim()) return;
    setLoading(true);
    setError(null);
    setQuote(null);
    try {
      const res = await fetch('/api/ai-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription,
          businessType,
          customerAddress: zip,
          generateTiers: true,
        }),
      });
      if (!res.ok) {
        throw new Error('Quote API returned ' + res.status);
      }
      const data: QuoteResponse = await res.json();
      setQuote(data);
      setSelectedTier(1);
    } catch (err) {
      console.error(err);
      setError(t('errorRetry'));
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setQuote(null);
    setError(null);
    setLeadStatus('idle');
  }

  async function handleSendLead(e: React.FormEvent) {
    e.preventDefault();
    if (!leadName.trim() || !leadEmail.trim() || !quote) return;
    setSending(true);
    setLeadStatus('idle');
    try {
      const selectedTierData = quote.tiers
        ? [quote.tiers.good, quote.tiers.better, quote.tiers.best][selectedTier]
        : null;
      const tierTotal = selectedTierData
        ? Math.round(subtotal * selectedTierData.multiplier * (1 + TAX_RATE) * 100) / 100
        : total;
      const summary = [
        `Smart Quote Demo request`,
        `Trade: ${businessType || 'not specified'}`,
        `ZIP: ${zip || 'not specified'}`,
        `Job: ${jobDescription}`,
        `Selected tier: ${selectedTierData?.name || 'standard'} ($${tierTotal.toFixed(2)})`,
        `Services: ${quote.services.map((s) => s.name).join(', ')}`,
      ].join('\n');

      const res = await fetch('/api/website-builder/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leadName,
          email: leadEmail,
          phone: leadPhone,
          service: businessType,
          message: summary,
          source: 'smart_quote_demo',
        }),
      });
      if (!res.ok) throw new Error('Lead API returned ' + res.status);
      setLeadStatus('success');
      setEmailModalOpen(false);
    } catch (err) {
      console.error(err);
      setLeadStatus('error');
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <div className="bg-[#1a1a2e] text-white py-3 px-4 text-center">
        <p className="text-sm">
          <span className="bg-[#f5a623] text-[#1a1a2e] px-2 py-0.5 rounded font-bold mr-2">
            DEMO
          </span>
          {t('bannerText')}{' '}
          <Link href="/auth/signup" className="text-[#f5a623] underline">
            {t('bannerSignUp')}
          </Link>{' '}
          {t('bannerSuffix')}
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="text-[#5c5c70] hover:text-[#1a1a2e] text-sm inline-flex items-center gap-1">
            ← {t('backToHome')}
          </Link>
          <LanguageSwitcher />
        </div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1a1a2e]">{t('title')}</h1>
          <p className="text-[#5c5c70]">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: t('quotesSent'), value: demoStats.sent, icon: FileText },
            { label: t('accepted'), value: demoStats.accepted, icon: CheckCircle },
            { label: t('avgValue'), value: `$${demoStats.avgValue.toLocaleString()}`, icon: DollarSign },
            { label: t('closeRate'), value: `${demoStats.closeRate}%`, icon: TrendingUp },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={18} className="text-[#f5a623]" />
                <span className="text-sm text-[#5c5c70]">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-[#1a1a2e]">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-start gap-2 mb-1">
            <Sparkles size={20} className="text-[#f5a623] mt-1 shrink-0" />
            <div>
              <h2 className="text-lg font-bold text-[#1a1a2e]">{t('tryItTitle')}</h2>
              <p className="text-sm text-[#5c5c70]">{t('tryItSubtitle')}</p>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="mt-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#1a1a2e] mb-1.5">
                  {t('businessTypeLabel')}
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-[#1a1a2e] focus:border-[#f5a623] focus:outline-none focus:ring-2 focus:ring-[#fef3d6]"
                >
                  <option value="">{t('businessTypePlaceholder')}</option>
                  {businessTypes.map((bt) => (
                    <option key={bt.value} value={bt.value}>{bt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1a1a2e] mb-1.5">
                  {t('zipLabel')}
                </label>
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder={t('zipPlaceholder')}
                  maxLength={10}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-[#1a1a2e] focus:border-[#f5a623] focus:outline-none focus:ring-2 focus:ring-[#fef3d6]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1a1a2e] mb-1.5">
                {t('jobDescriptionLabel')}
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder={t('jobDescriptionPlaceholder')}
                rows={3}
                required
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-[#1a1a2e] focus:border-[#f5a623] focus:outline-none focus:ring-2 focus:ring-[#fef3d6] resize-none"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading || !jobDescription.trim()}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a1a2e] text-white rounded-lg font-bold hover:bg-[#2d2d44] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles size={16} />
                {loading ? t('generating') : t('generateQuote')}
              </button>
              {quote && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#1a1a2e] border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  <RotateCcw size={14} />
                  {t('tryAnother')}
                </button>
              )}
            </div>
          </form>

          {error && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-red-900">{t('errorTitle')}</p>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}
        </div>

        {quote && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-[#1a1a2e]">
                    {t('quoteFor')} {leadName || 'your customer'}
                  </h2>
                  {zip && <p className="text-sm text-[#5c5c70]">ZIP {zip}</p>}
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#fef3d6] text-[#f5a623] rounded-full text-sm font-semibold self-start">
                  <Sparkles size={14} />
                  {t('aiPowered')}
                </span>
              </div>

              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 text-[#5c5c70] font-medium">{t('thDescription')}</th>
                      <th className="text-center py-3 text-[#5c5c70] font-medium">{t('thQty')}</th>
                      <th className="text-center py-3 text-[#5c5c70] font-medium">{t('thUnit')}</th>
                      <th className="text-right py-3 text-[#5c5c70] font-medium">{t('thPrice')}</th>
                      <th className="text-right py-3 text-[#5c5c70] font-medium">{t('thTotal')}</th>
                      <th className="text-right py-3 text-[#5c5c70] font-medium">{t('thAIRange')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.services.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-3 text-[#1a1a2e] font-medium">{item.name}</td>
                        <td className="py-3 text-center text-[#1a1a2e]">{item.quantity}</td>
                        <td className="py-3 text-center text-[#5c5c70]">{unitLabels[item.unit] || item.unit}</td>
                        <td className="py-3 text-right text-[#1a1a2e]">${item.price.toFixed(2)}</td>
                        <td className="py-3 text-right font-semibold text-[#1a1a2e]">${(item.quantity * item.price).toFixed(2)}</td>
                        <td className="py-3 text-right">
                          <span className="inline-block bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">
                            ${item.marketRange.min}–${item.marketRange.max}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {quote.notes && (
                <p className="text-xs text-[#5c5c70] italic mb-4">{quote.notes}</p>
              )}

              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#5c5c70]">{t('subtotal')}</span>
                    <span className="text-[#1a1a2e] font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#5c5c70]">{t('tax')} (8.25%)</span>
                    <span className="text-[#1a1a2e] font-medium">${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2">
                    <span className="text-[#1a1a2e]">{t('total')}</span>
                    <span className="text-[#1a1a2e]">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {quote.tiers && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-[#1a1a2e] mb-4">{t('tiersTitle')}</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {[quote.tiers.good, quote.tiers.better, quote.tiers.best].map((tier, index) => {
                    const tierTotal = Math.round(subtotal * tier.multiplier * 100) / 100;
                    const tierTax = Math.round(tierTotal * TAX_RATE * 100) / 100;
                    return (
                      <button
                        key={tier.name}
                        onClick={() => setSelectedTier(index)}
                        className={`p-5 rounded-xl border-2 text-left transition-all ${
                          selectedTier === index
                            ? 'border-[#f5a623] shadow-lg'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-[#1a1a2e]">{tier.name}</span>
                          {index === 1 && (
                            <span className="bg-[#f5a623] text-[#1a1a2e] text-xs font-bold px-2 py-0.5 rounded-full">
                              {t('popular')}
                            </span>
                          )}
                        </div>
                        <p className="text-2xl font-bold text-[#1a1a2e] mb-1">${(tierTotal + tierTax).toFixed(2)}</p>
                        <p className="text-xs text-[#5c5c70] mb-3">{tier.multiplier}x {t('multiplier')}</p>
                        <ul className="space-y-1.5">
                          {tier.extras.map((extra) => (
                            <li key={extra} className="flex items-center gap-2 text-sm text-[#5c5c70]">
                              <CheckCircle size={14} className="text-green-500 shrink-0" />
                              {extra}
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 text-center">
              <button
                onClick={() => {
                  setLeadStatus('idle');
                  setEmailModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#f5a623] text-[#1a1a2e] rounded-lg font-bold hover:bg-[#e09913] transition-colors"
              >
                <Mail size={16} />
                {t('emailQuote')}
              </button>
              {leadStatus === 'success' && (
                <p className="mt-3 text-sm text-green-700 font-medium">{t('emailSuccess')}</p>
              )}
            </div>
          </>
        )}

        <div className="bg-[#fef3d6] rounded-xl p-8 text-center">
          <Zap className="w-12 h-12 text-[#f5a623] mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">{t('ctaTitle')}</h3>
          <p className="text-[#5c5c70] mb-6 max-w-lg mx-auto">{t('ctaDesc')}</p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#1a1a2e] text-white rounded-xl font-bold hover:bg-[#2d2d44] transition-colors no-underline"
          >
            {t('getStartedFree')}
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>

      <footer className="border-t border-gray-200 py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-[#5c5c70]">
            {t('poweredBy')}{' '}
            <Link href="/" className="text-[#f5a623] font-medium no-underline hover:underline">
              ToolTime Pro
            </Link>
          </p>
        </div>
      </footer>

      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setEmailModalOpen(false)}
              className="absolute top-4 right-4 text-[#5c5c70] hover:text-[#1a1a2e]"
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-[#1a1a2e] mb-1">{t('emailModalTitle')}</h3>
            <p className="text-sm text-[#5c5c70] mb-4">{t('emailModalDesc')}</p>

            <form onSubmit={handleSendLead} className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-[#1a1a2e] mb-1.5">
                  {t('yourName')}
                </label>
                <input
                  type="text"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-[#1a1a2e] focus:border-[#f5a623] focus:outline-none focus:ring-2 focus:ring-[#fef3d6]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1a1a2e] mb-1.5">
                  {t('yourEmail')}
                </label>
                <input
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-[#1a1a2e] focus:border-[#f5a623] focus:outline-none focus:ring-2 focus:ring-[#fef3d6]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1a1a2e] mb-1.5">
                  {t('yourPhone')}
                </label>
                <input
                  type="tel"
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-[#1a1a2e] focus:border-[#f5a623] focus:outline-none focus:ring-2 focus:ring-[#fef3d6]"
                />
              </div>

              {leadStatus === 'error' && (
                <p className="text-sm text-red-700">{t('emailError')}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-white text-[#1a1a2e] border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 bg-[#1a1a2e] text-white rounded-lg font-bold hover:bg-[#2d2d44] transition-colors disabled:opacity-50"
                >
                  {sending ? t('sending') : t('sendQuote')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
