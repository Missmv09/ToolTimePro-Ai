'use client';

import Link from 'next/link';
import { useState } from 'react';

// Hero feature tabs
const heroFeatureTabs = [
  { name: 'Website', active: true },
  { name: 'Scheduling', active: true },
  { name: 'Worker App', active: true },
  { name: 'Compliance & HR', active: true },
  { name: 'Payments', active: true },
  { name: 'Payroll', active: false, comingSoon: true },
];

// Feature list with title, tagline, and descriptions
const featureList = [
  { name: 'Professional Website', tagline: 'Built For You', description: 'We create your branded site. Mobile-optimized, fast, designed to convert visitors into paying customers.', icon: '✓' },
  { name: '24/7 AI Chatbot', tagline: 'Always On', description: 'Our AI answers questions and captures leads around the clock. Even at 2am on Sunday.', icon: '✓' },
  { name: 'Online Scheduling', tagline: 'Fill Your Calendar', description: 'Customers book online anytime. Automatic reminders reduce no-shows.', icon: '✓' },
  { name: 'Smart Quoting', tagline: 'Win More Jobs', description: 'Create professional quotes in seconds. Customers approve with one tap.', icon: '✓' },
  { name: 'Worker App with GPS Clock-In', tagline: '', description: 'Your crew sees their jobs, clocks in with location proof, uploads photos, and reports issues.', icon: '✓' },
  { name: 'Invoicing & Payments', tagline: 'Get Paid Fast', description: 'One-click invoices. Accept cards and ACH. Auto-reminders chase late payers for you.', icon: '✓' },
  { name: 'Review Machine', tagline: '5-Star Automation', description: 'Auto-request reviews after every job. Watch your Google rating climb automatically.', icon: '✓' },
  { name: 'ToolTime Shield', tagline: 'Legal Protection + HR', description: 'Worker classification quiz, final pay calculator, compliance tools, AND 10+ HR templates. Stay lawsuit-free.', icon: '✓' },
  { name: 'Payroll', tagline: 'Coming Soon', description: 'Auto-calculate CA overtime & double-time. Join the waitlist.', icon: '⏳' },
];

// Demo cards organized in rows
const demoCards = {
  row1: [
    { name: 'Smart Quoting', tagline: 'Create professional quotes in seconds with line items', icon: '📝', href: '/demo/quoting' },
    { name: 'Online Scheduling', tagline: 'Let customers book online + manage your calendar', icon: '📅', href: '/demo/scheduling' },
    { name: 'AI Chatbot', tagline: '24/7 lead capture that never misses a customer', icon: '🤖', href: '/demo/chatbot' },
    { name: 'Review Machine', tagline: 'Automate 5-star reviews with SMS follow-ups', icon: '⭐', href: '/demo/reviews' },
  ],
  row2: [
    { name: 'Worker App', tagline: 'GPS clock-in, job details, and compliance tracking', icon: '👷', href: '/worker' },
    { name: 'Admin Dashboard', tagline: 'See jobs, revenue, crew status at a glance', icon: '📊', href: '/dashboard' },
    { name: 'ToolTime Shield', tagline: 'Worker classification, final pay calculator, HR docs', icon: '🛡️', href: '/dashboard/shield' },
  ],
};

// HR Document templates
const hrDocuments = [
  'New hire checklist (W-2 employees)',
  '1099 contractor onboarding checklist',
  'Offer letter template (CA at-will compliant)',
  'Termination checklist',
  'Resignation acceptance letter',
  'Wage theft prevention notice (CA required)',
  'Emergency contact form',
  'Time-off request form',
  'Incident report form',
  'I-9 & W-4 form links',
];

// Pricing plans
const pricingPlans = [
  {
    name: 'Starter',
    price: 30,
    setup: 499,
    tagline: 'Best for solo operators (1-2 people)',
    popular: false,
    features: [
      'Professional website (built for you)',
      'Online booking page',
      'Basic scheduling',
      'AI chatbot (lead capture)',
      'Invoicing + card payments',
      'ToolTime Shield (compliance tools)',
      'HR document library (10+ templates)',
      'Email support',
    ],
  },
  {
    name: 'Pro',
    price: 49,
    setup: 699,
    tagline: 'Best for growing teams (3-10 people)',
    popular: true,
    features: [
      'Everything in Starter, plus:',
      'Worker App (GPS clock-in, job lists)',
      'Smart quoting with e-signatures',
      'Admin dashboard',
      'Review Machine (automated 5-star requests)',
      'Break tracking + CA compliance alerts',
      'Team scheduling + dispatch',
      'Priority support',
    ],
  },
  {
    name: 'Elite',
    price: 79,
    setup: 999,
    tagline: 'Best for larger crews (10-50 people)',
    popular: false,
    features: [
      'Everything in Pro, plus:',
      'Multiple admin users',
      'Advanced reporting + analytics',
      'Custom job checklists',
      'Photo verification (clock-in selfies)',
      'Compliance dashboard + violation alerts',
      'Dedicated account manager',
      'Phone support',
      'Payroll (when launched) — included free',
    ],
  },
];

