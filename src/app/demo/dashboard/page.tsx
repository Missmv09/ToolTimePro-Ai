'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

// --- Demo Data ---
const demoStats = {
  jobsToday: 8,
  revenue: 12480,
  monthRevenue: 47650,
  activeCrew: 5,
  newLeads: 12,
  pendingQuotes: 6,
  unpaidInvoices: 3,
  avgRating: 4.9,
  reviewsThisMonth: 23,
};

const demoJobs = [
  { id: '1', customer: 'Martinez Residence', service: 'Full lawn care + fertilizer', time: '9:00 AM', status: 'active', tech: 'Miguel R.', amount: 320 },
  { id: '2', customer: 'Oak Valley HOA', service: 'Landscaping — Phase 2', time: '11:30 AM', status: 'en_route', tech: 'Carlos M.', amount: 1850 },
  { id: '3', customer: 'Thompson Pool', service: 'Weekly pool service', time: '2:00 PM', status: 'scheduled', tech: 'David L.', amount: 175 },
  { id: '4', customer: 'Chen Property', service: 'Tree trimming + removal', time: '4:00 PM', status: 'scheduled', tech: 'Miguel R.', amount: 680 },
];

const demoLeads = [
  { id: '1', name: 'Robert Wilson', service: 'Lawn care estimate', time: '10 min ago', source: 'Jenny AI', sourceIcon: '🤖' },
  { id: '2', name: 'Amanda Foster', service: 'Landscaping quote', time: '1 hour ago', source: 'Website', sourceIcon: '🌐' },
  { id: '3', name: 'James Lee', service: 'Sprinkler repair', time: '3 hours ago', source: 'Phone', sourceIcon: '📞' },
  { id: '4', name: 'Lisa Park', service: 'Monthly maintenance', time: '5 hours ago', source: 'Referral', sourceIcon: '🤝' },
];

const demoCrew = [
  { id: '1', name: 'Miguel R.', status: 'working', job: 'Martinez Residence', clockIn: '7:45 AM', breakCompliant: true },
  { id: '2', name: 'Carlos M.', status: 'en_route', job: 'Oak Valley HOA', clockIn: '8:00 AM', breakCompliant: true },
  { id: '3', name: 'David L.', status: 'available', job: null, clockIn: '7:30 AM', breakCompliant: true },
  { id: '4', name: 'James K.', status: 'break', job: null, clockIn: '8:15 AM', breakCompliant: true },
  { id: '5', name: 'Tony V.', status: 'working', job: 'Sunset Villas', clockIn: '7:50 AM', breakCompliant: false },
];

const jennyActivity = [
  { id: '1', action: 'Answered call', detail: 'Robert Wilson — booked lawn care estimate for Thursday', time: '10 min ago', icon: '📞' },
  { id: '2', action: 'Sent quote', detail: 'Amanda Foster — $2,400 landscaping quote auto-generated', time: '1 hr ago', icon: '📝' },
  { id: '3', action: 'Review request', detail: 'Martinez Residence — 5-star review collected on Google', time: '2 hrs ago', icon: '⭐' },
  { id: '4', action: 'Lead captured', detail: 'Lisa Park found via chatbot — wants monthly maintenance', time: '5 hrs ago', icon: '💬' },
];

const recentQuotes = [
  { id: '1', customer: 'Amanda Foster', service: 'Landscaping', amount: 2400, status: 'sent', date: 'Today' },
  { id: '2', customer: 'Park Family', service: 'Patio install', amount: 4800, status: 'viewed', date: 'Yesterday' },
  { id: '3', customer: 'Davis Corp', service: 'Commercial grounds', amount: 8500, status: 'signed', date: '2 days ago' },
];

const weeklyRevenue = [
  { day: 'Mon', amount: 2100 },
  { day: 'Tue', amount: 3200 },
  { day: 'Wed', amount: 1800 },
  { day: 'Thu', amount: 2900 },
  { day: 'Fri', amount: 3400 },
  { day: 'Sat', amount: 1600 },
  { day: 'Sun', amount: 0 },
];

