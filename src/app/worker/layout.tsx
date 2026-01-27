'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface WorkerUser {
  id: string
  full_name: string
  email: string
  role: string
  company_id: string
  company?: { name: string } | { name: string }[] | null
}

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<WorkerUser | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        if (pathname !== '/worker/login') {
          router.push('/worker/login')
        }
        setLoading(false)
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('*, company:companies(name)')
        .eq('id', authUser.id)
        .single()

      if (userData) {
        setUser(userData)
      }
      setLoading(false)
    }

    checkAuth()
  }, [pathname, router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/worker/login')
  }

  // Helper to get company name (handles both object and array from Supabase)
  const getCompanyName = (company: WorkerUser['company']): string => {
    if (!company) return 'ToolTime Pro'
    if (Array.isArray(company)) return company[0]?.name || 'ToolTime Pro'
    return company.name || 'ToolTime Pro'
  }

  // Don't show layout on login page
  if (pathname === '/worker/login') {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const navItems = [
    { href: '/worker/timeclock', label: 'Clock', icon: '⏱️' },
    { href: '/worker/job', label: 'Jobs', icon: '📋' },
    { href: '/worker/time', label: 'Hours', icon: '📊' },
    { href: '/worker/profile', label: 'Profile', icon: '👤' },
  ]

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{getCompanyName(user.company)}</p>
            <p className="font-semibold text-gray-900">{user.full_name}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-3 px-4 ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
