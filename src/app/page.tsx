'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

type Language = 'en' | 'es';

// Features data - ordered by key money makers first
const features = [
  { title: 'Smart Quoting — Win More Jobs', description: 'Create professional quotes in seconds. Voice, photo, or manual entry. Customers approve with e-signature. Close deals 3x faster.', badge: '💰 Top Revenue Driver', highlight: true },
  { title: 'AI Phone Receptionist', description: 'Never miss a call. Our AI answers 24/7, captures lead info, books appointments, and handles emergencies professionally.', badge: '💰 Top Revenue Driver', highlight: true },
  { title: 'Review Machine — Get More 5-Star Reviews', description: 'Automatically request reviews via SMS after jobs. Generate AI responses to reviews. More reviews = more customers calling you.', badge: '💰 Top Revenue Driver', highlight: true },
  { title: '24/7 Jenny Lite & Lead Capture', description: 'Never miss a lead. Our AI chatbot answers questions, captures contact info, and books appointments even at 2am.', badge: '💰 Top Revenue Driver', highlight: true },
  { title: 'Worker App with GPS Clock-In', description: 'Your crew sees their jobs, clocks in/out with location proof, uploads photos, and reports issues. Full compliance tracking built-in.', highlight: true },
  { title: 'ToolTime Shield — Legal Protection', description: 'Worker classification quiz, final wage calculator, AB5 compliance checklists. Protect yourself from costly lawsuits.', badge: '🛡️ Legal Protection', highlight: true },
  { title: 'Dispatch Board — Real-Time Crew Tracking', description: 'See all your crews on a map in real-time. Drag-and-drop job assignments. Send "running late" alerts automatically.', badge: 'Elite Only' },
  { title: 'Route Optimization', description: 'Automatically plan the most efficient routes for your crews. Save on gas and fit more jobs in each day.', badge: 'Elite Only' },
  { title: 'QuickBooks Sync', description: 'Two-way sync with QuickBooks Online. Invoices, payments, and customers sync automatically. No double entry.' },
  { title: 'Professional Website — Built For You', description: 'We create your branded site. Mobile-optimized, fast, designed to convert visitors into paying customers.' },
  { title: 'Online Booking & Scheduling', description: 'Let customers book online 24/7. Smart calendar prevents double-bookings. Automatic reminders reduce no-shows.' },
  { title: 'Invoicing & Payments', description: 'Send professional invoices. Accept credit cards with low fees. Get paid faster with automated payment reminders.' },
];

// Feature tabs - key money makers highlighted
const featureTabs = [
  { name: 'Jenny AI', icon: '🎧', href: '/jenny', highlight: true },
  { name: 'Smart Quoting', icon: '📝', href: '/dashboard/smart-quote', highlight: true },
  { name: 'AI Receptionist', icon: '📞', href: '/demo/phone-receptionist', highlight: true },
  { name: 'Reviews', icon: '⭐', href: '/demo/reviews', highlight: true },
  { name: 'Jenny Lite', icon: '🤖', href: '/demo/chatbot', highlight: true },
  { name: 'Worker App', icon: '👷', href: '/demo/worker' },
  { name: 'Legal Protection', icon: '🛡️', href: '/demo/shield' },
  { name: 'Route Optimization', icon: '🗺️', href: '/demo/route-optimization' },
  { name: 'Dispatch', icon: '📋', href: '/demo/dispatch' },
  { name: 'QuickBooks', icon: '📗', href: '/demo/quickbooks' },
  { name: 'Website', icon: '🌐', href: '/demo/website' },
];

