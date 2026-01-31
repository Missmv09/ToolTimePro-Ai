'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

// 50+ industries - more than any competitor
const industries = [
  // Outdoor & Property
  { name: 'Landscaping', icon: '🌳', slug: 'landscaping', category: 'Outdoor' },
  { name: 'Lawn Care', icon: '🌱', slug: 'lawn-care', category: 'Outdoor' },
  { name: 'Tree Service', icon: '🌲', slug: 'tree-service', category: 'Outdoor' },
  { name: 'Pool Service', icon: '🏊', slug: 'pool-service', category: 'Outdoor' },
  { name: 'Irrigation & Sprinkler', icon: '💧', slug: 'irrigation', category: 'Outdoor' },
  { name: 'Fencing', icon: '🏗️', slug: 'fencing', category: 'Outdoor' },
  { name: 'Snow Removal', icon: '❄️', slug: 'snow-removal', category: 'Outdoor' },
  { name: 'Pressure Washing', icon: '💦', slug: 'pressure-washing', category: 'Outdoor' },

  // Home Trades
  { name: 'Plumbing', icon: '🔧', slug: 'plumbing', category: 'Trades' },
  { name: 'Electrical', icon: '⚡', slug: 'electrical', category: 'Trades' },
  { name: 'HVAC', icon: '❄️', slug: 'hvac', category: 'Trades' },
  { name: 'Roofing', icon: '🏠', slug: 'roofing', category: 'Trades' },
  { name: 'Painting', icon: '🎨', slug: 'painting', category: 'Trades' },
  { name: 'Flooring', icon: '🪵', slug: 'flooring', category: 'Trades' },
  { name: 'Carpentry', icon: '🪚', slug: 'carpentry', category: 'Trades' },
  { name: 'Drywall', icon: '🧱', slug: 'drywall', category: 'Trades' },
  { name: 'Concrete & Masonry', icon: '🧱', slug: 'concrete', category: 'Trades' },
  { name: 'Welding', icon: '🔥', slug: 'welding', category: 'Trades' },
  { name: 'Insulation', icon: '🏗️', slug: 'insulation', category: 'Trades' },
  { name: 'Siding', icon: '🏡', slug: 'siding', category: 'Trades' },

  // Cleaning & Maintenance
  { name: 'House Cleaning', icon: '🧹', slug: 'cleaning', category: 'Cleaning' },
  { name: 'Commercial Cleaning', icon: '🏢', slug: 'commercial-cleaning', category: 'Cleaning' },
  { name: 'Carpet Cleaning', icon: '🧽', slug: 'carpet-cleaning', category: 'Cleaning' },
  { name: 'Window Cleaning', icon: '🪟', slug: 'window-cleaning', category: 'Cleaning' },
  { name: 'Gutter Cleaning', icon: '🍂', slug: 'gutter-cleaning', category: 'Cleaning' },
  { name: 'Chimney Sweep', icon: '🔥', slug: 'chimney-sweep', category: 'Cleaning' },
  { name: 'Janitorial', icon: '🧼', slug: 'janitorial', category: 'Cleaning' },

  // Repair & Install
  { name: 'Handyman', icon: '🛠️', slug: 'handyman', category: 'Repair' },
  { name: 'Appliance Repair', icon: '🔌', slug: 'appliance-repair', category: 'Repair' },
  { name: 'Garage Door', icon: '🚪', slug: 'garage-door', category: 'Repair' },
  { name: 'Locksmith', icon: '🔐', slug: 'locksmith', category: 'Repair' },
  { name: 'Glass & Mirror', icon: '🪞', slug: 'glass-mirror', category: 'Repair' },
  { name: 'Furniture Assembly', icon: '🪑', slug: 'furniture-assembly', category: 'Repair' },
  { name: 'TV Mounting', icon: '📺', slug: 'tv-mounting', category: 'Repair' },

  // Specialty Services
  { name: 'Pest Control', icon: '🐜', slug: 'pest-control', category: 'Specialty' },
  { name: 'Solar Installation', icon: '☀️', slug: 'solar', category: 'Specialty' },
  { name: 'Home Inspection', icon: '🔍', slug: 'home-inspection', category: 'Specialty' },
  { name: 'Septic Service', icon: '🚽', slug: 'septic', category: 'Specialty' },
  { name: 'Security Systems', icon: '🔒', slug: 'security-systems', category: 'Specialty' },
  { name: 'Home Theater', icon: '🎬', slug: 'home-theater', category: 'Specialty' },
  { name: 'Smart Home', icon: '🏠', slug: 'smart-home', category: 'Specialty' },

  // Auto & Mobile
  { name: 'Auto Detailing', icon: '🚗', slug: 'auto-detailing', category: 'Auto' },
  { name: 'Mobile Car Wash', icon: '🚙', slug: 'mobile-car-wash', category: 'Auto' },
  { name: 'Towing', icon: '🚛', slug: 'towing', category: 'Auto' },
  { name: 'Mobile Mechanic', icon: '🔧', slug: 'mobile-mechanic', category: 'Auto' },

  // Moving & Hauling
  { name: 'Moving', icon: '📦', slug: 'moving', category: 'Moving' },
  { name: 'Junk Removal', icon: '🗑️', slug: 'junk-removal', category: 'Moving' },
  { name: 'Delivery Service', icon: '🚚', slug: 'delivery', category: 'Moving' },
  { name: 'Storage', icon: '📦', slug: 'storage', category: 'Moving' },

  // Pet & Personal
  { name: 'Pet Sitting', icon: '🐕', slug: 'pet-sitting', category: 'Personal' },
  { name: 'Dog Walking', icon: '🦮', slug: 'dog-walking', category: 'Personal' },
  { name: 'Pet Grooming', icon: '🐩', slug: 'pet-grooming', category: 'Personal' },
  { name: 'Mobile Grooming', icon: '✂️', slug: 'mobile-grooming', category: 'Personal' },

  // Events & Creative
  { name: 'Photography', icon: '📷', slug: 'photography', category: 'Events' },
  { name: 'Event Planning', icon: '🎉', slug: 'event-planning', category: 'Events' },
  { name: 'Catering', icon: '🍽️', slug: 'catering', category: 'Events' },
  { name: 'DJ Services', icon: '🎧', slug: 'dj-services', category: 'Events' },
];

