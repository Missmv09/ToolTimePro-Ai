'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Building2, Wrench, Users, Check, ArrowRight, ArrowLeft, Search, Plus, X } from 'lucide-react'
import { industries, type Industry } from '@/lib/industries'

const STEPS = [
  { id: 1, title: 'Company Details', icon: Building2 },
  { id: 2, title: 'Your Industry', icon: Wrench },
  { id: 3, title: 'Invite Your Team', icon: Users },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { user, company, dbUser, isLoading, refreshUserData } = useAuth()
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

    if (selectedIndustries.length === 0 && customServices.length === 0) {
      // Nothing selected — just skip
      return true
    }

    setSaving(true)
    setError(null)

    // Save primary industry (first selected) to company
    if (selectedIndustries.length > 0) {
      const industryValue = selectedIndustries.map((i) => i.slug).join(',')
      const { error: industryError } = await supabase
        .from('companies')
        .update({ industry: industryValue })
        .eq('id', company.id)

      if (industryError) {
        setSaving(false)
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

    // Refresh AuthContext so DashboardLayout sees onboarding_completed = true
    await refreshUserData()

    router.push('/dashboard')
  }

  // Show loading while auth data is pending
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
                    Select one or more. We&apos;ll suggest services based on your selection.
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
                  placeholder="Search industries..."
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
                    No industries match &ldquo;{industrySearch}&rdquo;
                  </div>
                )}
              </div>

              {/* Services from selected industries */}
              {allSuggestedServices.length > 0 && (
                <div className="mt-6 pt-5 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Your services — uncheck any you don&apos;t offer:
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
                      placeholder="Add a custom service..."
                    />
                    <button
                      onClick={addCustomService}
                      disabled={!customServiceInput.trim()}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Add
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
                      Select all
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => setSelectedServiceNames(new Set())}
                      className="text-xs text-blue-600 hover:text-blue-500 font-medium"
                    >
                      Deselect all
                    </button>
                    <span className="ml-auto text-xs text-gray-400">
                      {selectedServiceNames.size} selected
                    </span>
                  </div>
                </div>
              )}

              {/* Custom service input when no industry selected yet */}
              {selectedIndustries.length === 0 && (
                <div className="mt-6 pt-5 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-3">
                    Don&apos;t see your industry? Add your services manually:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customServiceInput}
                      onChange={(e) => setCustomServiceInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomService() } }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Type a service name and press Enter"
                    />
                    <button
                      onClick={addCustomService}
                      disabled={!customServiceInput.trim()}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Add
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
            {company?.is_beta_tester ? (
              <>You have <strong>Beta Tester</strong> access &mdash; all features unlocked on the <strong>Elite plan</strong>.</>
            ) : (
              <>You&apos;re on the <strong>Pro plan</strong> free trial &mdash; 14 days of full access, no credit card required.</>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