// Demo cards - reordered by key money makers first, aligned with actual demo pages
const demoCards = [
  { icon: '🎧', name: 'Jenny AI', description: 'Meet Jenny — your AI that answers calls, writes quotes, and handles reviews 24/7', href: '/jenny', badge: '🌟 NEW' },
  { icon: '📝', name: 'Smart Quoting', description: 'Create professional quotes in seconds — close deals 3x faster', href: '/dashboard/smart-quote', badge: '💰 Top Revenue' },
  { icon: '📞', name: 'AI Phone Receptionist', description: 'Never miss a call. AI answers 24/7, captures leads, books jobs', href: '/demo/phone-receptionist', badge: '💰 Top Revenue' },
  { icon: '⭐', name: 'Review Machine', description: 'Automate 5-star reviews — more reviews = more customers', href: '/demo/reviews', badge: '💰 Top Revenue' },
  { icon: '🤖', name: 'AI Lead Capture', description: '24/7 chatbot that captures leads while you sleep', href: '/demo/chatbot', badge: '💰 Top Revenue' },
  { icon: '👷', name: 'Worker App', description: 'GPS clock-in, compliance tracking, job management', href: '/demo/worker', badge: 'Must Have' },
  { icon: '🛡️', name: 'ToolTime Shield', description: 'AB5 compliance, final pay calculator, HR docs', href: '/demo/shield', badge: 'Legal Protection' },
  { icon: '🗺️', name: 'Route Optimization', description: 'Save gas and fit more jobs into every day', href: '/demo/route-optimization', badge: 'Elite' },
  { icon: '📋', name: 'Dispatch Board', description: 'Real-time crew tracking and job assignment', href: '/demo/dispatch', badge: 'Elite' },
  { icon: '📗', name: 'QuickBooks Sync', description: 'Auto-sync invoices, payments, and customers', href: '/demo/quickbooks' },
  { icon: '🌐', name: 'Website Builder', description: "See a sample site we'd build for your business", href: '/demo/website' },
  { icon: '📊', name: 'Admin Dashboard', description: 'See jobs, revenue, crew status at a glance', href: '/demo/dashboard' },
];

// Pricing plans
const pricingPlans = [
  {
    name: 'Starter',
    price: 30,
    annualPrice: 300,
    workers: 'Owner + 2',
    description: 'For small teams',
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
    price: 59,
    annualPrice: 590,
    workers: 15,
    description: 'For growing teams who need more tools',
    popular: true,
    features: [
      'Everything in Starter, plus:',
      'Smart Quoting with e-signatures',
      'Review Machine (auto 5-star requests)',
      'Worker App (GPS clock-in)',
      'Break tracking + CA compliance alerts',
      'Team scheduling + dispatch',
      'Priority support',
    ],
    hrFeature: 'Full compliance toolkit',
  },
  {
    name: 'Elite',
    price: 99,
    annualPrice: 990,
    workers: 20,
    description: 'Full operations suite for serious businesses',
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

// Standalone plans - just need one thing
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
  },
];

