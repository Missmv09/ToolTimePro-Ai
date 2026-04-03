'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslations } from 'next-intl'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { signUp, isConfigured } = useAuth()
  const t = useTranslations('auth.signup')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: signUpError } = await signUp(email, fullName, companyName)

      if (signUpError) {
        const message = signUpError.message
        if (message === 'Failed to fetch') {
          setError(t('connectionError'))
        } else {
          setError(message)
        }
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      if (message === 'Failed to fetch') {
        setError(t('connectionError'))
      } else {
        setError(message)
      }
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-end mb-4">
            <LanguageSwitcher />
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-8">
            <div className="text-4xl mb-4">📬</div>
            <h2 className="text-2xl font-bold text-green-800 mb-4">{t('successTitle')}</h2>
            <p className="text-green-700 mb-2">
              {t('successMessage')} <strong>{email}</strong>.
            </p>
            <p className="text-green-600 text-sm">
              {t('successInstruction')}
            </p>
            <div className="mt-6 pt-4 border-t border-green-200">
              <p className="text-sm text-gray-500">
                {t('noEmailReceived')}{' '}
                <button
                  onClick={() => setSuccess(false)}
                  className="text-[#f5a623] hover:text-[#e6991a] font-medium"
                >
                  {t('tryAgain')}
                </button>
              </p>
            </div>
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

        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          {!isConfigured && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
              {t('authNotConfigured')}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
              {error.includes('already exists') && (
                <div className="mt-2">
                  <Link href="/auth/login" className="text-[#f5a623] hover:text-[#e6991a] font-medium underline">
                    {t('goToSignIn')}
                  </Link>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                {t('fullNameLabel')}
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623]"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                {t('companyNameLabel')}
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623]"
                placeholder="Smith Plumbing LLC"
              />
            </div>

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

          </div>

          <button
            type="submit"
            disabled={loading || !isConfigured}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-[#1a1a2e] font-bold bg-[#f5a623] hover:bg-[#e6991a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f5a623] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('creatingButton') : t('createButton')}
          </button>

          <p className="text-xs text-center text-gray-500">
            {t('termsText')}
          </p>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          {t('hasAccount')}{' '}
          <Link href="/auth/login" className="text-[#f5a623] hover:text-[#e6991a] font-medium">
            {t('signInLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}
