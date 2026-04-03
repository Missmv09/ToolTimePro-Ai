'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, FileText, Clock, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function FinalWagePage() {
  const t = useTranslations('tools.finalWage');

  const terminationTypes = [
    { key: 'involuntary', icon: XCircle, color: 'red' },
    { key: 'voluntaryNoNotice', icon: Clock, color: 'yellow' },
    { key: 'voluntaryWithNotice', icon: CheckCircle, color: 'green' },
    { key: 'seasonal', icon: Info, color: 'blue' },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[900px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/">
                <Image
                  src="/logo-01262026.png"
                  alt="ToolTime Pro"
                  width={140}
                  height={32}
                  className="h-8 w-auto"
                />
              </Link>
              <Link href="/tools" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">{t('backToTools')}</span>
              </Link>
            </div>

            {/* Language Switcher */}
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-6 py-8 space-y-6">
        {/* Title */}
        <div className="flex items-center gap-4">
          <div className="bg-purple-100 p-3 rounded-xl">
            <FileText className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-500">{t('subtitle')}</p>
          </div>
        </div>

        {/* Overview */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('overview')}</h2>
          <p className="text-gray-600">{t('overviewText')}</p>
        </div>

        {/* Termination Types */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('terminationTypes')}</h2>

          {terminationTypes.map(({ key, icon: Icon, color }) => {
            const colorClasses = {
              red: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', badge: 'bg-red-100 text-red-700' },
              yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' },
              green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', badge: 'bg-green-100 text-green-700' },
              blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
            };
            const colors = colorClasses[color as keyof typeof colorClasses];

            return (
              <div key={key} className={`${colors.bg} rounded-xl border ${colors.border} p-6`}>
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${colors.bg}`}>
                    <Icon className={`w-6 h-6 ${colors.icon}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{t(`${key}.title`)}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${colors.badge}`}>
                        {t(`${key}.deadline`)}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">{t(`${key}.description`)}</p>
                    <p className="text-sm text-gray-500">{t(`${key}.details`)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* What to Include */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('whatToInclude')}</h2>
          <ul className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <li key={i} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">{t(`includeItem${i}`)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Penalties */}
        <div className="bg-red-50 rounded-xl border border-red-200 p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-red-800 mb-2">{t('penaltiesTitle')}</h2>
              <p className="text-red-700 mb-4">{t('penaltiesText')}</p>
              <div className="bg-white rounded-lg p-4 mb-4">
                <p className="font-mono text-lg text-center text-red-800">{t('penaltyCalc')}</p>
              </div>
              <p className="text-sm text-red-600 mb-4">{t('penaltyExample')}</p>
              <Link
                href="/tools/calculator"
                className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                {t('useCalculator')}
              </Link>
            </div>
          </div>
        </div>

        {/* Best Practices */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('tips')}</h2>
          <ul className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 bg-[#f5a623] text-[#1a1a2e] rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {i}
                </span>
                <span className="text-gray-700">{t(`tipItem${i}`)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Disclaimer */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">{t('disclaimer')}</p>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-[#1a1a2e] to-[#2d2d44] rounded-xl p-8 text-center text-white">
          <h3 className="text-xl font-bold mb-2">{t('getProtection')}</h3>
          <p className="text-gray-300 mb-6">{t('ctaText')}</p>
          <Link
            href="/auth/signup"
            className="inline-block bg-[#f5a623] text-[#1a1a2e] px-8 py-3 rounded-lg font-bold hover:bg-[#e6991a] transition-colors"
          >
            {t('startTrial')}
          </Link>
        </div>
      </div>
    </main>
  );
}
