'use client'

import { Suspense, useEffect, useState, FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import QuickBooksConnect from '@/components/settings/QuickBooksConnect'

interface CompanyForm {
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  website: string
}

// Plan display configuration mapping plan IDs to human-readable names and prices
const PLAN_CONFIG: Record<string, { name: string; price: string; period: string }> = {
  starter: { name: 'Starter', price: '$30', period: 'Monthly' },
  pro: { name: 'Pro', price: '$59', period: 'Monthly' },
  elite: { name: 'Elite', price: '$99', period: 'Monthly' },
  booking_only: { name: 'Booking Only', price: '$15', period: 'Monthly' },
  invoicing_only: { name: 'Invoicing Only', price: '$15', period: 'Monthly' },
  free_trial: { name: 'Free Trial', price: '$0', period: '' },
}

function SettingsContent() {
  const { user, dbUser, company } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'account' | 'integrations' | 'subscription'>('account')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [qboConnected, setQboConnected] = useState(false)
  const [qboConnectionInfo, setQboConnectionInfo] = useState<{
    lastSyncAt: string | null
    syncStatus: string
  } | null>(null)

  // Company info form
  const [companyForm, setCompanyForm] = useState<CompanyForm>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    website: '',
  })

  // Initialize form when company data loads
  useEffect(() => {
    if (company) {
      setCompanyForm({
        name: company.name || '',
        email: company.email || '',
        phone: company.phone || '',
        address: company.address || '',
        city: company.city || '',
        state: company.state || '',
        zip: company.zip || '',
        website: company.website || '',
      })
    }
  }, [company])

  // Check for QBO connection status
  useEffect(() => {
    const checkQboConnection = async () => {
      if (!company?.id) return

      try {
        const { data, error } = await supabase
          .from('qbo_connections')
          .select('last_sync_at')
          .eq('company_id', company.id)
          .single()

        if (data && !error) {
          setQboConnected(true)
          setQboConnectionInfo({
            lastSyncAt: data.last_sync_at,
            syncStatus: 'active',
          })
        }
      } catch {
        // No connection found, that's fine
      }
    }

    checkQboConnection()
  }, [user])

  // Check for QBO callback success
  useEffect(() => {
    const qboStatus = searchParams.get('qbo')
    if (qboStatus === 'connected') {
      setQboConnected(true)
      setSaveMessage({ type: 'success', text: 'QuickBooks connected successfully!' })
      setTimeout(() => setSaveMessage(null), 5000)
    } else if (qboStatus === 'error') {
      setSaveMessage({ type: 'error', text: 'Failed to connect QuickBooks. Please try again.' })
      setTimeout(() => setSaveMessage(null), 5000)
    }
  }, [searchParams])

  const saveCompanyInfo = async () => {
    if (!company) return
    setSaving(true)
    setSaveMessage(null)

    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: companyForm.name,
          email: companyForm.email,
          phone: companyForm.phone,
          address: companyForm.address,
          city: companyForm.city,
          state: companyForm.state,
          zip: companyForm.zip,
          website: companyForm.website,
          updated_at: new Date().toISOString(),
        })
        .eq('id', company.id)

      if (error) {
        setSaveMessage({ type: 'error', text: 'Error saving: ' + error.message })
      } else {
        setSaveMessage({ type: 'success', text: 'Company info saved!' })
        setTimeout(() => setSaveMessage(null), 3000)
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'An unexpected error occurred' })
    }

    setSaving(false)
  }

  const handleQboDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect QuickBooks?')) return

    try {
      const response = await fetch('/api/quickbooks/disconnect', {
        method: 'POST',
      })

      if (response.ok) {
        setQboConnected(false)
        setQboConnectionInfo(null)
        setSaveMessage({ type: 'success', text: 'QuickBooks disconnected' })
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        throw new Error('Failed to disconnect')
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to disconnect QuickBooks' })
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Save Message */}
      {saveMessage && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            saveMessage.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('account')}
          className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'account'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Account
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'integrations'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Integrations
        </button>
        <button
          onClick={() => setActiveTab('subscription')}
          className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'subscription'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Subscription
        </button>
      </div>

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* User Info (read-only) */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Account</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
                <p className="text-gray-900">{dbUser?.full_name || 'Not set'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                <p className="text-gray-900">{user?.email || 'Not set'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Role</label>
                <p className="text-gray-900 capitalize">{dbUser?.role || 'User'}</p>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <ChangePasswordCard />

          {/* Company Info (editable) */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h2>

            {!company ? (
              <div className="text-center py-8 text-gray-500">
                <p>No company associated with your account.</p>
                <p className="text-sm mt-2">Please contact support if this is an error.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Email
                    </label>
                    <input
                      type="email"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={companyForm.address}
                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={companyForm.city}
                      onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={companyForm.state}
                      onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="CA"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                    <input
                      type="text"
                      value={companyForm.zip}
                      onChange={(e) => setCompanyForm({ ...companyForm, zip: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://yourcompany.com"
                  />
                </div>

                <div className="pt-4">
                  <button
                    onClick={saveCompanyInfo}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Connected Services</h2>
            <p className="text-gray-600 mb-6">
              Connect your favorite tools to sync data and streamline your workflow.
            </p>

            {/* QuickBooks Integration */}
            <QuickBooksConnect
              isConnected={qboConnected}
              lastSyncAt={qboConnectionInfo?.lastSyncAt}
              syncStatus={qboConnectionInfo?.syncStatus}
              onDisconnect={handleQboDisconnect}
            />
          </div>

          {/* Future Integrations Placeholder */}
          <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-6">
            <h3 className="text-lg font-medium text-gray-700 mb-2">More Integrations Coming Soon</h3>
            <p className="text-gray-500 text-sm">
              We&apos;re working on integrations with Stripe, Square, Google Calendar, and more.
            </p>
          </div>
        </div>
      )}

      {/* Subscription Tab */}
      {activeTab === 'subscription' && (() => {
        const isBetaTester = company?.is_beta_tester
        const planKey = company?.plan || 'free_trial'
        const planInfo = PLAN_CONFIG[planKey] || { name: planKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), price: '--', period: '' }
        const isFreeTrial = !isBetaTester && (planKey === 'free_trial' || !company?.plan)
        const activeAddons = company?.addons || []

        const ADDON_LABELS: Record<string, { name: string; description: string }> = {
          jenny_lite: { name: 'Jenny Lite', description: 'AI chat widget for your website' },
          jenny_pro: { name: 'Jenny Pro', description: 'AI phone answering, SMS, and direct booking' },
          jenny_exec_admin: { name: 'Jenny Exec Admin', description: 'Compliance advisor, HR guidance, business insights' },
          website_builder: { name: 'Website Builder', description: 'Custom business website' },
          keep_me_legal: { name: 'Keep Me Legal', description: 'Ongoing compliance monitoring' },
          quickbooks_sync: { name: 'QuickBooks Sync', description: 'Two-way QuickBooks integration' },
        }

        return (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription</h2>

            <div className={`${isBetaTester ? 'bg-green-50' : isFreeTrial ? 'bg-amber-50' : 'bg-blue-50'} rounded-lg p-4 mb-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isBetaTester ? 'text-green-600' : isFreeTrial ? 'text-amber-600' : 'text-blue-600'} font-medium`}>Current Plan</p>
                  <p className={`text-2xl font-bold ${isBetaTester ? 'text-green-700' : isFreeTrial ? 'text-amber-700' : 'text-blue-700'}`}>
                    {isBetaTester ? 'Elite (Beta Tester)' : planInfo.name}
                  </p>
                </div>
                <div className="text-right">
                  {isBetaTester ? (
                    <p className="text-2xl font-bold text-green-700">All Access</p>
                  ) : (
                    <>
                      {planInfo.period && (
                        <p className={`text-sm ${isFreeTrial ? 'text-amber-600' : 'text-blue-600'}`}>{planInfo.period}</p>
                      )}
                      <p className={`text-2xl font-bold ${isFreeTrial ? 'text-amber-700' : 'text-blue-700'}`}>
                        {isFreeTrial ? 'No charge' : `${planInfo.price}/mo`}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {isBetaTester && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800 text-sm font-medium">
                  You have beta tester access — all features are unlocked at no charge. Thank you for testing!
                </p>
              </div>
            )}

            {isFreeTrial && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-amber-800 text-sm font-medium">
                  You are currently on the Free Trial. Choose a plan to unlock all features.
                </p>
              </div>
            )}

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-gray-600">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Unlimited jobs and invoices</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>CA Compliance tools</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>QuickBooks integration</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Priority support</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                onClick={() => router.push('/pricing')}
              >
                Manage Billing
              </button>
              <button
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => router.push('/pricing')}
              >
                View Plans
              </button>
            </div>
          </div>

          {/* Active Add-ons */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Add-ons</h2>
            {isBetaTester ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm font-medium">
                  All add-ons are included with your beta tester access.
                </p>
              </div>
            ) : activeAddons.length > 0 ? (
              <div className="space-y-3">
                {activeAddons.map((addonId) => {
                  const addon = ADDON_LABELS[addonId]
                  return (
                    <div key={addonId} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div>
                        <p className="text-sm font-semibold text-blue-800">{addon?.name || addonId}</p>
                        {addon?.description && (
                          <p className="text-xs text-blue-600 mt-0.5">{addon.description}</p>
                        )}
                      </div>
                      <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">Active</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500 text-sm mb-3">No add-ons active on your account.</p>
                <button
                  onClick={() => router.push('/pricing')}
                  className="text-sm text-orange-500 font-semibold hover:text-orange-600"
                >
                  Browse available add-ons
                </button>
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl border p-6">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Need Help?</h3>
            <p className="text-gray-500 text-sm mb-4">
              Contact our support team for billing questions or to cancel your subscription.
            </p>
            <a
              href="mailto:support@tooltimepro.com"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              support@tooltimepro.com
            </a>
          </div>
        </div>
        )
      })()}
    </div>
  )
}

function ChangePasswordCard() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    setSaving(true)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Password updated successfully!' })
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setMessage(null), 5000)
    }

    setSaving(false)
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="At least 8 characters"
            minLength={8}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Confirm your password"
            minLength={8}
            required
          />
        </div>
        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}

// Loading fallback for Suspense
function SettingsLoading() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-6"></div>
      <div className="flex gap-2 mb-6 border-b pb-2">
        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-10 w-28 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-10 w-28 bg-gray-200 rounded animate-pulse"></div>
      </div>
      <div className="bg-white rounded-xl border p-6">
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4"></div>
        <div className="space-y-4">
          <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
          <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
          <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsContent />
    </Suspense>
  )
}
