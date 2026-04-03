'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const t = useTranslations('auth.forgotPassword')

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t('defaultError'))
      } else {
        setSuccess(true)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      if (message === 'Failed to fetch') {
        setError(t('connectionError'))
      } else {
        setError(message)
      }
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-end mb-4">
            <LanguageSwitcher />
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-green-800 mb-4">{t('successTitle')}</h2>
            <p className="text-green-700">
              {t('successMessage')}
            </p>
            <Link
              href="/auth/login"
              className="mt-6 inline-block text-[#f5a623] hover:text-[#e6991a]"
            >
              {t('backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-center text-gray-900">{t('title')}</h1>
          <h2 className="mt-6 text-center text-2xl font-semibold text-gray-900">
            {t('heading')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('subtitle')}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleReset}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              {t('emailLabel')}
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

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-[#1a1a2e] font-bold bg-[#f5a623] hover:bg-[#e6991a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f5a623] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('sending') : t('sendButton')}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          {t('rememberPassword')}{' '}
          <Link href="/auth/login" className="text-[#f5a623] hover:text-[#e6991a] font-medium">
            {t('signInLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}
