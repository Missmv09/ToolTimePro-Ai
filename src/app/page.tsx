'use client';

import Link from 'next/link';
import { useState } from 'react';

// Pain points data
const painPoints = [
  { icon: '📵', title: 'No Website = Invisible', description: "Customers can't find you online. You're losing jobs to competitors who show up on Google.", solution: 'Done-for-you branded website' },
  { icon: '📞', title: 'Missed Calls = Lost Money', description: "You're on a job, phone rings, you miss it. That lead goes to someone who answered.", solution: 'AI auto-responder + missed call texts' },
  { icon: '📅', title: 'Scheduling Chaos', description: 'Double-bookings, forgotten appointments, confused crews. Your calendar is a disaster.', solution: 'Smart scheduler + customer booking' },
  { icon: '👷', title: 'Worker Time Tracking', description: 'No idea when crew clocked in, where they are, or if they took their breaks.', solution: 'Worker app with GPS clock-in' },
  { icon: '⚖️', title: 'Legal Landmines', description: 'Final pay rules, worker classification, compliance headaches. One mistake = lawsuit.', solution: 'ToolTime Shield compliance toolkit' },
  { icon: '⭐', title: 'Zero Reviews', description: 'Happy customers never leave reviews. Your competitor has 100+, you have 3.', solution: 'Automated review request system' },
];

// Features data
const features = [
  { title: 'Professional Website — Built For You', description: 'We create your branded site. Mobile-optimized, fast, designed to convert visitors into paying customers.' },
  { title: '24/7 AI Chatbot', description: 'Never miss a lead. Our AI answers questions and captures contact info even at 2am on Sunday.' },
  { title: 'Smart Quoting — Win More Jobs', description: 'Create professional quotes in seconds. Voice, photo, or manual entry. Customers approve with e-signature.' },
  { title: 'Worker App with GPS Clock-In', description: 'Your crew sees their jobs, clocks in/out with location proof, uploads photos, and reports issues.' },
  { title: 'ToolTime Shield — Legal Protection', description: 'Worker classification quiz, final wage calculator, CA compliance checklists. Protect yourself from lawsuits.' },
  { title: 'HR Document Library', description: '10+ templates: offer letters, termination checklists, I-9 links, and more. All CA-compliant.' },
  { title: 'Review Machine — Get More 5-Star Reviews', description: 'Automatically request reviews via SMS after jobs. Generate AI responses to reviews. Build your reputation.' },
  { title: 'Admin Dashboard', description: 'See jobs, revenue, and crew status at a glance. Track performance and make smarter business decisions.' },
  { title: 'Dispatch Board', description: 'See all your crews on a map in real-time. Drag-and-drop job assignments. Send "running late" alerts automatically.', badge: 'Elite Only' },
  { title: 'Route Optimization', description: 'Automatically plan the most efficient routes for your crews. Save gas money and fit more jobs in each day.', badge: 'Elite Only' },
];

// Feature tabs
const featureTabs = [
  { name: 'Website', icon: '🌐', href: '/demo/website' },
  { name: 'Scheduling', icon: '📅', href: '/demo/scheduling' },
  { name: 'Quoting', icon: '📝', href: '/demo/quoting' },
  { name: 'Worker App', icon: '👷', href: '/worker' },
  { name: 'Compliance & HR', icon: '🛡️', href: '/dashboard/shield' },
  { name: 'Payments', icon: '💰', href: '/demo/invoicing' },
  { name: 'Payroll', icon: '💰', href: '#', comingSoon: true },
];

