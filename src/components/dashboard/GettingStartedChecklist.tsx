'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, Globe, Users, Briefcase, X, ChevronDown, ChevronUp } from 'lucide-react'
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

export default function GettingStartedChecklist() {
  const { company, dbUser } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [hasCustomers, setHasCustomers] = useState(false)
  const [hasJobs, setHasJobs] = useState(false)
  const [hasWebsite, setHasWebsite] = useState(false)
  const [hasTeam, setHasTeam] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!dbUser?.company_id) return

    // Check if user previously dismissed the checklist
    const dismissedKey = `checklist_dismissed_${dbUser.company_id}`
    if (localStorage.getItem(dismissedKey) === 'true') {
      setDismissed(true)
      return
    }

    const checkProgress = async () => {
      const companyId = dbUser.company_id

      const [customersRes, jobsRes, teamRes, websiteRes] = await Promise.all([
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
      ])

      setHasCustomers((customersRes.count ?? 0) > 0)
      setHasJobs((jobsRes.count ?? 0) > 0)
      setHasTeam((teamRes.count ?? 0) > 1) // More than the owner
      setHasWebsite(!!company?.website || (websiteRes.count ?? 0) > 0)
      setLoaded(true)
    }

    checkProgress()
  }, [dbUser?.company_id, company?.website])

  if (dismissed || !loaded) return null

  const items: ChecklistItem[] = [
    {
      id: 'website',
      label: 'Build your website',
      description: 'Create a professional site to attract customers',
      href: '/dashboard/website-builder',
      completed: hasWebsite,
      icon: <Globe size={18} />,
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
  ]

  const completedCount = items.filter((i) => i.completed).length
  const allDone = completedCount === items.length
  const progress = Math.round((completedCount / items.length) * 100)

  // Auto-dismiss if everything is done
  if (allDone) return null

  const handleDismiss = () => {
    if (dbUser?.company_id) {
      localStorage.setItem(`checklist_dismissed_${dbUser.company_id}`, 'true')
    }
    setDismissed(true)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Getting Started</h2>
          <span className="text-sm text-gray-500">
            {completedCount} of {items.length} complete
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            title="Dismiss"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Progress bar */}
          <div className="px-6 pt-4 pb-2">
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Checklist items */}
          <div className="px-6 pb-4">
            <div className="divide-y divide-gray-50">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-4 py-3 group transition-colors ${
                    item.completed ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex-shrink-0">
                    {item.completed ? (
                      <CheckCircle2 size={22} className="text-green-500" />
                    ) : (
                      <Circle size={22} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
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
        </>
      )}
    </div>
  )
}
