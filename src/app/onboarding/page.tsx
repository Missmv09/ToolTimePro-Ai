'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Building2, Wrench, Users, Check, ArrowRight, ArrowLeft, Search } from 'lucide-react'
import { industries, type Industry } from '@/lib/industries'

const STEPS = [
  { id: 1, title: 'Company Details', icon: Building2 },
  { id: 2, title: 'Your Industry', icon: Wrench },
  { id: 3, title: 'Invite Your Team', icon: Users },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { user, company, dbUser, isLoading } = useAuth()
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

  // Step 2: Industry & services
  const [industrySearch, setIndustrySearch] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null)
  const [selectedServices, setSelectedServices] = useState<Set<number>>(new Set())

  // When industry is selected, pre-check all its services
  const handleSelectIndustry = (industry: Industry) => {
    setSelectedIndustry(industry)
    setSelectedServices(new Set(industry.services.map((_, i) => i)))
  }

  const toggleService = (index: number) => {
    setSelectedServices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
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

  // Step 3: Team member
  const [memberName, setMemberName] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState<'admin' | 'worker'>('worker')

  const handleSaveCompany = async () => {
    if (!company) {
      setError('Account data is still loading. Please wait a moment and try again.')
      return false
    }
    setSaving(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('companies')
      .update({ phone, address, city, state, zip })
      .eq('id', company.id)

    setSaving(false)
    if (updateError) {
      setError(updateError.message)
      return false
    }
    return true
  }

  const handleSaveIndustryAndServices = async () => {
    if (!company) {
      setError('Account data is still loading. Please wait a moment and try again.')
      return false
    }

    if (!selectedIndustry) {
      // No industry selected — just skip
      return true
    }

    setSaving(true)
    setError(null)

    // Save industry to company
    const { error: industryError } = await supabase
      .from('companies')
      .update({ industry: selectedIndustry.slug })
      .eq('id', company.id)

    if (industryError) {
      setSaving(false)
      setError(industryError.message)
      return false
    }

    // Bulk-create selected services
    const servicesToCreate = selectedIndustry.services
      .filter((_, i) => selectedServices.has(i))
      .map((svc) => ({
        company_id: company.id,
        name: svc.name,
        default_price: svc.price,
        price_type: svc.priceType,
        duration_minutes: svc.duration,
      }))

    if (servicesToCreate.length > 0) {
      const { error: serviceError } = await supabase
        .from('services')
        .insert(servicesToCreate)

      if (serviceError) {
        setSaving(false)
        setError(serviceError.message)
        return false
      }
    }

    setSaving(false)
    return true
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
      await handleFinish()
    }
  }

  const handleSkip = () => {
    if (currentStep < 3) {
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

    // Mark onboarding as completed
    const { error: finishError } = await supabase
      .from('companies')
      .update({ onboarding_completed: true })
      .eq('id', company.id)

    setSaving(false)

    if (finishError) {
      setError('Failed to complete setup: ' + finishError.message)
      return
    }

    router.push('/dashboard')
  }

  const formatPrice = (price: number, priceType: string) => {
    if (price === 0) return 'Free'
    const formatted = price >= 1000 ? `$${(price / 1000).toFixed(price % 1000 === 0 ? 0 : 1)}k` : `$${price}`
    if (priceType === 'hourly') return `${formatted}/hr`
    if (priceType === 'per_sqft') return `${formatted}/sqft`
    return formatted
  }

  // Show loading while auth data is being fetched
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading your account...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to ToolTime Pro!</h1>
          <p className="text-gray-500 mt-1">Let&apos;s get your account set up in a few quick steps.</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-10">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
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
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
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
                  <h2 className="text-lg font-semibold text-gray-900">Company Details</h2>
                  <p className="text-sm text-gray-500">Add your business info so customers can find you.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Los Angeles"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="CA"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
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
                  <h2 className="text-lg font-semibold text-gray-900">What industry are you in?</h2>
                  <p className="text-sm text-gray-500">
                    We&apos;ll set up your services, pricing, and templates based on your industry.
                  </p>
                </div>
              </div>

              {!selectedIndustry ? (
                // Industry selection grid
                <div>
                  <div className="relative mb-4">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={industrySearch}
                      onChange={(e) => setIndustrySearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Search industries..."
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1">
                    {filteredIndustries.map((industry) => (
                      <button
                        key={industry.slug}
                        onClick={() => handleSelectIndustry(industry)}
                        className="flex items-center gap-2 px-3 py-3 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                      >
                        <span className="text-xl">{industry.icon}</span>
                        <span className="text-sm font-medium text-gray-800 leading-tight">{industry.name}</span>
                      </button>
                    ))}
                    {filteredIndustries.length === 0 && (
                      <div className="col-span-full text-center py-8 text-gray-400">
                        No industries match &ldquo;{industrySearch}&rdquo;
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Selected industry with suggested services
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{selectedIndustry.icon}</span>
                      <span className="text-lg font-semibold text-gray-900">{selectedIndustry.name}</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedIndustry(null)
                        setSelectedServices(new Set())
                        setIndustrySearch('')
                      }}
                      className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                    >
                      Change industry
                    </button>
                  </div>

                  <p className="text-sm text-gray-500 mb-3">
                    Select the services you offer. We&apos;ve pre-filled common ones for {selectedIndustry.name.toLowerCase()} businesses.
                    You can edit prices and add more from the dashboard later.
                  </p>

                  <div className="space-y-2">
                    {selectedIndustry.services.map((service, index) => (
                      <label
                        key={index}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedServices.has(index)
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedServices.has(index)}
                          onChange={() => toggleService(index)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-900">{service.name}</span>
                        </div>
                        <span className="text-sm text-gray-500 whitespace-nowrap">
                          {formatPrice(service.price, service.priceType)}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => setSelectedServices(new Set(selectedIndustry.services.map((_, i) => i)))}
                      className="text-xs text-blue-600 hover:text-blue-500 font-medium"
                    >
                      Select all
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => setSelectedServices(new Set())}
                      className="text-xs text-blue-600 hover:text-blue-500 font-medium"
                    >
                      Deselect all
                    </button>
                    <span className="ml-auto text-xs text-gray-400">
                      {selectedServices.size} of {selectedIndustry.services.length} selected
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Invite Team */}
          {currentStep === 3 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users size={20} className="text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Invite Your Team</h2>
                  <p className="text-sm text-gray-500">Add team members now or skip and do it later from the Team page.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team Member Name</label>
                  <input
                    type="text"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value as 'admin' | 'worker')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="worker">Worker</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  You can invite more team members anytime from <strong>Dashboard &rarr; Team</strong>.
                </p>
              </div>
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
                  Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSkip}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                {currentStep === 3 ? 'Skip & go to dashboard' : 'Skip'}
              </button>
              <button
                onClick={handleNext}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {saving ? (
                  'Saving...'
                ) : currentStep === 3 ? (
                  'Finish setup'
                ) : (
                  <>
                    Next
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
            You&apos;re on the <strong>Pro plan</strong> free trial &mdash; 14 days of full access, no credit card required.
          </p>
        </div>
      </div>
    </div>
  )
}
