'use client';

import Link from 'next/link';
import { useState } from 'react';

// Hero feature tabs
const heroFeatureTabs = [
  { name: 'Website', active: true, href: '/demo/website' },
  { name: 'Scheduling', active: true, href: '/demo/scheduling' },
  { name: 'Quoting', active: true, href: '/demo/quoting' },
  { name: 'Worker App', active: true, href: '/worker' },
  { name: 'Compliance & HR', active: true, href: '/dashboard/shield' },
  { name: 'Payments', active: true, href: '/demo/invoicing' },
  { name: 'Payroll', active: false, comingSoon: true, href: '#' },
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
  { icon: '🗺️', title: 'Dispatch Board', description: 'See all your crews on a map in real-time. Drag-and-drop job assignments. Send "running late" alerts automatically.', badge: 'Elite Only' },
  { icon: '🛣️', title: 'Route Optimization', description: 'Automatically plan the most efficient routes for your crews. Save gas money and fit more jobs in each day.', badge: 'Elite Only' },
];

// Demo cards - all features we offer
const demoCards = {
  row1: [
    { name: 'Website Builder', tagline: 'See a sample site we\'d build for your business', icon: '🌐', href: '/demo/website' },
    { name: 'Smart Quoting', tagline: 'Create professional quotes in seconds with live preview', icon: '📝', href: '/demo/quoting' },
    { name: 'Online Booking', tagline: 'Let customers book online + manage your calendar', icon: '📅', href: '/demo/scheduling' },
    { name: 'AI Chatbot', tagline: '24/7 lead capture that never misses a customer', icon: '🤖', href: '/demo/chatbot' },
  ],
  row2: [
    { name: 'Review Machine', tagline: 'Automate 5-star reviews with SMS follow-ups', icon: '⭐', href: '/demo/reviews' },
    { name: 'Worker App', tagline: 'GPS clock-in, job details, and compliance tracking', icon: '👷', href: '/worker' },
    { name: 'Admin Dashboard', tagline: 'See jobs, revenue, crew status at a glance', icon: '📊', href: '/dashboard' },
    { name: 'ToolTime Shield', tagline: 'Worker classification, final pay calculator, HR docs', icon: '🛡️', href: '/dashboard/shield' },
    { name: 'Dispatch Board', tagline: 'Real-time crew tracking and drag-and-drop scheduling', icon: '🗺️', href: '/dashboard/dispatch', badge: 'Elite' },
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

// Compliance Tools
const complianceTools = [
  'Worker classification quiz (Employee vs Contractor)',
  'Final pay deadline calculator (CA same-day / 72-hour rules)',
  'Waiting time penalty estimator',
  'AB5 compliance checklist',
  'Minimum wage chart (CA state + cities)',
  'Paid sick leave tracker',
  'Required workplace poster guide',
];

// HR On-Demand features
const hrOnDemand = [
  'Live expert for tricky terminations',
  'Wage dispute guidance',
  'Classification questions answered',
  'Document review before sending',
  'Priority response within 4 hours',
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
    monthlyPrice: 30,
    annualPrice: 300,
    workers: 5,
    tagline: 'Best for solo operators',
    popular: false,
    features: [
      'Professional website (built for you)',
      'Online booking page',
      'Basic scheduling',
      'Invoicing + card payments',
      'ToolTime Shield (compliance tools)',
      'HR document library (10+ templates)',
      'Email support',
    ],
  },
  {
    name: 'Pro',
    monthlyPrice: 49,
    annualPrice: 490,
    workers: 15,
    tagline: 'Best for growing teams',
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
    monthlyPrice: 79,
    annualPrice: 790,
    workers: 30,
    tagline: 'Best for larger crews',
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
    ],
  },
];

// Pricing add-ons
const pricingAddOns = [
  { id: 'keepMeLegal', name: 'Keep Me Legal', price: 29 },
  { id: 'aiChatbot', name: 'AI Chatbot', price: 19 },
  { id: 'extraPage', name: 'Extra Website Page', price: 10 },
  { id: 'website_builder', name: 'Website Builder', price: 10, description: 'Custom landing page built for you' },
];

