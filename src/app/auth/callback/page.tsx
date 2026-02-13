'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

async function checkNeedsPasswordOnServer(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/check-needs-password', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return false
    const { needsPassword } = await res.json()
    return needsPassword === true
  } catch {
    return false
  }
}

export default function AuthCallbackPage() {
  const router = useRouter()
  const { user, company, isLoading } = useAuth()
  const [status, setStatus] = useState<'confirming' | 'redirecting'>('confirming')
  const codeHandled = useRef(false)
  const serverChecked = useRef(false)

  // Step 1: Exchange the auth code / token for a session, then ask the
  // server (admin API → database) whether the user still needs to set a
  // password.  This is more reliable than reading user_metadata from the
  // client-side JWT.
  useEffect(() => {
    if (codeHandled.current) return
    codeHandled.current = true

    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const tokenHash = url.searchParams.get('token_hash')
    const type = url.searchParams.get('type')

    const processAuth = async () => {
      try {
        // Exchange the code / token for a Supabase session.
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) console.error('Error exchanging code for session:', error)
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'signup' | 'magiclink' | 'recovery' | 'email',
          })
          if (error) console.error('Error verifying OTP:', error)
        }

        // Poll for up to 5 s for the session to appear (handles hash-fragment
        // tokens that the Supabase JS client detects asynchronously).
        let session = null
        for (let i = 0; i < 20; i++) {
          const { data } = await supabase.auth.getSession()
          if (data.session) {
            session = data.session
            break
          }
          await new Promise((r) => setTimeout(r, 250))
        }

        if (session?.access_token) {
          const needsPassword = await checkNeedsPasswordOnServer(session.access_token)
          serverChecked.current = true
          if (needsPassword) {
            setStatus('redirecting')
            router.replace('/auth/set-password')
            return
          }
        }
      } catch (err) {
        console.error('Auth callback error:', err)
      }
    }

    processAuth()
  }, [router])

  // Step 2 (fallback): Once AuthContext has the user + company, redirect.
  // If the server check already redirected to set-password, this won't fire
  // because the component unmounts.  If it did NOT redirect (e.g. the server
  // call failed), fall back to the client-side user_metadata check.
  useEffect(() => {
    if (isLoading) return

    if (!user) {
      const timeout = setTimeout(() => {
        router.replace('/auth/login')
      }, 8000)
      return () => clearTimeout(timeout)
    }

    // Client-side fallback for the needs_password check
    if (user.user_metadata?.needs_password) {
      setStatus('redirecting')
      router.replace('/auth/set-password')
      return
    }

    // If the server-side check hasn't finished yet, wait.
    if (!serverChecked.current) return

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
