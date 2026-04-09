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
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface ChecklistItem {
  id: string
  label: string
  description: string
  href: string
  completed: boolean
  icon: React.ReactNode
}

interface ChecklistSection {
  id: string
  title: string
  subtitle: string
  items: ChecklistItem[]
}

export default function GettingStartedChecklist() {
  const { company, dbUser } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const [loaded, setLoaded] = useState(false)

  // Essentials
  const [hasProfile, setHasProfile] = useState(false)
  const [hasServices, setHasServices] = useState(false)
  const [hasWebsite, setHasWebsite] = useState(false)
  const [hasBooking, setHasBooking] = useState(false)
  const [hasCustomers, setHasCustomers] = useState(false)
  const [hasJobs, setHasJobs] = useState(false)
  const [hasTeam, setHasTeam] = useState(false)

  // Grow Your Business
  const [hasQuotes, setHasQuotes] = useState(false)
  const [hasInvoices, setHasInvoices] = useState(false)
  const [hasPayments, setHasPayments] = useState(false)
  const [hasJenny, setHasJenny] = useState(false)
  const [hasTimeLogs, setHasTimeLogs] = useState(false)

  useEffect(() => {
    if (!dbUser?.company_id) return

    // Check if user previously dismissed the checklist
    const dismissedKey = `checklist_dismissed_${dbUser.company_id}`
    if (localStorage.getItem(dismissedKey) === 'true') {
      setDismissed(true)
      return
    }

    // Restore collapsed state
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
      ])

      // Essentials
      setHasProfile(!!(company?.phone && company?.address))
      setHasServices((servicesRes.count ?? 0) > 0)
      setHasWebsite(!!company?.website || (websiteRes.count ?? 0) > 0)
      setHasBooking((servicesRes.count ?? 0) > 0 && (!!company?.website || (websiteRes.count ?? 0) > 0))
      setHasCustomers((customersRes.count ?? 0) > 0)
      setHasJobs((jobsRes.count ?? 0) > 0)
      setHasTeam((teamRes.count ?? 0) > 1)

      // Grow Your Business
      setHasQuotes((quotesRes.count ?? 0) > 0)
      setHasInvoices((invoicesRes.count ?? 0) > 0)
      setHasPayments(!!company?.stripe_connect_onboarded)
      setHasJenny(!!company?.booking_settings || (!!company?.website || (websiteRes.count ?? 0) > 0))
      setHasTimeLogs((timeLogsRes.count ?? 0) > 0)

      setLoaded(true)
    }

    checkProgress()
  }, [dbUser?.company_id, company?.website, company?.phone, company?.address, company?.stripe_connect_onboarded, company?.booking_settings])

  if (dismissed || !loaded) return null

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
          completed: hasProfile,
          icon: <Settings size={18} />,
        },
        {
          id: 'services',
          label: 'Add your services',
          description: 'Build your service catalog with pricing',
          href: '/dashboard/services',
          completed: hasServices,
          icon: <Wrench size={18} />,
        },
        {
          id: 'website',
          label: 'Build your website',
          description: 'Create a professional site to attract customers',
          href: '/dashboard/website-builder',
          completed: hasWebsite,
          icon: <Globe size={18} />,
        },
        {
          id: 'booking',
          label: 'Set up online booking',
          description: 'Let customers book appointments from your site',
          href: '/dashboard/booking',
          completed: hasBooking,
          icon: <CalendarCheck size={18} />,
        },
        {
          id: 'customer',
          label: 'Add your first customer',
          description: 'Start tracking your customer relationships',
          href: '/dashboard/customers',
          completed: hasCustomers,
          icon: <Users size={18} />,
        },
        {
          id: 'job',
          label: 'Create your first job',
          description: 'Schedule and track your work',
          href: '/dashboard/jobs',
          completed: hasJobs,
          icon: <Briefcase size={18} />,
        },
        {
          id: 'team',
          label: 'Invite your team',
          description: 'Add team members to collaborate',
          href: '/dashboard/team',
          completed: hasTeam,
          icon: <Users size={18} />,
        },
      ],
    },
    {
      id: 'grow',
      title: 'Grow Your Business',
      subtitle: 'Unlock quoting, invoicing, payments, and AI',
      items: [
        {
          id: 'quote',
          label: 'Send your first quote',
          description: 'Create professional estimates with e-signatures',
          href: '/dashboard/quotes',
          completed: hasQuotes,
          icon: <Quote size={18} />,
        },
        {
          id: 'invoice',
          label: 'Send your first invoice',
          description: 'Bill customers and track payments',
          href: '/dashboard/invoices',
          completed: hasInvoices,
          icon: <Receipt size={18} />,
        },
        {
          id: 'payments',
          label: 'Connect payments',
          description: 'Link Stripe to accept credit card payments',
          href: '/dashboard/settings',
          completed: hasPayments,
          icon: <CreditCard size={18} />,
        },
        {
          id: 'jenny',
          label: 'Set up Jenny AI',
          description: 'Configure your AI chatbot to capture leads 24/7',
          href: '/dashboard/jenny-lite',
          completed: hasJenny,
          icon: <MessageCircle size={18} />,
        },
        {
          id: 'timelogs',
          label: 'Start tracking time',
          description: 'Have your team clock in with GPS verification',
          href: '/dashboard/time-logs',
          completed: hasTimeLogs,
          icon: <Clock size={18} />,
        },
      ],
    },
  ]

  const allItems = sections.flatMap((s) => s.items)
  const totalCompleted = allItems.filter((i) => i.completed).length
  const totalItems = allItems.length
  const progress = Math.round((totalCompleted / totalItems) * 100)

  // Auto-dismiss if everything is done
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
      {sections.map((section) => {
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
                  <span className="text-xs text-gray-400">{section.subtitle}</span>
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
