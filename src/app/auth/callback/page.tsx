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
  // Track whether the redirect URL told us this is a new signup flow
  const isSignupFlow = useRef(false)

  // Exchange the PKCE authorization code (or verify token hash) for a session.
  // The signup and resend-confirmation routes tag the redirect URL with
  // ?flow=signup so we know to send the user to set-password regardless of
  // what user_metadata contains (which can be unreliable across Supabase
  // redirect modes).
  useEffect(() => {
    if (codeHandled.current) return
    codeHandled.current = true

    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const tokenHash = url.searchParams.get('token_hash')
    const type = url.searchParams.get('type')
    const flow = url.searchParams.get('flow')

    if (flow === 'signup') {
      isSignupFlow.current = true
    }

    const processAuth = async () => {
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            console.error('Error exchanging code for session:', error)
          }
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'signup' | 'magiclink' | 'recovery' | 'email',
          })
          if (error) {
            console.error('Error verifying OTP:', error)
          }
        }

        // After session is established, fetch the latest user from Supabase's
        // server (not the JWT) to reliably check needs_password.
        const { data: { user: freshUser } } = await supabase.auth.getUser()

        if (isSignupFlow.current || freshUser?.user_metadata?.needs_password) {
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

    // If this is a signup flow or the user still needs a password, go there
    if (isSignupFlow.current || user.user_metadata?.needs_password) {
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
