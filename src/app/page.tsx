'use client';

import Link from 'next/link';
import { useState } from 'react';

// Feature tabs in customer journey order
const featureTabs = [
  { id: 'website', name: 'Website', icon: '🌐', description: 'Your online storefront, built for you' },
  { id: 'scheduling', name: 'Scheduling', icon: '📅', description: 'Let customers book while you sleep' },
  { id: 'quoting', name: 'Quoting', icon: '📝', description: 'Professional quotes in 60 seconds' },
  { id: 'worker-app', name: 'Worker App', icon: '👷', description: 'Your crew\'s job command center' },
  { id: 'payments', name: 'Payments', icon: '💳', description: 'Get paid faster. Chase payments less.' },
  { id: 'reviews', name: 'Reviews', icon: '⭐', description: 'Turn happy customers into 5-star reviews' },
  { id: 'compliance', name: 'Compliance', icon: '🛡️', description: 'California compliance made stupid simple' },
  { id: 'payroll', name: 'Payroll', icon: '💵', comingSoon: true, description: 'Payroll that actually understands California' },
];

// Demo cards organized in rows
const demoCards = {
  row1: [
    { name: 'Website Builder', tagline: 'See a sample site we\'d build for you', icon: '🌐', href: '/demo/website' },
    { name: 'Online Scheduling', tagline: 'Book a fake appointment', icon: '📅', href: '/demo/scheduling' },
    { name: 'Smart Quoting', tagline: 'Build a quote in 60 seconds', icon: '📝', href: '/demo/quoting' },
    { name: 'AI Chatbot', tagline: 'Chat with our AI right now', icon: '🤖', href: '/demo/chatbot' },
  ],
  row2: [
    { name: 'Worker App', tagline: 'See what your crew sees', icon: '👷', href: '/worker' },
    { name: 'Admin Dashboard', tagline: 'Explore the command center', icon: '📊', href: '/dashboard' },
    { name: 'Invoicing', tagline: 'See a sample invoice', icon: '💳', href: '/demo/invoicing' },
    { name: 'Review Machine', tagline: 'See the review flow', icon: '⭐', href: '/demo/reviews' },
  ],
  row3: [
    { name: 'ToolTime Shield', tagline: 'Check your CA compliance', icon: '🛡️', href: '/dashboard/shield' },
    { name: 'HR Documents', tagline: 'Download free templates', icon: '📄', href: '/dashboard/hr-toolkit' },
  ],
};

