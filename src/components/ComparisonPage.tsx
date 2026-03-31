'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CompetitorData } from '@/lib/competitor-data';
import { CheckCircle, XCircle, Minus, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  data: CompetitorData;
}

export default function ComparisonPage({ data }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="bg-[#1a1a2e] text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-xl no-underline text-white">ToolTime Pro</Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/compare" className="text-gray-300 hover:text-white text-sm no-underline">All Comparisons</Link>
            <Link href="/pricing" className="text-gray-300 hover:text-white text-sm no-underline">Pricing</Link>
            <Link href="/auth/signup" className="bg-[#f5a623] hover:bg-[#e6991a] text-[#1a1a2e] px-5 py-2 rounded-lg text-sm font-medium no-underline">Start Free Trial</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-[#1a1a2e] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[#f5a623] font-medium mb-4 tracking-wide uppercase text-sm">Comparison Guide</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">{data.tagline}</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">{data.heroSubtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup" className="bg-[#f5a623] hover:bg-[#e6991a] text-[#1a1a2e] font-semibold py-3 px-8 rounded-lg no-underline">
              Start Free Trial
            </Link>
            <a href="#comparison" className="border border-white/30 hover:bg-white/10 text-white font-semibold py-3 px-8 rounded-lg no-underline">
              See Full Comparison
            </a>
          </div>
        </div>
      </section>

      {/* Savings Banner */}
      <section className="bg-green-50 border-b border-green-200 py-6 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-green-800 font-bold text-lg">Typical Savings: {data.savingsRange}</p>
            <p className="text-green-700 text-sm">switching from {data.name} to ToolTime Pro</p>
          </div>
          <span className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm">No Contracts, Cancel Anytime</span>
        </div>
      </section>

      {/* Pain Points */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1a1a2e] mb-6">Why Contractors Are Leaving {data.name}</h2>
          <div className="space-y-3">
            {data.painPoints.map((point, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Comparison */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1a1a2e] mb-2">Pricing Comparison</h2>
          <p className="text-gray-500 mb-6">Get more features, more users, and better value with ToolTime Pro.</p>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-xl shadow-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-5 text-sm font-medium text-gray-500">Plan Tier</th>
                  <th className="text-left py-4 px-5 text-sm font-medium text-[#f5a623]">ToolTime Pro</th>
                  <th className="text-left py-4 px-5 text-sm font-medium text-gray-500">{data.name}</th>
                </tr>
              </thead>
              <tbody>
                {data.plans.map((plan, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-4 px-5 text-sm font-medium text-gray-800">{plan.name}</td>
                    <td className="py-4 px-5 text-sm font-semibold text-green-700">{plan.tooltime}</td>
                    <td className="py-4 px-5 text-sm text-gray-500">{plan.competitor}</td>
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
          <h2 className="text-2xl font-bold text-[#1a1a2e] mb-2">Feature Comparison</h2>
          <p className="text-gray-500 mb-6">Here&apos;s where the platforms differ.</p>
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-xl shadow-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-5 text-sm font-medium text-gray-500">Feature</th>
                  <th className="text-center py-3 px-5 text-sm font-medium text-[#f5a623] w-40">ToolTime Pro</th>
                  <th className="text-center py-3 px-5 text-sm font-medium text-gray-500 w-40">{data.name}</th>
                </tr>
              </thead>
              <tbody>
                {data.features.map((feature, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-5 text-sm text-gray-800">{feature.name}</td>
                    <td className="py-3 px-5 text-center">
                      {feature.tooltimeIncluded ? (
                        <div className="flex flex-col items-center">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-xs text-green-700 mt-0.5">{feature.tooltime}</span>
                        </div>
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                      )}
                    </td>
                    <td className="py-3 px-5 text-center">
                      {feature.competitorIncluded === true ? (
                        <div className="flex flex-col items-center">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-xs text-gray-500 mt-0.5">{feature.competitor}</span>
                        </div>
                      ) : feature.competitorIncluded === 'partial' || feature.competitorIncluded === 'addon' ? (
                        <div className="flex flex-col items-center">
                          <Minus className="w-5 h-5 text-yellow-500" />
                          <span className="text-xs text-yellow-700 mt-0.5">{feature.competitor}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <XCircle className="w-5 h-5 text-red-400" />
                          <span className="text-xs text-red-600 mt-0.5">{feature.competitor}</span>
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
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1a1a2e] mb-2">Real-World Cost Comparison</h2>
          <p className="text-gray-500 mb-6">See how much you could save based on your team size.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.costExamples.map((example, i) => {
              const savings = example.competitor - example.tooltime;
              return (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm text-center">
                  <p className="text-sm font-medium text-gray-500 mb-4">{example.scenario}</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#f5a623] font-medium">ToolTime Pro</span>
                      <span className="font-bold text-green-700">${example.tooltime.toLocaleString()}/yr</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">{data.name}</span>
                      <span className="font-bold text-gray-700">${example.competitor.toLocaleString()}/yr</span>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-green-800 font-bold text-lg">Save ${savings.toLocaleString()}/yr</p>
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
          <h2 className="text-2xl font-bold text-[#1a1a2e] mb-6">Why Contractors Switch to ToolTime Pro</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.switchReasons.map((reason, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold text-[#1a1a2e] mb-2">{reason.title}</h3>
                <p className="text-sm text-gray-600">{reason.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1a1a2e] mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {data.faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-6 py-4 flex items-center justify-between"
                >
                  <span className="font-medium text-[#1a1a2e]">{faq.question}</span>
                  {openFaq === i ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600 text-sm">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[#1a1a2e] text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to Switch from {data.name}?</h2>
          <p className="text-gray-300 text-lg mb-8">
            No contracts. Cancel anytime. Free migration from {data.name}.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup" className="bg-[#f5a623] hover:bg-[#e6991a] text-[#1a1a2e] font-semibold py-3 px-8 rounded-lg text-lg no-underline">
              Start Free Trial
            </Link>
            <Link href="/pricing" className="border border-white/30 hover:bg-white/10 text-white font-semibold py-3 px-8 rounded-lg text-lg no-underline">
              See Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} ToolTime Pro. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/compare" className="hover:text-gray-700 no-underline">All Comparisons</Link>
            <Link href="/pricing" className="hover:text-gray-700 no-underline">Pricing</Link>
            <Link href="/terms" className="hover:text-gray-700 no-underline">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-700 no-underline">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
