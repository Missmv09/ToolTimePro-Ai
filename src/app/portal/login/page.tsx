'use client';

import { useState } from 'react';
import { Mail, ArrowRight, CheckCircle, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function PortalLoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const t = useTranslations('portal.login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_login_link', email }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        setError(t('genericError'));
      }
    } catch {
      setError(t('connectionError'));
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-end mb-4">
            <LanguageSwitcher />
          </div>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('checkEmail')}</h1>
          <p className="text-gray-500 mb-6">
            {t('linkSentMessage')} <strong>{email}</strong>. {t('linkSentInstruction')}
          </p>
          <p className="text-sm text-gray-400">
            {t('spamNote')}
          </p>
          <button
            onClick={() => { setSent(false); setEmail(''); }}
            className="mt-6 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('tryDifferentEmail')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-navy-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-gold-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 mt-2">
            {t('description')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('emailLabel')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 text-lg"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full bg-navy-500 text-white py-3 rounded-xl font-medium hover:bg-navy-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
          >
            {loading ? t('sending') : t('sendButton')}
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          {t('poweredBy')}
        </p>
      </div>
    </div>
  );
}