const categories = ['All', 'Outdoor', 'Trades', 'Cleaning', 'Repair', 'Specialty', 'Auto', 'Moving', 'Personal', 'Events'];

export default function IndustriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const filteredIndustries = industries.filter(industry => {
    const matchesSearch = industry.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || industry.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
            <Link href="/#features" className="text-[#5c5c70] font-medium text-base hover:text-[#1a1a2e] transition-colors no-underline">Features</Link>
            <Link href="/industries" className="text-[#f5a623] font-medium text-base transition-colors no-underline">Industries</Link>
            <Link href="/pricing" className="text-[#5c5c70] font-medium text-base hover:text-[#1a1a2e] transition-colors no-underline">Pricing</Link>
            <Link href="/tools" className="text-[#5c5c70] font-medium text-base hover:text-[#1a1a2e] transition-colors no-underline">Free Tools</Link>
            <span className="text-[#5c5c70] text-base flex items-center gap-1">
              📞 1-888-555-0123
            </span>
            <Link
              href="/auth/login"
              className="text-[#5c5c70] font-medium text-base hover:text-[#1a1a2e] transition-colors no-underline"
            >
              Login
            </Link>
            <Link
              href="/auth/signup"
              className="bg-[#f5a623] text-[#1a1a2e] px-5 py-2.5 rounded-lg font-semibold text-base shadow-[0_4px_12px_rgba(245,166,35,0.3)] hover:bg-[#e6991a] hover:-translate-y-0.5 transition-all no-underline"
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
      </nav>

      {/* Hero Section */}
      <section className="pt-16 pb-12 bg-gradient-to-br from-[#1a1a2e] to-[#2d2d44] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-[#f5a623] rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
        </div>

        <div className="max-w-[1200px] mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span className="text-[#f5a623]">✓</span>
            Works for ANY service business
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            Built for <span className="text-[#f5a623]">Every</span> Service Business
          </h1>
          <p className="text-xl text-gray-300 mb-6 max-w-2xl mx-auto">
            Unlike competitors who limit you to their list, ToolTime Pro adapts to YOUR business.
            If you schedule jobs and manage workers, we&apos;ve got you covered.
          </p>

          {/* Competitive callout */}
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-xl mb-8">
            <span className="text-2xl font-bold text-[#f5a623]">60+</span>
            <span className="text-white/80">Industries supported — and counting</span>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-[#f5a623] text-[#1a1a2e] rounded-xl font-bold shadow-lg hover:bg-[#e6991a] transition-all no-underline"
            >
              Start Free Trial
            </Link>
            <Link
              href="/demo/dashboard"
              className="px-8 py-4 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-all no-underline"
            >
              See Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="py-8 bg-white border-b">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-96">
              <input
                type="text"
                placeholder="Search industries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-transparent"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? 'bg-[#1a1a2e] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Industries Grid */}
      <section className="py-12">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredIndustries.map((industry) => (
              <Link
                key={industry.slug}
                href={`/industries/${industry.slug}`}
                className="bg-white rounded-xl p-4 text-center border-2 border-gray-100 hover:border-[#f5a623] hover:shadow-lg hover:-translate-y-1 transition-all no-underline group"
              >
                <div className="text-3xl mb-2">{industry.icon}</div>
                <h3 className="text-sm font-semibold text-[#1a1a2e] group-hover:text-[#f5a623] transition-colors">
                  {industry.name}
                </h3>
              </Link>
            ))}
          </div>

          {filteredIndustries.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">No industries found matching &quot;{searchQuery}&quot;</p>
              <p className="text-gray-400">But don&apos;t worry — ToolTime Pro works for ANY service business!</p>
              <Link
                href="/auth/signup"
                className="inline-block mt-4 px-6 py-3 bg-[#f5a623] text-[#1a1a2e] rounded-xl font-bold no-underline"
              >
                Start Free Trial Anyway →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* "Don't see yours?" CTA */}
      <section className="py-16 bg-gradient-to-r from-[#f5a623] to-[#e6991a]">
        <div className="max-w-[800px] mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-[#1a1a2e] mb-4">
            Don&apos;t See Your Industry?
          </h2>
          <p className="text-[#1a1a2e]/80 text-lg mb-8">
            <strong>That&apos;s the point.</strong> ToolTime Pro isn&apos;t limited to a checkbox list.
            If you run a service business — any service business — our platform adapts to you.
            Custom services, custom workflows, your way.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-[#1a1a2e] text-white rounded-xl font-bold shadow-lg hover:bg-[#2d2d44] transition-all no-underline"
            >
              Try It Free — 14 Days
            </Link>
            <Link
              href="/demo/quoting"
              className="px-8 py-4 bg-white text-[#1a1a2e] rounded-xl font-bold shadow-lg hover:bg-gray-50 transition-all no-underline"
            >
              See How Quoting Works
            </Link>
          </div>
        </div>
      </section>

      {/* Why ToolTime Pro */}
      <section className="py-16 bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1a1a2e] mb-4">Why Service Pros Choose ToolTime Pro</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              While other software makes you fit their mold, we built ToolTime Pro to fit yours.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#fef3d6] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                🎯
              </div>
              <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">Industry-Agnostic</h3>
              <p className="text-gray-600">
                Define your own services, pricing, and workflows. No forcing your business into pre-built templates.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#fef3d6] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                💰
              </div>
              <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">Half the Price</h3>
              <p className="text-gray-600">
                Save 50-77% compared to Jobber. Same features, better value. No $29/user hidden fees.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#fef3d6] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                🛡️
              </div>
              <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">Compliance Built-In</h3>
              <p className="text-gray-600">
                ToolTime Shield keeps you legal with CA labor law compliance, final pay calculators, and HR docs.
              </p>
            </div>
          </div>
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
              <p className="text-white/50 text-base leading-relaxed max-w-[300px]">
                The all-in-one platform for service businesses. Website, scheduling, worker app, HR & compliance — we set it up, you run your business.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white text-lg mb-5">Product</h4>
              <div className="flex flex-col gap-3">
                <Link href="/#features" className="text-white/50 text-base hover:text-[#f5a623] transition-colors no-underline">Features</Link>
                <Link href="/pricing" className="text-white/50 text-base hover:text-[#f5a623] transition-colors no-underline">Pricing</Link>
                <Link href="/#demos" className="text-white/50 text-base hover:text-[#f5a623] transition-colors no-underline">Demos</Link>
                <Link href="/compare/jobber" className="text-white/50 text-base hover:text-[#f5a623] transition-colors no-underline">Compare vs Jobber</Link>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-white text-lg mb-5">Company</h4>
              <div className="flex flex-col gap-3">
                <Link href="/auth/login" className="text-white/50 text-base hover:text-[#f5a623] transition-colors no-underline">Login</Link>
                <Link href="/auth/signup" className="text-white/50 text-base hover:text-[#f5a623] transition-colors no-underline">Sign Up</Link>
                <a href="mailto:support@tooltimepro.com" className="text-white/50 text-base hover:text-[#f5a623] transition-colors no-underline">Contact</a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-white/40 text-base">
            © 2026 ToolTime Pro. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
