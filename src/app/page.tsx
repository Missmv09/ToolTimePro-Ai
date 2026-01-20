'use client';

import Link from 'next/link';
import { useState } from 'react';

// Feature tabs in customer journey order
const featureTabs = [
  { id: 'website', name: 'Website', icon: '🌐', description: 'Build your professional online presence' },
  { id: 'scheduling', name: 'Online Scheduling', icon: '📅', description: 'Let customers book jobs online' },
  { id: 'quoting', name: 'Smart Quoting', icon: '📝', description: 'Create professional quotes in seconds' },
  { id: 'worker-app', name: 'Worker App', icon: '👷', description: 'GPS clock-in, job tracking, photo uploads' },
  { id: 'invoicing', name: 'Invoicing', icon: '💰', description: 'Send invoices and get paid faster' },
  { id: 'reviews', name: 'Review Machine', icon: '⭐', description: 'Automate 5-star review requests' },
  { id: 'compliance', name: 'ToolTime Shield', icon: '🛡️', description: 'California compliance made simple' },
  { id: 'payroll', name: 'Payroll', icon: '💵', comingSoon: true, description: 'Automated payroll processing' },
];

// Demo cards organized in rows
const demoCards = {
  row1: [
    { name: 'Website Builder', tagline: 'See how we build your site', icon: '🌐', href: '/demo/website' },
    { name: 'Online Scheduling', tagline: 'Let customers book online', icon: '📅', href: '/demo/scheduling' },
    { name: 'Smart Quoting', tagline: 'Create quotes in seconds', icon: '📝', href: '/demo/quoting' },
    { name: 'AI Chatbot', tagline: 'Never miss a lead', icon: '🤖', href: '/demo/chatbot' },
  ],
  row2: [
    { name: 'Worker App', tagline: 'GPS clock-in & job tracking', icon: '👷', href: '/worker' },
    { name: 'Admin Dashboard', tagline: 'See everything at a glance', icon: '📊', href: '/dashboard' },
    { name: 'Invoicing & Payments', tagline: 'Get paid faster', icon: '💰', href: '/demo/invoicing' },
    { name: 'Review Machine', tagline: 'Automate 5-star reviews', icon: '⭐', href: '/demo/reviews' },
  ],
  row3: [
    { name: 'ToolTime Shield', tagline: 'CA compliance made simple', icon: '🛡️', href: '/dashboard/shield' },
    { name: 'HR Document Library', tagline: 'All the forms you need', icon: '📋', href: '/dashboard/hr-toolkit' },
  ],
};

// Feature list with descriptions
const featureList = [
  { name: 'Website Builder', description: 'Get a professional site that converts visitors to customers' },
  { name: 'Online Scheduling', description: 'Let customers book appointments 24/7 online' },
  { name: 'Smart Quoting', description: 'Create professional quotes in seconds with line items' },
  { name: 'Worker App', description: 'GPS clock-in, job checklists, and photo uploads' },
  { name: 'Invoicing & Payments', description: 'Send invoices and accept payments instantly' },
  { name: 'Review Machine', description: 'Automatically request reviews, boost your Google rating' },
  { name: 'ToolTime Shield', description: 'California compliance tools and AB5 protection' },
  { name: 'Admin Dashboard', description: 'Jobs, leads, workers, revenue — all in one view' },
  { name: 'HR Document Library', description: 'Offer letters, checklists, W-2/1099 guides' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('website');

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

        {/* Tabs Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {featureTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-navy-500 text-white shadow-md'
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
                    href={tab.id === 'compliance' ? '/dashboard/shield' : tab.id === 'worker-app' ? '/worker' : `/demo/${tab.id}`}
                    className="inline-block mt-6 btn-primary"
                  >
                    Learn More
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
                    <span className="text-gold-500 mt-1">✓</span>
                    <div>
                      <span className="font-medium text-navy-500">{feature.name}</span>
                      <p className="text-sm text-gray-600">{feature.description}</p>
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
                  <Link key={index} href={card.href} className="card-hover group p-4">
                    <div className="w-10 h-10 bg-gold-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-gold-200 transition-colors">
                      <span className="text-xl">{card.icon}</span>
                    </div>
                    <h3 className="font-semibold text-navy-500 text-sm mb-1">{card.name}</h3>
                    <p className="text-xs text-gray-600">{card.tagline}</p>
                  </Link>
                ))}
              </div>

              {/* Row 2 */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {demoCards.row2.map((card, index) => (
                  <Link key={index} href={card.href} className="card-hover group p-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                      <span className="text-xl">{card.icon}</span>
                    </div>
                    <h3 className="font-semibold text-navy-500 text-sm mb-1">{card.name}</h3>
                    <p className="text-xs text-gray-600">{card.tagline}</p>
                  </Link>
                ))}
              </div>

              {/* Row 3 */}
              <div className="grid sm:grid-cols-2 gap-4">
                {demoCards.row3.map((card, index) => (
                  <Link key={index} href={card.href} className="card-hover group p-4">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-red-200 transition-colors">
                      <span className="text-xl">{card.icon}</span>
                    </div>
                    <h3 className="font-semibold text-navy-500 text-sm mb-1">{card.name}</h3>
                    <p className="text-xs text-gray-600">{card.tagline}</p>
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
