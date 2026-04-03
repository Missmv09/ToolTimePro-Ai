'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Calculator, GitBranch, CheckSquare, FileText, ArrowRight, Shield, Sparkles } from 'lucide-react';

const tools = [
  {
    icon: Calculator,
    href: '/tools/calculator',
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
    key: 'calculator',
  },
  {
    icon: GitBranch,
    href: '/tools/classification',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    key: 'classification',
  },
  {
    icon: CheckSquare,
    href: '/tools/checklist',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-600',
    key: 'checklist',
  },
  {
    icon: FileText,
    href: '/tools/final-wage',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    iconColor: 'text-purple-600',
    key: 'finalWage',
  },
];

export default function FreeToolsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [industriesOpen, setIndustriesOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const t = useTranslations('tools.hub');

  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Promo Banner */}
      <div className="bg-[#1a1a2e] text-white text-center py-2.5 px-4 text-sm">
        <span className="mr-2">🚀</span>
        {t('promoBanner')}
        <Link href="/auth/signup" className="text-[#f5a623] font-semibold ml-2 hover:underline">
          {t('startTrial')}
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
            <Link href="/#features" className="text-[#5c5c70] font-medium text-[0.9375rem] hover:text-[#1a1a2e] transition-colors no-underline">
              {t('features')}
            </Link>
            <div className="relative">
              <button
                onClick={() => setIndustriesOpen(!industriesOpen)}
                className="text-[#5c5c70] font-medium text-[0.9375rem] hover:text-[#1a1a2e] transition-colors flex items-center gap-1"
              >
                {t('industries')} <span className="text-xs">▼</span>
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
            <Link href="/pricing" className="text-[#5c5c70] font-medium text-[0.9375rem] hover:text-[#1a1a2e] transition-colors no-underline">
              {t('pricing')}
            </Link>
            <div className="relative">
              <button
                onClick={() => setResourcesOpen(!resourcesOpen)}
                className="text-[#5c5c70] font-medium text-[0.9375rem] hover:text-[#1a1a2e] transition-colors flex items-center gap-1"
              >
                {t('resources')} <span className="text-xs">▼</span>
              </button>
              {resourcesOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50">
                  <Link href="/tools" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🧰 Free Tools
                  </Link>
                  <Link href="/#demos" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    🎮 Demos
                  </Link>
                  <Link href="/compare" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    ⚖️ Compare Plans
                  </Link>
                </div>
              )}
            </div>

            {/* Language Switcher */}
            <LanguageSwitcher />

            <span className="text-[#5c5c70] flex items-center gap-1">
              📞 {t('phone')}
            </span>
            <Link
              href="/auth/signup"
              className="bg-[#f5a623] text-[#1a1a2e] px-5 py-2.5 rounded-lg font-semibold text-sm shadow-[0_4px_12px_rgba(245,166,35,0.3)] hover:bg-[#e6991a] transition-all no-underline"
            >
              {t('startTrial')}
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
            <Link href="/#features" className="text-[#5c5c70] font-medium hover:text-[#1a1a2e] no-underline">{t('features')}</Link>
            <Link href="/pricing" className="text-[#5c5c70] font-medium hover:text-[#1a1a2e] no-underline">{t('pricing')}</Link>
            <div className="border-t border-gray-100 pt-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{t('resources')}</p>
              <Link href="/tools" className="block text-[#5c5c70] font-medium hover:text-[#1a1a2e] no-underline py-1">Free Tools</Link>
              <Link href="/#demos" className="block text-[#5c5c70] font-medium hover:text-[#1a1a2e] no-underline py-1">Demos</Link>
              <Link href="/compare" className="block text-[#5c5c70] font-medium hover:text-[#1a1a2e] no-underline py-1">Compare Plans</Link>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <LanguageSwitcher />
            </div>
            <Link href="/auth/signup" className="bg-[#f5a623] text-[#1a1a2e] px-6 py-3 rounded-xl font-medium text-center no-underline">
              {t('startTrial')}
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-16 pb-12 bg-gradient-to-br from-[#1a1a2e] to-[#2d2d44] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-20 left-20 w-64 h-64 bg-[#f5a623] rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
        </div>

        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Shield className="w-4 h-4 text-[#f5a623]" />
              {t('caCompliance')}
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 drop-shadow-lg">
              {t('heroTitle')}
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              {t('heroSubtitle')}
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm">
                <Sparkles className="w-4 h-4 text-[#f5a623]" />
                {t('toolsCount')}
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm">
                <span className="text-green-400">✓</span>
                {t('noSignup')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="py-16 -mt-8">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-6">
            {tools.map((tool) => {
              const Icon = tool.icon;

              return (
                <Link
                  key={tool.key}
                  href={tool.href}
                  className={`group bg-white rounded-2xl p-6 border-2 ${tool.borderColor} hover:shadow-xl hover:-translate-y-1 transition-all no-underline`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`${tool.bgColor} p-3 rounded-xl`}>
                      <Icon className={`w-6 h-6 ${tool.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded bg-gradient-to-r ${tool.color} text-white`}>
                          {t('free')}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-[#1a1a2e] mb-2">{t(`${tool.key}.title`)}</h3>
                      <p className="text-gray-600 text-sm mb-4">{t(`${tool.key}.description`)}</p>
                      <div className="flex items-center gap-2 text-[#f5a623] font-semibold text-sm group-hover:gap-3 transition-all">
                        {t(`${tool.key}.cta`)}
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Free Section */}
      <section className="py-16 bg-white">
        <div className="max-w-[800px] mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-[#1a1a2e] mb-4">{t('whyTitle')}</h2>
          <p className="text-gray-600 text-lg">{t('whyText')}</p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-[#f5a623] to-[#e6991a]">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-[#1a1a2e] mb-4">{t('ctaTitle')}</h2>
          <p className="text-[#1a1a2e]/80 text-lg mb-8 max-w-2xl mx-auto">{t('ctaText')}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-[#1a1a2e] text-white rounded-xl font-bold shadow-lg hover:bg-[#2d2d44] transition-all no-underline"
            >
              {t('seePricing')}
            </Link>
            <Link
              href="/demo/booking"
              className="px-8 py-4 bg-white text-[#1a1a2e] rounded-xl font-bold shadow-lg hover:bg-gray-50 transition-all no-underline"
            >
              {t('tryDemo')}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1a1a2e] text-white py-8">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo-horizontal-white-01262026.png"
              alt="ToolTime Pro"
              width={180}
              height={40}
              className="h-10 w-auto"
            />
          </div>
          <p className="text-gray-400 text-sm">
            © 2026 ToolTime Pro. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
