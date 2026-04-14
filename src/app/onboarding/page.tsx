'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Building2, Wrench, Users, Shield, Calendar, Check, ArrowRight, ArrowLeft, Search, Plus, X, DollarSign, Star, RefreshCw, CheckCircle } from 'lucide-react'
import { industries, type Industry } from '@/lib/industries'
import { useTranslations } from 'next-intl'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function OnboardingPage() {
  const router = useRouter()
  const { user, company, dbUser, isLoading, refreshUserData } = useAuth()
  const t = useTranslations('misc.onboarding')
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not authenticated or if onboarding already completed
  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace('/auth/login')
      return
    }
    if (company?.onboarding_completed) {
      router.replace('/dashboard')
    }
  }, [user, company, isLoading, router])

  // Step 1: Company details
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')

  // Step 2: Industry & services (multi-select)
  const [industrySearch, setIndustrySearch] = useState('')
  const [selectedIndustries, setSelectedIndustries] = useState<Industry[]>([])
  const [selectedServiceNames, setSelectedServiceNames] = useState<Set<string>>(new Set())
  const [customServiceInput, setCustomServiceInput] = useState('')
  const [customServices, setCustomServices] = useState<string[]>([])

  // All suggested services from selected industries (deduplicated by name)
  const allSuggestedServices = useMemo(() => {
    const seen = new Set<string>()
    const result: { name: string; priceType: 'fixed' | 'hourly' | 'per_sqft'; duration: number }[] = []
    for (const ind of selectedIndustries) {
      for (const svc of ind.services) {
        if (!seen.has(svc.name)) {
          seen.add(svc.name)
          result.push({ name: svc.name, priceType: svc.priceType, duration: svc.duration })
        }
      }
    }
    return result
  }, [selectedIndustries])

  // When an industry is toggled, add/remove it and auto-check its services
  const handleToggleIndustry = (industry: Industry) => {
    const isAlreadySelected = selectedIndustries.some((i) => i.slug === industry.slug)
    if (isAlreadySelected) {
      // Remove industry and its unique services
      setSelectedIndustries((prev) => prev.filter((i) => i.slug !== industry.slug))
      // Remove services that only belonged to this industry
      const otherIndustries = selectedIndustries.filter((i) => i.slug !== industry.slug)
      const otherServiceNames = new Set(otherIndustries.flatMap((i) => i.services.map((s) => s.name)))
      setSelectedServiceNames((prev) => {
        const next = new Set(prev)
        for (const svc of industry.services) {
          if (!otherServiceNames.has(svc.name)) {
            next.delete(svc.name)
          }
        }
        return next
      })
    } else {
      // Add industry and auto-check all its services
      setSelectedIndustries((prev) => [...prev, industry])
      setSelectedServiceNames((prev) => {
        const next = new Set(prev)
        for (const svc of industry.services) {
          next.add(svc.name)
        }
        return next
      })
    }
  }

  const toggleServiceByName = (name: string) => {
    setSelectedServiceNames((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  const addCustomService = () => {
    const trimmed = customServiceInput.trim()
    if (trimmed && !customServices.includes(trimmed) && !selectedServiceNames.has(trimmed)) {
      setCustomServices((prev) => [...prev, trimmed])
      setSelectedServiceNames((prev) => new Set(prev).add(trimmed))
      setCustomServiceInput('')
    }
  }

  const removeCustomService = (name: string) => {
    setCustomServices((prev) => prev.filter((s) => s !== name))
    setSelectedServiceNames((prev) => {
      const next = new Set(prev)
      next.delete(name)
      return next
    })
  }

  const filteredIndustries = useMemo(() => {
    if (!industrySearch.trim()) return industries
    const q = industrySearch.toLowerCase()
    return industries.filter(
      (i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
    )
  }, [industrySearch])

  // Step 3: Payment methods
  const PAYMENT_METHOD_OPTIONS = [
    { id: 'zelle', label: 'Zelle', icon: '💸', placeholder: 'Email or phone number', helperText: 'Your Zelle-registered email or phone' },
    { id: 'venmo', label: 'Venmo', icon: '💜', placeholder: '@YourHandle', helperText: 'Your Venmo username (e.g. @MikesPlumbing)' },
    { id: 'cashapp', label: 'Cash App', icon: '💚', placeholder: '$YourCashTag', helperText: 'Your Cash App $cashtag' },
    { id: 'paypal', label: 'PayPal', icon: '🅿️', placeholder: 'paypal.me/yourname or email', helperText: 'Your PayPal.me link or PayPal email' },
    { id: 'square', label: 'Square', icon: '⬜', placeholder: 'Square payment link URL', helperText: 'Paste your Square payment link' },
    { id: 'check', label: 'Check', icon: '📝', placeholder: 'Payable to: Your Business Name LLC', helperText: 'Business name checks should be made out to' },
    { id: 'cash', label: 'Cash', icon: '💵', placeholder: '', helperText: 'Accept cash payments in person' },
    { id: 'other', label: 'Other', icon: '💳', placeholder: 'Payment details or instructions', helperText: 'Any other way you accept payment' },
  ] as const

  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<Set<string>>(new Set())
  const [paymentHandles, setPaymentHandles] = useState<Record<string, string>>({})
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState<string | null>(null)

  const togglePaymentMethod = (methodId: string) => {
    setSelectedPaymentMethods(prev => {
      const next = new Set(prev)
      if (next.has(methodId)) {
        next.delete(methodId)
        // Clear handle and preferred status
        setPaymentHandles(h => { const n = { ...h }; delete n[methodId]; return n })
        if (preferredPaymentMethod === methodId) setPreferredPaymentMethod(null)
      } else {
        next.add(methodId)
        // Auto-set first selected as preferred
        if (next.size === 1) setPreferredPaymentMethod(methodId)
      }
      return next
    })
  }

  const handleSavePaymentMethods = async () => {
    if (!company) {
      setError('Account data is still loading. Please wait a moment and try again.')
      return false
    }
    if (selectedPaymentMethods.size === 0) return true // skip if none selected

    setSaving(true)
    setError(null)

    try {
      // Build payment method records
      const methods = Array.from(selectedPaymentMethods).map((methodId, index) => ({
        company_id: company.id,
        method: methodId,
        handle: paymentHandles[methodId] || null,
        is_active: true,
        is_preferred: preferredPaymentMethod === methodId,
        sort_order: index,
      }))

      const { error: insertError } = await supabase
        .from('company_payment_methods')
        .upsert(methods, { onConflict: 'company_id,method' })

      if (insertError) {
        setError(insertError.message)
        return false
      }

      // Also build a payment_instructions string for backwards compatibility
      const instructionLines = methods
        .filter(m => m.handle)
        .map(m => {
          const opt = PAYMENT_METHOD_OPTIONS.find(o => o.id === m.method)
          return `${opt?.label || m.method}: ${m.handle}`
        })
      if (instructionLines.length > 0) {
        await supabase
          .from('companies')
          .update({ payment_instructions: instructionLines.join('\n') })
          .eq('id', company.id)
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payment methods. Please try again.')
      return false
    } finally {
      setSaving(false)
    }
  }

  // Step 4: Team member
  const [memberName, setMemberName] = useState('')
  // Step 5: 2FA
  const [twoFaPhone, setTwoFaPhone] = useState('')
  const [twoFaEnabled, setTwoFaEnabled] = useState(false)
  const [twoFaSaving, setTwoFaSaving] = useState(false)
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState<'admin' | 'worker' | 'worker_admin'>('worker')

  // Step 5: Google Calendar
  const [gcalConnected, setGcalConnected] = useState(false)
  const [gcalConnecting, setGcalConnecting] = useState(false)

  // Check Google Calendar connection status & detect OAuth return
  useEffect(() => {
    const checkGcal = async () => {
      if (!user?.id) return
      try {
        const { data } = await supabase
          .from('google_calendar_connections')
          .select('id')
          .eq('user_id', user.id)
          .single()
        if (data) setGcalConnected(true)
      } catch {
        // Not connected
      }
    }
    checkGcal()

    // Detect return from Google OAuth (gcal=connected query param)
    const params = new URLSearchParams(window.location.search)
    if (params.get('gcal') === 'connected') {
      setGcalConnected(true)
      setCurrentStep(5) // Stay on the calendar step to show success
      // Clean up URL
      window.history.replaceState({}, '', '/onboarding')
    }
  }, [user])

  const handleConnectGoogleCalendar = async () => {
    setGcalConnecting(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Session expired. Please refresh.')
        setGcalConnecting(false)
        return
      }
      const res = await fetch('/api/google-calendar/connect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to start Google Calendar connection')
      }
      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect. Please try again.')
      setGcalConnecting(false)
    }
  }

  const handleSaveCompany = async () => {
    if (!company) {
      setError('Account data is still loading. Please wait a moment and try again.')
      return false
    }
    setSaving(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('companies')
        .update({ phone, address, city, state, zip })
        .eq('id', company.id)

      if (updateError) {
        setSaving(false)
        setError(updateError.message)
        return false
      }
      // Refresh AuthContext so dashboard checklist sees updated company data
      await refreshUserData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save company details. Please try again.')
      return false
    } finally {
      setSaving(false)
    }
    return true
  }

  const handleSaveIndustryAndServices = async () => {
    if (!company) {
      setError('Account data is still loading. Please wait a moment and try again.')
      return false
    }

    if (selectedIndustries.length === 0 && customServices.length === 0) {
      // Nothing selected — just skip
      return true
    }

    setSaving(true)
    setError(null)

    try {
      // Save primary industry (first selected) to company
      if (selectedIndustries.length > 0) {
        const industryValue = selectedIndustries.map((i) => i.slug).join(',')
        const { error: industryError } = await supabase
          .from('companies')
          .update({ industry: industryValue })
          .eq('id', company.id)

        if (industryError) {
          setError(industryError.message)
          return false
        }
      }

      // Build services from selected suggested + custom
      const servicesToCreate: { company_id: string; name: string; default_price: null; price_type: string; duration_minutes: number }[] = []

      // Add selected suggested services
      for (const svc of allSuggestedServices) {
        if (selectedServiceNames.has(svc.name)) {
          servicesToCreate.push({
            company_id: company.id,
            name: svc.name,
            default_price: null,
            price_type: svc.priceType,
            duration_minutes: svc.duration,
          })
        }
      }

      // Add custom services
      for (const name of customServices) {
        if (selectedServiceNames.has(name)) {
          servicesToCreate.push({
            company_id: company.id,
            name,
            default_price: null,
            price_type: 'fixed',
            duration_minutes: 60,
          })
        }
      }

      if (servicesToCreate.length > 0) {
        const { error: serviceError } = await supabase
          .from('services')
          .insert(servicesToCreate)

        if (serviceError) {
          setError(serviceError.message)
          return false
        }
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save services. Please try again.')
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleEnable2FA = async () => {
    const digits = twoFaPhone.replace(/\D/g, '')
    if (digits.length < 10) {
      setError('Please enter a valid 10-digit phone number.')
      return false
    }

    setTwoFaSaving(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Session expired. Please refresh.')
        setTwoFaSaving(false)
        return false
      }

      const res = await fetch('/api/auth/2fa/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ phone: twoFaPhone }),
      })

      if (res.ok) {
        setTwoFaEnabled(true)
        setTwoFaSaving(false)
        return true
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to enable 2FA')
        setTwoFaSaving(false)
        return false
      }
    } catch {
      setError('Failed to enable 2FA')
      setTwoFaSaving(false)
      return false
    }
  }

  const handleNext = async () => {
    setError(null)

    if (currentStep === 1) {
      const success = await handleSaveCompany()
      if (success) setCurrentStep(2)
    } else if (currentStep === 2) {
      const success = await handleSaveIndustryAndServices()
      if (success) setCurrentStep(3)
    } else if (currentStep === 3) {
      const success = await handleSavePaymentMethods()
      if (success) setCurrentStep(4)
    } else if (currentStep === 4) {
      setCurrentStep(5)
    } else if (currentStep === 5) {
      // Google Calendar step — just advance (connect is optional)
      setCurrentStep(6)
    } else if (currentStep === 6) {
      // If they entered a phone number but haven't enabled yet, enable it
      if (twoFaPhone.trim() && !twoFaEnabled) {
        const success = await handleEnable2FA()
        if (success) await handleFinish()
      } else {
        await handleFinish()
      }
    }
  }

  const handleSkip = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1)
    } else {
      handleFinish()
    }
  }

  const handleFinish = async () => {
    if (!company) {
      setError('Account data is still loading. Please wait a moment and try again.')
      return
    }
    setSaving(true)
    setError(null)

    try {
      // Mark onboarding as completed
      const { error: finishError } = await supabase
        .from('companies')
        .update({ onboarding_completed: true })
        .eq('id', company.id)

      if (finishError) {
        setError('Failed to complete setup: ' + finishError.message)
        return
      }

      // Refresh AuthContext so DashboardLayout sees onboarding_completed = true
      await refreshUserData()

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete setup. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Show loading while auth data is pending
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">{t('loadingAccount')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('welcome')}</h1>
              <p className="text-gray-500 mt-1">{t('setupSubtitle')}</p>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-10">
          {[
            { id: 1, title: t('companyDetails'), icon: Building2 },
            { id: 2, title: t('yourIndustry'), icon: Wrench },
            { id: 3, title: t('paymentMethods'), icon: DollarSign },
            { id: 4, title: t('inviteTeam'), icon: Users },
            { id: 5, title: t('connectCalendar'), icon: Calendar },
            { id: 6, title: t('security'), icon: Shield },
          ].map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors ${
                    currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : currentStep === step.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {currentStep > step.id ? <Check size={18} /> : step.id}
                </div>
                <span
                  className={`ml-3 text-sm font-medium hidden sm:block ${
                    currentStep >= step.id ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < 5 && (
                <div
                  className={`flex-1 h-0.5 mx-2 sm:mx-4 ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Step 1: Company Details */}
          {currentStep === 1 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 size={20} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('companyDetailsTitle')}</h2>
                  <p className="text-sm text-gray-500">{t('companyDetailsSubtitle')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('businessPhone')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="(555) 123-4567"
                  />
                  <p className="text-xs text-gray-400 mt-1">Appears on your invoices and quotes so customers can reach you.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('streetAddress')}</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123 Main St"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('city')}</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Los Angeles"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('state')}</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="CA"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('zip')}</label>
                    <input
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="90001"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Your Industry */}
          {currentStep === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Wrench size={20} className="text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('industryTitle')}</h2>
                  <p className="text-sm text-gray-500">
                    {t('industrySubtitle')}
                  </p>
                </div>
              </div>

              {/* Selected industries tags */}
              {selectedIndustries.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedIndustries.map((ind) => (
                    <span
                      key={ind.slug}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200"
                    >
                      <span>{ind.icon}</span>
                      {ind.name}
                      <button
                        onClick={() => handleToggleIndustry(ind)}
                        className="text-blue-400 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Industry search & grid */}
              <div className="relative mb-4">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={industrySearch}
                  onChange={(e) => setIndustrySearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('searchIndustries')}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto pr-1">
                {filteredIndustries.map((industry) => {
                  const isSelected = selectedIndustries.some((i) => i.slug === industry.slug)
                  return (
                    <button
                      key={industry.slug}
                      onClick={() => handleToggleIndustry(industry)}
                      className={`flex items-center gap-2 px-3 py-3 border rounded-lg transition-colors text-left ${
                        isSelected
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      <span className="text-xl">{industry.icon}</span>
                      <span className="text-sm font-medium text-gray-800 leading-tight">{industry.name}</span>
                      {isSelected && <Check size={14} className="ml-auto text-blue-600" />}
                    </button>
                  )
                })}
                {filteredIndustries.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-400">
                    {t('noIndustriesMatch')} &ldquo;{industrySearch}&rdquo;
                  </div>
                )}
              </div>

              {/* Services from selected industries */}
              {allSuggestedServices.length > 0 && (
                <div className="mt-6 pt-5 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    {t('yourServices')}
                  </p>

                  <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                    {allSuggestedServices.map((service) => (
                      <label
                        key={service.name}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedServiceNames.has(service.name)
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedServiceNames.has(service.name)}
                          onChange={() => toggleServiceByName(service.name)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-900">{service.name}</span>
                      </label>
                    ))}

                    {/* Custom services */}
                    {customServices.map((name) => (
                      <div
                        key={name}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg border border-blue-300 bg-blue-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedServiceNames.has(name)}
                          onChange={() => toggleServiceByName(name)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-900">{name}</span>
                        <button
                          onClick={() => removeCustomService(name)}
                          className="ml-auto text-gray-400 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add custom service */}
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={customServiceInput}
                      onChange={(e) => setCustomServiceInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomService() } }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={t('addCustomService')}
                    />
                    <button
                      onClick={addCustomService}
                      disabled={!customServiceInput.trim()}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-1"
                    >
                      <Plus size={16} />
                      {t('add')}
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => {
                        const all = new Set(selectedServiceNames)
                        allSuggestedServices.forEach((s) => all.add(s.name))
                        customServices.forEach((s) => all.add(s))
                        setSelectedServiceNames(all)
                      }}
                      className="text-xs text-blue-600 hover:text-blue-500 font-medium"
                    >
                      {t('selectAll')}
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => setSelectedServiceNames(new Set())}
                      className="text-xs text-blue-600 hover:text-blue-500 font-medium"
                    >
                      {t('deselectAll')}
                    </button>
                    <span className="ml-auto text-xs text-gray-400">
                      {selectedServiceNames.size} {t('selected')}
                    </span>
                  </div>
                </div>
              )}

              {/* Custom service input when no industry selected yet */}
              {selectedIndustries.length === 0 && (
                <div className="mt-6 pt-5 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-3">
                    {t('noIndustryHint')}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customServiceInput}
                      onChange={(e) => setCustomServiceInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomService() } }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={t('typeServiceHint')}
                    />
                    <button
                      onClick={addCustomService}
                      disabled={!customServiceInput.trim()}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-1"
                    >
                      <Plus size={16} />
                      {t('add')}
                    </button>
                  </div>
                  {customServices.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {customServices.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200"
                        >
                          {name}
                          <button
                            onClick={() => removeCustomService(name)}
                            className="text-blue-400 hover:text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Payment Methods */}
          {currentStep === 3 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <DollarSign size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('paymentMethodsTitle')}</h2>
                  <p className="text-sm text-gray-500">{t('paymentMethodsSubtitle')}</p>
                </div>
              </div>

              <div className="space-y-3">
                {PAYMENT_METHOD_OPTIONS.map((method) => {
                  const isSelected = selectedPaymentMethods.has(method.id)
                  const isPreferred = preferredPaymentMethod === method.id
                  return (
                    <div key={method.id}>
                      <button
                        type="button"
                        onClick={() => togglePaymentMethod(method.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors text-left ${
                          isSelected
                            ? 'border-emerald-400 bg-emerald-50'
                            : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                        }`}
                      >
                        <span className="text-xl">{method.icon}</span>
                        <span className="text-sm font-medium text-gray-900 flex-1">{method.label}</span>
                        {isSelected && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setPreferredPaymentMethod(method.id)
                            }}
                            className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors ${
                              isPreferred
                                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                                : 'bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-600'
                            }`}
                            title="Set as preferred"
                          >
                            <Star size={10} className={isPreferred ? 'fill-amber-500' : ''} />
                            {isPreferred ? t('preferred') : t('setPreferred')}
                          </button>
                        )}
                        {isSelected && <Check size={16} className="text-emerald-600" />}
                      </button>

                      {/* Handle input - shown when method is selected and has a placeholder */}
                      {isSelected && method.placeholder && (
                        <div className="ml-12 mt-2 mb-1">
                          <input
                            type="text"
                            value={paymentHandles[method.id] || ''}
                            onChange={(e) => setPaymentHandles(prev => ({ ...prev, [method.id]: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder={method.placeholder}
                          />
                          <p className="text-xs text-gray-400 mt-1">{method.helperText}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {selectedPaymentMethods.size > 0 && (
                <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <p className="text-sm text-emerald-700">
                    {t('paymentMethodsHint')}
                  </p>
                </div>
              )}

              {selectedPaymentMethods.size === 0 && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    {t('paymentMethodsSkipHint')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Invite Team */}
          {currentStep === 4 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users size={20} className="text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('inviteTeamTitle')}</h2>
                  <p className="text-sm text-gray-500">{t('inviteTeamSubtitle')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('teamMemberName')}</label>
                  <input
                    type="text"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
                  <input
                    type="email"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('role')}</label>
                  <select
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value as 'admin' | 'worker' | 'worker_admin')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="worker">{t('worker')}</option>
                    <option value="admin">{t('admin')}</option>
                    <option value="worker_admin">{t('teamMemberAdmin')}</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  {t('inviteMoreHint')} <strong>{t('dashboardTeam')}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Connect Google Calendar */}
          {currentStep === 5 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar size={20} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('calendarTitle')}</h2>
                  <p className="text-sm text-gray-500">{t('calendarSubtitle')}</p>
                </div>
              </div>

              {gcalConnected ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-green-700">{t('calendarConnected')}</h3>
                  <p className="text-sm text-green-600 mt-1">
                    {t('calendarConnectedMessage')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 mt-0.5 flex-shrink-0" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-blue-900">{t('calendarBenefitTitle')}</p>
                        <ul className="mt-2 space-y-1 text-sm text-blue-700">
                          <li>{t('calendarBenefit1')}</li>
                          <li>{t('calendarBenefit2')}</li>
                          <li>{t('calendarBenefit3')}</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleConnectGoogleCalendar}
                    disabled={gcalConnecting}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {gcalConnecting ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        {t('calendarConnecting')}
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        {t('calendarConnectButton')}
                      </>
                    )}
                  </button>

                  <p className="text-xs text-center text-gray-400">
                    {t('calendarSkipHint')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 6: Security */}
          {currentStep === 6 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Shield size={20} className="text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('secureTitle')}</h2>
                  <p className="text-sm text-gray-500">{t('secureSubtitle')}</p>
                </div>
              </div>

              {twoFaEnabled ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <div className="text-3xl mb-2">&#10003;</div>
                  <h3 className="text-lg font-semibold text-green-700">{t('twoFaEnabled')}</h3>
                  <p className="text-sm text-green-600 mt-1">
                    {t('twoFaEnabledMessage')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('mobilePhone')}</label>
                    <input
                      type="tel"
                      value={twoFaPhone}
                      onChange={(e) => setTwoFaPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="(555) 123-4567"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {t('twoFaCodeHint')}
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700">
                      {t('twoFaSecurityHint')} <strong>{t('settings')}</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <div>
              {currentStep > 1 && (
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  <ArrowLeft size={16} />
                  {t('back')}
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSkip}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                {currentStep === 6 ? t('skipDashboard') : t('skip')}
              </button>
              <button
                onClick={handleNext}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {saving ? (
                  t('saving')
                ) : currentStep === 6 ? (
                  t('finishSetup')
                ) : (
                  <>
                    {t('next')}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Trial info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            {company?.is_beta_tester ? (
              <>{t('betaTester')} <strong>{t('betaTesterAccess')}</strong> {t('betaTesterPlan')} <strong>{t('elitePlan')}</strong>.</>
            ) : (
              <>{t('proPlanTrial')} <strong>{t('proPlan')}</strong> {t('proPlanTrialSuffix')}</>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
