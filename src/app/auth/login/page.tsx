'use client'

import { Suspense, useState, useCallback } from 'react'
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
  // 2FA state
  const [twoFaRequired, setTwoFaRequired] = useState(false)
  const [twoFaCode, setTwoFaCode] = useState('')
  const [twoFaPhoneLast4, setTwoFaPhoneLast4] = useState('')
  const [trustDevice, setTrustDevice] = useState(true)
  const [verifying2FA, setVerifying2FA] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { authError, signIn, isConfigured } = useAuth()

  // Check if user was kicked due to another login
  const sessionReplaced = searchParams.get('reason') === 'session_replaced'

  // Display either local error or auth context error
  const displayError = error || authError

  // Get device token from cookie
  const getDeviceToken = () => {
    const match = document.cookie.match(/ttp_2fa_device=([^;]+)/)
    return match ? match[1] : null
  }

  // Save device token as cookie (90 days)
  const saveDeviceToken = (token: string) => {
    const maxAge = 90 * 24 * 60 * 60 // 90 days in seconds
    document.cookie = `ttp_2fa_device=${token};max-age=${maxAge};path=/;samesite=strict`
  }

  // Navigate to the correct destination after login
  const navigateAfterLogin = useCallback(async () => {
    // Determine the correct destination after login:
    //   needs_password -> /auth/set-password
    //   onboarding not done -> /onboarding
    //   otherwise -> /dashboard
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
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
  }, [router, searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await signIn(email, password)

      if (error) {
        const message = error.message || 'An unexpected error occurred'
        const msgLower = message.toLowerCase()
        if (msgLower.includes('failed to fetch')) {
          setError('Unable to connect to the server. Please check your internet connection and try again.')
        } else if (msgLower.includes('temporarily unavailable') || msgLower.includes('rate limit') || msgLower.includes('too many requests')) {
          setError('too_many_attempts')
        } else if (msgLower.includes('invalid login credentials')) {
          setError('invalid_credentials')
        } else if (msgLower.includes('email not confirmed')) {
          setError('email_not_confirmed')
        } else {
          setError(message)
        }
        setLoading(false)
      } else {
        // Register this browser as the single active session
        await registerSession()

        // Check if 2FA is required
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            const deviceToken = getDeviceToken()
            const checkRes = await fetch('/api/auth/2fa/check-device', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ deviceToken }),
            })

            if (!checkRes.ok) {
              // 2FA check failed — fail closed, don't let user through
              await supabase.auth.signOut()
              setError('Unable to verify your identity. Please try again.')
              setLoading(false)
              return
            }

            const { required, trusted } = await checkRes.json()
            if (required && !trusted) {
              // Send 2FA code
              const sendRes = await fetch('/api/auth/2fa/send-code', {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` },
              })
              if (sendRes.ok) {
                const { phoneLast4 } = await sendRes.json()
                setTwoFaPhoneLast4(phoneLast4)
                setTwoFaRequired(true)
                setLoading(false)
                return
              } else {
                // SMS failed to send — sign out and show error
                await supabase.auth.signOut()
                setError('Unable to send verification code. SMS service may be unavailable. Please contact support or try again later.')
                setLoading(false)
                return
              }
            }
          }
        } catch {
          // 2FA check failed — fail closed, sign out
          await supabase.auth.signOut()
          setError('Unable to verify your identity. Please try again.')
          setLoading(false)
          return
        }

        await navigateAfterLogin()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      const msgLower = message.toLowerCase()
      if (msgLower.includes('failed to fetch')) {
        setError('Unable to connect to the server. Please check your internet connection and try again.')
      } else if (msgLower.includes('temporarily unavailable') || msgLower.includes('rate limit') || msgLower.includes('too many requests')) {
        setError('too_many_attempts')
      } else {
        setError(message)
      }
      setLoading(false)
    }
  }

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    setVerifying2FA(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Session expired. Please log in again.')
        setTwoFaRequired(false)
        setVerifying2FA(false)
        return
      }

      const res = await fetch('/api/auth/2fa/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          code: twoFaCode,
          trustDevice,
          deviceLabel: navigator.userAgent.substring(0, 100),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Verification failed')
        setVerifying2FA(false)
        return
      }

      // Save device token if trusting this device
      if (data.deviceToken) {
        saveDeviceToken(data.deviceToken)
      }

      await navigateAfterLogin()
    } catch {
      setError('Verification failed. Please try again.')
      setVerifying2FA(false)
    }
  }

  const handleResend2FA = async () => {
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const res = await fetch('/api/auth/2fa/send-code', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const { phoneLast4 } = await res.json()
        setTwoFaPhoneLast4(phoneLast4)
        setError(null)
      } else {
        setError('Failed to resend code. Please try again.')
      }
    } catch {
      setError('Failed to resend code.')
    }
  }

  const handleCancel2FA = async () => {
    await supabase.auth.signOut()
    setTwoFaRequired(false)
    setTwoFaCode('')
    setError(null)
  }

  // 2FA verification screen
  if (twoFaRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-center text-gray-900">ToolTime Pro</h1>
            <h2 className="mt-6 text-center text-2xl font-semibold text-gray-900">
              Two-Factor Verification
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter the 6-digit code sent to ***-{twoFaPhoneLast4 || '****'}
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleVerify2FA}>
            {displayError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {displayError}
              </div>
            )}

            <div>
              <label htmlFor="twofa-code" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <input
                id="twofa-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={twoFaCode}
                onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623]"
                placeholder="000000"
                autoFocus
              />
            </div>

            <div className="flex items-center">
              <input
                id="trust-device"
                type="checkbox"
                checked={trustDevice}
                onChange={(e) => setTrustDevice(e.target.checked)}
                className="h-4 w-4 text-[#f5a623] border-gray-300 rounded focus:ring-[#f5a623]"
              />
              <label htmlFor="trust-device" className="ml-2 block text-sm text-gray-700">
                Trust this device for 90 days
              </label>
            </div>

            <button
              type="submit"
              disabled={verifying2FA || twoFaCode.length !== 6}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-[#1a1a2e] font-bold bg-[#f5a623] hover:bg-[#e6991a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f5a623] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifying2FA ? 'Verifying...' : 'Verify'}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleResend2FA}
                className="text-[#f5a623] hover:text-[#e6991a]"
              >
                Resend code
              </button>
              <button
                type="button"
                onClick={handleCancel2FA}
                className="text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )
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
              {displayError === 'too_many_attempts' ? (
                <>
                  Too many sign-in attempts. Our server is temporarily unavailable — please wait a few minutes and try again.
                  If this persists, please contact support.
                </>
              ) : displayError === 'invalid_credentials' ? (
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623]"
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
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623]"
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
              <Link href="/auth/forgot-password" className="text-[#f5a623] hover:text-[#e6991a]">
                Forgot your password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-[#1a1a2e] font-bold bg-[#f5a623] hover:bg-[#e6991a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f5a623] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-[#f5a623] hover:text-[#e6991a] font-medium">
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
          <div className="w-12 h-12 border-4 border-[#f5a623] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