// Add-ons
const pricingAddOns = [
  { id: 'jenny_lite', name: 'Jenny Lite', price: 19, icon: '💬', description: 'Website chat & lead capture 24/7', highlight: true },
  { id: 'website_builder', name: 'Website Builder', price: 15, icon: '🌐', description: 'Custom landing page built for you' },
  { id: 'keep_me_legal', name: 'Keep Me Legal', price: 19, icon: '🛡️', description: 'Compliance monitoring & alerts' },
  { id: 'extra_page', name: 'Extra Website Page', price: 10, icon: '📄', description: 'Add more pages to your site' },
];

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [language, setLanguage] = useState<Language>('en');
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [industriesOpen, setIndustriesOpen] = useState(false);
  const router = useRouter();
  const { user, company, isLoading } = useAuth();

  // Redirect authenticated users away from the marketing homepage
  useEffect(() => {
    if (isLoading || !user) return;
    if (company?.onboarding_completed) {
      router.replace('/dashboard');
    } else if (company) {
      router.replace('/onboarding');
    }
  }, [user, company, isLoading, router]);

  const t = {
    en: {
      promo: 'Limited Time: Get 2 months free on annual plans.',
      startTrial: 'Start Free Trial',
      features: 'Features',
      industries: 'Industries',
      pricing: 'Pricing',
      resources: 'Resources',
      freeTools: 'Free Tools',
      getStarted: 'Get Started',
      badge: 'Built for Service Pros',
      heroTitle1: 'Your Business',
      heroTitle2: 'On Autopilot',
      heroSubtitle: "We set it up. You run your business. It's that simple.",
      cta1: 'Get Started Free',
      cta2: 'See How It Works',
      stat1: 'Starting at /month',
      stat2: 'Cheaper than competitors',
      stat3: 'Tech skills required',
      // Dashboard preview
      todaysOverview: "Today's Overview",
      jobsToday: 'Jobs Today',
      revenue: 'Revenue',
      activeCrew: 'Active Crew',
      newLeads: 'New Leads',
      upcomingJobs: 'Upcoming Jobs',
      lawnCare: 'Lawn care',
      landscaping: 'Landscaping',
      poolService: 'Pool service',
      active: 'Active',
      next: 'Next',
      later: 'Later',
    },
    es: {
      promo: 'Tiempo Limitado: Obtén 2 meses gratis en planes anuales.',
      startTrial: 'Prueba Gratis',
      features: 'Funciones',
      industries: 'Industrias',
      pricing: 'Precios',
      resources: 'Recursos',
      freeTools: 'Herramientas Gratis',
      getStarted: 'Comenzar',
      badge: 'Hecho para Profesionales',
      heroTitle1: 'Tu Negocio',
      heroTitle2: 'En Piloto Automático',
      heroSubtitle: 'Nosotros lo configuramos. Tú manejas tu negocio. Así de simple.',
      cta1: 'Empieza Gratis',
      cta2: 'Ver Cómo Funciona',
      stat1: 'Desde /mes',
      stat2: 'Más barato que la competencia',
      stat3: 'Habilidades técnicas requeridas',
      // Dashboard preview
      todaysOverview: 'Resumen de Hoy',
      jobsToday: 'Trabajos Hoy',
      revenue: 'Ingresos',
      activeCrew: 'Equipo Activo',
      newLeads: 'Nuevos Clientes',
      upcomingJobs: 'Próximos Trabajos',
      lawnCare: 'Jardinería',
      landscaping: 'Paisajismo',
      poolService: 'Servicio de piscina',
      active: 'Activo',
      next: 'Siguiente',
      later: 'Después',
    },
  };

  const text = t[language];

  return (
    <main className="min-h-screen bg-[#fafafa]">
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
            <Link href="/jenny" className="ml-6 text-[#f5a623] font-semibold text-base hover:text-[#e6991a] transition-colors no-underline flex items-center gap-1">
              🎧 Jenny AI
            </Link>
            <Link href="#features" className="text-[#5c5c70] font-medium text-base hover:text-[#1a1a2e] transition-colors no-underline">{text.features}</Link>
            <div className="relative">
              <button
                onClick={() => setIndustriesOpen(!industriesOpen)}
                className="text-[#5c5c70] font-medium text-base hover:text-[#1a1a2e] transition-colors flex items-center gap-1"
              >
                {text.industries} <span className="text-xs">▼</span>
              </button>
              {industriesOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50 max-h-[70vh] overflow-y-auto">
                  <Link href="/industries/landscaping" className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50 no-underline">
                    🌳 Landscaping
                  </Link>
                  <Link href="/industries/lawn-care" className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50 no-underline">
                    🌱 Lawn Care
                  </Link>
                  <Link href="/industries/pool-service" className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50 no-underline">
                    🏊 Pool Service
                  </Link>
                  <Link href="/industries/plumbing" className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50 no-underline">
                    🔧 Plumbing
                  </Link>
                  <Link href="/industries/electrical" className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50 no-underline">
                    ⚡ Electrical
                  </Link>
                  <Link href="/industries/hvac" className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50 no-underline">
                    ❄️ HVAC
                  </Link>
                  <Link href="/industries/painting" className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50 no-underline">
                    🎨 Painting
                  </Link>
                  <Link href="/industries/cleaning" className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50 no-underline">
                    🧹 Cleaning
                  </Link>
                  <Link href="/industries/roofing" className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50 no-underline">
                    🏠 Roofing
                  </Link>
                  <Link href="/industries/pest-control" className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50 no-underline">
                    🐜 Pest Control
                  </Link>
                  <Link href="/industries/auto-detailing" className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50 no-underline">
                    🚗 Auto Detailing
                  </Link>
                  <Link href="/industries/pressure-washing" className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50 no-underline">
                    💦 Pressure Washing
                  </Link>
                  <Link href="/industries/flooring" className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50 no-underline">
                    🪵 Flooring
                  </Link>
                  <Link href="/industries/handyman" className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50 no-underline">
                    🛠️ Handyman
                  </Link>
                  <Link href="/industries/tree-service" className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50 no-underline">
                    🌲 Tree Service
                  </Link>
                  <Link href="/industries/moving" className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50 no-underline">
                    📦 Moving
                  </Link>
                  <Link href="/industries/junk-removal" className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50 no-underline">
                    🗑️ Junk Removal
                  </Link>
                  <Link href="/industries/appliance-repair" className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50 no-underline">
                    🔌 Appliance Repair
                  </Link>
                  <Link href="/industries/garage-door" className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50 no-underline">
                    🚪 Garage Door
                  </Link>
                  <Link href="/industries/window-cleaning" className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50 no-underline">
                    🪟 Window Cleaning
                  </Link>
                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <Link href="/industries" className="block px-4 py-2 text-base text-[#f5a623] font-semibold hover:bg-gray-50 no-underline">
                      View All Industries →
                    </Link>
                  </div>
                </div>
              )}
            </div>
            <Link href="/pricing" className="text-[#5c5c70] font-medium text-base hover:text-[#1a1a2e] transition-colors no-underline">{text.pricing}</Link>
            <div className="relative">
              <button
                onClick={() => setResourcesOpen(!resourcesOpen)}
                className="text-[#5c5c70] font-medium text-base hover:text-[#1a1a2e] transition-colors flex items-center gap-1"
              >
                {text.resources} <span className="text-xs">▼</span>
              </button>
              {resourcesOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50">
                  <Link href="/tools" className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50 no-underline">
                    🧰 {text.freeTools}
                  </Link>
                  <Link href="#demos" className="block px-4 py-2 text-base text-gray-700 hover:bg-gray-50 no-underline">
                    🎮 Demos
                  </Link>
                  <Link href="/compare/jobber" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 no-underline">
                    ⚖️ Compare vs Jobber
                  </Link>
                </div>
              )}
            </div>

            {/* Language Switcher */}
            <div className="flex items-center border border-gray-200 rounded-lg">
              <button
                onClick={() => setLanguage('en')}
                className={`min-w-[40px] px-3 py-2 text-sm font-medium transition-colors rounded-l-lg ${
                  language === 'en' ? 'bg-[#1a1a2e] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                US
              </button>
              <button
                onClick={() => setLanguage('es')}
                className={`min-w-[40px] px-3 py-2 text-sm font-medium transition-colors rounded-r-lg border-l border-gray-200 ${
                  language === 'es' ? 'bg-[#1a1a2e] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                ES
              </button>
            </div>

            <a href="tel:1-888-555-0123" className="text-[#5c5c70] text-base flex items-center gap-2 whitespace-nowrap hover:text-[#1a1a2e] transition-colors no-underline">
              📞 <span>1-888-555-0123</span>
            </a>
            <Link
              href="/auth/signup"
              className="bg-[#f97316] text-white px-5 py-2.5 rounded-lg font-semibold text-base shadow-[0_4px_12px_rgba(249,115,22,0.3)] hover:bg-[#ea580c] hover:-translate-y-0.5 transition-all no-underline"
            >
              {text.startTrial}
            </Link>
            <Link
              href="/auth/login"
              className="text-[#374151] font-medium text-base hover:text-[#1a1a2e] transition-colors no-underline ml-1"
            >
              Login
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
            <Link href="/jenny" className="text-[#f5a623] font-semibold text-lg hover:text-[#e6991a] no-underline flex items-center gap-2">🎧 Jenny AI</Link>
            <Link href="#features" className="text-[#5c5c70] font-medium text-lg hover:text-[#1a1a2e] no-underline">{text.features}</Link>
            <Link href="/tools" className="text-[#5c5c70] font-medium text-lg hover:text-[#1a1a2e] no-underline">🧰 {text.freeTools}</Link>
            <Link href="#demos" className="text-[#5c5c70] font-medium text-lg hover:text-[#1a1a2e] no-underline">Demos</Link>
            <Link href="/pricing" className="text-[#5c5c70] font-medium text-lg hover:text-[#1a1a2e] no-underline">{text.pricing}</Link>
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setLanguage('en')}
                className={`flex-1 py-2 rounded-lg text-base font-medium ${language === 'en' ? 'bg-[#1a1a2e] text-white' : 'bg-gray-100'}`}
              >
                🇺🇸 English
              </button>
              <button
                onClick={() => setLanguage('es')}
                className={`flex-1 py-2 rounded-lg text-base font-medium ${language === 'es' ? 'bg-[#1a1a2e] text-white' : 'bg-gray-100'}`}
              >
                🇪🇸 Español
              </button>
            </div>
            <Link href="/auth/signup" className="bg-[#f97316] text-white px-6 py-3 rounded-xl font-semibold text-lg text-center no-underline">{text.startTrial}</Link>
            <Link href="/auth/login" className="text-[#374151] font-medium text-lg text-center py-3 hover:text-[#1a1a2e] no-underline">Login</Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-[100px] pb-[100px] bg-white relative overflow-hidden">
        {/* Background diagonal */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-br from-[#1a1a2e] to-[#2d2d44] hidden lg:block" style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)' }} />
        <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(245,166,35,0.12)_0%,transparent_70%)]" />

        <div className="max-w-[1200px] mx-auto px-6 grid lg:grid-cols-2 gap-[60px] items-center relative z-10">
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#fef3d6] px-[18px] py-2.5 rounded-full text-sm font-bold text-[#1a1a2e] mb-6 border border-[rgba(245,166,35,0.3)]">
              <span className="w-2 h-2 bg-[#00c853] rounded-full animate-pulse" />
              {text.badge}
            </div>

            {/* Headline */}
            <h1 className="text-[clamp(2.5rem,5.5vw,4rem)] font-extrabold text-[#1a1a2e] leading-[1.15] tracking-tight mb-6">
              {text.heroTitle1}<br />
              <span className="text-[#f5a623] relative">
                {text.heroTitle2}
                <span className="absolute bottom-1 left-0 right-0 h-2 bg-[#f5a623] opacity-30 -z-10 rounded" />
              </span>
            </h1>

            <p className="text-[1.1875rem] text-[#5c5c70] mb-9 max-w-[480px] leading-relaxed">
              {text.heroSubtitle}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 mb-14">
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 px-10 py-5 bg-[#f5a623] text-[#1a1a2e] rounded-xl font-bold text-[1.0625rem] shadow-[0_4px_16px_rgba(245,166,35,0.35)] hover:bg-[#e6991a] hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(245,166,35,0.4)] transition-all no-underline"
              >
                {text.cta1} →
              </Link>
              <Link
                href="#demos"
                className="inline-flex items-center gap-2 px-10 py-5 bg-white text-[#1a1a2e] border-2 border-[#1a1a2e] rounded-xl font-bold text-[1.0625rem] hover:bg-[#1a1a2e] hover:text-white transition-all no-underline"
              >
                {text.cta2}
              </Link>
            </div>

            {/* Stats */}
            <div className="flex gap-12 pt-8 border-t border-gray-200">
              <div>
                <div className="text-[2.25rem] font-extrabold text-[#1a1a2e] font-mono">$30</div>
                <div className="text-sm text-[#8e8e9f] mt-1.5">{text.stat1}</div>
              </div>
              <div>
                <div className="text-[2.25rem] font-extrabold text-[#1a1a2e] font-mono">3x</div>
                <div className="text-sm text-[#8e8e9f] mt-1.5">More jobs closed</div>
              </div>
              <div>
                <div className="text-[2.25rem] font-extrabold text-[#1a1a2e] font-mono">0</div>
                <div className="text-sm text-[#8e8e9f] mt-1.5">{text.stat3}</div>
              </div>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="hidden lg:flex justify-center">
            <div className="bg-white rounded-[20px] p-5 shadow-[0_24px_60px_rgba(26,26,46,0.16)] transform perspective-[1000px] hover:rotate-y-[-2deg] transition-transform duration-500 max-w-[420px]">
              <div className="bg-gradient-to-br from-[#1a1a2e] to-[#2d2d44] rounded-xl p-6 text-white min-h-[380px]">
                <div className="flex justify-between items-center mb-6">
                  <div className="text-[1.125rem] font-bold">📊 {text.todaysOverview}</div>
                  <div className="text-[0.8125rem] opacity-70 font-mono">{language === 'es' ? '25 Ene, 2026' : 'Jan 25, 2026'}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-white/10 rounded-[10px] p-3.5">
                    <div className="text-[0.6875rem] opacity-70 uppercase tracking-wide mb-1">{text.jobsToday}</div>
                    <div className="text-[1.375rem] font-extrabold">8</div>
                  </div>
                  <div className="bg-white/10 rounded-[10px] p-3.5">
                    <div className="text-[0.6875rem] opacity-70 uppercase tracking-wide mb-1">{text.revenue}</div>
                    <div className="text-[1.375rem] font-extrabold text-[#00c853]"><span className="opacity-60">$</span>2,450</div>
                  </div>
                  <div className="bg-white/10 rounded-[10px] p-3.5">
                    <div className="text-[0.6875rem] opacity-70 uppercase tracking-wide mb-1">{text.activeCrew}</div>
                    <div className="text-[1.375rem] font-extrabold">5</div>
                  </div>
                  <div className="bg-white/10 rounded-[10px] p-3.5">
                    <div className="text-[0.6875rem] opacity-70 uppercase tracking-wide mb-1">{text.newLeads}</div>
                    <div className="text-[1.375rem] font-extrabold">12</div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-[10px] p-3.5">
                  <div className="text-[0.75rem] opacity-60 uppercase tracking-wide mb-3">{text.upcomingJobs}</div>
                  {[
                    { name: '🏠 Martinez Residence', type: text.lawnCare, time: '9:00 AM', status: text.active, statusColor: 'bg-[#00c853]' },
                    { name: '🏢 Oak Valley HOA', type: text.landscaping, time: '11:30 AM', status: text.next, statusColor: 'bg-[#f5a623]' },
                    { name: '🏊 Thompson Pool', type: text.poolService, time: '2:00 PM', status: text.later, statusColor: 'bg-[#f5a623]' },
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

      {/* Features Section */}
      <section id="features" className="py-[100px] bg-[#1a1a2e] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(245,166,35,0.1)_0%,transparent_50%),radial-gradient(circle_at_80%_20%,rgba(245,166,35,0.08)_0%,transparent_50%)]" />

        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <div className="text-center max-w-[640px] mx-auto mb-16">
            <span className="inline-block bg-[rgba(245,166,35,0.2)] text-[#f5a623] px-[18px] py-2 rounded-full text-[0.8125rem] font-bold mb-5">
              Sound Familiar?
            </span>
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold text-white leading-tight tracking-tight mb-4">
              One Platform. Zero Headaches.
            </h2>
            <p className="text-[1.0625rem] text-white/70">
              Missed calls, scheduling chaos, compliance risks — they cost you real money. ToolTime Pro puts website, scheduling, worker management, HR & compliance all in one place. Finally.
            </p>
          </div>

          {/* Feature Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-14">
            {featureTabs.map((tab, index) => (
              <Link
                key={index}
                href={tab.href}
                className={`px-6 py-3.5 rounded-full font-semibold text-[0.9375rem] transition-all no-underline ${
                  index === 0
                    ? 'bg-[#f5a623] text-[#1a1a2e] border border-[#f5a623]'
                    : 'bg-white/10 text-white/80 border border-white/10 hover:bg-white/15 hover:text-white'
                }`}
              >
                {tab.icon} {tab.name}
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
                <p className="text-[0.8125rem] text-[#5c5c70] mb-5">{typeof plan.workers === 'number' ? `Up to ${plan.workers} workers` : plan.workers} workers</p>

                <div className="mb-7">
                  <span className="text-[3.25rem] font-extrabold text-[#1a1a2e] leading-none">
                    ${billingPeriod === 'monthly' ? plan.price : plan.annualPrice}
                  </span>
                  <span className="text-[#8e8e9f]">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                </div>

                <ul className="space-y-0 mb-6">
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

                {/* Optional Add-ons */}
                <div className="border-t border-gray-200 pt-4 mb-6">
                  <p className="text-[0.8125rem] font-semibold text-[#1a1a2e] mb-3">Optional Add-ons:</p>
                  <div className="space-y-2">
                    {plan.name === 'Elite' ? (
                      <div className="flex items-center gap-2 text-[0.875rem]">
                        <span className="text-[#00c853] font-bold">✓</span>
                        <span className="text-[#1a1a2e] font-medium">Jenny Lite</span>
                        <span className="text-[#00c853] font-semibold ml-auto text-[0.8125rem]">Included</span>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 cursor-pointer text-[0.875rem]">
                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#f5a623]" />
                        <span className="text-[#5c5c70]">Jenny Lite</span>
                        <span className="text-[#8e8e9f] ml-auto">$19/mo</span>
                      </label>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer text-[0.875rem]">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#f5a623]" />
                      <span className="text-[#5c5c70]">Keep Me Legal</span>
                      <span className="text-[#8e8e9f] ml-auto">$19/mo</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-[0.875rem]">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#f5a623]" />
                      <span className="text-[#5c5c70]">Website Builder</span>
                      <span className="text-[#8e8e9f] ml-auto">$15/mo</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-[0.875rem]">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#f5a623]" />
                      <span className="text-[#5c5c70]">Extra Website Page</span>
                      <span className="text-[#8e8e9f] ml-auto">$10/mo</span>
                    </label>
                  </div>
                </div>

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

          {/* Just Need One Thing - Standalone Options */}
          <div className="mt-16 bg-white rounded-[20px] p-10 border-2 border-gray-200">
            <div className="text-center mb-8">
              <h3 className="text-[1.5rem] font-extrabold text-[#1a1a2e] mb-2">Just Need One Thing?</h3>
              <p className="text-[#8e8e9f]">Not ready for a full plan? Start with just what you need.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6 max-w-[500px] mx-auto">
              {standalonePlans.map((plan, index) => (
                <Link
                  key={index}
                  href={`/auth/signup?plan=${plan.id}&billing=${billingPeriod}`}
                  className="border-2 border-gray-200 rounded-xl p-6 text-center hover:border-[#f5a623] transition-all no-underline group"
                >
                  <span className="text-[2.5rem] block mb-2">{plan.icon}</span>
                  <h4 className="text-[1.125rem] font-bold text-[#1a1a2e] mb-1">{plan.name}</h4>
                  <p className="text-[1.25rem] font-bold text-[#f5a623] mb-2">
                    ${billingPeriod === 'monthly' ? plan.price : plan.annualPrice}/{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                  </p>
                  <p className="text-[0.875rem] text-[#8e8e9f]">{plan.description}</p>
                </Link>
              ))}
            </div>
            <p className="text-center text-[0.875rem] text-[#8e8e9f] mt-6">
              💡 Upgrade to a full plan anytime — we&apos;ll credit what you&apos;ve paid!
            </p>
          </div>

          {/* Jenny AI Section */}
          <div className="mt-16 max-w-[1080px] mx-auto">
            <div className="bg-[#1a2038] rounded-[20px] p-12 relative overflow-hidden">
              {/* Background accents */}
              <div className="absolute -top-20 -right-16 w-[280px] h-[280px] bg-[radial-gradient(circle,rgba(245,166,35,0.12)_0%,transparent_70%)] rounded-full pointer-events-none" />
              <div className="absolute -bottom-16 -left-10 w-[200px] h-[200px] bg-[radial-gradient(circle,rgba(42,176,158,0.1)_0%,transparent_70%)] rounded-full pointer-events-none" />

              {/* Header */}
              <div className="flex items-center justify-between gap-4 mb-2 relative flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#f5a623] rounded-full flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
                      <path d="M12 1a3 3 0 00-3 3v1H8a7 7 0 00-7 7v1a2 2 0 002 2h1v2a5 5 0 005 5h6a5 5 0 005-5v-2h1a2 2 0 002-2v-1a7 7 0 00-7-7h-1V4a3 3 0 00-3-3zm-1 4V4a1 1 0 112 0v1h-2zM9 15a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm6 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[22px] font-extrabold text-white leading-tight m-0">Add Jenny AI — Your Business Assistant</h3>
                    <p className="text-sm text-white/60 mt-1">Jenny handles calls, chat, SMS, and keeps you compliant 24/7. Choose the tier that fits your needs.</p>
                  </div>
                </div>
                <Link href="/jenny" className="text-[#f5a623] text-sm font-semibold no-underline whitespace-nowrap hover:opacity-80 transition-opacity">
                  Learn More →
                </Link>
              </div>

              <div className="text-sm text-white/50 mt-3.5 mb-8 relative">
                From <strong className="text-[#f5a623] text-lg font-extrabold">$19/mo</strong>
                <span className="text-[12.5px] text-white/35 line-through italic ml-3">Jobber charges $349/mo for this</span>
              </div>

              {/* Customer-Facing Label */}
              <div className="text-center mb-3">
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider bg-white/12 text-white/70 px-3.5 py-1.5 rounded-full">
                  Customer-Facing
                </span>
              </div>

              {/* Customer-Facing Cards */}
              <div className="flex gap-5 mb-7 relative flex-col md:flex-row">
                {/* Jenny Lite */}
                <div className="flex-1 bg-[#232b47] border-[1.5px] border-white/10 rounded-[14px] p-7 transition-all hover:border-white/20 hover:shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative">
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="font-bold text-lg text-white">Jenny Lite</span>
                    <span className="font-extrabold text-base text-[#f5a623]">+$19<span className="text-xs font-medium text-white/40">/mo</span></span>
                  </div>
                  <ul className="list-none m-0 p-0">
                    {['Website chat widget', 'Lead capture & notifications', 'FAQ answering', 'English & Spanish'].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 py-1.5 text-[13.5px] text-white/65 leading-snug">
                        <svg width="14" height="14" viewBox="0 0 18 18" className="flex-shrink-0 mt-0.5"><path d="M3.5 9.5l3.5 3.5 7.5-7.5" stroke="#f5a623" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="inline-flex items-center gap-1.5 bg-[rgba(42,176,158,0.15)] text-[#2ab09e] text-xs font-semibold px-3 py-1.5 rounded-lg mt-3.5">
                    <svg width="14" height="14" viewBox="0 0 18 18"><path d="M3.5 9.5l3.5 3.5 7.5-7.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Included with Elite plan
                  </div>
                </div>

                {/* Jenny Pro */}
                <div className="flex-1 bg-[#232b47] border-[1.5px] border-[#f5a623] rounded-[14px] p-7 transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative">
                  <div className="absolute -top-[11px] left-1/2 -translate-x-1/2 bg-[#f5a623] text-white text-[10.5px] font-bold px-3.5 py-1 rounded-xl tracking-wider uppercase whitespace-nowrap">
                    Most Popular
                  </div>
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="font-bold text-lg text-white">Jenny Pro</span>
                    <span className="font-extrabold text-base text-[#f5a623]">+$49<span className="text-xs font-medium text-white/40">/mo</span></span>
                  </div>
                  <ul className="list-none m-0 p-0">
                    {[
                      { text: 'Everything in Lite, plus:', bold: false },
                      { text: 'AI phone answering 24/7', bold: true },
                      { text: 'SMS conversations', bold: false },
                      { text: 'Direct booking into calendar', bold: false },
                      { text: 'Bilingual voice support', bold: false },
                      { text: 'Emergency escalation', bold: false },
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 py-1.5 text-[13.5px] text-white/65 leading-snug">
                        <svg width="14" height="14" viewBox="0 0 18 18" className="flex-shrink-0 mt-0.5"><path d="M3.5 9.5l3.5 3.5 7.5-7.5" stroke="#f5a623" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {item.bold ? <strong className="text-white">{item.text}</strong> : item.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Owner-Facing Label */}
              <div className="text-center mb-3 mt-10 pt-5 border-t border-white/10">
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider bg-[rgba(245,166,35,0.18)] text-[#f5a623] px-3.5 py-1.5 rounded-full">
                  Owner-Facing
                </span>
              </div>

              {/* Owner-Facing Card */}
              <div className="flex gap-5 mb-0 relative flex-col md:flex-row">
                <div className="flex-1 max-w-[480px] bg-[#232b47] border-[1.5px] border-white/10 rounded-[14px] p-7 transition-all hover:border-white/20 hover:shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative">
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="font-bold text-lg text-white">Jenny Exec Admin</span>
                    <span className="font-extrabold text-base text-[#f5a623]">+$79<span className="text-xs font-medium text-white/40">/mo</span></span>
                  </div>
                  <ul className="list-none m-0 p-0">
                    {['Compliance advisor & alerts', 'HR guidance & document help', 'Business insights & reports', 'California labor law expertise', 'For owners only (not shown to workers)'].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 py-1.5 text-[13.5px] text-white/65 leading-snug">
                        <svg width="14" height="14" viewBox="0 0 18 18" className="flex-shrink-0 mt-0.5"><path d="M3.5 9.5l3.5 3.5 7.5-7.5" stroke="#f5a623" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-8 text-center relative">
                <Link
                  href="/pricing"
                  className="inline-block px-9 py-3.5 bg-[#f5a623] text-white text-[15px] font-bold rounded-[10px] no-underline hover:bg-[#e6991a] active:scale-[0.98] transition-all"
                >
                  Start 14-Day Free Trial →
                </Link>
                <span className="block text-xs text-white/40 mt-2.5">No credit card required</span>
              </div>
            </div>
          </div>

          {/* Full Pricing Page Link */}
          <div className="text-center mt-10">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 text-[#1a1a2e] font-semibold hover:text-[#f5a623] transition-colors no-underline"
            >
              See full pricing details & customize your plan →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-[#1a1a2e] text-center py-[100px] px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,166,35,0.1)_0%,transparent_60%)]" />
        <div className="max-w-[640px] mx-auto relative z-10">
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold text-white leading-tight tracking-tight mb-4">
            Ready to Put Your Business On Autopilot?
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
                <Link href="/jenny" className="text-[#f5a623] text-base hover:text-[#e6991a] transition-colors no-underline font-semibold">🎧 Jenny AI</Link>
                <Link href="#features" className="text-white/50 text-base hover:text-[#f5a623] transition-colors no-underline">Features</Link>
                <Link href="#pricing" className="text-white/50 text-base hover:text-[#f5a623] transition-colors no-underline">Pricing</Link>
                <Link href="#demos" className="text-white/50 text-base hover:text-[#f5a623] transition-colors no-underline">Demos</Link>
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
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-white/40 text-base">
            <div>© 2026 ToolTime Pro. All rights reserved.</div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-white/50">
                <span className="text-[#f5a623]">★</span> Women-Owned Business
              </span>
              <span className="text-white/30">|</span>
              <span>Built in California</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
