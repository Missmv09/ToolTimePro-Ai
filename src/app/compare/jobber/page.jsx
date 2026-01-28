'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function CompareJobberPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Promo Banner */}
      <div className="bg-[#1a1a2e] text-white text-center py-2.5 px-4 text-sm">
        <span className="mr-2">🚀</span>
        Limited Time: Get 2 months free on annual plans.
        <Link href="/auth/signup" className="text-[#f5a623] font-semibold ml-2 hover:underline">
          Start Free Trial
        </Link>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 left-0 right-0 bg-white/95 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/">
            <Image
              src="/logo-01262026.png"
              alt="ToolTime Pro"
              width={180}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </Link>

          <div className={`hidden md:flex items-center gap-6 ${mobileMenuOpen ? 'flex' : ''}`}>
            <Link href="/#features" className="text-[#5c5c70] font-medium text-[0.9375rem] hover:text-[#1a1a2e] transition-colors no-underline">Features</Link>
            <Link href="/pricing" className="text-[#5c5c70] font-medium text-[0.9375rem] hover:text-[#1a1a2e] transition-colors no-underline">Pricing</Link>
            <span className="text-[#5c5c70] text-sm flex items-center gap-1">
              📞 1-888-555-0123
            </span>
            <Link
              href="/auth/signup"
              className="bg-[#f5a623] text-[#1a1a2e] px-5 py-2.5 rounded-lg font-semibold text-sm shadow-[0_4px_12px_rgba(245,166,35,0.3)] hover:bg-[#e6991a] hover:-translate-y-0.5 transition-all no-underline"
            >
              Start Free Trial
            </Link>
          </div>

          <button
            className="md:hidden text-[#1a1a2e] text-2xl bg-transparent border-none cursor-pointer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            ☰
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg p-6 flex flex-col gap-4">
            <Link href="/#features" className="text-[#5c5c70] font-medium hover:text-[#1a1a2e] no-underline">Features</Link>
            <Link href="/pricing" className="text-[#5c5c70] font-medium hover:text-[#1a1a2e] no-underline">Pricing</Link>
            <Link href="/auth/signup" className="bg-[#f5a623] text-[#1a1a2e] px-6 py-3 rounded-xl font-medium text-center no-underline">Start Free Trial</Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="py-20 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <span className="inline-block bg-[#fef3d6] px-[18px] py-2 rounded-full text-[0.8125rem] font-bold text-[#1a1a2e] mb-5">
            ToolTime Pro vs Jobber
          </span>
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-extrabold text-[#1a1a2e] leading-tight tracking-tight mb-6">
            Looking for a Jobber Alternative?
          </h1>
          <p className="text-[1.125rem] text-[#5c5c70] max-w-[640px] mx-auto mb-10">
            See how ToolTime Pro compares to Jobber and why service businesses are making the switch.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-10 py-5 bg-[#f5a623] text-[#1a1a2e] rounded-xl font-bold text-[1.0625rem] shadow-[0_4px_16px_rgba(245,166,35,0.35)] hover:bg-[#e6991a] hover:-translate-y-[3px] transition-all no-underline"
          >
            Try ToolTime Pro Free →
          </Link>
        </div>
      </section>

      {/* Comparison Table Section */}
      <section className="py-20 bg-[#fafafa]">
        <div className="max-w-[1000px] mx-auto px-6">
          <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-extrabold text-[#1a1a2e] text-center mb-12">
            Feature Comparison
          </h2>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-3 bg-[#1a1a2e] text-white">
              <div className="p-5 font-bold">Feature</div>
              <div className="p-5 font-bold text-center border-l border-white/10">ToolTime Pro</div>
              <div className="p-5 font-bold text-center border-l border-white/10">Jobber</div>
            </div>

            {/* Table Rows */}
            {[
              { feature: 'Starting Price', tooltime: '$30/mo', jobber: '$49/mo' },
              { feature: 'Professional Website', tooltime: true, jobber: false },
              { feature: 'Online Booking', tooltime: true, jobber: true },
              { feature: 'Smart Quoting', tooltime: true, jobber: true },
              { feature: 'Invoicing & Payments', tooltime: true, jobber: true },
              { feature: 'Worker App with GPS', tooltime: true, jobber: true },
              { feature: 'California Compliance', tooltime: true, jobber: false },
              { feature: 'ToolTime Shield (Legal Protection)', tooltime: true, jobber: false },
              { feature: 'AI Chatbot Lead Capture', tooltime: true, jobber: false },
              { feature: 'Review Automation', tooltime: true, jobber: false },
              { feature: 'Spanish Language Support', tooltime: true, jobber: false },
              { feature: 'Dispatch Board', tooltime: 'Elite', jobber: 'Extra Cost' },
              { feature: 'Route Optimization', tooltime: 'Elite', jobber: 'Extra Cost' },
            ].map((row, index) => (
              <div key={index} className={`grid grid-cols-3 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <div className="p-4 text-[#1a1a2e] font-medium">{row.feature}</div>
                <div className="p-4 text-center border-l border-gray-100">
                  {row.tooltime === true ? (
                    <span className="text-[#00c853] font-bold">✓</span>
                  ) : row.tooltime === false ? (
                    <span className="text-gray-300">✗</span>
                  ) : (
                    <span className="text-[#f5a623] font-semibold text-sm">{row.tooltime}</span>
                  )}
                </div>
                <div className="p-4 text-center border-l border-gray-100">
                  {row.jobber === true ? (
                    <span className="text-[#00c853] font-bold">✓</span>
                  ) : row.jobber === false ? (
                    <span className="text-gray-300">✗</span>
                  ) : (
                    <span className="text-[#8e8e9f] font-semibold text-sm">{row.jobber}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Switch Section */}
      <section className="py-20 bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-extrabold text-[#1a1a2e] text-center mb-12">
            Why Service Pros Are Switching to ToolTime Pro
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: '💰',
                title: 'Save $200+/year',
                description: 'Get more features for less. Our Pro plan includes everything Jobber charges extra for.'
              },
              {
                icon: '🛡️',
                title: 'California Compliance Built-In',
                description: 'ToolTime Shield keeps you legal with AB5 compliance, final pay calculators, and HR document library.'
              },
              {
                icon: '🌐',
                title: 'Website Included',
                description: "We build your professional website for you. Jobber doesn't offer this — you'd pay $100+/mo elsewhere."
              },
              {
                icon: '🤖',
                title: 'AI That Works 24/7',
                description: 'Our AI chatbot captures leads while you sleep. Never miss a potential customer again.'
              },
              {
                icon: '⭐',
                title: 'Review Machine',
                description: 'Automatically request and manage reviews. More 5-star reviews = more customers calling you.'
              },
              {
                icon: '🇪🇸',
                title: 'Spanish Support',
                description: 'Full Spanish language support for your team and customers. Built for California contractors.'
              },
            ].map((item, index) => (
              <div key={index} className="bg-[#fafafa] rounded-xl p-8 border border-gray-200">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold text-[#1a1a2e] mb-3">{item.title}</h3>
                <p className="text-[#5c5c70]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#1a1a2e] text-center py-20 px-6">
        <div className="max-w-[640px] mx-auto">
          <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold text-white leading-tight mb-4">
            Ready to Make the Switch?
          </h2>
          <p className="text-[1.125rem] text-white/70 mb-8">
            Start your free 14-day trial. No credit card required. Import your data from Jobber in minutes.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-10 py-5 bg-[#f5a623] text-[#1a1a2e] rounded-xl font-bold text-[1.0625rem] shadow-[0_4px_16px_rgba(245,166,35,0.35)] hover:bg-[#e6991a] hover:-translate-y-[3px] transition-all no-underline"
          >
            Start Free Trial →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#12121f] text-white py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <Link href="/" className="inline-block mb-4">
                <Image
                  src="/logo-horizontal-white-01262026.png"
                  alt="ToolTime Pro"
                  width={180}
                  height={40}
                  className="h-10 w-auto"
                />
              </Link>
              <p className="text-white/50 text-[0.9375rem] leading-relaxed max-w-[300px]">
                The all-in-one platform for service businesses. Website, scheduling, worker app, HR & compliance — we set it up, you run your business.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-5">Product</h4>
              <div className="flex flex-col gap-3">
                <Link href="/#features" className="text-white/50 text-[0.9375rem] hover:text-[#f5a623] transition-colors no-underline">Features</Link>
                <Link href="/pricing" className="text-white/50 text-[0.9375rem] hover:text-[#f5a623] transition-colors no-underline">Pricing</Link>
                <Link href="/#demos" className="text-white/50 text-[0.9375rem] hover:text-[#f5a623] transition-colors no-underline">Demos</Link>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-white mb-5">Company</h4>
              <div className="flex flex-col gap-3">
                <Link href="/auth/login" className="text-white/50 text-[0.9375rem] hover:text-[#f5a623] transition-colors no-underline">Login</Link>
                <Link href="/auth/signup" className="text-white/50 text-[0.9375rem] hover:text-[#f5a623] transition-colors no-underline">Sign Up</Link>
                <a href="mailto:support@tooltimepro.com" className="text-white/50 text-[0.9375rem] hover:text-[#f5a623] transition-colors no-underline">Contact</a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-white/40 text-[0.875rem]">
            © 2026 ToolTime Pro. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
