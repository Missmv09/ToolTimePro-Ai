'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function AuthCallbackPage() {
  const router = useRouter()
  const { user, company, isLoading } = useAuth()
  const [status, setStatus] = useState<'confirming' | 'redirecting'>('confirming')

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      // No session yet — might still be processing the URL hash.
      // Give the Supabase client a moment, then fall back to login.
      const timeout = setTimeout(() => {
        router.replace('/auth/login')
      }, 5000)
      return () => clearTimeout(timeout)
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