// Standalone plans
const standalonePlans = [
  {
    id: 'booking_only',
    name: 'Booking Only',
    price: 15,
    annualPrice: 150,
    icon: '📅',
    description: 'Just need online booking? Start here.',
  },
  {
    id: 'invoicing_only',
    name: 'Invoicing Only',
    price: 15,
    annualPrice: 150,
    icon: '🧾',
    description: 'Just need to send invoices? This is for you.',
  }
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
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, string[]>>({
    Starter: [],
    Pro: [],
    Elite: [],
  });

  const toggleAddOn = (planName: string, addOnId: string) => {
    setSelectedAddOns(prev => ({
      ...prev,
      [planName]: prev[planName].includes(addOnId)
        ? prev[planName].filter(id => id !== addOnId)
        : [...prev[planName], addOnId],
    }));
  };

  const handleStartTrial = (planName: string) => {
    const addOns = selectedAddOns[planName];
    const addOnsParam = addOns.length > 0 ? `&addons=${addOns.join(',')}` : '';
    window.location.href = `/auth/signup?plan=${planName.toLowerCase()}&billing=${billingPeriod}${addOnsParam}`;
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ==================== HEADER/NAV ==================== */}
      <header className="bg-[#0a1628] text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            <span className="text-xl font-bold text-white hover:text-white">ToolTime Pro</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#demos" className="text-white/80 hover:text-white transition-colors">Features</Link>
            <Link href="/pricing" className="text-white/80 hover:text-white transition-colors">Pricing</Link>
            <Link href="/dashboard" className="text-white/80 hover:text-white transition-colors">Dashboard</Link>
            <Link href="/auth/login" className="text-white/80 hover:text-white transition-colors">Log In</Link>
            <Link
              href="/auth/signup"
              className="bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </nav>
          {/* Mobile menu button */}
          <button className="md:hidden text-white p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* ==================== HERO SECTION ==================== */}
      <div className="bg-gradient-to-b from-[#0a1628] to-[#1a365d] text-white">
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
                  <Link
                    key={index}
                    href={tab.href}
                    className={`flex items-center gap-2 ${tab.comingSoon ? 'pointer-events-none' : 'hover:bg-white/10 -mx-2 px-2 py-1 rounded'}`}
                  >
                    <span className={tab.comingSoon ? 'text-white/50' : 'text-gold-500'}>
                      {tab.comingSoon ? '⏳' : '✓'}
                    </span>
                    <span className={tab.comingSoon ? 'text-white/50' : ''}>
                      {tab.name}
                      {tab.comingSoon && <span className="text-xs ml-2">(Soon)</span>}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Feature Tabs - Desktop */}
          <div className="hidden md:flex flex-wrap gap-2 mb-10">
            {heroFeatureTabs.map((tab, index) => (
              <Link
                key={index}
                href={tab.href}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${
                  tab.comingSoon
                    ? 'bg-white/10 text-white/50 pointer-events-none'
                    : 'bg-navy-500 text-white border border-white/20 hover:bg-navy-400 hover:border-white/40'
                }`}
              >
                <span className={tab.comingSoon ? 'text-white/50' : 'text-gold-500'}>
                  {tab.comingSoon ? '⏳' : '✓'}
                </span>
                {tab.name}
                {tab.comingSoon && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full ml-1">Soon</span>
                )}
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 mb-16">
            <Link
              href="/pricing"
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

          {/* Features with Worker App Preview */}
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left: Feature List */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">✓</span>
                <div>
                  <span className="font-semibold text-white">Professional Website — Built For You</span>
                  <p className="text-white/70 text-sm mt-1">We create your branded site. Mobile-optimized, fast, designed to convert visitors into paying customers.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">✓</span>
                <div>
                  <span className="font-semibold text-white">24/7 AI Chatbot</span>
                  <p className="text-white/70 text-sm mt-1">Never miss a lead. Our AI answers questions and captures contact info even at 2am on Sunday.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">✓</span>
                <div>
                  <span className="font-semibold text-white">Online Scheduling — Fill Your Calendar</span>
                  <p className="text-white/70 text-sm mt-1">Customers book online anytime. Automatic reminders reduce no-shows by 50%.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">✓</span>
                <div>
                  <span className="font-semibold text-white">Smart Quoting — Win More Jobs</span>
                  <p className="text-white/70 text-sm mt-1">Create professional quotes in seconds. Voice, photo, or manual entry. Customers approve with e-signatures.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">✓</span>
                <div>
                  <span className="font-semibold text-white">Worker App with GPS Clock-In</span>
                  <p className="text-white/70 text-sm mt-1">Your crew sees their jobs, clocks in/out with location proof, uploads photos, and reports issues.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">✓</span>
                <div>
                  <span className="font-semibold text-white">ToolTime Shield — Legal Protection</span>
                  <p className="text-white/70 text-sm mt-1">Worker classification quiz, final wage calculator, CA compliance checklists. Protect yourself from lawsuits.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">✓</span>
                <div>
                  <span className="font-semibold text-white">HR Document Library</span>
                  <p className="text-white/70 text-sm mt-1">10+ templates: offer letters, termination checklists, I-9 links, and more. All CA-compliant.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">✓</span>
                <div>
                  <span className="font-semibold text-white">Review Machine — Get More 5-Star Reviews</span>
                  <p className="text-white/70 text-sm mt-1">Automatically request reviews via SMS after jobs. Generate AI responses to reviews. Build your reputation.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">✓</span>
                <div>
                  <span className="font-semibold text-white">Admin Dashboard</span>
                  <p className="text-white/70 text-sm mt-1">See jobs, revenue, and crew status at a glance. <span className="text-gold-500">Track performance</span> and make smarter business decisions.</p>
                </div>
              </div>
            </div>

            {/* Right: Worker App Preview */}
            <div className="flex justify-center lg:justify-end">
              <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gold-500 rounded-lg flex items-center justify-center">
                    <span className="text-navy-900 font-bold text-lg">⚙️</span>
                  </div>
                  <span className="font-bold text-navy-500 text-lg">Worker App</span>
                </div>

                {/* Job Card 1 */}
                <div className="bg-gray-50 rounded-xl p-4 mb-3">
                  <div className="flex items-start gap-3">
                    <span className="text-gold-500 mt-1">📍</span>
                    <div className="flex-1">
                      <p className="font-semibold text-navy-500">Martinez Residence</p>
                      <p className="text-sm text-gray-500">123 Oak Street</p>
                      <p className="text-sm text-gray-600 mt-1 font-medium">9:00 AM - 11:00 AM</p>
                    </div>
                  </div>
                </div>

                {/* Job Card 2 */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <span className="text-gray-400 mt-1">📍</span>
                    <div className="flex-1">
                      <p className="font-semibold text-navy-500">Oak Valley HOA</p>
                      <p className="text-sm text-gray-500">456 Pine Avenue</p>
                      <p className="text-sm text-gray-600 mt-1 font-medium">11:30 AM - 3:00 PM</p>
                    </div>
                  </div>
                </div>

                {/* Clock In Button */}
                <button className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition-colors">
                  ✓ Clock In Now
                </button>
              </div>
            </div>
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
            {demoCards.row1.map((card, index) => (
              <Link
                key={index}
                href={card.href}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-5 flex flex-col group min-h-[200px]"
              >
                <div className="w-12 h-12 bg-gold-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-gold-200 transition-colors">
                  <span className="text-2xl">{card.icon}</span>
                </div>
                <h3 className="font-semibold text-navy-500 mb-1 text-base">{card.name}</h3>
                <p className="text-sm text-gray-500 flex-grow leading-relaxed">{card.tagline}</p>
                <span className="text-sm text-gold-600 font-medium mt-4 group-hover:text-gold-700 inline-flex items-center gap-1">
                  Try Demo <span className="group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </Link>
            ))}
          </div>

          {/* Row 2 - 4 cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {demoCards.row2.map((card, index) => (
              <Link
                key={index}
                href={card.href}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-5 flex flex-col group min-h-[200px]"
              >
                <div className="w-12 h-12 bg-gold-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-gold-200 transition-colors">
                  <span className="text-2xl">{card.icon}</span>
                </div>
                <h3 className="font-semibold text-navy-500 mb-1 text-base">{card.name}</h3>
                <p className="text-sm text-gray-500 flex-grow leading-relaxed">{card.tagline}</p>
                <span className="text-sm text-gold-600 font-medium mt-4 group-hover:text-gold-700 inline-flex items-center gap-1">
                  Try Demo <span className="group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ==================== HR & COMPLIANCE SECTION ==================== */}
      <div className="bg-[#fef9f0]">
        <div className="max-w-6xl mx-auto px-4 py-16">
          {/* Section Header */}
          <div className="text-center mb-12">
            <span className="inline-block bg-navy-500 text-white text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              🛡️ ToolTime HR
            </span>
            <h2 className="text-3xl font-bold text-navy-500 mb-3">Your Back-Office Safety Net</h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              The HR support that other platforms don&apos;t offer. Sleep better knowing you&apos;re protected.
            </p>
          </div>

          {/* Three Category Cards + Right Side Preview */}
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            {/* Left Column: Three Category Cards */}
            <div className="space-y-4">
              {/* Document Templates Card */}
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">📄</span>
                  <h3 className="font-bold text-navy-500">Document Templates (Included)</h3>
                </div>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {hrDocuments.map((doc, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-gold-500 mt-0.5">›</span>
                      <span className="text-gray-600">{doc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Compliance Tools Card */}
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">⚖️</span>
                  <h3 className="font-bold text-navy-500">Compliance Tools (Included)</h3>
                </div>
                <ul className="space-y-1.5">
                  {complianceTools.map((tool, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-gold-500 mt-0.5">›</span>
                      <span className="text-gray-600">{tool}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* HR On-Demand Card */}
              <div className="bg-gradient-to-r from-gold-50 to-gold-100 rounded-xl p-6 border-2 border-gold-300">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">👨‍💼</span>
                  <h3 className="font-bold text-navy-500">HR On-Demand</h3>
                  <span className="text-xs bg-gold-500 text-navy-900 px-2 py-0.5 rounded-full font-semibold">Elite Plan</span>
                </div>
                <ul className="space-y-1.5">
                  {hrOnDemand.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-gold-600 mt-0.5">›</span>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right Column: Interactive Preview */}
            <div className="space-y-4">
              {/* HR Document Library Card */}
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">📁</span>
                  <h4 className="font-bold text-navy-500">HR Document Library</h4>
                </div>
                <p className="text-sm text-gray-500 mb-4">10+ templates ready to use</p>
                <div className="space-y-2">
                  <Link href="/dashboard/hr-toolkit" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-gold-500">📄</span>
                      <span className="text-sm text-navy-500">Offer Letter Template</span>
                    </div>
                    <span className="text-xs bg-gold-500 text-navy-900 px-3 py-1 rounded-full font-semibold">Download</span>
                  </Link>
                  <Link href="/dashboard/hr-toolkit" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-gold-500">📄</span>
                      <span className="text-sm text-navy-500">Termination Checklist</span>
                    </div>
                    <span className="text-xs bg-gold-500 text-navy-900 px-3 py-1 rounded-full font-semibold">Download</span>
                  </Link>
                  <Link href="/dashboard/hr-toolkit" className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-gold-500">📄</span>
                      <span className="text-sm text-navy-500">1099 Onboarding</span>
                    </div>
                    <span className="text-xs bg-gold-500 text-navy-900 px-3 py-1 rounded-full font-semibold">Download</span>
                  </Link>
                </div>
              </div>

              {/* Worker Classification Quiz Card */}
              <div className="bg-navy-500 rounded-xl p-6 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">⚖️</span>
                  <h4 className="font-bold">Worker Classification Quiz</h4>
                </div>
                <p className="text-sm text-white/70 mb-4">Does this worker control how & when they work?</p>
                <div className="bg-navy-600 rounded-lg p-4 mb-4">
                  <div className="space-y-2">
                    <button className="w-full text-left px-4 py-2 bg-navy-500 hover:bg-navy-400 rounded-lg text-sm transition-colors">
                      Yes — they set their own schedule
                    </button>
                    <button className="w-full text-left px-4 py-2 bg-navy-500 hover:bg-navy-400 rounded-lg text-sm transition-colors">
                      No — I control their hours
                    </button>
                  </div>
                </div>
                <Link href="/dashboard/shield" className="inline-block bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold px-4 py-2 rounded-lg transition-colors text-sm">
                  Take the Full Quiz →
                </Link>
              </div>
            </div>
          </div>

          {/* California Compliance Tools - Same Section */}
          <div className="bg-navy-500 rounded-2xl p-8">
            <div className="text-center mb-8">
              <span className="inline-block bg-red-500 text-white text-sm font-semibold px-4 py-1.5 rounded-full mb-3">
                ⚠️ California Employers
              </span>
              <h3 className="text-2xl font-bold text-white mb-2">Stay Out of Trouble</h3>
              <p className="text-white/70 max-w-xl mx-auto">
                California employment law is brutal. One mistake can cost you thousands. We make compliance dead simple.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Link href="/dashboard/shield" className="bg-gradient-to-br from-gold-500 to-gold-600 rounded-xl p-5 text-navy-900 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">💰</span>
                  <h4 className="font-bold">Final Pay Calculator</h4>
                </div>
                <p className="text-sm text-navy-800">Know exactly when to pay terminated employees</p>
                <p className="text-xs text-navy-700 mt-1">Avoid up to 30 days wage penalties</p>
              </Link>

              <Link href="/dashboard/shield" className="bg-gradient-to-br from-navy-600 to-navy-700 rounded-xl p-5 text-white hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">📋</span>
                  <h4 className="font-bold">Size-Based Requirements</h4>
                </div>
                <p className="text-sm text-white/90">See exactly what laws apply to YOUR business</p>
                <p className="text-xs text-white/70 mt-1">1-4 employees? 50+? Different rules.</p>
              </Link>

              <Link href="/dashboard/shield" className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">📍</span>
                  <h4 className="font-bold">Local Wage Lookup</h4>
                </div>
                <p className="text-sm text-white/90">SF pays $18.07/hr, not $16.00</p>
                <p className="text-xs text-white/70 mt-1">Know your city&apos;s minimum wage</p>
              </Link>
            </div>

            <div className="text-center mt-6">
              <Link href="/dashboard/shield" className="inline-block bg-white hover:bg-gray-100 text-navy-900 font-semibold px-8 py-3 rounded-lg transition-colors">
                Check Your Compliance →
              </Link>
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

      {/* ==================== GET STARTED CTA SECTION ==================== */}
      <div id="get-started" className="bg-gradient-to-b from-[#0a1628] to-[#1a365d] text-white">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center">
            <span className="inline-block bg-gold-500 text-navy-900 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              Get Started
            </span>
            <h2 className="text-3xl font-bold mb-4">Ready to Grow Your Business?</h2>
            <p className="text-white/80 max-w-2xl mx-auto mb-8">
              Join thousands of service businesses using ToolTime Pro to save time, stay compliant, and get more customers.
            </p>
            <Link
              href="/pricing"
              className="inline-block bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold text-lg px-8 py-4 rounded-lg transition-colors"
            >
              View Plans & Pricing
            </Link>
            <p className="text-white/60 text-sm mt-4">
              No contracts. Cancel anytime. 30-day money-back guarantee.
            </p>
          </div>
        </div>
      </div>

      {/* ==================== PRICING SECTION ==================== */}
      <div className="bg-white">
        <div className="max-w-6xl mx-auto px-4 py-16">
          {/* Section Header */}
          <div className="text-center mb-8">
            <span className="inline-block bg-gold-100 text-gold-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              Simple Pricing
            </span>
            <h2 className="text-3xl font-bold text-navy-500 mb-3">Plans That Grow With You</h2>
            <p className="text-gray-600">No hidden fees. Cancel anytime.</p>
          </div>

          {/* Billing Toggle */}
          <div className="flex justify-center items-center gap-4 mb-12">
            <span className={`font-medium ${billingPeriod === 'monthly' ? 'text-navy-500' : 'text-gray-400'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
              className="relative w-14 h-8 bg-gray-200 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500"
              style={{ backgroundColor: billingPeriod === 'annual' ? '#c9a227' : '#e5e7eb' }}
            >
              <span
                className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  billingPeriod === 'annual' ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`font-medium ${billingPeriod === 'annual' ? 'text-navy-500' : 'text-gray-400'}`}>
              Annual
            </span>
            {billingPeriod === 'annual' && (
              <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
                Save 2 months
              </span>
            )}
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
                  <span className="text-4xl font-bold text-navy-500">
                    ${billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice}
                  </span>
                  <span className="text-gray-500">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">{plan.tagline}</p>

                {/* Workers included */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm font-semibold text-navy-500">{plan.workers} workers included</p>
                  <p className="text-xs text-gray-500">+$2/user for additional workers</p>
                </div>

                {/* Features list */}
                <ul className="space-y-2 mb-6 flex-grow">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-2 text-sm">
                      <span className="text-gold-500 mt-0.5">✓</span>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Add-ons */}
                <div className="border-t border-gray-200 pt-4 mb-6">
                  <p className="text-sm font-semibold text-navy-500 mb-3">Optional Add-ons:</p>
                  <div className="space-y-2">
                    {pricingAddOns.map((addOn) => (
                      <label key={addOn.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedAddOns[plan.name].includes(addOn.id)}
                          onChange={() => toggleAddOn(plan.name, addOn.id)}
                          className="w-4 h-4 rounded border-gray-300 text-gold-500 focus:ring-gold-500"
                        />
                        <span className="text-sm text-gray-700">{addOn.name}</span>
                        <span className="text-sm text-gray-500 ml-auto">${addOn.price}/mo</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleStartTrial(plan.name)}
                  className={`text-center py-3 rounded-lg font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-gold-500 hover:bg-gold-600 text-navy-900'
                      : 'border-2 border-navy-500 text-navy-500 hover:bg-navy-50'
                  }`}
                >
                  Start Free Trial
                </button>
                <p className="text-xs text-gray-500 text-center mt-3">
                  14-day free trial • No credit card required • Cancel anytime
                </p>
              </div>
            ))}
          </div>

          {/* Just Need One Thing? Section */}
          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-navy-500 mb-2">Just Need One Thing?</h3>
              <p className="text-gray-600 max-w-xl mx-auto">
                Not ready for a full plan? Start with just what you need. Upgrade anytime — we&apos;ll credit your payments.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {standalonePlans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{plan.icon}</span>
                    <h4 className="font-bold text-navy-500">{plan.name}</h4>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                  <div className="mb-4">
                    <span className="text-2xl font-bold text-navy-500">
                      ${billingPeriod === 'monthly' ? plan.price : plan.annualPrice}
                    </span>
                    <span className="text-gray-500">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                  </div>
                  <Link
                    href={`/auth/signup?plan=${plan.id}&billing=${billingPeriod}`}
                    className="block text-center py-2 px-4 border-2 border-navy-500 text-navy-500 rounded-lg font-semibold hover:bg-navy-50 transition-colors"
                  >
                    Get Started
                  </Link>
                </div>
              ))}
            </div>
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
                  <td className="p-4 text-navy-500">Workers Included</td>
                  <td className="text-center p-4 text-navy-500">5</td>
                  <td className="text-center p-4 text-navy-500 bg-gold-100">15</td>
                  <td className="text-center p-4 text-navy-500">30</td>
                </tr>
                <tr className="bg-white">
                  <td className="p-4 text-navy-500">Monthly Price</td>
                  <td className="text-center p-4 text-navy-500">$30</td>
                  <td className="text-center p-4 text-navy-500 bg-gold-50">$49</td>
                  <td className="text-center p-4 text-navy-500">$79</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="p-4 text-navy-500">Annual Price</td>
                  <td className="text-center p-4 text-navy-500">$300</td>
                  <td className="text-center p-4 text-navy-500 bg-gold-50/50">$490</td>
                  <td className="text-center p-4 text-navy-500">$790</td>
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
        </div>
      </div>

      {/* ==================== FINAL CTA SECTION ==================== */}
      <div className="bg-gradient-to-b from-[#0a1628] to-[#1a365d] text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Stop Juggling. Start Growing.</h2>
          <p className="text-xl text-white/80 mb-8">
            Join hundreds of service businesses running smarter.
          </p>
          <Link
            href="/pricing"
            className="inline-block bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold text-xl px-10 py-4 rounded-lg transition-colors mb-4"
          >
            Get Started
          </Link>
          <p className="text-white/60 mb-8">Simple pricing. No hidden fees.</p>

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