const complianceAlerts = [
  { id: '1', type: 'warning', message: 'Tony V. — meal break overdue (5hr 12min without break)', action: 'Send reminder' },
  { id: '2', type: 'info', message: 'All worker classifications up to date', action: null },
  { id: '3', type: 'success', message: '3 final pay calculations auto-completed this month', action: null },
];

// navItems labels will be translated inside the component

export default function DashboardDemoPage() {
  const t = useTranslations('demo.dashboard');
  const [activeNav, setActiveNav] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { key: 'dashboard', icon: '📊', label: t('navDashboard'), href: '/demo/dashboard' },
    { key: 'jobs', icon: '📋', label: t('navJobsSchedule'), href: '/demo/scheduling' },
    { key: 'dispatch', icon: '🗺️', label: t('navDispatchBoard'), href: '/demo/dispatch' },
    { key: 'quotes', icon: '📝', label: t('navQuotes'), href: '/demo/invoicing' },
    { key: 'invoices', icon: '💰', label: t('navInvoicing'), href: '/demo/invoicing' },
    { key: 'leads', icon: '👥', label: t('navLeadsCRM'), href: '#' },
    { key: 'crew', icon: '👷', label: t('navTeamWorkers'), href: '/demo/worker' },
    { key: 'routes', icon: '🚗', label: t('navRouteOptimizer'), href: '/demo/route-optimization' },
    { key: 'jenny', icon: '🤖', label: t('navJennyAI'), href: '/demo/phone-receptionist' },
    { key: 'reviews', icon: '⭐', label: t('navReviews'), href: '/demo/reviews' },
    { key: 'shield', icon: '🛡️', label: t('navShield'), href: '/demo/shield' },
    { key: 'booking', icon: '📅', label: t('navOnlineBooking'), href: '/demo/booking' },
    { key: 'quickbooks', icon: '📚', label: t('navQuickBooks'), href: '/demo/quickbooks' },
    { key: 'website', icon: '🌐', label: t('navMyWebsite'), href: '/demo/website' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'working':
        return 'bg-green-100 text-green-700';
      case 'en_route':
        return 'bg-blue-100 text-blue-700';
      case 'scheduled':
      case 'available':
        return 'bg-gray-100 text-gray-700';
      case 'break':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getQuoteStatusColor = (status: string) => {
    switch (status) {
      case 'signed': return 'bg-green-100 text-green-700';
      case 'viewed': return 'bg-blue-100 text-blue-700';
      case 'sent': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const maxRevenue = Math.max(...weeklyRevenue.map(d => d.amount));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Banner */}
      <div className="bg-[#f5a623] text-[#1a1a2e] py-2 px-4 text-center relative z-50">
        <p className="text-sm font-medium">
          <span className="bg-[#1a1a2e] text-white px-2 py-0.5 rounded font-bold mr-2">DEMO</span>
          {t('bannerText')}{' '}
          <Link href="/auth/signup" className="underline font-bold">
            {t('startFreeTrial')}
          </Link>
        </p>
      </div>

      <div className="flex">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-40px)] fixed lg:sticky top-[40px] z-40 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          {/* Logo */}
          <div className="h-16 flex items-center gap-2 px-6 border-b border-gray-200">
            <div className="w-8 h-8 bg-[#f5a623] rounded-lg flex items-center justify-center">
              <span className="text-lg">🛠</span>
            </div>
            <span className="font-bold text-xl text-[#1a1a2e]">ToolTime Pro</span>
          </div>

          {/* Company */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-xs text-gray-500">{t('company')}</p>
            <p className="text-sm font-medium text-[#1a1a2e]">Green Scene Landscaping</p>
            <p className="text-xs text-gray-400">{t('elitePlan')}</p>
          </div>

          {/* Navigation */}
          <nav className="p-3 space-y-0.5 overflow-y-auto max-h-[calc(100vh-250px)]">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => { setActiveNav(item.key); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors no-underline text-sm ${
                  activeNav === item.key
                    ? 'bg-[#fef3d6] text-[#1a1a2e] font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* User */}
          <div className="absolute bottom-0 left-0 w-64 p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-[#1a1a2e]">JD</span>
              </div>
              <div>
                <p className="text-sm font-medium text-[#1a1a2e]">John Davis</p>
                <p className="text-xs text-gray-500">{t('owner')}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 min-w-0">
          {/* Mobile Header */}
          <div className="lg:hidden mb-6 flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#f5a623] rounded-lg flex items-center justify-center">
                <span className="text-sm">🛠</span>
              </div>
              <span className="font-bold text-lg text-[#1a1a2e]">ToolTime Pro</span>
            </div>
            <Link href="/" className="text-sm text-blue-600 font-medium no-underline">{t('exit')}</Link>
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#1a1a2e]">{t('goodMorning')}</h1>
              <p className="text-gray-500">{t('dateSubtitle')}</p>
            </div>
            <div className="flex gap-3 items-center">
              <LanguageSwitcher />
              <Link href="/demo/scheduling" className="px-4 py-2 bg-white border border-gray-200 rounded-lg font-medium text-[#1a1a2e] hover:bg-gray-50 no-underline text-sm">
                📅 {t('calendar')}
              </Link>
              <Link href="/demo/dispatch" className="px-4 py-2 bg-white border border-gray-200 rounded-lg font-medium text-[#1a1a2e] hover:bg-gray-50 no-underline text-sm">
                🗺️ {t('dispatch')}
              </Link>
              <button className="px-4 py-2 bg-[#f5a623] text-[#1a1a2e] rounded-lg font-bold hover:bg-[#e6991a] text-sm">
                {t('newJob')}
              </button>
            </div>
          </div>

          {/* Stats Row 1 — Key Business Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">{t('jobsToday')}</span>
                <span className="text-lg">📋</span>
              </div>
              <div className="text-3xl font-bold text-[#1a1a2e]">{demoStats.jobsToday}</div>
              <p className="text-xs text-green-600 mt-1">{t('jobsTodayDetail')}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">{t('todaysRevenue')}</span>
                <span className="text-lg">💰</span>
              </div>
              <div className="text-3xl font-bold text-green-600">${demoStats.revenue.toLocaleString()}</div>
              <p className="text-xs text-gray-400 mt-1">${demoStats.monthRevenue.toLocaleString()} {t('thisMonth')}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">{t('pendingQuotes')}</span>
                <span className="text-lg">📝</span>
              </div>
              <div className="text-3xl font-bold text-[#f5a623]">{demoStats.pendingQuotes}</div>
              <p className="text-xs text-blue-600 mt-1">{t('pipelineValue')}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">{t('unpaidInvoices')}</span>
                <span className="text-lg">📨</span>
              </div>
              <div className="text-3xl font-bold text-red-500">{demoStats.unpaidInvoices}</div>
              <p className="text-xs text-gray-400 mt-1">$4,200 outstanding</p>
            </div>
          </div>

          {/* Stats Row 2 — AI & Reviews & Crew */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#2d2d4a] rounded-xl p-5 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">Jenny AI Today</span>
                <span className="text-lg">🤖</span>
              </div>
              <div className="text-3xl font-bold">7</div>
              <p className="text-xs text-white/60 mt-1">3 calls, 2 quotes, 2 reviews</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Reviews</span>
                <span className="text-lg">⭐</span>
              </div>
              <div className="text-3xl font-bold text-[#1a1a2e]">{demoStats.avgRating}</div>
              <p className="text-xs text-green-600 mt-1">{demoStats.reviewsThisMonth} new this month</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Active Crew</span>
                <span className="text-lg">👷</span>
              </div>
              <div className="text-3xl font-bold text-[#1a1a2e]">{demoStats.activeCrew}</div>
              <p className="text-xs text-gray-400 mt-1">All CA-compliant</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">New Leads</span>
                <span className="text-lg">👥</span>
              </div>
              <div className="text-3xl font-bold text-[#f5a623]">{demoStats.newLeads}</div>
              <p className="text-xs text-gray-400 mt-1">4 from Jenny, 5 from website</p>
            </div>
          </div>

          {/* Row: Jenny AI + Revenue Chart */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Jenny AI Activity */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-[#1a1a2e] to-[#2d2d4a]">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🤖</span>
                  <h2 className="font-bold text-white">Jenny AI — Live Activity</h2>
                </div>
                <Link href="/demo/phone-receptionist" className="text-xs text-[#f5a623] font-medium no-underline hover:underline">
                  Configure →
                </Link>
              </div>
              <div className="divide-y divide-gray-100">
                {jennyActivity.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-[#1a1a2e]">{item.action}</span>
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{item.time}</span>
                        </div>
                        <p className="text-sm text-gray-600">{item.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
                <span className="text-xs text-gray-500">Jenny answered <strong>156 calls</strong> and collected <strong>23 reviews</strong> this month</span>
              </div>
            </div>

            {/* Weekly Revenue Chart */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-bold text-[#1a1a2e]">Weekly Revenue</h2>
                <span className="text-sm text-gray-400">This week</span>
              </div>
              <div className="p-6">
                <div className="flex items-end justify-between gap-3 h-40 mb-4">
                  {weeklyRevenue.map((day) => (
                    <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-xs text-gray-500 font-medium">${(day.amount / 1000).toFixed(1)}k</span>
                      <div
                        className="w-full rounded-t-lg transition-all bg-gradient-to-t from-[#f5a623] to-[#fcd582]"
                        style={{ height: `${maxRevenue > 0 ? (day.amount / maxRevenue) * 100 : 0}%`, minHeight: day.amount > 0 ? '8px' : '2px' }}
                      />
                      <span className="text-xs text-gray-500">{day.day}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Week total</p>
                    <p className="text-2xl font-bold text-[#1a1a2e]">$15,000</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">vs. last week</p>
                    <p className="text-sm font-semibold text-green-600">+12.4%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row: Today's Jobs + Quotes Pipeline */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Today's Jobs */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-bold text-[#1a1a2e]">Today&apos;s Jobs</h2>
                <Link href="/demo/scheduling" className="text-sm text-blue-600 font-medium no-underline hover:underline">View Schedule →</Link>
              </div>
              <div className="divide-y divide-gray-100">
                {demoJobs.map((job) => (
                  <div key={job.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="font-semibold text-[#1a1a2e] text-sm">{job.customer}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${getStatusColor(job.status)}`}>
                        {job.status === 'en_route' ? 'en route' : job.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1.5">{job.service}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>⏰ {job.time} &middot; 👷 {job.tech}</span>
                      <span className="font-semibold text-[#1a1a2e]">${job.amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quotes Pipeline */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-bold text-[#1a1a2e]">Quotes Pipeline</h2>
                <Link href="/demo/invoicing" className="text-sm text-blue-600 font-medium no-underline hover:underline">View All →</Link>
              </div>
              <div className="divide-y divide-gray-100">
                {recentQuotes.map((quote) => (
                  <div key={quote.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="font-semibold text-[#1a1a2e] text-sm">{quote.customer}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${getQuoteStatusColor(quote.status)}`}>
                        {quote.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{quote.service}</span>
                      <span className="font-bold text-[#1a1a2e]">${quote.amount.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{quote.date}</p>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
                <span className="text-xs text-gray-500">Close rate: <strong className="text-green-600">68%</strong> — avg. time to sign: <strong>1.2 days</strong></span>
              </div>
            </div>
          </div>

          {/* Row: New Leads + Compliance */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* New Leads */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-bold text-[#1a1a2e]">New Leads</h2>
                <span className="text-sm text-blue-600 font-medium cursor-pointer">View CRM →</span>
              </div>
              <div className="divide-y divide-gray-100">
                {demoLeads.map((lead) => (
                  <div key={lead.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="font-semibold text-[#1a1a2e] text-sm">{lead.name}</h3>
                      <span className="text-xs text-gray-400">{lead.time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{lead.service}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded flex items-center gap-1">
                        {lead.sourceIcon} {lead.source}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ToolTime Shield — Compliance */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🛡️</span>
                  <h2 className="font-bold text-[#1a1a2e]">ToolTime Shield</h2>
                </div>
                <Link href="/demo/shield" className="text-sm text-blue-600 font-medium no-underline hover:underline">View All →</Link>
              </div>
              <div className="divide-y divide-gray-100">
                {complianceAlerts.map((alert) => (
                  <div key={alert.id} className="p-4 hover:bg-gray-50 flex items-start gap-3">
                    <span className="mt-0.5 text-sm">
                      {alert.type === 'warning' ? '⚠️' : alert.type === 'success' ? '✅' : 'ℹ️'}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">{alert.message}</p>
                      {alert.action && (
                        <button className="text-xs text-blue-600 font-medium mt-1 hover:underline">{alert.action}</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-green-50 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs">✅</span>
                  <span className="text-xs text-green-700 font-medium">CA labor law compliance: 96% — AB5, final pay, break tracking active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Crew Status Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-bold text-[#1a1a2e]">Crew Status</h2>
              <div className="flex gap-3">
                <Link href="/demo/dispatch" className="text-sm text-blue-600 font-medium no-underline hover:underline">Dispatch Board →</Link>
                <Link href="/demo/route-optimization" className="text-sm text-blue-600 font-medium no-underline hover:underline">Routes →</Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs">Current Job</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs">Clock In</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs">Break Status</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {demoCrew.map((worker) => (
                    <tr key={worker.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm">
                            👷
                          </div>
                          <span className="font-medium text-[#1a1a2e] text-sm">{worker.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${getStatusColor(worker.status)}`}>
                          {worker.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">{worker.job || '—'}</td>
                      <td className="py-3 px-4 text-gray-600 text-sm">{worker.clockIn}</td>
                      <td className="py-3 px-4">
                        {worker.breakCompliant ? (
                          <span className="text-xs text-green-600 font-medium">✓ Compliant</span>
                        ) : (
                          <span className="text-xs text-red-600 font-medium">⚠ Break overdue</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button className="text-blue-600 text-xs font-medium mr-3">Message</button>
                        <button className="text-blue-600 text-xs font-medium">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Feature Quick Links Grid */}
          <div className="mb-6">
            <h2 className="font-bold text-[#1a1a2e] mb-4">Explore All Features</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { icon: '🤖', label: 'AI Phone Receptionist', desc: 'Jenny answers 24/7', href: '/demo/phone-receptionist' },
                { icon: '📝', label: 'Smart Quoting', desc: 'Send & sign digitally', href: '/demo/invoicing' },
                { icon: '💰', label: 'Invoicing & Payments', desc: 'Get paid faster', href: '/demo/invoicing' },
                { icon: '🗺️', label: 'Dispatch Board', desc: 'Real-time crew tracking', href: '/demo/dispatch' },
                { icon: '🚗', label: 'Route Optimization', desc: 'Save time on the road', href: '/demo/route-optimization' },
                { icon: '⭐', label: 'Review Machine', desc: 'Automate 5-star reviews', href: '/demo/reviews' },
                { icon: '🛡️', label: 'ToolTime Shield', desc: 'CA compliance built-in', href: '/demo/shield' },
                { icon: '📅', label: 'Online Booking', desc: 'Customers book directly', href: '/demo/booking' },
                { icon: '👷', label: 'Worker Mobile App', desc: 'GPS clock-in, photos', href: '/demo/worker' },
                { icon: '📚', label: 'QuickBooks Sync', desc: 'Two-way auto-sync', href: '/demo/quickbooks' },
                { icon: '🌐', label: 'Business Website', desc: 'Free with Pro+ plan', href: '/demo/website' },
                { icon: '💬', label: 'Jenny Lite Chatbot', desc: 'Capture leads on site', href: '/demo/chatbot' },
              ].map((feature) => (
                <Link
                  key={feature.label}
                  href={feature.href}
                  className="bg-white rounded-xl p-4 border border-gray-200 hover:border-[#f5a623] hover:shadow-md transition-all group no-underline"
                >
                  <span className="text-2xl block mb-2">{feature.icon}</span>
                  <h3 className="font-semibold text-sm text-[#1a1a2e] group-hover:text-[#f5a623] transition-colors">{feature.label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{feature.desc}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-[#1a1a2e] to-[#2d2d4a] rounded-xl p-6 text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold mb-1">Ready to run your business smarter?</h3>
                <p className="text-white/70 text-sm">
                  Smart quoting, AI phone receptionist, automated reviews, crew management, invoicing, compliance — all starting at $49/mo.
                </p>
              </div>
              <Link
                href="/auth/signup"
                className="px-6 py-3 bg-[#f5a623] text-[#1a1a2e] rounded-xl font-bold hover:bg-[#e6991a] transition-colors no-underline text-center whitespace-nowrap"
              >
                Start Free Trial →
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
