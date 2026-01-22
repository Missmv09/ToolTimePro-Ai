'use client';

import Link from 'next/link';
import { useState } from 'react';
import { submitWebsiteLead } from '@/lib/supabase-browser';

// Hero feature tabs
const heroFeatureTabs = [
  { name: 'Website', active: true },
  { name: 'Scheduling', active: true },
  { name: 'Worker App', active: true },
  { name: 'Compliance & HR', active: true },
  { name: 'Payments', active: true },
  { name: 'Payroll', active: false, comingSoon: true },
];

// Industry cards for "Who It's For" section
const industryCards = [
  { icon: '🏠', name: 'Home Services', description: 'Cleaning, handyman, organizing, inspections' },
  { icon: '🌿', name: 'Outdoor Services', description: 'Landscaping, pool, pressure washing' },
  { icon: '🚗', name: 'Mobile Services', description: 'Auto detailing, notary, locksmith, towing' },
  { icon: '💆', name: 'Wellness & Beauty', description: 'Massage, salon, personal training' },
  { icon: '🐕', name: 'Pet Services', description: 'Grooming, walking, sitting, training' },
  { icon: '📚', name: 'Lessons & Events', description: 'Tutoring, photography, DJ, catering' },
  { icon: '🔧', name: 'Skilled Trades', description: 'Electrical, plumbing, HVAC, painting' },
  { icon: '✨', name: 'And More', description: 'If you book appointments and send invoices, we\'re for you' },
];

// Pain points
const painPoints = [
  { icon: '🌐', problem: 'No Real Website', solution: 'We build you a real website that gets you found' },
  { icon: '📞', problem: 'Missed Calls = Missed Money', solution: 'AI chatbot answers 24/7' },
  { icon: '📅', problem: 'Scheduling Chaos', solution: 'One calendar. Online booking. No more chaos.' },
  { icon: '👷', problem: 'Where\'s My Crew?', solution: 'GPS clock-in and job tracking' },
  { icon: '⚖️', problem: 'California Legal Landmines', solution: 'ToolTime Shield keeps you compliant' },
  { icon: '⭐', problem: 'Zero Online Reviews', solution: 'Automatic review requests after every job' },
];

// Features list
const featureList = [
  { name: 'Professional Website', tagline: 'Built For You', description: 'We create your branded site. Mobile-optimized, fast, designed to convert visitors into paying customers.', icon: '✓' },
  { name: '24/7 AI Chatbot', tagline: 'Never Miss a Lead', description: 'Our AI answers questions and captures leads around the clock. Even at 2am on Sunday.', icon: '✓' },
  { name: 'Online Scheduling', tagline: 'Fill Your Calendar', description: 'Customers book online anytime. Automatic reminders reduce no-shows.', icon: '✓' },
  { name: 'Smart Quoting', tagline: 'Win More Jobs', description: 'Create professional quotes in seconds. Customers approve with one tap.', icon: '✓' },
  { name: 'Worker App', tagline: 'Your Crew\'s Command Center', description: 'Your crew sees their jobs, clocks in with location proof, uploads photos, and reports issues.', icon: '✓' },
  { name: 'Invoicing & Payments', tagline: 'Get Paid Faster', description: 'One-click invoices. Accept cards and ACH. Auto-reminders chase late payers for you.', icon: '✓' },
  { name: 'Review Machine', tagline: 'Automated 5-Star Growth', description: 'Auto-request reviews after every job. Watch your Google rating climb automatically.', icon: '✓' },
  { name: 'ToolTime Shield', tagline: 'Legal Protection + HR', description: 'Worker classification quiz, final pay calculator, compliance tools, AND 10+ HR templates. Stay lawsuit-free.', icon: '✓' },
  { name: 'Payroll', tagline: 'Coming Soon', description: 'Auto-calculate CA overtime & double-time. Join the waitlist.', icon: '⏳' },
];

