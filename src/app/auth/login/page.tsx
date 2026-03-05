'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { registerSession } from '@/hooks/useSessionGuard'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { authError, signIn, isConfigured } = useAuth()

  // Check if user was kicked due to another login
  const sessionReplaced = searchParams.get('reason') === 'session_replaced'

  // Display either local error or auth context error
  const displayError = error || authError

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await signIn(email, password)

      if (error) {
        const message = error.message || 'An unexpected error occurred'
        if (message.toLowerCase().includes('failed to fetch')) {
          setError('Unable to connect to the server. Please check your internet connection and try again.')
        } else if (message.toLowerCase().includes('invalid login credentials')) {
          setError('invalid_credentials')
        } else if (message.toLowerCase().includes('email not confirmed')) {
          setError('email_not_confirmed')
        } else {
          setError(message)
        }
        setLoading(false)
      } else {
        // Register this browser as the single active session.
        // Any other browser logged in as this user will be signed out.
        await registerSession()

        // Determine the correct destination after login:
        //   needs_password → /auth/set-password
        //   onboarding not done → /onboarding
        //   otherwise → /dashboard
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            // Server-side password check (reads app_metadata directly)
            const pwRes = await fetch('/api/auth/check-needs-password', {
              headers: { Authorization: `Bearer ${session.access_token}` },
            })
            if (pwRes.ok) {
              const { needsPassword } = await pwRes.json()
              if (needsPassword) {
                router.push('/auth/set-password')
                return
              }
            }
          }
        } catch {
          // If the check fails, fall through to dashboard
        }

        // Check user role and onboarding status
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser()
          if (authUser?.id) {
            const { data: userRow } = await supabase
              .from('users')
              .select('company_id, role')
              .eq('id', authUser.id)
              .single()

            // Workers should be redirected to the worker app
            if (userRow?.role === 'worker') {
              router.push('/worker')
              return
            }

            if (userRow?.company_id) {
              const { data: comp } = await supabase
                .from('companies')
                .select('onboarding_completed')
                .eq('id', userRow.company_id)
                .single()
              if (comp && !comp.onboarding_completed) {
                router.push('/onboarding')
                return
              }
            }
          }
        } catch {
          // If the check fails, fall through to dashboard
        }

        const redirectTo = searchParams.get('redirect')
        router.push(redirectTo && redirectTo.startsWith('/') ? redirectTo : '/dashboard')
        router.refresh()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      if (message.toLowerCase().includes('failed to fetch')) {
        setError('Unable to connect to the server. Please check your internet connection and try again.')
      } else {
        setError(message)
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-center text-gray-900">ToolTime Pro</h1>
          <h2 className="mt-6 text-center text-2xl font-semibold text-gray-900">
            Sign in to your account
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {sessionReplaced && !displayError && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
              You were signed out because your account was signed in from another device.
              Only one active session is allowed at a time.
            </div>
          )}

          {!isConfigured && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
              Authentication is not configured. Please contact support if this issue persists.
            </div>
          )}

          {displayError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {displayError === 'invalid_credentials' ? (
                <>
                  Incorrect email or password. If you signed up recently but never set a password, please{' '}
                  <Link href="/auth/forgot-password" className="underline font-medium text-red-800 hover:text-red-900">
                    reset your password
                  </Link>{' '}
                  to get started.
                </>
              ) : displayError === 'email_not_confirmed' ? (
                <>
                  Your email hasn&apos;t been verified yet. Check your inbox for the verification email, or{' '}
                  <Link href="/auth/signup" className="underline font-medium text-red-800 hover:text-red-900">
                    sign up again
                  </Link>{' '}
                  to get a new one.
                </>
              ) : (
                displayError
              )}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link href="/auth/forgot-password" className="text-blue-600 hover:text-blue-500">
                Forgot your password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-blue-600 hover:text-blue-500 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
