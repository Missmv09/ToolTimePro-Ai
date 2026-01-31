'use client';

import Link from 'next/link';
import { useState } from 'react';

// Jenny's capabilities
const jennyFeatures = [
  {
    id: 'answers',
    name: 'Jenny Answers',
    icon: '📞',
    tagline: 'Never miss a call again',
    description: 'Your 24/7 AI receptionist that answers calls, captures leads, books appointments, and handles emergencies — all while you focus on the job.',
    capabilities: [
      'Answers every call instantly, even at 2 AM',
      'Captures name, phone, address, and service details',
      'Books appointments directly into your calendar',
      'Handles emergencies and escalates when needed',
      'Speaks English and Spanish fluently',
    ],
    stats: { value: '100%', label: 'Calls Answered' },
    demoLink: '/demo/phone-receptionist',
    color: 'from-green-500 to-emerald-600',
  },
  {
    id: 'quotes',
    name: 'Jenny Quotes',
    icon: '📝',
    tagline: 'Quotes in seconds, not hours',
    description: 'Describe the job by voice, snap a photo, or type it out — Jenny analyzes the work and generates accurate quotes with market-rate pricing.',
    capabilities: [
      'Voice-to-quote: just describe the job out loud',
      'Photo analysis: snap a pic, get a quote',
      'AI-powered line item suggestions',
      'Market rate pricing guidance',
      'E-signature ready quotes',
    ],
    stats: { value: '3x', label: 'Faster Quotes' },
    demoLink: '/dashboard/smart-quote',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'reviews',
    name: 'Jenny Reviews',
    icon: '⭐',
    tagline: 'More 5-star reviews on autopilot',
    description: 'Jenny automatically requests reviews after completed jobs and writes professional responses to every review — positive or negative.',
    capabilities: [
      'Auto-sends review requests via SMS after jobs',
      'Writes personalized responses to all reviews',
      'Handles negative reviews professionally',
      'Tracks review metrics and trends',
      'Boosts your Google ranking',
    ],
    stats: { value: '5x', label: 'More Reviews' },
    demoLink: '/demo/reviews',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    id: 'assistant',
    name: 'Jenny Assistant',
    icon: '💬',
    tagline: 'Your website works 24/7',
    description: 'A smart chatbot on your website that answers customer questions, captures leads, and books appointments while you sleep.',
    capabilities: [
      'Answers FAQs about your services',
      'Captures lead info automatically',
      'Books appointments in real-time',
      'Sends you instant lead notifications',
      'Works on any device, any time',
    ],
    stats: { value: '24/7', label: 'Lead Capture' },
    demoLink: '/demo/chatbot',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'compliance',
    name: 'Jenny Compliance',
    icon: '⚖️',
    tagline: 'Stay legal, stay protected',
    description: 'Get instant answers to California labor law questions. Jenny knows wage rules, break requirements, AB5 classification, and more.',
    capabilities: [
      'California labor law guidance',
      'Wage and overtime calculations',
      'Meal and rest break compliance',
      'Worker classification (AB5) help',
      'Final pay requirements',
    ],
    stats: { value: '100+', label: 'Compliance Topics' },
    demoLink: '/demo/shield',
    color: 'from-red-500 to-rose-600',
  },
  {
    id: 'setup',
    name: 'Jenny Setup',
    icon: '🚀',
    tagline: 'Get started in minutes',
    description: 'When you sign up, Jenny helps create your business profile — generating taglines, service descriptions, and getting you ready to go.',
    capabilities: [
      'Generates business taglines',
      'Suggests service descriptions',
      'Creates professional content',
      'Tailored to your industry',
      'Ready in minutes, not days',
    ],
    stats: { value: '<5min', label: 'Setup Time' },
    demoLink: '/auth/signup',
    color: 'from-teal-500 to-cyan-500',
  },
];

