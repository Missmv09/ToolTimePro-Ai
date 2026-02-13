'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'confirming' | 'redirecting'>('confirming')
  const handled = useRef(false)

  // Single sequential flow — no race conditions, no competing useEffects,
  // no reliance on client-side JWT metadata (which Supabase may clear).
  // Every decision uses server-side checks only.
  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const handleCallback = async () => {
      try {
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        const tokenHash = url.searchParams.get('token_hash')
        const type = url.searchParams.get('type')

        // Step 1: Exchange the auth code / token for a Supabase session.
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

        // Step 2: Wait for the session to appear.
        let session = null
        for (let i = 0; i < 20; i++) {
          const { data } = await supabase.auth.getSession()
          if (data.session) {
            session = data.session
            break
          }
          await new Promise((r) => setTimeout(r, 250))
        }

        if (!session?.access_token) {
          router.replace('/auth/login')
          return
        }

        // Step 3: Server-side password check — reads app_metadata directly
        // from the database via admin API.  This is the ONLY reliable check;
        // the client-side JWT may not contain our needs_password flag.
        setStatus('redirecting')
        try {
          const res = await fetch('/api/auth/check-needs-password', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
          if (res.ok) {
            const { needsPassword } = await res.json()
            if (needsPassword) {
              router.replace('/auth/set-password')
              return
            }
          }
        } catch {
          // If the check fails, fall through to onboarding check below.
        }

        // Step 4: Check onboarding status directly from the database.
        const { data: userData } = await supabase.auth.getUser()
        const userId = userData?.user?.id
        if (userId) {
          const { data: userRow } = await supabase
            .from('users')
            .select('company_id')
            .eq('id', userId)
            .single()
          if (userRow?.company_id) {
            const { data: comp } = await supabase
              .from('companies')
              .select('onboarding_completed')
              .eq('id', userRow.company_id)
              .single()
            if (comp?.onboarding_completed) {
              router.replace('/dashboard')
            } else {
              router.replace('/onboarding')
            }
            return
          }
        }

        router.replace('/onboarding')
      } catch (err) {
        console.error('Auth callback error:', err)
        router.replace('/auth/login')
      }
    }

    handleCallback()
  }, [router])

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