// Demo cards
const demoCards = [
  { icon: '🌐', name: 'Website Builder', description: "See a sample site we'd build for your business", href: '/demo/website' },
  { icon: '📝', name: 'Smart Quoting', description: 'Create professional quotes in seconds with live preview', href: '/demo/quoting' },
  { icon: '📅', name: 'Online Booking', description: 'Let customers book online + manage your calendar', href: '/demo/scheduling' },
  { icon: '🤖', name: 'AI Chatbot', description: '24/7 lead capture that never misses a customer', href: '/demo/chatbot' },
  { icon: '⭐', name: 'Review Machine', description: 'Automate 5-star reviews with SMS follow-ups', href: '/demo/reviews' },
  { icon: '👷', name: 'Worker App', description: 'GPS clock-in, job details, and compliance tracking', href: '/worker' },
  { icon: '📊', name: 'Admin Dashboard', description: 'See jobs, revenue, crew status at a glance', href: '/dashboard' },
  { icon: '🛡️', name: 'ToolTime Shield', description: 'Worker classification, final pay calculator, HR docs', href: '/dashboard/shield' },
  { icon: '🗺️', name: 'Dispatch Board', description: 'Real-time crew tracking and drag-and-drop scheduling', href: '/dashboard/dispatch', badge: 'Elite' },
];