// Feature list with title, tagline, and descriptions
const featureList = [
  { name: 'Professional Website', tagline: 'Built For You', description: 'We create your branded site. Mobile-optimized, fast, designed to convert visitors into paying customers.', icon: '✓' },
  { name: '24/7 AI Chatbot', tagline: 'Always On', description: 'Our AI answers questions and captures leads around the clock. Even at 2am on Sunday.', icon: '✓' },
  { name: 'Online Scheduling', tagline: 'Fill Your Calendar', description: 'Customers book online anytime. Automatic reminders reduce no-shows by 50%.', icon: '✓' },
  { name: 'Smart Quoting', tagline: 'Win More Jobs', description: 'Create professional quotes in seconds. Customers approve with one tap.', icon: '✓' },
  { name: 'Worker App with GPS Clock-In', tagline: '', description: 'Your crew sees their jobs, clocks in with location proof, uploads photos, and reports issues.', icon: '✓' },
  { name: 'Invoicing & Payments', tagline: 'Get Paid Fast', description: 'One-click invoices. Accept cards and ACH. Auto-reminders chase late payers for you.', icon: '✓' },
  { name: 'Review Machine', tagline: '5-Star Automation', description: 'Auto-request reviews after every job. Watch your Google rating climb automatically.', icon: '✓' },
  { name: 'ToolTime Shield', tagline: 'Legal Protection', description: 'Worker classification quiz, final pay calculator, CA compliance checklists. Stay lawsuit-free.', icon: '✓' },
  { name: 'HR Document Library', tagline: 'Ready to Use', description: '10+ templates: offer letters, termination checklists, I-9 links. All CA-compliant.', icon: '✓' },
  { name: 'Payroll', tagline: 'Coming Soon', description: 'Auto-calculate CA overtime & double-time. Join the waitlist.', icon: '⏳' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('website');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeTabData = featureTabs.find(tab => tab.id === activeTab);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-navy-gradient text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            ToolTime <span className="text-gold-500">Pro</span>
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mb-8">
            The all-in-one platform for blue-collar service businesses.
            Manage jobs, workers, compliance, and grow your landscaping, pool, painting, or cleaning business.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/dashboard" className="btn-secondary text-lg px-6 py-3">
              Open Dashboard
            </Link>
            <Link href="/worker/login" className="btn-outline border-white text-white hover:bg-white hover:text-navy-500 text-lg px-6 py-3">
              Worker App
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Tabs Section */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-navy-500 text-center mb-8">Everything You Need to Run Your Business</h2>

        {/* Mobile Dropdown */}
        <div className="md:hidden mb-6">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg flex items-center justify-between shadow-sm"
          >
            <span className="flex items-center gap-2">
              <span>{activeTabData?.icon}</span>
              <span className="font-medium text-navy-500">{activeTabData?.name}</span>
              {activeTabData?.comingSoon && (
                <span className="text-xs bg-gold-500 text-navy-900 px-2 py-0.5 rounded-full">
                  Coming Soon
                </span>
              )}
            </span>
            <span className={`text-gray-400 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {mobileMenuOpen && (
            <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              {featureTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left flex items-center gap-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                    activeTab === tab.id
                      ? 'bg-navy-50 text-navy-600'
                      : 'hover:bg-gray-50 text-gray-700'
                  } ${tab.comingSoon ? 'opacity-70' : ''}`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span className="font-medium">{tab.name}</span>
                  {tab.comingSoon && (
                    <span className="text-xs bg-gold-500 text-navy-900 px-2 py-0.5 rounded-full ml-auto">
                      Coming Soon
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Tabs Navigation */}
        <div className="hidden md:flex flex-wrap justify-center gap-2 mb-8">
          {featureTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-navy-500 text-white shadow-md scale-105'
                  : 'bg-white text-navy-500 border border-gray-200 hover:border-navy-300 hover:bg-gray-50'
              } ${tab.comingSoon ? 'opacity-70' : ''}`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
              {tab.comingSoon && (
                <span className="text-xs bg-gold-500 text-navy-900 px-2 py-0.5 rounded-full ml-1">
                  Coming Soon
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Active Tab Content */}
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          {featureTabs.map((tab) => (
            tab.id === activeTab && (
              <div key={tab.id} className="animate-fadeIn">
                <div className="w-20 h-20 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">{tab.icon}</span>
                </div>
                <h3 className="text-2xl font-bold text-navy-500 mb-2">{tab.name}</h3>
                <p className="text-gray-600 max-w-xl mx-auto">{tab.description}</p>
                {!tab.comingSoon && (
                  <Link
                    href={
                      tab.id === 'compliance' ? '/dashboard/shield' :
                      tab.id === 'worker-app' ? '/worker' :
                      tab.id === 'payments' ? '/demo/invoicing' :
                      `/demo/${tab.id}`
                    }
                    className="inline-block mt-6 btn-primary"
                  >
                    Try Demo →
                  </Link>
                )}
              </div>
            )
          ))}
        </div>
      </div>

      {/* Feature List + Demo Cards Section */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Left: Feature List */}
            <div className="lg:col-span-1">
              <h2 className="text-xl font-bold text-navy-500 mb-6">Platform Features</h2>
              <ul className="space-y-4">
                {featureList.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className={`mt-1 ${feature.icon === '⏳' ? 'text-gray-400' : 'text-gold-500'}`}>{feature.icon}</span>
                    <div>
                      <span className={`font-medium ${feature.icon === '⏳' ? 'text-gray-500' : 'text-navy-500'}`}>
                        {feature.name}
                        {feature.tagline && <span className="text-gray-500 font-normal"> — {feature.tagline}</span>}
                      </span>
                      <p className="text-sm text-gray-600 mt-0.5">{feature.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: Demo Cards */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold text-navy-500 mb-6">See It In Action</h2>

              {/* Row 1 */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {demoCards.row1.map((card, index) => (
                  <Link key={index} href={card.href} className="card-hover group p-4 flex flex-col">
                    <div className="w-10 h-10 bg-gold-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-gold-200 transition-colors">
                      <span className="text-xl">{card.icon}</span>
                    </div>
                    <h3 className="font-semibold text-navy-500 text-sm mb-1">{card.name}</h3>
                    <p className="text-xs text-gray-600 flex-grow">{card.tagline}</p>
                    <span className="text-xs text-gold-600 font-medium mt-2 group-hover:text-gold-700">Try Demo →</span>
                  </Link>
                ))}
              </div>

              {/* Row 2 */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {demoCards.row2.map((card, index) => (
                  <Link key={index} href={card.href} className="card-hover group p-4 flex flex-col">
                    <div className="w-10 h-10 bg-gold-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-gold-200 transition-colors">
                      <span className="text-xl">{card.icon}</span>
                    </div>
                    <h3 className="font-semibold text-navy-500 text-sm mb-1">{card.name}</h3>
                    <p className="text-xs text-gray-600 flex-grow">{card.tagline}</p>
                    <span className="text-xs text-gold-600 font-medium mt-2 group-hover:text-gold-700">Try Demo →</span>
                  </Link>
                ))}
              </div>

              {/* Row 3 */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {demoCards.row3.map((card, index) => (
                  <Link key={index} href={card.href} className="card-hover group p-4 flex flex-col">
                    <div className="w-10 h-10 bg-gold-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-gold-200 transition-colors">
                      <span className="text-xl">{card.icon}</span>
                    </div>
                    <h3 className="font-semibold text-navy-500 text-sm mb-1">{card.name}</h3>
                    <p className="text-xs text-gray-600 flex-grow">{card.tagline}</p>
                    <span className="text-xs text-gold-600 font-medium mt-2 group-hover:text-gold-700">Try Demo →</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-xl font-bold text-navy-500 mb-6">Quick Links</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/dashboard" className="p-4 bg-white rounded-lg hover:bg-gray-100 transition-colors shadow-sm">
              <span className="font-medium text-navy-500">Admin Dashboard</span>
            </Link>
            <Link href="/dashboard/jobs" className="p-4 bg-white rounded-lg hover:bg-gray-100 transition-colors shadow-sm">
              <span className="font-medium text-navy-500">Jobs Management</span>
            </Link>
            <Link href="/dashboard/leads" className="p-4 bg-white rounded-lg hover:bg-gray-100 transition-colors shadow-sm">
              <span className="font-medium text-navy-500">Lead Tracking</span>
            </Link>
            <Link href="/dashboard/time-logs" className="p-4 bg-white rounded-lg hover:bg-gray-100 transition-colors shadow-sm">
              <span className="font-medium text-navy-500">Time Logs</span>
            </Link>
            <Link href="/dashboard/shield" className="p-4 bg-white rounded-lg hover:bg-gray-100 transition-colors shadow-sm">
              <span className="font-medium text-navy-500">ToolTime Shield</span>
            </Link>
            <Link href="/dashboard/shield/calculator" className="p-4 bg-white rounded-lg hover:bg-gray-100 transition-colors shadow-sm">
              <span className="font-medium text-navy-500">Penalty Calculator</span>
            </Link>
            <Link href="/worker/login" className="p-4 bg-white rounded-lg hover:bg-gray-100 transition-colors shadow-sm">
              <span className="font-medium text-navy-500">Worker Login</span>
            </Link>
            <Link href="/dashboard/hr-toolkit" className="p-4 bg-white rounded-lg hover:bg-gray-100 transition-colors shadow-sm">
              <span className="font-medium text-navy-500">HR Document Library</span>
            </Link>
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
