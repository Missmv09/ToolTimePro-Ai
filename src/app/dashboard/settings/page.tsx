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
  default_quote_terms: string
}

// Plan display configuration mapping plan IDs to human-readable names and prices
const PLAN_CONFIG: Record<string, { name: string; price: string; period: string }> = {
  starter: { name: 'Starter', price: '$49', period: 'Monthly' },
  pro: { name: 'Pro', price: '$79', period: 'Monthly' },
  elite: { name: 'Elite', price: '$129', period: 'Monthly' },
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
    default_quote_terms: '',
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
        default_quote_terms: (company as unknown as Record<string, unknown>).default_quote_terms as string || '',
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
      const updateData: Record<string, unknown> = {
          name: companyForm.name,
          email: companyForm.email,
          phone: companyForm.phone,
          address: companyForm.address,
          city: companyForm.city,
          state: companyForm.state,
          zip: companyForm.zip,
          website: companyForm.website,
          default_quote_terms: companyForm.default_quote_terms,
          updated_at: new Date().toISOString(),
        }

      let { error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', company.id)

      // Retry without default_quote_terms if column doesn't exist
      if (error?.message?.includes('default_quote_terms')) {
        delete updateData.default_quote_terms
        const retry = await supabase.from('companies').update(updateData).eq('id', company.id)
        error = retry.error
      }

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

          {/* Two-Factor Authentication */}
          <TwoFactorCard />

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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Quote Terms & Conditions
                  </label>
                  <textarea
                    value={companyForm.default_quote_terms}
                    onChange={(e) => setCompanyForm({ ...companyForm, default_quote_terms: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Net 30 payment terms. 50% deposit required before work begins. All work guaranteed for 90 days. Cancellation fee of $50 applies within 24 hours of scheduled service."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    These terms will auto-populate on new quotes. You can edit them per quote.
                  </p>
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

          {/* Stripe Payments Integration */}
          <StripeConnectCard />
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
          keep_me_legal: { name: 'Compliance Autopilot', description: 'Automated compliance monitoring, law-change alerts & cert reminders' },
          quickbooks_sync: { name: 'QuickBooks Sync', description: 'Two-way QuickBooks integration' },
          portal_pro: { name: 'Customer Portal Pro', description: 'Branded customer portal with job tracker, photos, messaging & documents' },
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

function TwoFactorCard() {
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [phone, setPhone] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [showSetup, setShowSetup] = useState(false)
  const [saving, setSaving] = useState(false)
  const [disabling, setDisabling] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const load2FASettings = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return

        const res = await fetch('/api/auth/2fa/settings', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setEnabled(data.enabled)
          setPhone(data.phone || '')
          setEditPhone(data.phone || '')
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    load2FASettings()
  }, [])

  const handleEnable = async (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const digits = editPhone.replace(/\D/g, '')
    if (digits.length < 10) {
      setMessage({ type: 'error', text: 'Please enter a valid 10-digit phone number.' })
      return
    }

    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const res = await fetch('/api/auth/2fa/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ phone: editPhone }),
      })

      const data = await res.json()
      if (res.ok) {
        setEnabled(true)
        setPhone(editPhone)
        setShowSetup(false)
        setMessage({ type: 'success', text: 'Two-factor authentication enabled! You will receive a code on your next login from a new device.' })
        setTimeout(() => setMessage(null), 8000)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to enable 2FA' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to enable 2FA' })
    } finally {
      setSaving(false)
    }
  }

  const handleDisable = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will remove all trusted devices.')) return

    setDisabling(true)
    setMessage(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const res = await fetch('/api/auth/2fa/settings', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (res.ok) {
        setEnabled(false)
        setPhone('')
        setEditPhone('')
        setMessage({ type: 'success', text: 'Two-factor authentication disabled.' })
        setTimeout(() => setMessage(null), 5000)
      } else {
        setMessage({ type: 'error', text: 'Failed to disable 2FA' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to disable 2FA' })
    } finally {
      setDisabling(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Two-Factor Authentication</h2>
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h2>
        {enabled && (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            Enabled
          </span>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Add an extra layer of security by requiring a verification code sent to your phone when logging in from a new device.
      </p>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm mb-4 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {enabled ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Verification codes are sent to: <strong>***-***-{phone.slice(-4)}</strong>
          </p>
          <button
            onClick={handleDisable}
            disabled={disabling}
            className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {disabling ? 'Disabling...' : 'Disable 2FA'}
          </button>
        </div>
      ) : showSetup ? (
        <form onSubmit={handleEnable} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number for Verification Codes</label>
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="(555) 123-4567"
              required
            />
            <p className="text-xs text-gray-500 mt-1">We&apos;ll send a 6-digit code to this number when you log in from an unrecognized device.</p>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Enabling...' : 'Enable 2FA'}
            </button>
            <button
              type="button"
              onClick={() => { setShowSetup(false); setMessage(null) }}
              className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowSetup(true)}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Set Up 2FA
        </button>
      )}
    </div>
  )
}

// Loading fallback for Suspense
function StripeConnectCard() {
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [onboarded, setOnboarded] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return

        // Check URL params for return from Stripe
        const urlParams = new URLSearchParams(window.location.search)
        const stripeParam = urlParams.get('stripe')

        if (stripeParam === 'connected') {
          // Verify onboarding completed
          const cbRes = await fetch('/api/stripe/connect/callback', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
          if (cbRes.ok) {
            const cbData = await cbRes.json()
            if (cbData.onboarded) {
              setConnected(true)
              setOnboarded(true)
              setMessage({ type: 'success', text: 'Stripe connected! You can now accept online payments.' })
              setTimeout(() => setMessage(null), 8000)
            } else {
              setConnected(true)
              setMessage({ type: 'error', text: 'Stripe onboarding incomplete. Please try again to finish setup.' })
            }
          }
          // Clean URL
          window.history.replaceState({}, '', window.location.pathname + '?tab=integrations')
          setLoading(false)
          return
        }

        const res = await fetch('/api/stripe/connect/status', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setConnected(data.connected)
          setOnboarded(data.onboarded)
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    checkStatus()
  }, [])

  const handleConnect = async () => {
    setConnecting(true)
    setMessage(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to start Stripe setup' })
        setConnecting(false)
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to connect to Stripe' })
      setConnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Stripe Payments</h2>
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Stripe Payments</h2>
            <p className="text-sm text-gray-500">Accept online payments from your customers</p>
          </div>
        </div>
        {connected && onboarded && (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            Connected
          </span>
        )}
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm mb-4 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {connected && onboarded ? (
        <p className="text-sm text-gray-600">
          Your Stripe account is connected. Customers can pay invoices and deposits online. Payments go directly to your Stripe account.
        </p>
      ) : connected && !onboarded ? (
        <div className="space-y-3">
          <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
            Your Stripe account is created but onboarding is incomplete. Please finish setup to start accepting payments.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {connecting ? 'Redirecting...' : 'Complete Stripe Setup'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Connect your Stripe account to accept credit card payments on invoices and collect deposits on quotes. Payments go directly to your bank account.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {connecting ? 'Redirecting to Stripe...' : 'Connect Stripe'}
          </button>
        </div>
      )}
    </div>
  )
}

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
