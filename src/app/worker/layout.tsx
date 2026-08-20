'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Head from 'next/head'
import SessionTimeoutWarning from '@/components/auth/SessionTimeoutWarning'
import { useSessionTimeout } from '@/hooks/useSessionTimeout'
import { WorkerAuthProvider } from '@/contexts/WorkerAuthContext'
import { OfflineIndicator, OfflineStatusDot } from '@/components/worker/OfflineIndicator'
import { useTranslations } from 'next-intl'
import LanguageSwitcher from '@/components/LanguageSwitcher'

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
  const [authError, setAuthError] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('worker.layout')

  // A failure here used to fall through to `if (!user) return null` below, which
  // renders a BLANK PAGE: no children, no error, no way back. The worker taps
  // the app and gets white. Every failure now lands on an error with a retry,
  // and only the redirect-to-login path leaves `user` unset.
  const checkAuth = useCallback(async () => {
    setLoading(true)
    setAuthError(null)
    try {
      const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser()

      // Check the user BEFORE the error. Having no session is not a failure —
      // it is the logged-out case, and it has to redirect. Supabase reports it
      // as an error ("Auth session missing!"), so throwing on `authErr` first
      // parks a signed-out worker on an error card instead of the login page.
      if (!authUser) {
        if (pathname !== '/worker/login' && pathname !== '/worker/login/') {
          router.push('/worker/login')
        }
        return
      }

      if (authErr) throw authErr

      // Note the join: `companies` has its own RLS, so this can fail for a
      // worker who can read their own users row perfectly well.
      const { data: userData, error: userErr } = await supabase
        .from('users')
        .select('*, company:companies(name)')
        .eq('id', authUser.id)
        .single()

      if (userErr) throw userErr
      if (!userData) throw new Error('No worker profile found for this account')

      setUser(userData)
    } catch (err) {
      console.error('Worker auth check failed:', err)
      // Supabase rejects with a plain `{ code, message }`, not an Error.
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : String(err)
      setAuthError(message)
    } finally {
      setLoading(false)
    }
  }, [pathname, router])

  useEffect(() => {
    void checkAuth()

    // Register service worker for offline support
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        console.log('[SW] Registered:', registration.scope)
      }).catch((err) => {
        console.warn('[SW] Registration failed:', err)
      })
    }
  }, [checkAuth])

  const handleSignOut = async () => {
    localStorage.removeItem('tooltime_worker_session')
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Sign out error:', error.message)
    }
    router.push('/worker/login')
  }

  const { showWarning, secondsRemaining, resetTimeout } = useSessionTimeout({
    onTimeout: handleSignOut,
    enabled: !!user && pathname !== '/worker/login' && pathname !== '/worker/login/',
  })

  // Helper to get company name (handles both object and array from Supabase)
  const getCompanyName = (company: WorkerUser['company']): string => {
    if (!company) return 'Task Iguana'
    if (Array.isArray(company)) return company[0]?.name || 'Task Iguana'
    return company.name || 'Task Iguana'
  }

  // Don't show layout on login page. next.config has trailingSlash:true, so the
  // path arrives as '/worker/login/' — match both, otherwise this falls through
  // to the auth gate below and renders null (a blank page) on the login route.
  if (pathname === '/worker/login' || pathname === '/worker/login/') {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-50 border-2 border-red-300 rounded-2xl p-6 text-center">
          <p className="text-lg font-semibold text-red-800 mb-2">{t('loadFailed')}</p>
          <p className="text-sm text-red-700 mb-4 break-words">{authError}</p>
          <button
            onClick={() => void checkAuth()}
            className="w-full py-4 bg-red-600 text-white text-lg font-bold rounded-xl hover:bg-red-700 transition-colors"
          >
            {t('tryAgain')}
          </button>
        </div>
      </div>
    )
  }

  // Only reachable while the redirect to /worker/login is in flight.
  if (!user) {
    return null
  }

  const navItems = [
    { href: '/worker/timeclock', label: t('clock'), icon: '⏱️' },
    { href: '/worker/job', label: t('jobs'), icon: '📋' },
    { href: '/worker/route', label: t('route'), icon: '🗺️' },
    { href: '/worker/time', label: t('hours'), icon: '📊' },
    { href: '/worker/profile', label: t('profile'), icon: '👤' },
  ]

  return (
    <WorkerAuthProvider>
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Offline Status Banner */}
      <OfflineIndicator />

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{getCompanyName(user.company)}</p>
            <p className="font-semibold text-gray-900">{user.full_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <OfflineStatusDot />
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {t('signOut')}
            </button>
          </div>
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

      {showWarning && (
        <SessionTimeoutWarning
          secondsRemaining={secondsRemaining}
          onStayLoggedIn={resetTimeout}
          onLogOut={handleSignOut}
        />
      )}
    </div>
    </WorkerAuthProvider>
  )
}
