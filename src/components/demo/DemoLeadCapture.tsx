'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Mail, X, CheckCircle } from 'lucide-react';

interface DemoLeadCaptureProps {
  featureName: string;
  source: string;
}

export default function DemoLeadCapture({ featureName, source }: DemoLeadCaptureProps) {
  const t = useTranslations('demo.common.leadCapture');

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSending(true);
    setStatus('idle');
    try {
      const message = [
        `Demo interest: ${featureName}`,
        businessName.trim() ? `Business: ${businessName.trim()}` : null,
      ].filter(Boolean).join('\n');

      const res = await fetch('/api/website-builder/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          service: featureName,
          message,
          source,
        }),
      });
      if (!res.ok) throw new Error('Lead API returned ' + res.status);
      setStatus('success');
      setOpen(false);
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 text-center">
        <p className="text-sm text-[#5c5c70] mb-3">
          {t('teaser', { feature: featureName })}
        </p>
        <button
          onClick={() => {
            setStatus('idle');
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#f5a623] text-[#1a1a2e] rounded-lg font-bold hover:bg-[#e09913] transition-colors"
        >
          <Mail size={16} />
          {t('button')}
        </button>
        {status === 'success' && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-green-700 font-medium">
            <CheckCircle size={14} />
            {t('success')}
          </p>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-[#5c5c70] hover:text-[#1a1a2e]"
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-[#1a1a2e] mb-1">
              {t('modalTitle', { feature: featureName })}
            </h3>
            <p className="text-sm text-[#5c5c70] mb-4">{t('modalDesc')}</p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-[#1a1a2e] mb-1.5">
                  {t('name')}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-[#1a1a2e] focus:border-[#f5a623] focus:outline-none focus:ring-2 focus:ring-[#fef3d6]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1a1a2e] mb-1.5">
                  {t('email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-[#1a1a2e] focus:border-[#f5a623] focus:outline-none focus:ring-2 focus:ring-[#fef3d6]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1a1a2e] mb-1.5">
                  {t('phone')}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-[#1a1a2e] focus:border-[#f5a623] focus:outline-none focus:ring-2 focus:ring-[#fef3d6]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1a1a2e] mb-1.5">
                  {t('business')}
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-[#1a1a2e] focus:border-[#f5a623] focus:outline-none focus:ring-2 focus:ring-[#fef3d6]"
                />
              </div>

              {status === 'error' && (
                <p className="text-sm text-red-700">{t('error')}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-white text-[#1a1a2e] border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 bg-[#1a1a2e] text-white rounded-lg font-bold hover:bg-[#2d2d44] transition-colors disabled:opacity-50"
                >
                  {sending ? t('sending') : t('submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
