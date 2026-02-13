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
  // This must happen before the auth state listeners can detect a user.
  useEffect(() => {
    if (codeHandled.current) return
    codeHandled.current = true

    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const tokenHash = url.searchParams.get('token_hash')
    const type = url.searchParams.get('type')

    if (code) {
      supabase.auth.exchangeCodeForSession(code).catch((err) => {
        console.error('Error exchanging code for session:', err)
      })
    } else if (tokenHash && type) {
      supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as 'signup' | 'magiclink' | 'recovery' | 'email',
      }).catch((err) => {
        console.error('Error verifying OTP:', err)
      })
    }
  }, [])

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