// Pricing plans
const pricingPlans = [
  {
    name: 'Starter',
    price: 30,
    annualPrice: 300,
    workers: 5,
    description: 'Perfect for solo operators',
    features: [
      'Professional website (built for you)',
      'Online booking page',
      'Basic scheduling',
      'Invoicing + card payments',
      'ToolTime Shield (compliance tools)',
      'HR document library (10+ templates)',
      'Email support',
    ],
    hrFeature: 'ToolTime Shield included',
  },
  {
    name: 'Pro',
    price: 49,
    annualPrice: 490,
    workers: 15,
    description: 'Best for growing teams',
    popular: true,
    features: [
      'Everything in Starter, plus:',
      'Worker App (GPS clock-in)',
      'Smart quoting with e-signatures',
      'Review Machine (auto 5-star requests)',
      'Break tracking + CA compliance alerts',
      'Team scheduling + dispatch',
      'Priority support',
    ],
    hrFeature: 'Full compliance toolkit',
  },
  {
    name: 'Elite',
    price: 79,
    annualPrice: 790,
    workers: 30,
    description: 'For established crews',
    features: [
      'Everything in Pro, plus:',
      'Dispatch Board + Route Optimization',
      'Multiple admin users',
      'Advanced reporting + analytics',
      'Photo verification (clock-in selfies)',
      'Compliance dashboard',
      'Dedicated account manager',
      'Phone support',
    ],
    hrFeature: 'HR On-Demand access',
    payrollFeature: 'Payroll (coming soon)',
  },
];

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5 text-[#1a1a2e] font-extrabold text-xl no-underline">
            <div className="w-[42px] h-[42px] bg-[#f5a623] rounded-[10px] flex items-center justify-center text-xl shadow-[0_4px_12px_rgba(245,166,35,0.3)]">
              🛠
            </div>
            <span>ToolTime Pro</span>
          </Link>

          <div className={`hidden md:flex items-center gap-9 ${mobileMenuOpen ? 'flex' : ''}`}>
            <Link href="#features" className="text-[#5c5c70] font-medium text-[0.9375rem] hover:text-[#1a1a2e] transition-colors no-underline">Features</Link>
            <Link href="#demos" className="text-[#5c5c70] font-medium text-[0.9375rem] hover:text-[#1a1a2e] transition-colors no-underline">Demos</Link>
            <Link href="#hr" className="text-[#5c5c70] font-medium text-[0.9375rem] hover:text-[#1a1a2e] transition-colors no-underline">🛡️ HR & Compliance</Link>
            <Link href="#pricing" className="text-[#5c5c70] font-medium text-[0.9375rem] hover:text-[#1a1a2e] transition-colors no-underline">Pricing</Link>
            <Link
              href="/auth/signup"
              className="bg-[#1a1a2e] text-white px-6 py-3 rounded-xl font-medium text-[0.9375rem] shadow-[0_4px_12px_rgba(26,26,46,0.08)] hover:bg-[#2d2d44] hover:-translate-y-0.5 transition-all no-underline"
            >
              Get Started
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
            <Link href="#features" className="text-[#5c5c70] font-medium hover:text-[#1a1a2e] no-underline">Features</Link>
            <Link href="#demos" className="text-[#5c5c70] font-medium hover:text-[#1a1a2e] no-underline">Demos</Link>
            <Link href="#hr" className="text-[#5c5c70] font-medium hover:text-[#1a1a2e] no-underline">🛡️ HR & Compliance</Link>
            <Link href="#pricing" className="text-[#5c5c70] font-medium hover:text-[#1a1a2e] no-underline">Pricing</Link>
            <Link href="/auth/signup" className="bg-[#1a1a2e] text-white px-6 py-3 rounded-xl font-medium text-center no-underline">Get Started</Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-[140px] pb-[100px] bg-white relative overflow-hidden">
        {/* Background diagonal */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-br from-[#1a1a2e] to-[#2d2d44] hidden lg:block" style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)' }} />
        <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(245,166,35,0.12)_0%,transparent_70%)]" />

        <div className="max-w-[1200px] mx-auto px-6 grid lg:grid-cols-2 gap-[60px] items-center relative z-10">
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#fef3d6] px-[18px] py-2.5 rounded-full text-sm font-bold text-[#1a1a2e] mb-6 border border-[rgba(245,166,35,0.3)]">
              <span className="w-2 h-2 bg-[#00c853] rounded-full animate-pulse" />
              Built for Service Pros
            </div>

            {/* Headline */}
            <h1 className="text-[clamp(2.5rem,5.5vw,4rem)] font-extrabold text-[#1a1a2e] leading-[1.15] tracking-tight mb-6">
              Run Your Business<br />
              <span className="text-[#f5a623] relative">
                Like a Pro
                <span className="absolute bottom-1 left-0 right-0 h-2 bg-[#f5a623] opacity-30 -z-10 rounded" />
              </span>
            </h1>

            <p className="text-[1.1875rem] text-[#5c5c70] mb-9 max-w-[480px] leading-relaxed">
              We set it up. You run your business. It&apos;s that simple.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 mb-14">
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 px-10 py-5 bg-[#f5a623] text-[#1a1a2e] rounded-xl font-bold text-[1.0625rem] shadow-[0_4px_16px_rgba(245,166,35,0.35)] hover:bg-[#e6991a] hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(245,166,35,0.4)] transition-all no-underline"
              >
                Get Started Free →
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center gap-2 px-10 py-5 bg-white text-[#1a1a2e] border-2 border-[#1a1a2e] rounded-xl font-bold text-[1.0625rem] hover:bg-[#1a1a2e] hover:text-white transition-all no-underline"
              >
                See How It Works
              </Link>
            </div>

            {/* Stats */}
            <div className="flex gap-12 pt-8 border-t border-gray-200">
              <div>
                <div className="text-[2.25rem] font-extrabold text-[#1a1a2e] font-mono">$30</div>
                <div className="text-sm text-[#8e8e9f] mt-1.5">Starting at /month</div>
              </div>
              <div>
                <div className="text-[2.25rem] font-extrabold text-[#1a1a2e] font-mono">10x</div>
                <div className="text-sm text-[#8e8e9f] mt-1.5">Cheaper than competitors</div>
              </div>
              <div>
                <div className="text-[2.25rem] font-extrabold text-[#1a1a2e] font-mono">0</div>
                <div className="text-sm text-[#8e8e9f] mt-1.5">Tech skills required</div>
              </div>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="hidden lg:flex justify-center">
            <div className="bg-white rounded-[20px] p-5 shadow-[0_24px_60px_rgba(26,26,46,0.16)] transform perspective-[1000px] hover:rotate-y-[-2deg] transition-transform duration-500 max-w-[420px]">
              <div className="bg-gradient-to-br from-[#1a1a2e] to-[#2d2d44] rounded-xl p-6 text-white min-h-[380px]">
                <div className="flex justify-between items-center mb-6">
                  <div className="text-[1.125rem] font-bold">📊 Today&apos;s Overview</div>
                  <div className="text-[0.8125rem] opacity-70 font-mono">Jan 19, 2026</div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-white/10 rounded-[10px] p-3.5">
                    <div className="text-[0.6875rem] opacity-70 uppercase tracking-wide mb-1">Jobs Today</div>
                    <div className="text-[1.375rem] font-extrabold">8</div>
                  </div>
                  <div className="bg-white/10 rounded-[10px] p-3.5">
                    <div className="text-[0.6875rem] opacity-70 uppercase tracking-wide mb-1">Revenue</div>
                    <div className="text-[1.375rem] font-extrabold"><span className="opacity-60">$</span>2,450</div>
                  </div>
                  <div className="bg-white/10 rounded-[10px] p-3.5">
                    <div className="text-[0.6875rem] opacity-70 uppercase tracking-wide mb-1">Active Crew</div>
                    <div className="text-[1.375rem] font-extrabold">5</div>
                  </div>
                  <div className="bg-white/10 rounded-[10px] p-3.5">
                    <div className="text-[0.6875rem] opacity-70 uppercase tracking-wide mb-1">New Leads</div>
                    <div className="text-[1.375rem] font-extrabold">12</div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-[10px] p-3.5">
                  <div className="text-[0.75rem] opacity-60 uppercase tracking-wide mb-3">Upcoming Jobs</div>
                  {[
                    { name: '🏠 Martinez Residence', type: 'Lawn care', time: '9:00 AM', status: 'Active', statusColor: 'bg-[#00c853]' },
                    { name: '🏢 Oak Valley HOA', type: 'Landscaping', time: '11:30 AM', status: 'Next', statusColor: 'bg-[#f5a623]' },
                    { name: '🏊 Thompson Pool', type: 'Pool service', time: '2:00 PM', status: 'Later', statusColor: 'bg-[#f5a623]' },
                  ].map((job, i) => (
                    <div key={i} className={`flex justify-between items-center py-2.5 ${i < 2 ? 'border-b border-white/10' : ''}`}>
                      <div>
                        <div className="text-[0.8125rem] font-semibold">{job.name}</div>
                        <div className="text-[0.6875rem] opacity-60">{job.type} • {job.time}</div>
                      </div>
                      <span className={`${job.statusColor} text-[#1a1a2e] px-2.5 py-1 rounded-full text-[0.625rem] font-bold uppercase`}>
                        {job.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-[100px] bg-[#fafafa]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center max-w-[640px] mx-auto mb-16">
            <span className="inline-block bg-[#fef3d6] px-[18px] py-2 rounded-full text-[0.8125rem] font-bold text-[#1a1a2e] mb-5">
              Sound Familiar?
            </span>
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold text-[#1a1a2e] leading-tight tracking-tight mb-4">
              These Problems Cost You Money
            </h2>
            <p className="text-[1.0625rem] text-[#5c5c70]">
              You&apos;re great at your trade. But running the business side? That&apos;s where things fall apart.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {painPoints.map((point, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-8 border border-gray-200 relative overflow-hidden group hover:-translate-y-1.5 hover:shadow-lg hover:border-transparent transition-all"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#ff5252] group-hover:bg-[#00c853] transition-colors" />
                <div className="w-[52px] h-[52px] bg-[#ffebee] group-hover:bg-[#e8f5e9] rounded-xl flex items-center justify-center text-2xl mb-5 transition-colors">
                  {point.icon}
                </div>
                <h3 className="text-[1.125rem] font-extrabold text-[#1a1a2e] mb-2.5">{point.title}</h3>
                <p className="text-[0.9375rem] text-[#5c5c70] mb-5 leading-relaxed">{point.description}</p>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#00c853]">
                  <span className="w-5 h-5 bg-[#00c853] text-white rounded-full flex items-center justify-center text-[0.6875rem]">✓</span>
                  {point.solution}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-[100px] bg-[#1a1a2e] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(245,166,35,0.1)_0%,transparent_50%),radial-gradient(circle_at_80%_20%,rgba(245,166,35,0.08)_0%,transparent_50%)]" />

        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <div className="text-center max-w-[640px] mx-auto mb-16">
            <span className="inline-block bg-[rgba(245,166,35,0.2)] text-[#f5a623] px-[18px] py-2 rounded-full text-[0.8125rem] font-bold mb-5">
              Everything You Need
            </span>
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold text-white leading-tight tracking-tight mb-4">
              One Platform. Zero Headaches.
            </h2>
            <p className="text-[1.0625rem] text-white/70">
              Website, scheduling, worker management, HR & compliance — all in one place. Finally.
            </p>
          </div>

          {/* Feature Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-14">
            {featureTabs.map((tab, index) => (
              <Link
                key={index}
                href={tab.href}
                className={`px-6 py-3.5 rounded-full font-semibold text-[0.9375rem] transition-all no-underline ${
                  tab.comingSoon
                    ? 'bg-white/10 text-white/60 border border-white/10'
                    : index === 0
                      ? 'bg-[#f5a623] text-[#1a1a2e] border border-[#f5a623]'
                      : 'bg-white/10 text-white/80 border border-white/10 hover:bg-white/15 hover:text-white'
                }`}
              >
                {tab.icon} {tab.name}
                {tab.comingSoon && (
                  <span className="bg-[#f5a623] text-[#1a1a2e] px-2 py-0.5 rounded-[10px] text-[0.625rem] font-bold ml-1.5 align-middle">
                    COMING SOON
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Feature Content */}
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <ul className="space-y-7">
                {features.map((feature, index) => (
                  <li key={index} className="flex gap-5">
                    <div className="w-9 h-9 min-w-[36px] bg-[#f5a623] rounded-[10px] flex items-center justify-center text-[#1a1a2e] font-bold">
                      ✓
                    </div>
                    <div>
                      <h4 className="text-white font-extrabold text-[1.0625rem] mb-1.5">
                        {feature.title}
                        {feature.badge && (
                          <span className="ml-2 bg-white/20 text-white/90 text-[0.625rem] font-bold px-2 py-0.5 rounded-full align-middle">
                            {feature.badge}
                          </span>
                        )}
                      </h4>
                      <p className="text-white/65 text-[0.9375rem] leading-relaxed">{feature.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Phone Mockup */}
            <div className="flex justify-center">
              <div className="bg-[#0a0a12] rounded-[40px] p-3 shadow-[0_24px_60px_rgba(26,26,46,0.16)] max-w-[300px]">
                <div className="bg-white rounded-[32px] overflow-hidden">
                  <div className="bg-gradient-to-br from-[#1a1a2e] to-[#2d2d44] text-white p-5">
                    <h4 className="font-extrabold text-[1.0625rem]">👷 Worker App</h4>
                  </div>
                  <div className="p-4">
                    <div className="bg-[#fafafa] rounded-xl p-4 mb-3 border border-gray-200">
                      <h5 className="text-[#1a1a2e] font-bold text-[0.9375rem] mb-1">🏠 Martinez Residence</h5>
                      <p className="text-[0.8125rem] text-[#8e8e9f]">123 Oak Street</p>
                      <p className="text-[#1a1a2e] font-semibold text-[0.8125rem] mt-1.5">9:00 AM - 11:00 AM</p>
                    </div>
                    <div className="bg-[#fafafa] rounded-xl p-4 mb-3 border border-gray-200">
                      <h5 className="text-[#1a1a2e] font-bold text-[0.9375rem] mb-1">🏢 Oak Valley HOA</h5>
                      <p className="text-[0.8125rem] text-[#8e8e9f]">456 Pine Avenue</p>
                      <p className="text-[#1a1a2e] font-semibold text-[0.8125rem] mt-1.5">11:30 AM - 2:00 PM</p>
                    </div>
                    <button className="w-full py-4 bg-[#00c853] text-white font-bold rounded-xl">
                      ⏰ Clock In Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demos Section */}
      <section id="demos" className="py-20 bg-[#fafafa]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center max-w-[640px] mx-auto mb-16">
            <span className="inline-block bg-[#fef3d6] px-[18px] py-2 rounded-full text-[0.8125rem] font-bold text-[#1a1a2e] mb-5">
              See It In Action
            </span>
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold text-[#1a1a2e] leading-tight tracking-tight mb-4">
              Try Our Interactive Demos
            </h2>
            <p className="text-[1.0625rem] text-[#5c5c70]">
              Click any feature below to see exactly how ToolTime Pro works. No signup required.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {demoCards.map((card, index) => (
              <Link
                key={index}
                href={card.href}
                className="bg-white rounded-[20px] p-6 text-center border-2 border-gray-200 hover:border-[#f5a623] hover:-translate-y-1 hover:shadow-lg transition-all no-underline group relative"
              >
                {card.badge && (
                  <span className="absolute top-3 right-3 bg-[#1a1a2e] text-white text-[0.625rem] font-bold px-2 py-1 rounded-full">
                    {card.badge}
                  </span>
                )}
                <div className="text-[2.5rem] mb-3">{card.icon}</div>
                <h3 className="text-[1.125rem] font-extrabold text-[#1a1a2e] mb-2">{card.name}</h3>
                <p className="text-[0.875rem] text-[#8e8e9f] leading-relaxed mb-3">{card.description}</p>
                <span className="text-[#f5a623] font-semibold text-[0.875rem] group-hover:underline">Try Demo →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-[100px] bg-[#fafafa]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center max-w-[640px] mx-auto mb-12">
            <span className="inline-block bg-[#fef3d6] px-[18px] py-2 rounded-full text-[0.8125rem] font-bold text-[#1a1a2e] mb-5">
              Simple Pricing
            </span>
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold text-[#1a1a2e] leading-tight tracking-tight mb-4">
              Plans That Grow With You
            </h2>
            <p className="text-[1.0625rem] text-[#5c5c70]">
              No hidden fees. No contracts. Cancel anytime.
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex justify-center mb-12">
            <div className="bg-gray-100 rounded-full p-1.5 flex">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-7 py-3.5 rounded-full font-semibold text-[0.9375rem] transition-all ${
                  billingPeriod === 'monthly'
                    ? 'bg-white text-[#1a1a2e] shadow-md'
                    : 'text-[#8e8e9f] hover:text-[#1a1a2e]'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={`px-7 py-3.5 rounded-full font-semibold text-[0.9375rem] flex items-center gap-2 transition-all ${
                  billingPeriod === 'annual'
                    ? 'bg-white text-[#1a1a2e] shadow-md'
                    : 'text-[#8e8e9f] hover:text-[#1a1a2e]'
                }`}
              >
                Annual
                <span className="bg-[#00c853] text-white px-2.5 py-1 rounded-full text-[0.6875rem] font-bold">
                  Save 17%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-[1100px] mx-auto">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`bg-white rounded-[20px] p-10 border-2 relative transition-all hover:-translate-y-2 hover:shadow-lg ${
                  plan.popular
                    ? 'border-[#f5a623] shadow-[0_0_0_4px_rgba(245,166,35,0.15),0_12px_40px_rgba(26,26,46,0.12)] scale-[1.03]'
                    : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#f5a623] text-[#1a1a2e] px-5 py-2 rounded-full text-[0.75rem] font-extrabold whitespace-nowrap">
                    Most Popular
                  </div>
                )}

                <div className="text-[1.5rem] font-extrabold text-[#1a1a2e] mb-2">{plan.name}</div>
                <p className="text-[0.9375rem] text-[#8e8e9f] mb-2">{plan.description}</p>
                <p className="text-[0.8125rem] text-[#5c5c70] mb-5">Up to {plan.workers} workers</p>

                <div className="mb-7">
                  <span className="text-[3.25rem] font-extrabold text-[#1a1a2e] leading-none">
                    ${billingPeriod === 'monthly' ? plan.price : plan.annualPrice}
                  </span>
                  <span className="text-[#8e8e9f]">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                </div>

                <ul className="space-y-0 mb-8">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-3 py-3 text-[0.9375rem] text-[#1a1a2e] border-b border-gray-100 last:border-0">
                      <span className="text-[#00c853] font-bold min-w-[20px]">✓</span>
                      {feature}
                    </li>
                  ))}
                  {plan.hrFeature && (
                    <li className="flex items-start gap-3 py-3 text-[0.9375rem] text-[#1a1a2e] bg-[#fef3d6] -mx-10 px-10 rounded-none">
                      <span className="min-w-[20px]">🛡️</span>
                      {plan.hrFeature}
                    </li>
                  )}
                  {plan.payrollFeature && (
                    <li className="flex items-start gap-3 py-3 text-[0.9375rem] text-[#8e8e9f] italic bg-gradient-to-r from-[rgba(245,166,35,0.1)] to-[rgba(245,166,35,0.05)] -mx-10 px-10">
                      <span className="min-w-[20px]">💰</span>
                      {plan.payrollFeature}
                    </li>
                  )}
                </ul>

                <Link
                  href={`/auth/signup?plan=${plan.name.toLowerCase()}&billing=${billingPeriod}`}
                  className={`block w-full py-4 rounded-xl font-bold text-center transition-all no-underline ${
                    plan.popular
                      ? 'bg-[#f5a623] text-[#1a1a2e] hover:bg-[#e6991a] shadow-[0_4px_16px_rgba(245,166,35,0.35)]'
                      : 'bg-[#1a1a2e] text-white hover:bg-[#2d2d44]'
                  }`}
                >
                  Start Free Trial
                </Link>
                <p className="text-center text-[0.8125rem] text-[#8e8e9f] mt-3">
                  14-day free trial • No credit card required
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-[#1a1a2e] text-center py-[100px] px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,166,35,0.1)_0%,transparent_60%)]" />
        <div className="max-w-[640px] mx-auto relative z-10">
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold text-white leading-tight tracking-tight mb-4">
            Ready to Run Your Business Like a Pro?
          </h2>
          <p className="text-[1.125rem] text-white/70 mb-9">
            Join hundreds of service businesses using ToolTime Pro to save time, stay compliant, and get more customers.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-10 py-5 bg-[#f5a623] text-[#1a1a2e] rounded-xl font-bold text-[1.0625rem] shadow-[0_4px_16px_rgba(245,166,35,0.35)] hover:bg-[#e6991a] hover:-translate-y-[3px] transition-all no-underline"
          >
            Get Started Free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#12121f] text-white py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2.5 text-white font-extrabold text-xl mb-4 no-underline">
                <div className="w-[42px] h-[42px] bg-[#f5a623] rounded-[10px] flex items-center justify-center text-xl">
                  🛠
                </div>
                <span>ToolTime Pro</span>
              </Link>
              <p className="text-white/50 text-[0.9375rem] leading-relaxed max-w-[300px]">
                The all-in-one platform for service businesses. Website, scheduling, worker app, HR & compliance — we set it up, you run your business.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-5">Product</h4>
              <div className="flex flex-col gap-3">
                <Link href="#features" className="text-white/50 text-[0.9375rem] hover:text-[#f5a623] transition-colors no-underline">Features</Link>
                <Link href="#pricing" className="text-white/50 text-[0.9375rem] hover:text-[#f5a623] transition-colors no-underline">Pricing</Link>
                <Link href="#demos" className="text-white/50 text-[0.9375rem] hover:text-[#f5a623] transition-colors no-underline">Demos</Link>
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