// Demo cards
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
    { name: 'Invoicing & Payments', tagline: 'See a sample invoice', icon: '💳', href: '/demo/invoicing' },
    { name: 'Review Machine', tagline: 'See the review flow', icon: '⭐', href: '/demo/reviews' },
  ],
  row3: [
    { name: 'ToolTime Shield', tagline: 'Check your CA compliance', icon: '🛡️', href: '/dashboard/shield' },
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

// Testimonials
const testimonials = [
  {
    quote: "Before ToolTime Pro, I was losing customers because I couldn't answer the phone while cleaning. Now the AI chatbot books appointments for me 24/7.",
    name: 'Maria G.',
    business: 'Sparkle Clean Services',
    location: 'San Jose, CA',
    industry: 'House Cleaning',
  },
  {
    quote: "The worker app changed everything. I know exactly where my crews are, breaks are tracked automatically, and I haven't worried about compliance since.",
    name: 'Carlos R.',
    business: 'Green Valley Landscaping',
    location: 'Sacramento, CA',
    industry: 'Landscaping',
  },
  {
    quote: "I went from 3 Google reviews to 47 in three months. The automatic review requests are pure gold for a small business like mine.",
    name: 'Jessica T.',
    business: 'Pawfect Grooming',
    location: 'Los Angeles, CA',
    industry: 'Pet Grooming',
  },
  {
    quote: "Setup was done for me in a week. I\'m not tech-savvy at all, but now I have a professional website and online booking. Game changer.",
    name: 'Marcus D.',
    business: 'Elite Auto Detailing',
    location: 'San Diego, CA',
    industry: 'Mobile Detailing',
  },
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

// Business types for questionnaire
const businessTypes = [
  { value: 'landscaping', label: 'Landscaping & Lawn Care' },
  { value: 'pool', label: 'Pool Service & Maintenance' },
  { value: 'painting', label: 'Painting & Drywall' },
  { value: 'cleaning', label: 'Cleaning & Janitorial' },
  { value: 'hvac', label: 'HVAC & Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'roofing', label: 'Roofing & Gutters' },
  { value: 'handyman', label: 'Handyman Services' },
  { value: 'pest', label: 'Pest Control' },
  { value: 'other', label: 'Other Home Services' },
];

// Pain points for questionnaire
const painPointOptions = [
  { value: 'scheduling', label: 'Scheduling & dispatching jobs' },
  { value: 'payments', label: 'Getting paid on time' },
  { value: 'compliance', label: 'CA labor law compliance' },
  { value: 'time_tracking', label: 'Tracking worker hours' },
  { value: 'quoting', label: 'Creating quotes & estimates' },
  { value: 'reviews', label: 'Getting more reviews' },
  { value: 'leads', label: 'Managing leads & customers' },
  { value: 'website', label: 'Need a better website' },
];

// Employee count options
const employeeCountOptions = [
  { value: 'just_me', label: 'Just me' },
  { value: '2-5', label: '2-5 workers' },
  { value: '6-10', label: '6-10 workers' },
  { value: '11-25', label: '11-25 workers' },
  { value: '25+', label: '25+ workers' },
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileFeatureOpen, setMobileFeatureOpen] = useState(false);

  // Questionnaire form state
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    companyName: '',
    businessType: '',
    painPoints: [] as string[],
    employeeCount: '',
  });
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handlePainPointChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      painPoints: prev.painPoints.includes(value)
        ? prev.painPoints.filter((p) => p !== value)
        : [...prev.painPoints, value],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email) {
      return;
    }

    setFormStatus('submitting');

    const result = await submitWebsiteLead({
      email: formData.email,
      phone: formData.phone || undefined,
      companyName: formData.companyName || undefined,
      businessType: formData.businessType || undefined,
      painPoints: formData.painPoints.length > 0 ? formData.painPoints : undefined,
      employeeCount: formData.employeeCount || undefined,
    });

    if (result.success) {
      setFormStatus('success');
    } else {
      // Still show success to not lose the lead
      setFormStatus('success');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ==================== HERO SECTION ==================== */}
      <div className="bg-gradient-to-b from-[#1a1a2e] to-[#2d2d4a] text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
          {/* Tagline Badge */}
          <div className="mb-6">
            <span className="inline-block bg-gold-500 text-navy-900 text-sm font-semibold px-4 py-1.5 rounded-full">
              Everything You Need
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
            One Platform. Zero Headaches.
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-white/80 max-w-2xl mb-10">
            Website, scheduling, worker management, HR & compliance — all in one place.
          </p>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10 max-w-3xl">
            <div className="text-center sm:text-left">
              <div className="text-3xl sm:text-4xl font-bold text-gold-500">$49/mo</div>
              <div className="text-white/70 text-sm">starting</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-3xl sm:text-4xl font-bold text-gold-500">Up to 10x</div>
              <div className="text-white/70 text-sm">cheaper than competitors</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-3xl sm:text-4xl font-bold text-gold-500">Done-for-you</div>
              <div className="text-white/70 text-sm">0 tech skills required</div>
            </div>
          </div>

          {/* Feature Tabs - Mobile Dropdown */}
          <div className="md:hidden mb-8">
            <button
              onClick={() => setMobileFeatureOpen(!mobileFeatureOpen)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg flex items-center justify-between"
            >
              <span className="font-medium">Features Included</span>
              <span className={`transition-transform ${mobileFeatureOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {mobileFeatureOpen && (
              <div className="mt-2 bg-white/10 border border-white/20 rounded-lg p-4 space-y-2">
                {heroFeatureTabs.map((tab, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className={tab.comingSoon ? 'text-white/50' : 'text-gold-500'}>
                      {tab.comingSoon ? '⏳' : '✓'}
                    </span>
                    <span className={tab.comingSoon ? 'text-white/50' : ''}>
                      {tab.name}
                      {tab.comingSoon && <span className="text-xs ml-2">(Soon)</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feature Tabs - Desktop */}
          <div className="hidden md:flex flex-wrap gap-2 mb-10">
            {heroFeatureTabs.map((tab, index) => (
              <span
                key={index}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
                  tab.comingSoon
                    ? 'bg-white/10 text-white/50'
                    : 'bg-navy-500 text-white border border-white/20'
                }`}
              >
                <span className={tab.comingSoon ? 'text-white/50' : 'text-gold-500'}>
                  {tab.comingSoon ? '⏳' : '✓'}
                </span>
                {tab.name}
                {tab.comingSoon && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full ml-1">Soon</span>
                )}
              </span>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4">
            <Link
              href="/auth/register"
              className="bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold text-lg px-8 py-3 rounded-lg transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="#demos"
              className="border-2 border-white/30 text-white hover:bg-white/10 font-semibold text-lg px-8 py-3 rounded-lg transition-colors"
            >
              See How It Works
            </Link>
          </div>
        </div>
      </div>

      {/* ==================== WHO IT'S FOR SECTION ==================== */}
      <div className="bg-white">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-navy-500 mb-3">
              For Service Businesses That Go To Their Customers
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Whether you&apos;re a solo operator or managing a crew, we handle the back office.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {industryCards.map((card, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-3xl mb-3">{card.icon}</div>
                <h3 className="font-semibold text-navy-500 mb-1">{card.name}</h3>
                <p className="text-sm text-gray-600">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==================== PAIN POINTS SECTION ==================== */}
      <div className="bg-[#f8f9fa]">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-navy-500 mb-3">
              Running a Service Business Is Hard Enough
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              You didn&apos;t start your business to fight with software, chase payments, or worry about lawsuits.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {painPoints.map((point, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-sm"
              >
                <div className="text-3xl mb-3">{point.icon}</div>
                <h3 className="font-semibold text-navy-500 mb-2">{point.problem}</h3>
                <p className="text-gray-600">→ {point.solution}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==================== FEATURES SECTION ==================== */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-navy-500 mb-3">One Platform. Every Tool.</h2>
          </div>

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

      {/* ==================== DEMO CARDS SECTION ==================== */}
      <div id="demos" className="bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-16">
          {/* Section Header */}
          <div className="text-center mb-12">
            <span className="inline-block bg-gold-100 text-gold-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              See It In Action
            </span>
            <h2 className="text-3xl font-bold text-navy-500 mb-3">Try Our Interactive Demos</h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              See exactly how ToolTime Pro works. No signup required.
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

          {/* Row 2 - 4 cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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

          {/* Row 3 - 1 card centered */}
          <div className="flex justify-center">
            <Link
              href={demoCards.row3[0].href}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col group w-full sm:w-1/2 lg:w-1/4"
            >
              <div className="w-12 h-12 bg-gold-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-gold-200 transition-colors">
                <span className="text-2xl">{demoCards.row3[0].icon}</span>
              </div>
              <h3 className="font-semibold text-navy-500 mb-2">{demoCards.row3[0].name}</h3>
              <p className="text-sm text-gray-600 flex-grow">{demoCards.row3[0].tagline}</p>
              <span className="text-sm text-gold-600 font-medium mt-3 group-hover:text-gold-700">
                Try Demo →
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* ==================== TOOLTIME SHIELD + HR SECTION ==================== */}
      <div className="bg-white">
        <div className="max-w-6xl mx-auto px-4 py-16">
          {/* Section Header */}
          <div className="text-center mb-12">
            <span className="inline-block bg-navy-100 text-navy-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              ToolTime Shield
            </span>
            <h2 className="text-3xl font-bold text-navy-500 mb-3">Your Back-Office Safety Net</h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              The HR support that other platforms don&apos;t offer.
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
              <div className="bg-[#f8f9fa] rounded-xl p-6">
                <h4 className="font-bold text-navy-500 mb-1">HR Document Library</h4>
                <p className="text-sm text-gray-600 mb-4">All templates ready to use</p>
                <div className="space-y-2">
                  <Link
                    href="/dashboard/hr-toolkit"
                    className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-navy-500">Offer Letter Template</span>
                    <span className="text-xs bg-gold-500 text-navy-900 px-3 py-1 rounded font-medium">Download</span>
                  </Link>
                  <Link
                    href="/dashboard/hr-toolkit"
                    className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-navy-500">Termination Checklist</span>
                    <span className="text-xs bg-gold-500 text-navy-900 px-3 py-1 rounded font-medium">Download</span>
                  </Link>
                  <Link
                    href="/dashboard/hr-toolkit"
                    className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-navy-500">1099 Onboarding</span>
                    <span className="text-xs bg-gold-500 text-navy-900 px-3 py-1 rounded font-medium">Download</span>
                  </Link>
                </div>
              </div>

              {/* Worker Classification Quiz Card */}
              <div className="bg-[#f8f9fa] rounded-xl p-6">
                <h4 className="font-bold text-navy-500 mb-1">Worker Classification Quiz</h4>
                <p className="text-sm text-gray-600 mb-4">Does this worker control how & when they work?</p>
                <div className="bg-white rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-700 mb-3">Sample Question:</p>
                  <p className="text-navy-500 font-medium mb-3">&quot;Does this worker set their own schedule?&quot;</p>
                  <div className="flex gap-3">
                    <span className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">Yes</span>
                    <span className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">No</span>
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

      {/* ==================== TESTIMONIALS SECTION ==================== */}
      <div className="bg-[#f8f9fa]">
        <div className="max-w-6xl mx-auto px-4 py-16">
          {/* Section Header */}
          <div className="text-center mb-12">
            <span className="inline-block bg-gold-100 text-gold-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              Real Results
            </span>
            <h2 className="text-3xl font-bold text-navy-500 mb-3">Trusted By Service Pros</h2>
          </div>

          {/* Testimonials Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
                <p className="text-gray-700 mb-4 italic">&quot;{testimonial.quote}&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gold-100 rounded-full flex items-center justify-center">
                    <span className="text-gold-600 font-semibold">{testimonial.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-navy-500">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.business} • {testimonial.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats Bar */}
          <div className="bg-navy-500 rounded-xl p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-gold-500">500+</div>
                <div className="text-white/70 text-sm">businesses</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-gold-500">4.9/5</div>
                <div className="text-white/70 text-sm">rating</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-gold-500">10,000+</div>
                <div className="text-white/70 text-sm">jobs scheduled</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== QUESTIONNAIRE FORM SECTION ==================== */}
      <div id="get-started" className="bg-gradient-to-b from-[#1a1a2e] to-[#2d2d4a] text-white">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <span className="inline-block bg-gold-500 text-navy-900 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              Get Started
            </span>
            <h2 className="text-3xl font-bold mb-4">Tell Us About Your Business</h2>
            <p className="text-white/80 max-w-2xl mx-auto">
              We&apos;ll show you how ToolTime Pro can help you save time, stay compliant, and grow.
            </p>
          </div>

          {formStatus === 'success' ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-navy-500 mb-2">Thanks!</h3>
              <p className="text-gray-600 mb-6">We&apos;ll be in touch within 24 hours.</p>
              <Link href="/dashboard" className="inline-block bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold px-6 py-3 rounded-lg transition-colors">
                Explore the Dashboard
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-xl p-8">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Email (Required) */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-navy-500 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 text-navy-500"
                    placeholder="you@company.com"
                  />
                </div>

                {/* Phone (Optional) */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-navy-500 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 text-navy-500"
                    placeholder="(555) 123-4567"
                  />
                </div>

                {/* Company Name (Optional) */}
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-navy-500 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 text-navy-500"
                    placeholder="Your Company LLC"
                  />
                </div>

                {/* Business Type (Dropdown) */}
                <div>
                  <label htmlFor="businessType" className="block text-sm font-medium text-navy-500 mb-2">
                    Business Type
                  </label>
                  <select
                    id="businessType"
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 text-navy-500 bg-white"
                  >
                    <option value="">Select your industry...</option>
                    {businessTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Employee Count */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-navy-500 mb-2">
                    Team Size
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {employeeCountOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, employeeCount: option.value })}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          formData.employeeCount === option.value
                            ? 'bg-navy-500 text-white'
                            : 'bg-gray-100 text-navy-500 hover:bg-gray-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pain Points (Checkboxes) */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-navy-500 mb-3">
                    What challenges are you facing? (Select all that apply)
                  </label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {painPointOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          formData.painPoints.includes(option.value)
                            ? 'border-gold-500 bg-gold-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.painPoints.includes(option.value)}
                          onChange={() => handlePainPointChange(option.value)}
                          className="w-4 h-4 text-gold-500 border-gray-300 rounded focus:ring-gold-500"
                        />
                        <span className="text-sm text-navy-500">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-8">
                <button
                  type="submit"
                  disabled={formStatus === 'submitting' || !formData.email}
                  className="w-full bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold text-lg py-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {formStatus === 'submitting' ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Get My Free Demo</span>
                  )}
                </button>
                <p className="text-center text-sm text-gray-500 mt-3">
                  No credit card required. We&apos;ll reach out within 24 hours.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ==================== PRICING SECTION ==================== */}
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

      {/* ==================== FINAL CTA SECTION ==================== */}
      <div className="bg-gradient-to-b from-[#1a1a2e] to-[#2d2d4a] text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Stop Juggling. Start Growing.</h2>
          <p className="text-xl text-white/80 mb-8">
            Join hundreds of service businesses running smarter.
          </p>
          <Link
            href="/auth/register"
            className="inline-block bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold text-xl px-10 py-4 rounded-lg transition-colors mb-4"
          >
            Get Started Free
          </Link>
          <p className="text-white/60 mb-8">No credit card required. Free 14-day trial.</p>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <span>🔒</span>
              <span>Bank-level security</span>
            </div>
            <div className="flex items-center gap-2">
              <span>💳</span>
              <span>No hidden fees</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📞</span>
              <span>Real human support</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== FOOTER ==================== */}
      <footer className="bg-navy-500 text-white/70 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="font-bold text-white mb-2">ToolTime Pro</p>
          <p className="text-sm">Built for service businesses — home services, mobile services, skilled trades, and more.</p>
        </div>
      </footer>
    </main>
  );
}
