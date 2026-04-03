'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { COMPETITORS } from '@/lib/competitor-data';
import { ArrowRight, Shield, Bot, DollarSign, Globe } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const competitors = Object.values(COMPETITORS);

export default function ComparePage() {
  const t = useTranslations('compare');

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="bg-[#1a1a2e] text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-xl no-underline text-white">ToolTime Pro</Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/#features" className="text-gray-300 hover:text-white text-sm no-underline">{t('features')}</Link>
            <Link href="/pricing" className="text-gray-300 hover:text-white text-sm no-underline">{t('seePricing')}</Link>
            <Link href="/tools" className="text-gray-300 hover:text-white text-sm no-underline">{t('freeTools')}</Link>
            <LanguageSwitcher />
            <Link href="/auth/signup" className="bg-[#f5a623] hover:bg-[#e6991a] text-[#1a1a2e] px-5 py-2 rounded-lg text-sm font-medium no-underline">{t('startFreeTrial')}</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-[#1a1a2e] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[#f5a623] font-medium mb-4 tracking-wide uppercase text-sm">{t('comparisonGuide')}</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {t('heroTitle')}
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-4">
            {t('heroSubtitle', { count: competitors.length })}
          </p>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-[#1a1a2e] mb-10">
            {t('noOtherPlatform')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm text-center">
              <Bot className="w-10 h-10 text-[#f5a623] mx-auto mb-3" />
              <h3 className="font-bold text-[#1a1a2e]">{t('aiNative')}</h3>
              <p className="text-sm text-gray-500 mt-2">{t('aiNativeDesc')}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm text-center">
              <Shield className="w-10 h-10 text-[#f5a623] mx-auto mb-3" />
              <h3 className="font-bold text-[#1a1a2e]">{t('complianceBuilt')}</h3>
              <p className="text-sm text-gray-500 mt-2">{t('complianceBuiltDesc')}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm text-center">
              <DollarSign className="w-10 h-10 text-[#f5a623] mx-auto mb-3" />
              <h3 className="font-bold text-[#1a1a2e]">{t('affordable')}</h3>
              <p className="text-sm text-gray-500 mt-2">{t('affordableDesc')}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm text-center">
              <Globe className="w-10 h-10 text-[#f5a623] mx-auto mb-3" />
              <h3 className="font-bold text-[#1a1a2e]">{t('bilingualTitle')}</h3>
              <p className="text-sm text-gray-500 mt-2">{t('bilingualDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Competitor Cards */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-[#1a1a2e] mb-3">{t('chooseComparison')}</h2>
          <p className="text-center text-gray-500 mb-10">{t('chooseComparisonDesc')}</p>

          <div className="space-y-6">
            {competitors.map(comp => (
              <Link
                key={comp.slug}
                href={`/compare/${comp.slug}`}
                className="block bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-[#f5a623] transition-all p-6 no-underline"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-[#1a1a2e]">{comp.tagline}</h3>
                    <p className="text-gray-500 mt-1">{comp.heroSubtitle}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                        {t('save', { amount: comp.savingsRange })}
                      </span>
                      <span className="text-sm text-gray-400">
                        {t('featuresTheyDontHave', { count: comp.features.filter(f => f.tooltimeIncluded && !f.competitorIncluded).length })}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[#1a1a2e] text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">{t('readyToSwitch')}</h2>
          <p className="text-gray-300 text-lg mb-8">
            {t('readyToSwitchDesc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup" className="bg-[#f5a623] hover:bg-[#e6991a] text-[#1a1a2e] font-semibold py-3 px-8 rounded-lg text-lg no-underline">
              {t('startFreeTrial')}
            </Link>
            <Link href="/pricing" className="border border-white/30 hover:bg-white/10 text-white font-semibold py-3 px-8 rounded-lg text-lg no-underline">
              {t('seePricing')}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 px-6 py-8 text-center text-sm text-gray-500">
        <p>{t('copyright', { year: new Date().getFullYear() })}</p>
      </footer>
    </div>
  );
}
