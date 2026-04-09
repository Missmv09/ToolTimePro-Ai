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
  feature?: FeatureKey // only show if user has this feature
}

interface ChecklistSection {
  id: string
  title: string
  subtitle: string
  items: ChecklistItem[]
}

export default function GettingStartedChecklist() {
  const { company, dbUser } = useAuth()
  const { canAccess } = usePlanGating()
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
          .eq('user_id', dbUser.id),
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
        jenny: hasWebsiteOrSite, // Jenny Lite works once website is set up
        jennyPro: !!company?.booking_settings, // Jenny Pro configured with booking settings
        timeLogs: (timeLogsRes.count ?? 0) > 0,
        dispatch: (jobsRes.count ?? 0) > 0, // Dispatch is useful once you have jobs
        routeOptimizer: (jobsRes.count ?? 0) >= 2, // Route optimizer needs multiple jobs
        blog: false, // Check would need blog_posts table
        quickbooks: (qboRes.count ?? 0) > 0,
        compliance: !!(company?.booking_settings), // Placeholder — compliance settings
        customerPortal: (customersRes.count ?? 0) > 0 && (jobsRes.count ?? 0) > 0,
      })
      setLoaded(true)
    }

    checkProgress()
  }, [dbUser?.company_id, dbUser?.id, company?.website, company?.phone, company?.address, company?.stripe_connect_onboarded, company?.booking_settings])

  if (dismissed || !loaded) return null

  // Build sections with plan-aware items
  const sections: ChecklistSection[] = [
    {
      id: 'essentials',
      title: 'Essentials',
      subtitle: 'Set up the basics to start running your business',
      items: [
        {
          id: 'profile',
          label: 'Complete your company profile',
          description: 'Add phone, address, and business details',
          href: '/dashboard/settings',
          completed: checks.profile,
          icon: <Settings size={18} />,
        },
        {
          id: 'services',
          label: 'Add your services',
          description: 'Build your service catalog with pricing',
          href: '/dashboard/services',
          completed: checks.services,
          icon: <Wrench size={18} />,
          feature: 'booking',
        },
        {
          id: 'website',
          label: 'Build your website',
          description: 'Create a professional site to attract customers',
          href: '/dashboard/website-builder',
          completed: checks.website,
          icon: <Globe size={18} />,
          feature: 'website_builder',
        },
        {
          id: 'booking',
          label: 'Set up online booking',
          description: 'Let customers book appointments from your site',
          href: '/dashboard/booking',
          completed: checks.booking,
          icon: <CalendarCheck size={18} />,
          feature: 'booking',
        },
        {
          id: 'customer',
          label: 'Add your first customer',
          description: 'Start tracking your customer relationships',
          href: '/dashboard/customers',
          completed: checks.customers,
          icon: <Users size={18} />,
          feature: 'customers',
        },
        {
          id: 'job',
          label: 'Create your first job',
          description: 'Schedule and track your work',
          href: '/dashboard/jobs',
          completed: checks.jobs,
          icon: <Briefcase size={18} />,
        },
        {
          id: 'team',
          label: 'Invite your team',
          description: 'Add team members to collaborate',
          href: '/dashboard/team',
          completed: checks.team,
          icon: <Users size={18} />,
          feature: 'team_management',
        },
      ],
    },
    {
      id: 'revenue',
      title: 'Quotes, Invoicing & Payments',
      subtitle: 'Start billing customers and getting paid',
      items: [
        {
          id: 'quote',
          label: 'Send your first quote',
          description: 'Create professional estimates with e-signatures',
          href: '/dashboard/quotes',
          completed: checks.quotes,
          icon: <Quote size={18} />,
          feature: 'quoting',
        },
        {
          id: 'invoice',
          label: 'Send your first invoice',
          description: 'Bill customers and track payments',
          href: '/dashboard/invoices',
          completed: checks.invoices,
          icon: <Receipt size={18} />,
          feature: 'invoicing',
        },
        {
          id: 'payments',
          label: 'Connect Stripe payments',
          description: 'Accept credit card payments from customers',
          href: '/dashboard/settings',
          completed: checks.payments,
          icon: <CreditCard size={18} />,
          feature: 'invoicing',
        },
        {
          id: 'quickbooks',
          label: 'Connect QuickBooks',
          description: 'Sync invoices, payments, and customers',
          href: '/dashboard/settings',
          completed: checks.quickbooks,
          icon: <BookOpen size={18} />,
          feature: 'quickbooks_sync',
        },
      ],
    },
    {
      id: 'ai',
      title: 'Jenny AI & Website',
      subtitle: 'Set up your AI assistant and online presence',
      items: [
        {
          id: 'jenny',
          label: 'Set up Jenny Lite chatbot',
          description: 'Capture leads 24/7 on your website',
          href: '/dashboard/jenny-lite',
          completed: checks.jenny,
          icon: <MessageCircle size={18} />,
          feature: 'jenny_lite',
        },
        {
          id: 'jennypro',
          label: 'Configure Jenny Pro',
          description: 'AI phone answering and SMS for your business',
          href: '/dashboard/jenny-pro',
          completed: checks.jennyPro,
          icon: <Phone size={18} />,
          feature: 'jenny_pro',
        },
        {
          id: 'blog',
          label: 'Publish your first blog post',
          description: 'Attract customers with SEO content',
          href: '/dashboard/blog',
          completed: checks.blog,
          icon: <BookOpen size={18} />,
          feature: 'blog',
        },
        {
          id: 'portal',
          label: 'Activate Customer Portal',
          description: 'Give customers a self-service portal with job tracking',
          href: '/dashboard/settings',
          completed: checks.customerPortal,
          icon: <Contact size={18} />,
          feature: 'customer_portal',
        },
      ],
    },
    {
      id: 'operations',
      title: 'Team & Operations',
      subtitle: 'Manage crews, time, routes, and compliance',
      items: [
        {
          id: 'timelogs',
          label: 'Start tracking time',
          description: 'Have your team clock in with GPS verification',
          href: '/dashboard/time-logs',
          completed: checks.timeLogs,
          icon: <Clock size={18} />,
          feature: 'time_tracking',
        },
        {
          id: 'dispatch',
          label: 'Use the Dispatch Board',
          description: 'Assign crews and track workers in real-time',
          href: '/dashboard/dispatch',
          completed: checks.dispatch,
          icon: <Radio size={18} />,
          feature: 'dispatch_board',
        },
        {
          id: 'routes',
          label: 'Optimize your routes',
          description: 'Save gas and drive time with smart routing',
          href: '/dashboard/route-optimizer',
          completed: checks.routeOptimizer,
          icon: <Route size={18} />,
          feature: 'route_optimizer',
        },
        {
          id: 'compliance',
          label: 'Review compliance dashboard',
          description: 'Monitor labor law compliance and worker classification',
          href: '/dashboard/compliance',
          completed: checks.compliance,
          icon: <Shield size={18} />,
          feature: 'compliance',
        },
      ],
    },
  ]

  // Filter items based on user's plan/add-ons
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

  const handleDismiss = () => {
    if (dbUser?.company_id) {
      localStorage.setItem(`checklist_dismissed_${dbUser.company_id}`, 'true')
    }
    setDismissed(true)
  }

  const toggleSection = (sectionId: string) => {
    const updated = { ...collapsedSections, [sectionId]: !collapsedSections[sectionId] }
    setCollapsedSections(updated)
    if (dbUser?.company_id) {
      localStorage.setItem(`checklist_collapsed_${dbUser.company_id}`, JSON.stringify(updated))
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Getting Started</h2>
          <span className="text-sm text-gray-500">
            {totalCompleted} of {totalItems} complete
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
          title="Dismiss"
        >
          <X size={18} />
        </button>
      </div>

      {/* Overall progress bar */}
      <div className="px-6 pt-4 pb-2">
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Sections */}
      {filteredSections.map((section) => {
        const sectionCompleted = section.items.filter((i) => i.completed).length
        const sectionTotal = section.items.length
        const isCollapsed = collapsedSections[section.id] ?? false
        const sectionDone = sectionCompleted === sectionTotal

        return (
          <div key={section.id} className="border-t border-gray-100">
            {/* Section header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-gray-800">{section.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  sectionDone
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {sectionCompleted}/{sectionTotal}
                </span>
                {!sectionDone && (
                  <span className="text-xs text-gray-400 hidden sm:inline">{section.subtitle}</span>
                )}
              </div>
              {isCollapsed ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronUp size={16} className="text-gray-400" />}
            </button>

            {/* Section items */}
            {!isCollapsed && (
              <div className="px-6 pb-3">
                <div className="divide-y divide-gray-50">
                  {section.items.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`flex items-center gap-4 py-2.5 group transition-colors ${
                        item.completed ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {item.completed ? (
                          <CheckCircle2 size={20} className="text-green-500" />
                        ) : (
                          <Circle size={20} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${item.completed ? 'text-gray-500 line-through' : 'text-gray-900 group-hover:text-blue-600'}`}>
                          {item.label}
                        </p>
                        <p className="text-xs text-gray-500">{item.description}</p>
                      </div>
                      <div className="flex-shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors">
                        {item.icon}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
