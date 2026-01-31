'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function CompareJobber() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [industriesOpen, setIndustriesOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
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
            <div className="relative">
              <button
                onClick={() => setIndustriesOpen(!industriesOpen)}
                className="text-[#5c5c70] font-medium text-[0.9375rem] hover:text-[#1a1a2e] transition-colors flex items-center gap-1"
              >
                Industries <span className="text-xs">▼</span>
              </button>
              {industriesOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50 max-h-[70vh] overflow-y-auto">
                  <Link href="/industries/landscaping" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🌳 Landscaping
                  </Link>
                  <Link href="/industries/lawn-care" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🌱 Lawn Care
                  </Link>
                  <Link href="/industries/pool-service" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🏊 Pool Service
                  </Link>
                  <Link href="/industries/plumbing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🔧 Plumbing
                  </Link>
                  <Link href="/industries/electrical" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    ⚡ Electrical
                  </Link>
                  <Link href="/industries/hvac" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    ❄️ HVAC
                  </Link>
                  <Link href="/industries/painting" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🎨 Painting
                  </Link>
                  <Link href="/industries/cleaning" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🧹 Cleaning
                  </Link>
                  <Link href="/industries/roofing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🏠 Roofing
                  </Link>
                  <Link href="/industries/pest-control" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🐜 Pest Control
                  </Link>
                  <Link href="/industries/auto-detailing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🚗 Auto Detailing
                  </Link>
                  <Link href="/industries/pressure-washing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    💦 Pressure Washing
                  </Link>
                  <Link href="/industries/flooring" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🪵 Flooring
                  </Link>
                  <Link href="/industries/handyman" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🛠️ Handyman
                  </Link>
                  <Link href="/industries/tree-service" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🌲 Tree Service
                  </Link>
                  <Link href="/industries/moving" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    📦 Moving
                  </Link>
                  <Link href="/industries/junk-removal" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🗑️ Junk Removal
                  </Link>
                  <Link href="/industries/appliance-repair" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🔌 Appliance Repair
                  </Link>
                  <Link href="/industries/garage-door" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🚪 Garage Door
                  </Link>
                  <Link href="/industries/window-cleaning" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🪟 Window Cleaning
                  </Link>
                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <Link href="/industries" className="block px-4 py-2 text-sm text-[#f5a623] font-semibold hover:bg-gray-50 no-underline">
                      View All Industries →
                    </Link>
                  </div>
                </div>
              )}
            </div>
            <Link href="/pricing" className="text-[#5c5c70] font-medium text-[0.9375rem] hover:text-[#1a1a2e] transition-colors no-underline">Pricing</Link>
            <div className="relative">
              <button
                onClick={() => setResourcesOpen(!resourcesOpen)}
                className="text-[#5c5c70] font-medium text-[0.9375rem] hover:text-[#1a1a2e] transition-colors flex items-center gap-1"
              >
                Resources <span className="text-xs">▼</span>
              </button>
              {resourcesOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50">
                  <Link href="/tools" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🧰 Free Tools
                  </Link>
                  <Link href="/#demos" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🎮 Demos
                  </Link>
                </div>
              )}
            </div>

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
            <Link href="/tools" className="text-[#5c5c70] font-medium hover:text-[#1a1a2e] no-underline">🧰 Free Tools</Link>
            <Link href="/#demos" className="text-[#5c5c70] font-medium hover:text-[#1a1a2e] no-underline">Demos</Link>
            <Link href="/pricing" className="text-[#5c5c70] font-medium hover:text-[#1a1a2e] no-underline">Pricing</Link>
            <Link href="/auth/signup" className="bg-[#f5a623] text-[#1a1a2e] px-6 py-3 rounded-xl font-medium text-center no-underline">Start Free Trial</Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="bg-[#1a2e44] text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-amber-400 font-medium mb-4 tracking-wide uppercase text-sm">
            Comparison Guide
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            ToolTime Pro vs Jobber
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            See why contractors are switching to ToolTime Pro — the same powerful features at a fraction of the price.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/pricing"
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Start Free Trial
            </Link>
            <a
              href="#comparison"
              className="border border-white/30 hover:bg-white/10 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              See Full Comparison
            </a>
          </div>
        </div>
      </section>

      {/* Quick Stats Bar */}
      <section className="bg-[#f8f9fa] border-b py-8 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-3xl font-bold text-[#1a2e44]">77%</p>
            <p className="text-gray-600 text-sm">Average Savings</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#1a2e44]">$7</p>
            <p className="text-gray-600 text-sm">Per Extra User (vs $29)</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#1a2e44]">2x</p>
            <p className="text-gray-600 text-sm">More Users Per Plan</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#1a2e44]">14 Days</p>
            <p className="text-gray-600 text-sm">Free Trial</p>
          </div>
        </div>
      </section>

      {/* Main Comparison Section */}
      <section id="comparison" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-[#1a2e44] mb-4">
            Pricing Comparison
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Get more features, more users, and better value with ToolTime Pro.
          </p>

          {/* Pricing Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-4 bg-gray-50 font-semibold text-[#1a2e44] rounded-tl-lg">Plan Tier</th>
                  <th className="p-4 bg-[#1a2e44] text-white font-semibold">
                    <div className="flex items-center justify-center gap-2">
                      <span>🛠️</span>
                      <span>ToolTime Pro</span>
                    </div>
                  </th>
                  <th className="p-4 bg-gray-200 font-semibold text-gray-700 rounded-tr-lg">Jobber</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="p-4 font-medium text-gray-800">Solo / Starter</td>
                  <td className="p-4 text-center bg-green-50">
                    <span className="text-2xl font-bold text-green-600">$30</span>
                    <span className="text-gray-500">/mo</span>
                    <p className="text-sm text-gray-600 mt-1">Up to 2 users</p>
                  </td>
                  <td className="p-4 text-center bg-gray-50">
                    <span className="text-2xl font-bold text-gray-700">$39-69</span>
                    <span className="text-gray-500">/mo</span>
                    <p className="text-sm text-gray-600 mt-1">1 user only</p>
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-4 font-medium text-gray-800">Small Team</td>
                  <td className="p-4 text-center bg-green-50">
                    <span className="text-2xl font-bold text-green-600">$49</span>
                    <span className="text-gray-500">/mo</span>
                    <p className="text-sm text-gray-600 mt-1">Up to 15 users</p>
                  </td>
                  <td className="p-4 text-center bg-gray-50">
                    <span className="text-2xl font-bold text-gray-700">$169</span>
                    <span className="text-gray-500">/mo</span>
                    <p className="text-sm text-gray-600 mt-1">Up to 5 users</p>
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-4 font-medium text-gray-800">Growing Team</td>
                  <td className="p-4 text-center bg-green-50">
                    <span className="text-2xl font-bold text-green-600">$79</span>
                    <span className="text-gray-500">/mo</span>
                    <p className="text-sm text-gray-600 mt-1">Up to 30 users</p>
                  </td>
                  <td className="p-4 text-center bg-gray-50">
                    <span className="text-2xl font-bold text-gray-700">$349</span>
                    <span className="text-gray-500">/mo</span>
                    <p className="text-sm text-gray-600 mt-1">Up to 15 users</p>
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="p-4 font-medium text-gray-800">Extra Users</td>
                  <td className="p-4 text-center bg-green-50">
                    <span className="text-2xl font-bold text-green-600">$7</span>
                    <span className="text-gray-500">/user/mo</span>
                  </td>
                  <td className="p-4 text-center bg-gray-50">
                    <span className="text-2xl font-bold text-gray-700">$29</span>
                    <span className="text-gray-500">/user/mo</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-gray-800">Enterprise</td>
                  <td className="p-4 text-center bg-green-50">
                    <span className="text-lg font-semibold text-green-600">Custom pricing</span>
                  </td>
                  <td className="p-4 text-center bg-gray-50">
                    <span className="text-2xl font-bold text-gray-700">$599</span>
                    <span className="text-gray-500">/mo</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Savings Callout */}
          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <p className="text-lg">
              <span className="font-bold text-[#1a2e44]">A 10-person team saves over $3,000/year</span>
              <span className="text-gray-600"> switching from Jobber to ToolTime Pro</span>
            </p>
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-16 px-4 bg-[#f8f9fa]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-[#1a2e44] mb-4">
            Feature Comparison
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Both platforms offer core field service features. Here&apos;s where they differ.
          </p>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-4 font-semibold text-[#1a2e44]">Feature</th>
                  <th className="p-4 font-semibold text-[#1a2e44] text-center w-48">ToolTime Pro</th>
                  <th className="p-4 font-semibold text-gray-500 text-center w-48">Jobber</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <td className="p-4 font-medium text-gray-800">Scheduling & Calendar</td>
                  <td className="p-4 text-center text-gray-700">✅ All plans</td>
                  <td className="p-4 text-center text-gray-500">✅ All plans</td>
                </tr>
                <tr className="border-b border-gray-100 bg-white">
                  <td className="p-4 font-medium text-gray-800">Invoicing & Payments</td>
                  <td className="p-4 text-center text-gray-700">✅ All plans</td>
                  <td className="p-4 text-center text-gray-500">✅ All plans</td>
                </tr>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <td className="p-4 font-medium text-gray-800">Client Management (CRM)</td>
                  <td className="p-4 text-center text-gray-700">✅ All plans</td>
                  <td className="p-4 text-center text-gray-500">✅ All plans</td>
                </tr>
                <tr className="border-b border-gray-100 bg-white">
                  <td className="p-4 font-medium text-gray-800">Online Booking Page</td>
                  <td className="p-4 text-center text-gray-700">✅ All plans</td>
                  <td className="p-4 text-center text-gray-500">✅ All plans</td>
                </tr>
                <tr className="border-b border-gray-100 bg-green-50">
                  <td className="p-4 font-medium text-gray-800">SMS Quote & Invoice Notifications</td>
                  <td className="p-4 text-center text-green-600 font-medium">✅ All plans</td>
                  <td className="p-4 text-center text-gray-500">⚠️ $199+/mo plans</td>
                </tr>
                <tr className="border-b border-gray-100 bg-green-50">
                  <td className="p-4 font-medium text-gray-800">Team Scheduling & Dispatch</td>
                  <td className="p-4 text-center text-green-600 font-medium">✅ Pro ($49)</td>
                  <td className="p-4 text-center text-gray-500">⚠️ $169+/mo plans</td>
                </tr>
                <tr className="border-b border-gray-100 bg-green-50">
                  <td className="p-4 font-medium text-gray-800">Compliance Tools (ToolTime Shield)</td>
                  <td className="p-4 text-center text-green-600 font-medium">✅ Included</td>
                  <td className="p-4 text-center text-gray-500">❌ Not available</td>
                </tr>
                <tr className="border-b border-gray-100 bg-green-50">
                  <td className="p-4 font-medium text-gray-800">ToolTime Assistant (24/7 AI Lead Capture)</td>
                  <td className="p-4 text-center text-green-600 font-medium">✅ $19/mo add-on</td>
                  <td className="p-4 text-center text-gray-500">⚠️ $349+/mo plans</td>
                </tr>
                <tr className="border-b border-gray-100 bg-white">
                  <td className="p-4 font-medium text-gray-800">AI Phone Receptionist</td>
                  <td className="p-4 text-center text-gray-700">🔜 Coming soon</td>
                  <td className="p-4 text-center text-gray-500">✅ $349+/mo plans</td>
                </tr>
                <tr className="border-b border-gray-100 bg-green-50">
                  <td className="p-4 font-medium text-gray-800">Worker Mobile App (GPS Clock-in)</td>
                  <td className="p-4 text-center text-green-600 font-medium">✅ Pro ($49)</td>
                  <td className="p-4 text-center text-gray-500">⚠️ Extra cost</td>
                </tr>
                <tr className="border-b border-gray-100 bg-green-50">
                  <td className="p-4 font-medium text-gray-800">Website Builder</td>
                  <td className="p-4 text-center text-green-600 font-medium">✅ $15/mo add-on</td>
                  <td className="p-4 text-center text-gray-500">⚠️ $599/mo plan only</td>
                </tr>
                <tr className="border-b border-gray-100 bg-white">
                  <td className="p-4 font-medium text-gray-800">Route Optimization</td>
                  <td className="p-4 text-center text-gray-700">🔜 Coming soon</td>
                  <td className="p-4 text-center text-gray-500">✅ $199+/mo plans</td>
                </tr>
                <tr className="bg-green-50">
                  <td className="p-4 font-medium text-gray-800">QuickBooks Sync</td>
                  <td className="p-4 text-center text-green-600 font-medium">✅ $12/mo add-on</td>
                  <td className="p-4 text-center text-gray-500">⚠️ $169+/mo plans</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Why Switch Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-[#1a2e44] mb-12">
            Why Contractors Switch to ToolTime Pro
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-bold text-[#1a2e44] mb-2">Save 50-77% on Software</h3>
              <p className="text-gray-600">Get the same core features at a fraction of the price. No hidden fees, no surprise charges.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-bold text-[#1a2e44] mb-2">SMS Built Into Every Plan</h3>
              <p className="text-gray-600">Send quotes and invoices via text message — included in all plans, not locked behind $199+ tiers.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-bold text-[#1a2e44] mb-2">Affordable Team Growth</h3>
              <p className="text-gray-600">Add team members for just $7/user vs Jobber&apos;s $29/user. Scale without breaking the bank.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🛡️</div>
              <h3 className="text-xl font-bold text-[#1a2e44] mb-2">Compliance Tools Included</h3>
              <p className="text-gray-600">ToolTime Shield keeps you audit-ready with safety checklists and compliance docs — Jobber doesn&apos;t offer this.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-bold text-[#1a2e44] mb-2">ToolTime Assistant</h3>
              <p className="text-gray-600">24/7 AI-powered lead capture for just $19/mo. Jobber charges $349+/mo for similar functionality.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-bold text-[#1a2e44] mb-2">Built for Growing Teams</h3>
              <p className="text-gray-600">Our $79 plan includes 30 users. Jobber&apos;s $349 plan only includes 15. Do the math.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Real Cost Scenarios */}
      <section className="py-16 px-4 bg-[#1a2e44] text-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Real-World Cost Comparison
          </h2>
          <p className="text-gray-300 text-center mb-12 max-w-2xl mx-auto">
            See how much you could save based on your team size.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
              <h3 className="font-semibold text-lg mb-4">Solo Contractor</h3>
              <div className="space-y-2 mb-4">
                <p>
                  <span className="text-gray-400">ToolTime Pro:</span>{' '}
                  <span className="text-green-400 font-bold">$30/mo</span>
                </p>
                <p>
                  <span className="text-gray-400">Jobber:</span>{' '}
                  <span className="text-gray-300">$69/mo</span>
                </p>
              </div>
              <div className="bg-amber-500 text-white font-bold py-2 px-4 rounded-lg">
                Save $468/year
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
              <h3 className="font-semibold text-lg mb-4">5-Person Team + Add-ons</h3>
              <div className="space-y-2 mb-4">
                <p>
                  <span className="text-gray-400">ToolTime Pro:</span>{' '}
                  <span className="text-green-400 font-bold">$83/mo</span>
                </p>
                <p>
                  <span className="text-gray-400">Jobber:</span>{' '}
                  <span className="text-gray-300">$169/mo</span>
                </p>
              </div>
              <div className="bg-amber-500 text-white font-bold py-2 px-4 rounded-lg">
                Save $1,032/year
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
              <h3 className="font-semibold text-lg mb-4">15-Person Team + All Features</h3>
              <div className="space-y-2 mb-4">
                <p>
                  <span className="text-gray-400">ToolTime Pro:</span>{' '}
                  <span className="text-green-400 font-bold">$152/mo</span>
                </p>
                <p>
                  <span className="text-gray-400">Jobber:</span>{' '}
                  <span className="text-gray-300">$349+/mo</span>
                </p>
              </div>
              <div className="bg-amber-500 text-white font-bold py-2 px-4 rounded-lg">
                Save $2,364+/year
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-[#1a2e44] mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-[#1a2e44] mb-2">Can I migrate my data from Jobber to ToolTime Pro?</h3>
              <p className="text-gray-600">Yes! Our team can help you migrate your customer data, job history, and settings. With our White Glove Setup ($349), we handle the entire migration for you.</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-[#1a2e44] mb-2">Does ToolTime Pro have a mobile app?</h3>
              <p className="text-gray-600">Yes, our Worker App is available on iOS and Android. It includes GPS clock-in/out, job details, customer info, and the ability to collect payments on-site.</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-[#1a2e44] mb-2">What is ToolTime Assistant?</h3>
              <p className="text-gray-600">ToolTime Assistant is our AI-powered chatbot that captures leads 24/7, answers customer questions, and can book appointments — even when you&apos;re asleep or on a job. It&apos;s available as a $19/mo add-on on any plan.</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-[#1a2e44] mb-2">Is there a free trial?</h3>
              <p className="text-gray-600">Yes! All plans include a 14-day free trial with no credit card required. Try everything before you commit.</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-[#1a2e44] mb-2">What if I need help getting started?</h3>
              <p className="text-gray-600">We offer Assisted Onboarding ($149) where we help you set up your account, or White Glove Setup ($349) where we do everything for you including data migration and team training.</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-bold text-[#1a2e44] mb-2">Does ToolTime Pro integrate with QuickBooks?</h3>
              <p className="text-gray-600">Yes! Our QuickBooks Sync add-on ($12/mo) automatically syncs your invoices, payments, and expenses with QuickBooks Online.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-amber-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Save $1,000+ Per Year?
          </h2>
          <p className="text-white/90 text-lg mb-8">
            Join hundreds of contractors who switched from Jobber to ToolTime Pro.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/pricing"
              className="bg-[#1a2e44] hover:bg-[#0f1d2d] text-white font-semibold py-4 px-8 rounded-lg transition-colors text-lg"
            >
              Start Your Free Trial →
            </Link>
            <Link
              href="/contact"
              className="bg-white hover:bg-gray-100 text-[#1a2e44] font-semibold py-4 px-8 rounded-lg transition-colors text-lg"
            >
              Schedule a Demo
            </Link>
          </div>
          <p className="text-white/70 text-sm mt-6">
            14-day free trial • No credit card required • Cancel anytime
          </p>
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
                <Link href="/#pricing" className="text-white/50 text-[0.9375rem] hover:text-[#f5a623] transition-colors no-underline">Pricing</Link>
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

      {/* Schema Markup for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "ToolTime Pro vs Jobber: Complete Comparison Guide",
            "description": "Compare ToolTime Pro and Jobber pricing, features, and value. See why contractors save 50-77% by switching to ToolTime Pro.",
            "author": {
              "@type": "Organization",
              "name": "ToolTime Pro"
            }
          })
        }}
      />
    </div>
  );
}
