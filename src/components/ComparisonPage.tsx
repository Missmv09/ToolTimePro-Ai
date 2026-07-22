'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { CompetitorData } from '@/lib/competitor-data';
import { CheckCircle, XCircle, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface Props {
  data: CompetitorData;
}

export default function ComparisonPage({ data }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const t = useTranslations('compare');

  return (
    <div className="min-h-screen bg-[#12151C]">
      {/* Nav */}
      <nav className="bg-[#0A0C11] text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-xl no-underline text-white">Task Iguana</Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/compare" className="text-gray-300 hover:text-white text-sm no-underline">{t('allComparisons')}</Link>
            <Link href="/pricing" className="text-gray-300 hover:text-white text-sm no-underline">{t('seePricing')}</Link>
            <LanguageSwitcher />
            <Link href="/auth/signup" className="bg-[#2E9BFF] hover:bg-[#1E7FE0] text-white px-5 py-2 rounded-lg text-sm font-medium no-underline">{t('startFreeTrial')}</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-[#0A0C11] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[#1FE3C4] font-medium mb-4 tracking-wide uppercase text-sm">{t('comparisonGuide')}</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">{data.tagline}</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">{data.heroSubtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup" className="bg-[#2E9BFF] hover:bg-[#1E7FE0] text-white font-semibold py-3 px-8 rounded-lg no-underline">
              {t('startFreeTrial')}
            </Link>
            <a href="#comparison" className="border border-white/30 hover:bg-white/10 text-white font-semibold py-3 px-8 rounded-lg no-underline">
              {t('seeFullComparison')}
            </a>
          </div>
        </div>
      </section>

      {/* Savings Banner */}
      <section className="bg-green-500/10 border-b border-green-500/20 py-6 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-green-300 font-bold text-lg">{t('typicalSavings', { amount: data.savingsRange })}</p>
            <p className="text-green-300 text-sm">{t('switchingFrom', { name: data.name })}</p>
          </div>
          <span className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm">{t('noContractsCancel')}</span>
        </div>
      </section>

      {/* Pain Points */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">{t('whyLeaving', { name: data.name })}</h2>
          <div className="space-y-3">
            {data.painPoints.map((point, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Comparison */}
      <section className="py-12 px-4 bg-[#0A0C11]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-2">{t('pricingComparison')}</h2>
          <p className="text-white/50 mb-6">{t('pricingComparisonDesc')}</p>
          <div className="overflow-x-auto">
            <table className="w-full bg-[#12151C] rounded-xl shadow-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-5 text-sm font-medium text-white/50">{t('planTier')}</th>
                  <th className="text-left py-4 px-5 text-sm font-medium text-[#1FE3C4]">Task Iguana</th>
                  <th className="text-left py-4 px-5 text-sm font-medium text-white/50">{data.name}</th>
                </tr>
              </thead>
              <tbody>
                {data.plans.map((plan, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-4 px-5 text-sm font-medium text-white">{plan.name}</td>
                    <td className="py-4 px-5 text-sm font-semibold text-green-300">{plan.tooltime}</td>
                    <td className="py-4 px-5 text-sm text-white/50">{plan.competitor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section id="comparison" className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-2">{t('featureComparison')}</h2>
          <p className="text-white/50 mb-6">{t('featureComparisonDesc')}</p>
          <div className="overflow-x-auto">
            <table className="w-full bg-[#12151C] rounded-xl shadow-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-5 text-sm font-medium text-white/50">{t('feature')}</th>
                  <th className="text-center py-3 px-5 text-sm font-medium text-[#1FE3C4] w-40">Task Iguana</th>
                  <th className="text-center py-3 px-5 text-sm font-medium text-white/50 w-40">{data.name}</th>
                </tr>
              </thead>
              <tbody>
                {data.features.map((feature, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-[#0A0C11]">
                    <td className="py-3 px-5 text-sm text-white">{feature.name}</td>
                    <td className="py-3 px-5 text-center">
                      {feature.tooltimeIncluded ? (
                        <div className="flex flex-col items-center">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-xs text-green-300 mt-0.5">{feature.tooltime}</span>
                        </div>
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                      )}
                    </td>
                    <td className="py-3 px-5 text-center">
                      {feature.competitorIncluded === true ? (
                        <div className="flex flex-col items-center">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-xs text-white/50 mt-0.5">{feature.competitor}</span>
                        </div>
                      ) : feature.competitorIncluded === 'partial' || feature.competitorIncluded === 'addon' ? (
                        <div className="flex flex-col items-center">
                          <Minus className="w-5 h-5 text-yellow-500" />
                          <span className="text-xs text-yellow-700 mt-0.5">{feature.competitor}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <XCircle className="w-5 h-5 text-red-400" />
                          <span className="text-xs text-red-300 mt-0.5">{feature.competitor}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Cost Examples */}
      <section className="py-12 px-4 bg-[#0A0C11]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-2">{t('realWorldCost')}</h2>
          <p className="text-white/50 mb-6">{t('realWorldCostDesc')}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.costExamples.map((example, i) => {
              const savings = example.competitor - example.tooltime;
              return (
                <div key={i} className="bg-[#12151C] rounded-xl p-6 shadow-sm text-center">
                  <p className="text-sm font-medium text-white/50 mb-4">{example.scenario}</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#1FE3C4] font-medium">Task Iguana</span>
                      <span className="font-bold text-green-300">${example.tooltime.toLocaleString()}/yr</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/50">{data.name}</span>
                      <span className="font-bold text-white/80">${example.competitor.toLocaleString()}/yr</span>
                    </div>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-3">
                    <p className="text-green-300 font-bold text-lg">Save ${savings.toLocaleString()}/yr</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Switch */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">{t('whySwitchTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.switchReasons.map((reason, i) => (
              <div key={i} className="bg-[#12151C] rounded-xl p-6 shadow-sm border border-white/10">
                <h3 className="font-bold text-white mb-2">{reason.title}</h3>
                <p className="text-sm text-white/60">{reason.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 px-4 bg-[#0A0C11]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">{t('faqTitle')}</h2>
          <div className="space-y-3">
            {data.faqs.map((faq, i) => (
              <div key={i} className="bg-[#12151C] rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-6 py-4 flex items-center justify-between"
                >
                  <span className="font-medium text-white">{faq.question}</span>
                  {openFaq === i ? (
                    <ChevronUp className="w-5 h-5 text-white/40" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-white/40" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4">
                    <p className="text-white/60 text-sm">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[#0A0C11] text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">{t('readyToSwitchFrom', { name: data.name })}</h2>
          <p className="text-gray-300 text-lg mb-8">
            {t('readyToSwitchFromDesc', { name: data.name })}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup" className="bg-[#2E9BFF] hover:bg-[#1E7FE0] text-white font-semibold py-3 px-8 rounded-lg text-lg no-underline">
              {t('startFreeTrial')}
            </Link>
            <Link href="/pricing" className="border border-white/30 hover:bg-white/10 text-white font-semibold py-3 px-8 rounded-lg text-lg no-underline">
              {t('seePricing')}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white/10 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/50">{t('copyright', { year: new Date().getFullYear() })}</p>
          <div className="flex gap-6 text-sm text-white/50">
            <Link href="/compare" className="hover:text-white/80 no-underline">{t('allComparisons')}</Link>
            <Link href="/pricing" className="hover:text-white/80 no-underline">{t('seePricing')}</Link>
            <Link href="/terms" className="hover:text-white/80 no-underline">{t('terms')}</Link>
            <Link href="/privacy" className="hover:text-white/80 no-underline">{t('privacy')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