// Comparison with competitors
const competitorComparison = [
  { feature: 'AI Phone Receptionist', jenny: true, jobber: '$349+/mo extra', housecall: false },
  { feature: 'AI Quote Generation', jenny: true, jobber: false, housecall: false },
  { feature: 'AI Review Responses', jenny: true, jobber: false, housecall: false },
  { feature: '24/7 Lead Capture Chatbot', jenny: true, jobber: false, housecall: false },
  { feature: 'AI Compliance Assistant', jenny: true, jobber: false, housecall: false },
  { feature: 'Voice-to-Quote', jenny: true, jobber: false, housecall: false },
  { feature: 'Photo Quote Analysis', jenny: true, jobber: false, housecall: false },
  { feature: 'Bilingual Support', jenny: true, jobber: 'Limited', housecall: false },
];

export default function JennyPage() {
  const [activeFeature, setActiveFeature] = useState(jennyFeatures[0]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#1a1a2e] via-[#2d2d44] to-[#1a1a2e] text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 text-[200px] font-bold text-white/5">867</div>
          <div className="absolute bottom-20 right-20 text-[200px] font-bold text-white/5">5309</div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-20 relative z-10">
          <Link href="/" className="text-white/70 hover:text-white text-sm mb-8 inline-flex items-center gap-1">
            ← Back to Home
          </Link>

          <div className="grid lg:grid-cols-2 gap-12 items-center mt-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#f5a623]/20 px-4 py-2 rounded-full text-[#f5a623] font-semibold text-sm mb-6">
                <span className="w-2 h-2 bg-[#f5a623] rounded-full animate-pulse"></span>
                AI-Powered Business Assistant
              </div>

              <h1 className="text-5xl lg:text-6xl font-extrabold mb-6 leading-tight">
                Meet <span className="text-[#f5a623]">Jenny</span>
              </h1>

              <p className="text-xl text-white/80 mb-4 leading-relaxed">
                Your AI-powered business partner that answers calls, writes quotes,
                handles reviews, and keeps you compliant — 24/7.
              </p>

              <p className="text-lg text-white/60 mb-8">
                While you&apos;re on the job, Jenny&apos;s got your back.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/pricing"
                  className="bg-[#f5a623] text-[#1a1a2e] px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#e6991a] transition-all hover:-translate-y-1 shadow-lg shadow-[#f5a623]/25 no-underline"
                >
                  Add Jenny for $49/mo →
                </Link>
                <Link
                  href="#features"
                  className="border-2 border-white/30 text-white px-8 py-4 rounded-xl font-bold hover:bg-white/10 transition-colors no-underline"
                >
                  See What Jenny Can Do
                </Link>
              </div>

              <p className="text-white/50 text-sm mt-6">
                Works with any plan • 14-day free trial • Jobber charges $349/mo for this
              </p>
            </div>

            {/* Jenny Avatar/Visual */}
            <div className="hidden lg:flex justify-center">
              <div className="relative">
                <div className="w-80 h-80 bg-gradient-to-br from-[#f5a623] to-[#e6991a] rounded-full flex items-center justify-center shadow-2xl shadow-[#f5a623]/20">
                  <div className="text-center">
                    <div className="text-8xl mb-4">🎧</div>
                    <div className="text-3xl font-bold text-[#1a1a2e]">Jenny</div>
                    <div className="text-[#1a1a2e]/70 font-medium">Always On Duty</div>
                  </div>
                </div>

                {/* Floating capability badges */}
                <div className="absolute -top-4 -left-4 bg-white rounded-xl px-4 py-2 shadow-lg animate-bounce">
                  <span className="text-2xl">📞</span>
                  <span className="ml-2 font-semibold text-[#1a1a2e]">Answering calls...</span>
                </div>
                <div className="absolute top-1/4 -right-8 bg-white rounded-xl px-4 py-2 shadow-lg animate-bounce" style={{ animationDelay: '0.5s' }}>
                  <span className="text-2xl">📝</span>
                  <span className="ml-2 font-semibold text-[#1a1a2e]">Writing quote...</span>
                </div>
                <div className="absolute -bottom-4 left-1/4 bg-white rounded-xl px-4 py-2 shadow-lg animate-bounce" style={{ animationDelay: '1s' }}>
                  <span className="text-2xl">⭐</span>
                  <span className="ml-2 font-semibold text-[#1a1a2e]">5 new reviews!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-[#1a1a2e]">6</div>
              <div className="text-gray-500 mt-1">AI-Powered Features</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#1a1a2e]">24/7</div>
              <div className="text-gray-500 mt-1">Always Available</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#00c853]">$49</div>
              <div className="text-gray-500 mt-1">Per Month Add-on</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#1a1a2e]">7x</div>
              <div className="text-gray-500 mt-1">Cheaper Than Jobber</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block bg-[#fef3d6] px-4 py-2 rounded-full text-sm font-bold text-[#1a1a2e] mb-4">
              One AI, Six Superpowers
            </span>
            <h2 className="text-4xl font-extrabold text-[#1a1a2e] mb-4">
              Everything Jenny Can Do For You
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Jenny handles the busywork so you can focus on what you do best — your trade.
            </p>
          </div>

          {/* Feature Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {jennyFeatures.map((feature) => (
              <button
                key={feature.id}
                onClick={() => setActiveFeature(feature)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all ${
                  activeFeature.id === feature.id
                    ? 'bg-[#1a1a2e] text-white shadow-lg'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-[#f5a623]'
                }`}
              >
                <span className="text-xl">{feature.icon}</span>
                {feature.name}
              </button>
            ))}
          </div>

          {/* Active Feature Detail */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
            <div className={`bg-gradient-to-r ${activeFeature.color} p-8 text-white`}>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-5xl">{activeFeature.icon}</div>
                <div>
                  <h3 className="text-3xl font-bold">{activeFeature.name}</h3>
                  <p className="text-white/80 text-lg">{activeFeature.tagline}</p>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-4xl font-bold">{activeFeature.stats.value}</div>
                  <div className="text-white/70">{activeFeature.stats.label}</div>
                </div>
              </div>
            </div>

            <div className="p-8">
              <p className="text-xl text-gray-700 mb-8">{activeFeature.description}</p>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-bold text-[#1a1a2e] mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-[#00c853] text-white rounded-lg flex items-center justify-center text-sm">✓</span>
                    What Jenny Does
                  </h4>
                  <ul className="space-y-3">
                    {activeFeature.capabilities.map((cap, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="text-[#00c853] mt-1">✓</span>
                        <span className="text-gray-700">{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col justify-center items-center bg-gray-50 rounded-2xl p-8">
                  <p className="text-gray-500 mb-4">See {activeFeature.name} in action</p>
                  <Link
                    href={activeFeature.demoLink}
                    className="bg-[#1a1a2e] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#2d2d44] transition-colors no-underline inline-flex items-center gap-2"
                  >
                    Try Demo →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All Features Grid */}
      <section className="py-20 bg-[#1a1a2e]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Try Each Feature</h2>
            <p className="text-white/60">Click any card to see an interactive demo</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jennyFeatures.map((feature) => (
              <Link
                key={feature.id}
                href={feature.demoLink}
                className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#f5a623] rounded-2xl p-6 transition-all hover:-translate-y-1 no-underline"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center text-2xl`}>
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{feature.name}</h3>
                    <p className="text-white/60 text-sm">{feature.tagline}</p>
                  </div>
                </div>
                <p className="text-white/70 text-sm mb-4 line-clamp-2">{feature.description}</p>
                <span className="text-[#f5a623] font-semibold text-sm group-hover:underline">
                  Try Demo →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#fef3d6] px-4 py-2 rounded-full text-sm font-bold text-[#1a1a2e] mb-4">
              Jenny vs The Competition
            </span>
            <h2 className="text-3xl font-bold text-[#1a1a2e] mb-4">
              More AI. Less Money.
            </h2>
            <p className="text-gray-600">
              See how Jenny stacks up against Jobber and HouseCall Pro
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#1a1a2e] text-white">
                  <th className="text-left p-4 font-semibold">Feature</th>
                  <th className="text-center p-4 font-semibold">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-[#f5a623]">Jenny</span>
                      <span className="text-xs bg-[#f5a623] text-[#1a1a2e] px-2 py-0.5 rounded-full">+$49/mo</span>
                    </div>
                  </th>
                  <th className="text-center p-4 font-semibold">Jobber</th>
                  <th className="text-center p-4 font-semibold">HouseCall Pro</th>
                </tr>
              </thead>
              <tbody>
                {competitorComparison.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="p-4 text-gray-700 font-medium">{row.feature}</td>
                    <td className="p-4 text-center">
                      {row.jenny === true ? (
                        <span className="text-2xl text-[#00c853]">✓</span>
                      ) : (
                        <span className="text-gray-400">{row.jenny}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {row.jobber === true ? (
                        <span className="text-2xl text-[#00c853]">✓</span>
                      ) : row.jobber === false ? (
                        <span className="text-2xl text-red-400">✗</span>
                      ) : (
                        <span className="text-gray-500 text-sm">{row.jobber}</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {row.housecall === true ? (
                        <span className="text-2xl text-[#00c853]">✓</span>
                      ) : row.housecall === false ? (
                        <span className="text-2xl text-red-400">✗</span>
                      ) : (
                        <span className="text-gray-500 text-sm">{row.housecall}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center text-gray-500 text-sm mt-6">
            * Jobber AI Receptionist is an additional $349+/month on top of their base plan
          </p>
        </div>
      </section>

      {/* 867-5309 Section */}
      <section className="py-20 bg-[#f5a623]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-6xl mb-6">🎵</div>
          <h2 className="text-4xl font-extrabold text-[#1a1a2e] mb-4">
            867-5309 / Jenny
          </h2>
          <p className="text-xl text-[#1a1a2e]/80 mb-8 max-w-2xl mx-auto">
            Just like the song, our Jenny is unforgettable. She&apos;ll answer your calls,
            capture your leads, and make sure you never miss an opportunity.
          </p>
          <p className="text-lg text-[#1a1a2e]/60 font-medium">
            &ldquo;Jenny, Jenny, who can I turn to?&rdquo; — Now you know.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#1a1a2e]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-extrabold text-white mb-6">
            Ready to Meet Jenny?
          </h2>
          <p className="text-xl text-white/70 mb-8 max-w-2xl mx-auto">
            Add Jenny to any ToolTime Pro plan for just $49/mo.
            Jobber charges $349/mo for this. You save $300+ every month.
          </p>

          <div className="bg-white/10 rounded-2xl p-6 mb-8 max-w-md mx-auto">
            <div className="text-white/60 text-sm mb-2">Example: Pro Plan + Jenny</div>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-white text-lg">$59</span>
              <span className="text-white/50">+</span>
              <span className="text-[#f5a623] text-lg">$49</span>
              <span className="text-white/50">=</span>
              <span className="text-[#f5a623] text-4xl font-bold">$108</span>
              <span className="text-white/60">/mo</span>
            </div>
            <div className="text-white/40 text-sm mt-2">Jobber equivalent: $598/mo</div>
          </div>

          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Link
              href="/pricing"
              className="bg-[#f5a623] text-[#1a1a2e] px-10 py-5 rounded-xl font-bold text-lg hover:bg-[#e6991a] transition-all hover:-translate-y-1 shadow-lg shadow-[#f5a623]/25 no-underline"
            >
              Add Jenny to Your Plan →
            </Link>
            <Link
              href="/auth/signup"
              className="border-2 border-white/30 text-white px-10 py-5 rounded-xl font-bold hover:bg-white/10 transition-colors no-underline"
            >
              Start Free Trial
            </Link>
          </div>

          <div className="flex justify-center gap-8 text-white/50 text-sm flex-wrap">
            <span>✓ 14-day free trial</span>
            <span>✓ No credit card required</span>
            <span>✓ Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#12121f] text-white py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-white/40 text-sm">
            © 2026 ToolTime Pro. Jenny is your AI-powered business assistant.
          </p>
          <div className="flex justify-center gap-6 mt-4">
            <Link href="/" className="text-white/60 hover:text-[#f5a623] text-sm no-underline">Home</Link>
            <Link href="/pricing" className="text-white/60 hover:text-[#f5a623] text-sm no-underline">Pricing</Link>
            <Link href="/compare/jobber" className="text-white/60 hover:text-[#f5a623] text-sm no-underline">Compare vs Jobber</Link>
            <Link href="/auth/signup" className="text-white/60 hover:text-[#f5a623] text-sm no-underline">Sign Up</Link>
          </div>
          <div className="mt-6 text-[#f5a623] text-sm">
            ★ Proudly Women-Owned Business
          </div>
        </div>
      </footer>
    </div>
  );
}
