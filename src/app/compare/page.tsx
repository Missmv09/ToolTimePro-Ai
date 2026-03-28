'use client';

import Link from 'next/link';
import { COMPETITORS } from '@/lib/competitor-data';
import { ArrowRight, Shield, Bot, DollarSign, Globe, CheckCircle } from 'lucide-react';

const competitors = Object.values(COMPETITORS);

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="bg-[#1a2e44] text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-xl no-underline text-white">ToolTime Pro</Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/#features" className="text-gray-300 hover:text-white text-sm no-underline">Features</Link>
            <Link href="/pricing" className="text-gray-300 hover:text-white text-sm no-underline">Pricing</Link>
            <Link href="/tools" className="text-gray-300 hover:text-white text-sm no-underline">Free Tools</Link>
            <Link href="/auth/signup" className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-medium no-underline">Start Free Trial</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-[#1a2e44] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-amber-400 font-medium mb-4 tracking-wide uppercase text-sm">Comparison Guide</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            How ToolTime Pro Compares
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-4">
            The only platform that&apos;s AI-native + compliance-built + affordable + bilingual.
            See how we stack up against every major FSM platform.
          </p>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-[#1a2e44] mb-10">
            No Other Platform Has All Four
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm text-center">
              <Bot className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h3 className="font-bold text-[#1a2e44]">AI-Native</h3>
              <p className="text-sm text-gray-500 mt-2">Jenny AI auto-dispatches, follows up leads, tracks cash flow, and costs jobs — autonomously.</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm text-center">
              <Shield className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h3 className="font-bold text-[#1a2e44]">Compliance-Built</h3>
              <p className="text-sm text-gray-500 mt-2">ToolTime Shield covers worker classification, break tracking, and labor law across 5 states.</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm text-center">
              <DollarSign className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h3 className="font-bold text-[#1a2e44]">Affordable</h3>
              <p className="text-sm text-gray-500 mt-2">Starting at $30/mo. No contracts, no termination fees, transparent pricing published online.</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm text-center">
              <Globe className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h3 className="font-bold text-[#1a2e44]">Bilingual</h3>
              <p className="text-sm text-gray-500 mt-2">Full Spanish support throughout — not an afterthought. 30%+ of the trades workforce is Spanish-speaking.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Competitor Cards */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-[#1a2e44] mb-3">Choose Your Comparison</h2>
          <p className="text-center text-gray-500 mb-10">Click any competitor to see a detailed side-by-side breakdown.</p>

          <div className="space-y-6">
            {competitors.map(comp => (
              <Link
                key={comp.slug}
                href={`/compare/${comp.slug}`}
                className="block bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-amber-300 transition-all p-6 no-underline"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-[#1a2e44]">{comp.tagline}</h3>
                    <p className="text-gray-500 mt-1">{comp.heroSubtitle}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                        Save {comp.savingsRange}
                      </span>
                      <span className="text-sm text-gray-400">
                        {comp.features.filter(f => f.tooltimeIncluded && !f.competitorIncluded).length} features they don&apos;t have
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
                </div>
              </Link>
            ))}

            {/* Jobber (existing page) */}
            <Link
              href="/compare/jobber"
              className="block bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-amber-300 transition-all p-6 no-underline"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#1a2e44]">ToolTime Pro vs Jobber</h3>
                  <p className="text-gray-500 mt-1">See why contractors are switching — same features at a fraction of the price.</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                      Save $2,000-$3,000+/year
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-[#1a2e44] text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to Switch?</h2>
          <p className="text-gray-300 text-lg mb-8">
            No contracts. Cancel anytime. Free migration from any platform.
            Start your free trial and see the difference today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup" className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-8 rounded-lg text-lg no-underline">
              Start Free Trial
            </Link>
            <Link href="/pricing" className="border border-white/30 hover:bg-white/10 text-white font-semibold py-3 px-8 rounded-lg text-lg no-underline">
              See Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 px-6 py-8 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} ToolTime Pro. All rights reserved.</p>
      </footer>
    </div>
  );
}
