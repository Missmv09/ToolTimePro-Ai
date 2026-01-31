'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function CompareJobber() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [industriesOpen, setIndustriesOpen] = useState(false);
  const [language, setLanguage] = useState('en');

  const t = {
    en: {
      promo: 'Limited Time: Get 2 months free on annual plans.',
      startTrial: 'Start Free Trial',
      features: 'Features',
      industries: 'Industries',
      pricing: 'Pricing',
      resources: 'Resources',
      freeTools: 'Free Tools',
      demos: 'Demos',
      viewAllIndustries: 'View All Industries →',
    },
    es: {
      promo: 'Tiempo Limitado: Obtén 2 meses gratis en planes anuales.',
      startTrial: 'Prueba Gratis',
      features: 'Funciones',
      industries: 'Industrias',
      pricing: 'Precios',
      resources: 'Recursos',
      freeTools: 'Herramientas Gratis',
      demos: 'Demos',
      viewAllIndustries: 'Ver Todas las Industrias →',
    },
  };

  const text = t[language];

  return (
    <div className="min-h-screen bg-white">
      {/* Promo Banner */}
      <div className="bg-[#1a1a2e] text-white text-center py-2.5 px-4 text-sm">
        <span className="mr-2">🚀</span>
        {text.promo}
        <Link href="/auth/signup" className="text-[#f5a623] font-semibold ml-2 hover:underline">
          {text.startTrial}
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
            <Link href="/#features" className="text-[#5c5c70] font-medium text-[0.9375rem] hover:text-[#1a1a2e] transition-colors no-underline">{text.features}</Link>
            <div className="relative">
              <button
                onClick={() => setIndustriesOpen(!industriesOpen)}
                className="text-[#5c5c70] font-medium text-[0.9375rem] hover:text-[#1a1a2e] transition-colors flex items-center gap-1"
              >
                {text.industries} <span className="text-xs">▼</span>
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
                      {text.viewAllIndustries}
                    </Link>
                  </div>
                </div>
              )}
            </div>
            <Link href="/pricing" className="text-[#5c5c70] font-medium text-[0.9375rem] hover:text-[#1a1a2e] transition-colors no-underline">{text.pricing}</Link>
            <div className="relative">
              <button
                onClick={() => setResourcesOpen(!resourcesOpen)}
                className="text-[#5c5c70] font-medium text-[0.9375rem] hover:text-[#1a1a2e] transition-colors flex items-center gap-1"
              >
                {text.resources} <span className="text-xs">▼</span>
              </button>
              {resourcesOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50">
                  <Link href="/tools" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🧰 {text.freeTools}
                  </Link>
                  <Link href="/#demos" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🎮 {text.demos}
                  </Link>
                </div>
              )}
            </div>

            {/* Language Switcher */}
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  language === 'en' ? 'bg-[#1a1a2e] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                🇺🇸
              </button>
              <button
                onClick={() => setLanguage('es')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  language === 'es' ? 'bg-[#1a1a2e] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                🇪🇸
              </button>
            </div>

            <span className="text-[#5c5c70] text-sm flex items-center gap-1">
              📞 1-888-555-0123
            </span>
            <Link
              href="/auth/signup"
              className="bg-[#f5a623] text-[#1a1a2e] px-5 py-2.5 rounded-lg font-semibold text-sm shadow-[0_4px_12px_rgba(245,166,35,0.3)] hover:bg-[#e6991a] hover:-translate-y-0.5 transition-all no-underline"
            >
              {text.startTrial}
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
          <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg p-6 flex flex-col gap-4 z-50">
            <Link href="/#features" className="text-[#5c5c70] font-medium hover:text-[#1a1a2e] no-underline">{text.features}</Link>
            <Link href="/tools" className="text-[#5c5c70] font-medium hover:text-[#1a1a2e] no-underline">🧰 {text.freeTools}</Link>
            <Link href="/#demos" className="text-[#5c5c70] font-medium hover:text-[#1a1a2e] no-underline">{text.demos}</Link>
            <Link href="/pricing" className="text-[#5c5c70] font-medium hover:text-[#1a1a2e] no-underline">{text.pricing}</Link>
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setLanguage('en')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${language === 'en' ? 'bg-[#1a1a2e] text-white' : 'bg-gray-100'}`}
              >
                🇺🇸 English
              </button>
              <button
                onClick={() => setLanguage('es')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${language === 'es' ? 'bg-[#1a1a2e] text-white' : 'bg-gray-100'}`}
              >
                🇪🇸 Español
              </button>
            </div>
            <Link href="/auth/signup" className="bg-[#f5a623] text-[#1a1a2e] px-6 py-3 rounded-xl font-medium text-center no-underline">{text.startTrial}</Link>
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
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            See why contractors are switching to ToolTime Pro — the same powerful features at a fraction of the price.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="bg-[#f5a623] text-[#1a1a2e] px-8 py-3 rounded-lg font-bold hover:bg-[#e6991a] transition-colors no-underline"
            >
              Start Free Trial
            </Link>
            <Link
              href="#comparison"
              className="bg-white/10 text-white px-8 py-3 rounded-lg font-bold hover:bg-white/20 transition-colors no-underline"
            >
              See Full Comparison
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="bg-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
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
        </div>
      </section>

      {/* Pricing Comparison */}
      <section id="comparison" className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Pricing Comparison</h2>
          <p className="text-gray-600 text-center mb-12">
            Get more features, more users, and better value with ToolTime Pro.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-4 bg-gray-50 font-semibold">Plan Tier</th>
                  <th className="p-4 bg-[#1a2e44] text-white font-semibold">
                    <span className="flex items-center justify-center gap-2">
                      ⚡ ToolTime Pro
                    </span>
                  </th>
                  <th className="p-4 bg-gray-200 font-semibold">Jobber</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-4 font-medium">Solo / Starter</td>
                  <td className="p-4 text-center bg-blue-50">
                    <span className="text-2xl font-bold text-[#f5a623]">$30</span>
                    <span className="text-gray-600">/mo</span>
                    <p className="text-sm text-gray-500">Up to 2 users</p>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-2xl font-bold">$39-69</span>
                    <span className="text-gray-600">/mo</span>
                    <p className="text-sm text-gray-500">1 user only</p>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">Small Team</td>
                  <td className="p-4 text-center bg-blue-50">
                    <span className="text-2xl font-bold text-[#f5a623]">$49</span>
                    <span className="text-gray-600">/mo</span>
                    <p className="text-sm text-gray-500">Up to 15 users</p>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-2xl font-bold">$169</span>
                    <span className="text-gray-600">/mo</span>
                    <p className="text-sm text-gray-500">Up to 5 users</p>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">Growing Team</td>
                  <td className="p-4 text-center bg-blue-50">
                    <span className="text-2xl font-bold text-[#f5a623]">$79</span>
                    <span className="text-gray-600">/mo</span>
                    <p className="text-sm text-gray-500">Up to 30 users</p>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-2xl font-bold">$349</span>
                    <span className="text-gray-600">/mo</span>
                    <p className="text-sm text-gray-500">Up to 15 users</p>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">Extra Users</td>
                  <td className="p-4 text-center bg-blue-50">
                    <span className="text-2xl font-bold text-[#f5a623]">$7</span>
                    <span className="text-gray-600">/user/mo</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-2xl font-bold">$29</span>
                    <span className="text-gray-600">/user/mo</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">Enterprise</td>
                  <td className="p-4 text-center bg-blue-50">
                    <span className="text-[#f5a623] font-bold">Custom pricing</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-2xl font-bold">$599</span>
                    <span className="text-gray-600">/mo</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 p-6 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-center text-lg">
              <strong>A 10-person team saves over $3,000/year</strong> switching from Jobber to ToolTime Pro
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#1a2e44] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Save?</h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of contractors who switched to ToolTime Pro. Start your 14-day free trial today.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block bg-[#f5a623] text-[#1a1a2e] px-8 py-4 rounded-lg font-bold text-lg hover:bg-[#e6991a] transition-colors no-underline"
          >
            Start Free Trial →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1a1a2e] text-white py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-400">
            © 2024 ToolTime Pro. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