// Comparison table features
const comparisonFeatures = [
  { name: 'Professional Website', starter: true, pro: true, elite: true },
  { name: 'Online Scheduling', starter: true, pro: true, elite: true },
  { name: 'AI Chatbot', starter: true, pro: true, elite: true },
  { name: 'Invoicing + Payments', starter: true, pro: true, elite: true },
  { name: 'ToolTime Shield', starter: true, pro: true, elite: true },
  { name: 'HR Document Library', starter: true, pro: true, elite: true },
  { name: 'Worker App (GPS)', starter: false, pro: true, elite: true },
  { name: 'Smart Quoting', starter: false, pro: true, elite: true },
  { name: 'Review Machine', starter: false, pro: true, elite: true },
  { name: 'Break Tracking Alerts', starter: false, pro: true, elite: true },
  { name: 'Admin Dashboard', starter: false, pro: true, elite: true },
  { name: 'Multiple Admins', starter: false, pro: false, elite: true },
  { name: 'Advanced Reports', starter: false, pro: false, elite: true },
  { name: 'Photo Verification', starter: false, pro: false, elite: true },
  { name: 'Compliance Dashboard', starter: false, pro: false, elite: true },
  { name: 'Dedicated Support', starter: false, pro: false, elite: true },
];

// Pricing FAQs
const pricingFaqs = [
  {
    question: "What's included in the setup fee?",
    answer: "We build your website, set up your booking system, configure your AI chatbot, and train you on everything. Done-for-you, not DIY.",
  },
  {
    question: "Are there any hidden fees?",
    answer: "Nope. Just the monthly fee + standard payment processing (2.9% + 30¢ per transaction).",
  },
  {
    question: "Can I switch plans later?",
    answer: "Yes! Upgrade or downgrade anytime. We'll prorate your billing.",
  },
  {
    question: "What if I want to cancel?",
    answer: "Cancel anytime. No contracts, no cancellation fees. We'll even help you export your data.",
  },
  {
    question: "Do you offer discounts for annual billing?",
    answer: "Yes — pay annually and get 2 months free (17% savings).",
  },
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileFeatureOpen, setMobileFeatureOpen] = useState(false);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-[#1a1a2e] to-[#2d2d4a] text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
          {/* Tagline Badge */}
          <div className="mb-6">
            <span className="inline-block bg-gold-500 text-navy-900 text-sm font-semibold px-4 py-1.5 rounded-full">
              Built For You
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
            For Service Businesses That Go To Their Customers
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-white/80 max-w-3xl mb-12">
            Whether you&apos;re a solo operator or managing a crew, ToolTime Pro handles the back office so you can focus on the work.
          </p>

          {/* Industry Grid (4x2) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-2xl mb-2">🏠</div>
              <div className="font-semibold text-gold-500 mb-1">Home Services</div>
              <div className="text-sm text-white/70">Cleaning, handyman, organizing, inspections</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-2xl mb-2">🌿</div>
              <div className="font-semibold text-gold-500 mb-1">Outdoor Services</div>
              <div className="text-sm text-white/70">Landscaping, pool, pressure washing</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-2xl mb-2">🚗</div>
              <div className="font-semibold text-gold-500 mb-1">Mobile Services</div>
              <div className="text-sm text-white/70">Auto detailing, notary, locksmith, towing</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-2xl mb-2">💆</div>
              <div className="font-semibold text-gold-500 mb-1">Wellness & Beauty</div>
              <div className="text-sm text-white/70">Massage, salon, personal training</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-2xl mb-2">🐕</div>
              <div className="font-semibold text-gold-500 mb-1">Pet Services</div>
              <div className="text-sm text-white/70">Grooming, walking, sitting, training</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-2xl mb-2">📚</div>
              <div className="font-semibold text-gold-500 mb-1">Lessons & Events</div>
              <div className="text-sm text-white/70">Tutoring, photography, DJ, catering</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-2xl mb-2">🔧</div>
              <div className="font-semibold text-gold-500 mb-1">Skilled Trades</div>
              <div className="text-sm text-white/70">Electrical, plumbing, HVAC, painting, roofing</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-2xl mb-2">✨</div>
              <div className="font-semibold text-gold-500 mb-1">And More</div>
              <div className="text-sm text-white/70">If you book appointments and send invoices, we&apos;re for you</div>
            </div>
          </div>

          {/* CTA Button */}
          <div>
            <Link
              href="#demos"
              className="inline-block bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold text-lg px-8 py-3 rounded-lg transition-colors"
            >
              See How It Works →
            </Link>
          </div>
        </div>
      </div>

      {/* Feature List Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-navy-500 mb-8">Platform Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureList.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className={`mt-1 text-lg ${feature.icon === '⏳' ? 'text-gray-400' : 'text-gold-500'}`}>
                  {feature.icon}
                </span>
                <div>
                  <span className={`font-semibold ${feature.icon === '⏳' ? 'text-gray-500' : 'text-navy-500'}`}>
                    {feature.name}
                    {feature.tagline && <span className="text-gray-500 font-normal"> — {feature.tagline}</span>}
                  </span>
                  <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Demo Cards Section */}
      <div id="demos" className="bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-16">
          {/* Section Header */}
          <div className="text-center mb-12">
            <span className="inline-block bg-gold-100 text-gold-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              See It In Action
            </span>
            <h2 className="text-3xl font-bold text-navy-500 mb-3">Try Our Interactive Demos</h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              Click any feature below to see exactly how ToolTime Pro works. No signup required.
            </p>
          </div>

          {/* Row 1 - 4 cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {demoCards.row1.map((card, index) => (
              <Link
                key={index}
                href={card.href}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col group"
              >
                <div className="w-12 h-12 bg-gold-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-gold-200 transition-colors">
                  <span className="text-2xl">{card.icon}</span>
                </div>
                <h3 className="font-semibold text-navy-500 mb-2">{card.name}</h3>
                <p className="text-sm text-gray-600 flex-grow">{card.tagline}</p>
                <span className="text-sm text-gold-600 font-medium mt-3 group-hover:text-gold-700">
                  Try Demo →
                </span>
              </Link>
            ))}
          </div>

          {/* Row 2 - 3 cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {demoCards.row2.map((card, index) => (
              <Link
                key={index}
                href={card.href}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col group"
              >
                <div className="w-12 h-12 bg-gold-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-gold-200 transition-colors">
                  <span className="text-2xl">{card.icon}</span>
                </div>
                <h3 className="font-semibold text-navy-500 mb-2">{card.name}</h3>
                <p className="text-sm text-gray-600 flex-grow">{card.tagline}</p>
                <span className="text-sm text-gold-600 font-medium mt-3 group-hover:text-gold-700">
                  Try Demo →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ToolTime Shield + HR Section */}
      <div className="bg-[#f8f9fa]">
        <div className="max-w-6xl mx-auto px-4 py-16">
          {/* Section Header */}
          <div className="text-center mb-12">
            <span className="inline-block bg-navy-100 text-navy-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              ToolTime HR
            </span>
            <h2 className="text-3xl font-bold text-navy-500 mb-3">Your Back-Office Safety Net</h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              The HR support that other platforms don&apos;t offer. Sleep better knowing you&apos;re protected.
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column: Document Templates */}
            <div>
              <h3 className="text-xl font-bold text-navy-500 mb-4">Document Templates (Included)</h3>
              <ul className="space-y-3">
                {hrDocuments.map((doc, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-gold-500 mt-0.5">✓</span>
                    <span className="text-gray-700">{doc}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right Column: Interactive Tools */}
            <div className="space-y-6">
              {/* HR Document Library Card */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h4 className="font-bold text-navy-500 mb-1">HR Document Library</h4>
                <p className="text-sm text-gray-600 mb-4">All templates ready to use</p>
                <div className="space-y-2">
                  <Link
                    href="/dashboard/hr-toolkit"
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-sm text-navy-500">Offer Letter Template</span>
                    <span className="text-xs bg-gold-500 text-navy-900 px-3 py-1 rounded font-medium">Download</span>
                  </Link>
                  <Link
                    href="/dashboard/hr-toolkit"
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-sm text-navy-500">Termination Checklist</span>
                    <span className="text-xs bg-gold-500 text-navy-900 px-3 py-1 rounded font-medium">Download</span>
                  </Link>
                  <Link
                    href="/dashboard/hr-toolkit"
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-sm text-navy-500">1099 Onboarding</span>
                    <span className="text-xs bg-gold-500 text-navy-900 px-3 py-1 rounded font-medium">Download</span>
                  </Link>
                </div>
              </div>

              {/* Worker Classification Quiz Card */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h4 className="font-bold text-navy-500 mb-1">Worker Classification Quiz</h4>
                <p className="text-sm text-gray-600 mb-4">Does this worker control how & when they work?</p>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-700 mb-3">Sample Question:</p>
                  <p className="text-navy-500 font-medium mb-3">&quot;Does this worker set their own schedule?&quot;</p>
                  <div className="flex gap-3">
                    <span className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm">Yes</span>
                    <span className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm">No</span>
                  </div>
                </div>
                <Link
                  href="/dashboard/shield"
                  className="inline-block bg-gold-500 hover:bg-gold-600 text-navy-900 font-medium px-6 py-2 rounded-lg transition-colors"
                >
                  Take the Quiz →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="bg-white">
        <div className="max-w-6xl mx-auto px-4 py-16">
          {/* Section Header */}
          <div className="text-center mb-12">
            <span className="inline-block bg-gold-100 text-gold-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              Simple Pricing
            </span>
            <h2 className="text-3xl font-bold text-navy-500 mb-3">Plans That Grow With You</h2>
            <p className="text-gray-600">No hidden fees. No annual contracts. Cancel anytime.</p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`bg-white rounded-xl p-6 flex flex-col ${
                  plan.popular
                    ? 'border-2 border-gold-500 shadow-lg relative'
                    : 'border border-gray-200 shadow-sm'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gold-500 text-navy-900 text-xs font-bold px-4 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-bold text-navy-500 mb-2">{plan.name}</h3>
                <div className="mb-1">
                  <span className="text-4xl font-bold text-navy-500">${plan.price}</span>
                  <span className="text-gray-500">/mo</span>
                </div>
                <p className="text-sm text-gray-500 mb-4">+ ${plan.setup} one-time setup</p>
                <p className="text-sm text-gray-600 mb-6">{plan.tagline}</p>
                <ul className="space-y-3 mb-6 flex-grow">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-2 text-sm">
                      <span className="text-gold-500 mt-0.5">✓</span>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/register"
                  className={`text-center py-3 rounded-lg font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-gold-500 hover:bg-gold-600 text-navy-900'
                      : 'border-2 border-navy-500 text-navy-500 hover:bg-navy-50'
                  }`}
                >
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto mb-12">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-navy-500 text-white">
                  <th className="text-left p-4 font-semibold">Feature</th>
                  <th className="text-center p-4 font-semibold">Starter</th>
                  <th className="text-center p-4 font-semibold bg-navy-600">Pro</th>
                  <th className="text-center p-4 font-semibold">Elite</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-4 text-navy-500">{feature.name}</td>
                    <td className="text-center p-4">
                      {feature.starter ? (
                        <span className="text-gold-500">✓</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className={`text-center p-4 ${index % 2 === 0 ? 'bg-gold-50' : 'bg-gold-50/50'}`}>
                      {feature.pro ? (
                        <span className="text-gold-500">✓</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="text-center p-4">
                      {feature.elite ? (
                        <span className="text-gold-500">✓</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="bg-navy-50 font-bold">
                  <td className="p-4 text-navy-500">Monthly Price</td>
                  <td className="text-center p-4 text-navy-500">$30</td>
                  <td className="text-center p-4 text-navy-500 bg-gold-100">$49</td>
                  <td className="text-center p-4 text-navy-500">$79</td>
                </tr>
                <tr className="bg-white">
                  <td className="p-4 text-gray-600">Setup Fee</td>
                  <td className="text-center p-4 text-gray-600">$499</td>
                  <td className="text-center p-4 text-gray-600 bg-gold-50">$699</td>
                  <td className="text-center p-4 text-gray-600">$999</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pricing FAQ */}
          <div className="max-w-3xl mx-auto mb-12">
            <h3 className="text-xl font-bold text-navy-500 mb-6 text-center">Frequently Asked Questions</h3>
            <div className="space-y-3">
              {pricingFaqs.map((faq, index) => (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full flex items-center justify-between p-4 text-left bg-white hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-navy-500">{faq.question}</span>
                    <span className={`text-gray-400 transition-transform ${openFaq === index ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>
                  {openFaq === index && (
                    <div className="p-4 bg-gray-50 border-t border-gray-200">
                      <p className="text-gray-600">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pricing CTA */}
          <div className="text-center">
            <p className="text-gray-600 mb-4">Not sure which plan is right for you?</p>
            <Link
              href="/contact"
              className="inline-block bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Schedule a Free Consultation
            </Link>
            <p className="text-sm text-gray-500 mt-3">Talk to a real human. No pressure.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-navy-500 text-white/70 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="font-bold text-white mb-2">ToolTime Pro</p>
          <p className="text-sm">Built for landscapers, painters, pool pros, handymen, and cleaners.</p>
        </div>
      </footer>
    </main>
  );
}
