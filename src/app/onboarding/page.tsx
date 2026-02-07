'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Building2, Wrench, Users, Check, ArrowRight, ArrowLeft } from 'lucide-react'

const STEPS = [
  { id: 1, title: 'Company Details', icon: Building2 },
  { id: 2, title: 'Add a Service', icon: Wrench },
  { id: 3, title: 'Invite Your Team', icon: Users },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { company, dbUser } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Company details
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')

  // Step 2: Service
  const [serviceName, setServiceName] = useState('')
  const [servicePrice, setServicePrice] = useState('')
  const [servicePriceType, setServicePriceType] = useState<'fixed' | 'hourly'>('fixed')

  // Step 3: Team member
  const [memberName, setMemberName] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState<'admin' | 'worker'>('worker')

  const handleSaveCompany = async () => {
    if (!company) return
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

  const handleSaveService = async () => {
    if (!company || !serviceName.trim()) return true // skip if empty
    setSaving(true)
    setError(null)

    const { error: serviceError } = await supabase
      .from('services')
      .insert({
        company_id: company.id,
        name: serviceName.trim(),
        default_price: servicePrice ? parseFloat(servicePrice) : null,
        price_type: servicePriceType,
        duration_minutes: 60,
      })

    setSaving(false)
    if (serviceError) {
      setError(serviceError.message)
      return false
    }
    return true
  }

  const handleInviteMember = async () => {
    // This is optional - just skip if empty
    if (!memberName.trim() || !memberEmail.trim()) return true
    // For now, just show they can invite from the Team page
    return true
  }

  const handleNext = async () => {
    setError(null)

    if (currentStep === 1) {
      const success = await handleSaveCompany()
      if (success) setCurrentStep(2)
    } else if (currentStep === 2) {
      const success = await handleSaveService()
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
    if (!company) return
    setSaving(true)

    // Mark onboarding as completed
    await supabase
      .from('companies')
      .update({ onboarding_completed: true })
      .eq('id', company.id)

    setSaving(false)
    router.push('/dashboard')
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

          {/* Step 2: Add a Service */}
          {currentStep === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Wrench size={20} className="text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Add Your First Service</h2>
                  <p className="text-sm text-gray-500">What do you offer? You can always add more later.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                  <input
                    type="text"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Lawn Mowing, House Cleaning, Pool Maintenance"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                    <input
                      type="number"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="150"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price Type</label>
                    <select
                      value={servicePriceType}
                      onChange={(e) => setServicePriceType(e.target.value as 'fixed' | 'hourly')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="fixed">Fixed Price</option>
                      <option value="hourly">Hourly Rate</option>
                    </select>
                  </div>
                </div>
              </div>
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
