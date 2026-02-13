'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const { user, company, isLoading } = useAuth()
  const [status, setStatus] = useState<'confirming' | 'redirecting'>('confirming')
  const codeHandled = useRef(false)

  // Exchange the PKCE authorization code (or verify token hash) for a session.
  // We await the result and check needs_password directly on the returned user
  // to avoid a race condition where the auth context loads company data before
  // the second useEffect can redirect to the set-password page.
  useEffect(() => {
    if (codeHandled.current) return
    codeHandled.current = true

    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const tokenHash = url.searchParams.get('token_hash')
    const type = url.searchParams.get('type')

    const processAuth = async () => {
      try {
        let authUser = null

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            console.error('Error exchanging code for session:', error)
            return
          }
          authUser = data?.user
        } else if (tokenHash && type) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'signup' | 'magiclink' | 'recovery' | 'email',
          })
          if (error) {
            console.error('Error verifying OTP:', error)
            return
          }
          authUser = data?.user
        }

        // Redirect immediately if this user still needs to set a password.
        // Checking the returned user directly is more reliable than waiting
        // for the auth context to propagate the updated user state.
        if (authUser?.user_metadata?.needs_password) {
          setStatus('redirecting')
          router.replace('/auth/set-password')
        }
      } catch (err) {
        console.error('Auth callback error:', err)
      }
    }

    processAuth()
  }, [router])

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      // No session yet — might still be processing the auth code.
      // Give the Supabase client a moment, then fall back to login.
      const timeout = setTimeout(() => {
        router.replace('/auth/login')
      }, 8000)
      return () => clearTimeout(timeout)
    }

    // If the user still needs to set a password, send them there first
    if (user.user_metadata?.needs_password) {
      setStatus('redirecting')
      router.replace('/auth/set-password')
      return
    }

    // User is authenticated — wait for company data before redirecting
    if (!company) return

    setStatus('redirecting')

    if (company.onboarding_completed) {
      router.replace('/dashboard')
    } else {
      router.replace('/onboarding')
    }
  }, [user, company, isLoading, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6" />
        {status === 'confirming' ? (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Confirming your email...</h2>
            <p className="text-gray-500">Just a moment while we verify your account.</p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Email confirmed!</h2>
            <p className="text-gray-500">Setting up your account...</p>
          </>
        )}
      </div>
    </div>
  )
}
