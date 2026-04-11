'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Circle,
  Globe,
  Users,
  Briefcase,
  CalendarCheck,
  Wrench,
  Receipt,
  Quote,
  CreditCard,
  MessageCircle,
  Settings,
  Clock,
  Radio,
  Route,
  Phone,
  Shield,
  BookOpen,
  Contact,
  X,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usePlanGating } from '@/hooks/usePlanGating'
import { supabase } from '@/lib/supabase'
import type { FeatureKey } from '@/lib/plan-features'

interface ChecklistItem {
  id: string
  label: string
  description: string
  href: string
  completed: boolean
  icon: React.ReactNode
  feature?: FeatureKey
}

interface ChecklistSection {
  id: string
  title: string
  subtitle: string
  doneMessage: string
  items: ChecklistItem[]
}

export default function GettingStartedChecklist() {
  const { company, dbUser } = useAuth()
  const { canAccess, plan } = usePlanGating()
  const [dismissed, setDismissed] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const [loaded, setLoaded] = useState(false)

  // Completion state
  const [checks, setChecks] = useState({
    profile: false,
    services: false,
    website: false,
    booking: false,
    customers: false,
    jobs: false,
    team: false,
    quotes: false,
    invoices: false,
    payments: false,
    jenny: false,
    jennyPro: false,
    timeLogs: false,
    dispatch: false,
    routeOptimizer: false,
    blog: false,
    quickbooks: false,
    compliance: false,
    customerPortal: false,
  })

  useEffect(() => {
    if (!dbUser?.company_id) return

    const dismissedKey = `checklist_dismissed_${dbUser.company_id}`
    if (localStorage.getItem(dismissedKey) === 'true') {
      setDismissed(true)
      return
    }

    const collapsedKey = `checklist_collapsed_${dbUser.company_id}`
    const saved = localStorage.getItem(collapsedKey)
    if (saved) {
      try { setCollapsedSections(JSON.parse(saved)) } catch {}
    }

    const checkProgress = async () => {
      const companyId = dbUser.company_id

      const [
        customersRes,
        jobsRes,
        teamRes,
        websiteRes,
        servicesRes,
        quotesRes,
        invoicesRes,
        timeLogsRes,
        qboRes,
      ] = await Promise.all([
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId),
        supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId),
        supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId),
        supabase
          .from('website_sites')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'live'),
        supabase
          .from('services')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('is_active', true),
        supabase
          .from('quotes')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId),
        supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId),
        supabase
          .from('time_logs')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId),
        supabase
          .from('qbo_connections')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId),
      ])

      const hasWebsiteOrSite = !!company?.website || (websiteRes.count ?? 0) > 0
      const hasServicesSet = (servicesRes.count ?? 0) > 0

      setChecks({
        profile: !!(company?.phone && company?.address),
        services: hasServicesSet,
        website: hasWebsiteOrSite,
        booking: hasServicesSet && hasWebsiteOrSite,
        customers: (customersRes.count ?? 0) > 0,
        jobs: (jobsRes.count ?? 0) > 0,
        team: (teamRes.count ?? 0) > 1,
        quotes: (quotesRes.count ?? 0) > 0,
        invoices: (invoicesRes.count ?? 0) > 0,
        payments: !!company?.stripe_connect_onboarded,
        jenny: hasWebsiteOrSite,
        jennyPro: !!company?.booking_settings,
        timeLogs: (timeLogsRes.count ?? 0) > 0,
        dispatch: (jobsRes.count ?? 0) > 0,
        routeOptimizer: (jobsRes.count ?? 0) >= 2,
        blog: false,
        quickbooks: (qboRes.count ?? 0) > 0,
        compliance: !!(company?.booking_settings),
        customerPortal: (customersRes.count ?? 0) > 0 && (jobsRes.count ?? 0) > 0,
      })
      setLoaded(true)
    }

    checkProgress()
  }, [dbUser?.company_id, dbUser?.id, company?.website, company?.phone, company?.address, company?.stripe_connect_onboarded, company?.booking_settings])

  if (dismissed || !loaded) return null

  // Friendly plan name for the header
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1).replace('_', ' ')

  // Build plan-aware sections
  const sections: ChecklistSection[] = [
    {
      id: 'essentials',
      title: 'Set Up Your Business',
      subtitle: 'The basics — takes about 10 minutes',
      doneMessage: 'Your business is set up and ready to go!',
      items: [
        {
          id: 'profile',
          label: 'Add your business info',
          description: 'Your name, phone number, and address so customers can find you',
          href: '/dashboard/settings',
          completed: checks.profile,
          icon: <Settings size={18} />,
        },
        {
          id: 'services',
          label: 'List the services you offer',
          description: 'What do you do? Add your services and prices',
          href: '/dashboard/services',
          completed: checks.services,
          icon: <Wrench size={18} />,
          feature: 'booking',
        },
        {
          id: 'customer',
          label: 'Add a customer',
          description: 'Enter your first customer — you can always add more later',
          href: '/dashboard/customers',
          completed: checks.customers,
          icon: <Users size={18} />,
          feature: 'customers',
        },
        {
          id: 'job',
          label: 'Schedule your first job',
          description: 'Pick a customer, choose a service, set a date — done!',
          href: '/dashboard/jobs',
          completed: checks.jobs,
          icon: <Briefcase size={18} />,
        },
      ],
    },
    {
      id: 'online',
      title: 'Get Found Online',
      subtitle: 'Let customers find and book you on the web',
      doneMessage: 'You\'re online! Customers can now find and book you.',
      items: [
        {
          id: 'website',
          label: 'Create your website',
          description: 'We\'ll build you a professional site — no tech skills needed',
          href: '/dashboard/website-builder',
          completed: checks.website,
          icon: <Globe size={18} />,
          feature: 'website_builder',
        },
        {
          id: 'booking',
          label: 'Turn on online booking',
          description: 'Customers pick a time, you get notified — no phone tag',
          href: '/dashboard/booking',
          completed: checks.booking,
          icon: <CalendarCheck size={18} />,
          feature: 'booking',
        },
        {
          id: 'jenny',
          label: 'Meet Jenny — your AI assistant',
          description: 'She answers questions and captures leads on your site 24/7',
          href: '/dashboard/jenny-lite',
          completed: checks.jenny,
          icon: <MessageCircle size={18} />,
          feature: 'jenny_lite',
        },
        {
          id: 'jennypro',
          label: 'Set up Jenny to answer your phone',
          description: 'Never miss a call — Jenny answers in English and Spanish',
          href: '/dashboard/jenny-pro',
          completed: checks.jennyPro,
          icon: <Phone size={18} />,
          feature: 'jenny_pro',
        },
        {
          id: 'blog',
          label: 'Post a blog article',
          description: 'We\'ll help you write it — great for showing up on Google',
          href: '/dashboard/blog',
          completed: checks.blog,
          icon: <BookOpen size={18} />,
          feature: 'blog',
        },
      ],
    },
    {
      id: 'revenue',
      title: 'Start Getting Paid',
      subtitle: 'Send quotes, invoices, and collect payments',
      doneMessage: 'You\'re all set to quote, invoice, and get paid!',
      items: [
        {
          id: 'payments',
          label: 'Connect your payment account',
          description: 'Link Stripe so you can accept credit cards — takes 5 minutes',
          href: '/dashboard/settings?tab=integrations',
          completed: checks.payments,
          icon: <CreditCard size={18} />,
          feature: 'invoicing',
        },
        {
          id: 'quote',
          label: 'Send a quote to a customer',
          description: 'Create a professional estimate — they can approve it right from their phone',
          href: '/dashboard/quotes',
          completed: checks.quotes,
          icon: <Quote size={18} />,
          feature: 'quoting',
        },
        {
          id: 'invoice',
          label: 'Send your first invoice',
          description: 'Bill a customer and get paid online — no more chasing checks',
          href: '/dashboard/invoices',
          completed: checks.invoices,
          icon: <Receipt size={18} />,
          feature: 'invoicing',
        },
        {
          id: 'quickbooks',
          label: 'Connect QuickBooks',
          description: 'Your invoices and payments sync automatically — less bookkeeping',
          href: '/dashboard/settings?tab=integrations',
          completed: checks.quickbooks,
          icon: <BookOpen size={18} />,
          feature: 'quickbooks_sync',
        },
      ],
    },
    {
      id: 'team',
      title: 'Manage Your Team',
      subtitle: 'Add workers, track time, and stay organized',
      doneMessage: 'Your team is set up and ready to roll!',
      items: [
        {
          id: 'team',
          label: 'Add your workers',
          description: 'Invite your crew so they can see jobs on their phone',
          href: '/dashboard/team',
          completed: checks.team,
          icon: <Users size={18} />,
          feature: 'team_management',
        },
        {
          id: 'timelogs',
          label: 'Have someone clock in',
          description: 'Workers tap one button on their phone — GPS tracks the rest',
          href: '/dashboard/time-logs',
          completed: checks.timeLogs,
          icon: <Clock size={18} />,
          feature: 'time_tracking',
        },
        {
          id: 'dispatch',
          label: 'Try the Dispatch Board',
          description: 'See all your crews on a map and assign jobs with a click',
          href: '/dashboard/dispatch',
          completed: checks.dispatch,
          icon: <Radio size={18} />,
          feature: 'dispatch_board',
        },
        {
          id: 'routes',
          label: 'Optimize a route',
          description: 'We\'ll sort your jobs to save gas and drive time',
          href: '/dashboard/route-optimizer',
          completed: checks.routeOptimizer,
          icon: <Route size={18} />,
          feature: 'route_optimizer',
        },
        {
          id: 'compliance',
          label: 'Check your compliance status',
          description: 'Make sure your crew\'s breaks and hours are on track',
          href: '/dashboard/compliance',
          completed: checks.compliance,
          icon: <Shield size={18} />,
          feature: 'compliance',
        },
        {
          id: 'portal',
          label: 'See your Customer Portal',
          description: 'Customers can check job status and message you — fewer phone calls',
          href: '/dashboard/settings',
          completed: checks.customerPortal,
          icon: <Contact size={18} />,
          feature: 'customer_portal',
        },
      ],
    },
  ]

  // Filter items by plan, remove empty sections
  const filteredSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.feature || canAccess(item.feature)),
    }))
    .filter((section) => section.items.length > 0)

  const allItems = filteredSections.flatMap((s) => s.items)
  const totalCompleted = allItems.filter((i) => i.completed).length
  const totalItems = allItems.length
  const progress = Math.round((totalCompleted / totalItems) * 100)

  if (totalCompleted === totalItems) return null

  // Find the first incomplete item across all sections
  const nextStep = allItems.find((i) => !i.completed)

  // Determine which sections to show expanded by default:
  // - Show the section with the next incomplete step
  // - Auto-collapse completed sections
  const getDefaultCollapsed = (section: { id: string; items: ChecklistItem[] }) => {
    if (collapsedSections[section.id] !== undefined) return collapsedSections[section.id]
    const sectionDone = section.items.every((i) => i.completed)
    if (sectionDone) return true
    // Only auto-expand the first incomplete section
    const firstIncompleteSection = filteredSections.find((s) => s.items.some((i) => !i.completed))
    return firstIncompleteSection?.id !== section.id
  }

  const handleDismiss = () => {
    if (dbUser?.company_id) {
      localStorage.setItem(`checklist_dismissed_${dbUser.company_id}`, 'true')
    }
    setDismissed(true)
  }

  const toggleSection = (sectionId: string) => {
    const current = getDefaultCollapsed(filteredSections.find((s) => s.id === sectionId)!)
    const updated = { ...collapsedSections, [sectionId]: !current }
    setCollapsedSections(updated)
    if (dbUser?.company_id) {
      localStorage.setItem(`checklist_collapsed_${dbUser.company_id}`, JSON.stringify(updated))
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Welcome to your {planLabel} plan
            </h2>
            <button
              onClick={handleDismiss}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Let&apos;s get you set up — {totalItems - totalCompleted} {totalItems - totalCompleted === 1 ? 'step' : 'steps'} to go
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-2xl font-bold text-blue-600">{progress}%</p>
          <p className="text-xs text-gray-400">complete</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-6 pt-3 pb-1">
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Next step callout */}
      {nextStep && (
        <div className="mx-6 mt-3 mb-1">
          <Link
            href={nextStep.href}
            className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors group"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <ArrowRight size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Next step</p>
              <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">{nextStep.label}</p>
              <p className="text-xs text-gray-500">{nextStep.description}</p>
            </div>
            <ArrowRight size={18} className="text-blue-400 group-hover:text-blue-600 flex-shrink-0 transition-colors" />
          </Link>
        </div>
      )}

      {/* Sections */}
      <div className="pt-2">
        {filteredSections.map((section) => {
          const sectionCompleted = section.items.filter((i) => i.completed).length
          const sectionTotal = section.items.length
          const isCollapsed = getDefaultCollapsed(section)
          const sectionDone = sectionCompleted === sectionTotal

          return (
            <div key={section.id} className="border-t border-gray-100">
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {sectionDone && <Sparkles size={14} className="text-green-500" />}
                  <h3 className={`text-sm font-semibold ${sectionDone ? 'text-green-700' : 'text-gray-800'}`}>
                    {section.title}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    sectionDone
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {sectionCompleted}/{sectionTotal}
                  </span>
                  {!sectionDone && (
                    <span className="text-xs text-gray-400 hidden md:inline">{section.subtitle}</span>
                  )}
                  {sectionDone && (
                    <span className="text-xs text-green-600 hidden md:inline">{section.doneMessage}</span>
                  )}
                </div>
                {isCollapsed ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronUp size={16} className="text-gray-400" />}
              </button>

              {/* Section items */}
              {!isCollapsed && (
                <div className="px-6 pb-3">
                  <div className="divide-y divide-gray-50">
                    {section.items.map((item) => {
                      const isNext = nextStep?.id === item.id

                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          className={`flex items-center gap-4 py-2.5 group transition-colors rounded-lg -mx-2 px-2 ${
                            item.completed
                              ? 'opacity-50'
                              : isNext
                                ? 'bg-blue-50/50'
                                : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex-shrink-0">
                            {item.completed ? (
                              <CheckCircle2 size={20} className="text-green-500" />
                            ) : (
                              <Circle size={20} className={`${isNext ? 'text-blue-400' : 'text-gray-300'} group-hover:text-blue-400 transition-colors`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${
                              item.completed
                                ? 'text-gray-500 line-through'
                                : isNext
                                  ? 'text-blue-700'
                                  : 'text-gray-900 group-hover:text-blue-600'
                            }`}>
                              {item.label}
                            </p>
                            <p className="text-xs text-gray-500">{item.description}</p>
                          </div>
                          <div className={`flex-shrink-0 transition-colors ${
                            isNext ? 'text-blue-500' : 'text-gray-400 group-hover:text-blue-500'
                          }`}>
                            {item.icon}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Help footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          Need help setting up?{' '}
          <a href="mailto:support@tooltimepro.com" className="text-blue-600 hover:underline">Email us</a>
          {' '}or{' '}
          <a href="tel:1-888-980-8665" className="text-blue-600 hover:underline">call 1-888-980-8665</a>
          {' '}&mdash; we&apos;re happy to walk you through it.
        </p>
      </div>
    </div>
  )
}
