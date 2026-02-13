'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, company, isLoading, refreshUserData } = useAuth()
  const [status, setStatus] = useState<'confirming' | 'exchanging' | 'redirecting'>('confirming')
  const [hasRedirected, setHasRedirected] = useState(false)

  // Step 1: Handle PKCE code exchange if code is in URL params
  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      setStatus('exchanging')
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          console.error('Code exchange failed:', error.message)
          router.replace('/auth/login')
        }
        // After exchange, onAuthStateChange will fire and update user state
      })
    }
  }, [searchParams, router])

  // Step 2: Once user is authenticated, redirect based on onboarding status
  useEffect(() => {
    if (isLoading || hasRedirected) return

    if (!user) {
      // No user yet — wait for code exchange or hash processing.
      // After 8 seconds, fall back to login.
      const timeout = setTimeout(() => {
        if (!hasRedirected) {
          setHasRedirected(true)
          router.replace('/auth/login')
        }
      }, 8000)
      return () => clearTimeout(timeout)
    }

    // User is authenticated — now wait for company data
    setStatus('redirecting')

    // If company data loaded, redirect based on onboarding status
    if (company !== undefined && company !== null) {
      setHasRedirected(true)
      if (company.onboarding_completed) {
        router.replace('/dashboard')
      } else {
        router.replace('/onboarding')
      }
      return
    }

    // Company hasn't loaded yet — refresh and wait
    refreshUserData()

    const timeout = setTimeout(() => {
      if (!hasRedirected) {
        setHasRedirected(true)
        // Default to onboarding for new users
        router.replace('/onboarding')
      }
    }, 3000)
    return () => clearTimeout(timeout)
  }, [user, company, isLoading, hasRedirected, router, refreshUserData])

  return (
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6" />
      {status === 'confirming' || status === 'exchanging' ? (
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
  )
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Suspense fallback={
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Confirming your email...</h2>
          <p className="text-gray-500">Just a moment while we verify your account.</p>
        </div>
      }>
        <AuthCallbackContent />
      </Suspense>
    </div>
  )
}
