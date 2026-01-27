'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Language = 'en' | 'es';

const translations = {
  en: {
    workerPortal: 'Worker Portal',
    signIn: 'Sign In',
    email: 'Email',
    password: 'Password',
    signingIn: 'Signing in...',
    signInBtn: 'Sign In',
    needAccount: 'Need an account? Ask your employer to add you.',
    accountNotFound: 'Account not found. Contact your employer.',
  },
  es: {
    workerPortal: 'Portal del Trabajador',
    signIn: 'Iniciar Sesión',
    email: 'Correo Electrónico',
    password: 'Contraseña',
    signingIn: 'Iniciando sesión...',
    signInBtn: 'Iniciar Sesión',
    needAccount: '¿Necesitas una cuenta? Pide a tu empleador que te agregue.',
    accountNotFound: 'Cuenta no encontrada. Contacta a tu empleador.',
  },
};

export default function WorkerLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [language, setLanguage] = useState<Language>('en')
  const router = useRouter()

  const t = translations[language];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Verify user exists in database
    const { data: userData } = await supabase
      .from('users')
      .select('role, company_id, full_name')
      .eq('id', data.user?.id)
      .single()

    if (!userData) {
      setError(t.accountNotFound)
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    // Workers and admins/owners can access worker app
    router.push('/worker/timeclock')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex flex-col items-center justify-center p-4">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 flex rounded-lg overflow-hidden border border-white/30">
        <button
          onClick={() => setLanguage('en')}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            language === 'en' ? 'bg-white text-blue-600' : 'bg-transparent text-white hover:bg-white/10'
          }`}
        >
          EN
        </button>
        <button
          onClick={() => setLanguage('es')}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            language === 'es' ? 'bg-white text-blue-600' : 'bg-transparent text-white hover:bg-white/10'
          }`}
        >
          ES
        </button>
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">ToolTime Pro</h1>
          <p className="text-blue-200 mt-2">{t.workerPortal}</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-6">
            {t.signIn}
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.email}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.password}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? t.signingIn : t.signInBtn}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-200 text-sm mt-6">
          {t.needAccount}
        </p>
      </div>
    </div>
  )
}
