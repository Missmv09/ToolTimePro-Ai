'use client'

import { Suspense, useEffect, useState, FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import QuickBooksConnect from '@/components/settings/QuickBooksConnect'
import GoogleCalendarConnect from '@/components/settings/GoogleCalendarConnect'

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
  payment_instructions: string
  license_number: string
  insurance_policy_number: string
  insurance_expiration: string
  tax_id: string
  business_hours: Record<string, { open: string; close: string }>
  service_area_radius: string
  company_description: string
  default_hourly_rate: string
  preferred_language: string
}

const DAYS_OF_WEEK = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
] as const

const DEFAULT_HOURS = { open: '08:00', close: '17:00' }

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
  const { user, dbUser, company, refreshUserData } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialTab = (tabParam === 'integrations' || tabParam === 'subscription') ? tabParam : 'account'
  const [activeTab, setActiveTab] = useState<'account' | 'integrations' | 'subscription'>(initialTab)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [qboConnected, setQboConnected] = useState(false)
  const [qboConnectionInfo, setQboConnectionInfo] = useState<{
    lastSyncAt: string | null
    syncStatus: string
  } | null>(null)

  // Payment methods
  const PAYMENT_METHOD_OPTIONS = [
    { id: 'zelle', label: 'Zelle', icon: '💸', placeholder: 'Email or phone number' },
    { id: 'venmo', label: 'Venmo', icon: '💜', placeholder: '@YourHandle' },
    { id: 'cashapp', label: 'Cash App', icon: '💚', placeholder: '$YourCashTag' },
    { id: 'paypal', label: 'PayPal', icon: '🅿️', placeholder: 'paypal.me/yourname or email' },
    { id: 'square', label: 'Square', icon: '⬜', placeholder: 'Square payment link URL' },
    { id: 'check', label: 'Check', icon: '📝', placeholder: 'Payable to: Your Business Name LLC' },
    { id: 'cash', label: 'Cash', icon: '💵', placeholder: '' },
    { id: 'other', label: 'Other', icon: '💳', placeholder: 'Payment details or instructions' },
  ] as const

  const [paymentMethods, setPaymentMethods] = useState<{ method: string; handle: string; is_preferred: boolean }[]>([])
  const [savingPaymentMethods, setSavingPaymentMethods] = useState(false)

  // Load payment methods
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      if (!company?.id) return
      const { data, error } = await supabase
        .from('company_payment_methods')
        .select('method, handle, is_preferred, sort_order')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .order('sort_order')
      if (error) {
        // Table may not exist yet if migration hasn't been applied
        console.warn('Could not load payment methods:', error.message)
        return
      }
      if (data) {
        setPaymentMethods(data.map(d => ({ method: d.method, handle: d.handle || '', is_preferred: d.is_preferred })))
      }
    }
    fetchPaymentMethods()
  }, [company?.id])

  const toggleSettingsPaymentMethod = (methodId: string) => {
    setPaymentMethods(prev => {
      const exists = prev.find(m => m.method === methodId)
      if (exists) {
        return prev.filter(m => m.method !== methodId)
      }
      const isFirst = prev.length === 0
      return [...prev, { method: methodId, handle: '', is_preferred: isFirst }]
    })
  }

  const updatePaymentHandle = (methodId: string, handle: string) => {
    setPaymentMethods(prev => prev.map(m => m.method === methodId ? { ...m, handle } : m))
  }

  const setPreferredMethod = (methodId: string) => {
    setPaymentMethods(prev => prev.map(m => ({ ...m, is_preferred: m.method === methodId })))
  }

  const savePaymentMethods = async () => {
    if (!company) return
    setSavingPaymentMethods(true)
    setSaveMessage(null)

    let tableAvailable = true

    try {
      // Delete existing then insert fresh
      const { error: deleteError } = await supabase.from('company_payment_methods').delete().eq('company_id', company.id)

      if (deleteError && (deleteError.message.includes('schema cache') || deleteError.message.includes('does not exist') || deleteError.code === '42P01')) {
        tableAvailable = false
        console.warn('company_payment_methods table not available yet:', deleteError.message)
      } else if (deleteError) {
        throw deleteError
      }

      if (tableAvailable && paymentMethods.length > 0) {
        const records = paymentMethods.map((m, index) => ({
          company_id: company.id,
          method: m.method,
          handle: m.handle || null,
          is_active: true,
          is_preferred: m.is_preferred,
          sort_order: index,
        }))
        const { error } = await supabase.from('company_payment_methods').insert(records)
        if (error) throw error
      }

      // Always sync payment_instructions as fallback
      const instructionLines = paymentMethods
        .filter(m => m.handle)
        .map(m => {
          const opt = PAYMENT_METHOD_OPTIONS.find(o => o.id === m.method)
          return `${opt?.label || m.method}: ${m.handle}`
        })
      await supabase
        .from('companies')
        .update({ payment_instructions: instructionLines.length > 0 ? instructionLines.join('\n') : null })
        .eq('id', company.id)

      setSaveMessage({ type: 'success', text: 'Payment methods saved!' })
    } catch (err) {
      console.error('Save payment methods error:', err)
      setSaveMessage({ type: 'error', text: 'Failed to save payment methods.' })
    } finally {
      setSavingPaymentMethods(false)
      setTimeout(() => setSaveMessage(null), 5000)
    }
  }

  // Quote approval settings
  const [quoteApprovalRequired, setQuoteApprovalRequired] = useState(false)
  const [quoteApproverIds, setQuoteApproverIds] = useState<string[]>([])
  const [teamMembers, setTeamMembers] = useState<{ id: string; full_name: string; role: string }[]>([])
  const [savingApproval, setSavingApproval] = useState(false)

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
    payment_instructions: '',
    license_number: '',
    insurance_policy_number: '',
    insurance_expiration: '',
    tax_id: '',
    business_hours: {},
    service_area_radius: '',
    company_description: '',
    default_hourly_rate: '',
    preferred_language: 'en',
  })

  // Initialize form when company data loads
  useEffect(() => {
    if (company) {
      const c = company as unknown as Record<string, unknown>
      setCompanyForm({
        name: company.name || '',
        email: company.email || '',
        phone: company.phone || '',
        address: company.address || '',
        city: company.city || '',
        state: company.state || '',
        zip: company.zip || '',
        website: company.website || '',
        default_quote_terms: (c.default_quote_terms as string) || '',
        payment_instructions: company.payment_instructions || '',
        license_number: (c.license_number as string) || '',
        insurance_policy_number: (c.insurance_policy_number as string) || '',
        insurance_expiration: (c.insurance_expiration as string) || '',
        tax_id: (c.tax_id as string) || '',
        business_hours: (c.business_hours as Record<string, { open: string; close: string }>) || {},
        service_area_radius: c.service_area_radius ? String(c.service_area_radius) : '',
        company_description: (c.company_description as string) || '',
        default_hourly_rate: c.default_hourly_rate ? String(c.default_hourly_rate) : '',
        preferred_language: (c.preferred_language as string) || 'en',
      })
      // Load quote approval settings
      const approvalSettings = c.quote_approval_settings as { required?: boolean; approver_ids?: string[] } | null
      if (approvalSettings) {
        setQuoteApprovalRequired(approvalSettings.required || false)
        setQuoteApproverIds(approvalSettings.approver_ids || [])
      }
    }
  }, [company])

  // Fetch team members for approver selection (owners only)
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!company?.id || dbUser?.role !== 'owner') return
      const { data } = await supabase
        .from('users')
        .select('id, full_name, role')
        .eq('company_id', company.id)
        .order('full_name')
      if (data) setTeamMembers(data)
    }
    fetchTeamMembers()
  }, [company?.id, dbUser?.role])

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
      } catch (err) {
        // No connection found is expected; log real errors
        if (err instanceof Error && !err.message?.includes('PGRST116')) {
          console.warn('QBO connection check error:', err.message)
        }
      }
    }

    checkQboConnection()
  }, [company?.id])

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

    // Validate required fields
    if (!companyForm.name.trim()) {
      setSaveMessage({ type: 'error', text: 'Business Name is required.' })
      return
    }
    if (!companyForm.phone.trim()) {
      setSaveMessage({ type: 'error', text: 'Business Phone is required — it appears on your invoices and quotes.' })
      return
    }

    setSaving(true)
    setSaveMessage(null)

    try {
      // Core fields that are guaranteed to exist in the DB
      const coreData: Record<string, unknown> = {
        name: companyForm.name,
        email: companyForm.email,
        phone: companyForm.phone,
        address: companyForm.address,
        city: companyForm.city,
        state: companyForm.state,
        zip: companyForm.zip,
        updated_at: new Date().toISOString(),
      }

      // Extended fields from migration 028 — save gracefully if columns exist
      const extendedData: Record<string, unknown> = {
        website: companyForm.website || null,
        default_quote_terms: companyForm.default_quote_terms || null,
        payment_instructions: companyForm.payment_instructions || null,
        license_number: companyForm.license_number || null,
        insurance_policy_number: companyForm.insurance_policy_number || null,
        insurance_expiration: companyForm.insurance_expiration || null,
        tax_id: companyForm.tax_id || null,
        business_hours: Object.keys(companyForm.business_hours).length > 0 ? companyForm.business_hours : null,
        service_area_radius: companyForm.service_area_radius ? Number(companyForm.service_area_radius) : null,
        company_description: companyForm.company_description || null,
        default_hourly_rate: companyForm.default_hourly_rate ? Number(companyForm.default_hourly_rate) : null,
        preferred_language: companyForm.preferred_language || 'en',
      }

      // Try saving all fields at once
      let { error } = await supabase
        .from('companies')
        .update({ ...coreData, ...extendedData })
        .eq('id', company.id)

      // If extended columns don't exist yet, fall back to core fields only
      if (error?.message?.includes('schema cache') || error?.message?.includes('column')) {
        const retry = await supabase.from('companies').update(coreData).eq('id', company.id)
        error = retry.error
        if (!error) {
          setSaveMessage({ type: 'success', text: 'Core info saved! Run migration 028 to enable all profile fields.' })
          setTimeout(() => setSaveMessage(null), 5000)
          setSaving(false)
          return
        }
      }

      if (error) {
        setSaveMessage({ type: 'error', text: 'Error saving: ' + error.message })
      } else {
        // Refresh AuthContext so dashboard checklist sees updated company data
        await refreshUserData()
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

  const saveQuoteApprovalSettings = async () => {
    if (!company) return
    setSavingApproval(true)
    const settings = {
      required: quoteApprovalRequired,
      approver_ids: quoteApprovalRequired ? quoteApproverIds : [],
    }
    const { error } = await supabase
      .from('companies')
      .update({ quote_approval_settings: settings, updated_at: new Date().toISOString() })
      .eq('id', company.id)

    if (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save approval settings: ' + error.message })
    } else {
      setSaveMessage({ type: 'success', text: 'Quote approval settings saved!' })
      setTimeout(() => setSaveMessage(null), 3000)
    }
    setSavingApproval(false)
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
              <p className="text-xs text-gray-400"><span className="text-red-500">*</span> = required</p>
            </div>

            {!company ? (
              <div className="text-center py-8 text-gray-500">
                <p>No company associated with your account.</p>
                <p className="text-sm mt-2">Please contact support if this is an error.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* === CORE INFO === */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="(555) 123-4567"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Appears on invoices, quotes, and your booking page.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address <span className="text-red-500">*</span>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={companyForm.city}
                      onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State <span className="text-red-500">*</span>
                    </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={companyForm.zip}
                      onChange={(e) => setCompanyForm({ ...companyForm, zip: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* === PROFESSIONAL DETAILS === */}
                <div className="border-t pt-6">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">Professional Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contractor License #
                      </label>
                      <input
                        type="text"
                        value={companyForm.license_number}
                        onChange={(e) => setCompanyForm({ ...companyForm, license_number: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. CSLB #1234567"
                      />
                      <p className="text-xs text-gray-500 mt-1">Auto-prints on quotes &amp; invoices. Required in CA, FL, TX.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax ID / EIN
                      </label>
                      <input
                        type="text"
                        value={companyForm.tax_id}
                        onChange={(e) => setCompanyForm({ ...companyForm, tax_id: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. 12-3456789"
                      />
                      <p className="text-xs text-gray-500 mt-1">Appears on professional invoices. Set it once, never retype.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Insurance Policy #
                      </label>
                      <input
                        type="text"
                        value={companyForm.insurance_policy_number}
                        onChange={(e) => setCompanyForm({ ...companyForm, insurance_policy_number: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Policy number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Insurance Expiration
                      </label>
                      <input
                        type="date"
                        value={companyForm.insurance_expiration}
                        onChange={(e) => setCompanyForm({ ...companyForm, insurance_expiration: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Jenny AI will alert you before it expires.</p>
                    </div>
                  </div>
                </div>

                {/* === ONLINE PRESENCE === */}
                <div className="border-t pt-6">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">Online Presence</h3>
                  <div className="grid grid-cols-2 gap-4">
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Language</label>
                      <select
                        value={companyForm.preferred_language}
                        onChange={(e) => setCompanyForm({ ...companyForm, preferred_language: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish / Espa&ntilde;ol</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Language for customer-facing documents.</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Description
                    </label>
                    <textarea
                      value={companyForm.company_description}
                      onChange={(e) => setCompanyForm({ ...companyForm, company_description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tell your customers about your business — this shows on your booking page and customer portal."
                    />
                  </div>
                </div>

                {/* === OPERATIONS === */}
                <div className="border-t pt-6">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">Operations</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Hourly Rate
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={companyForm.default_hourly_rate}
                          onChange={(e) => setCompanyForm({ ...companyForm, default_hourly_rate: e.target.value })}
                          className="w-full pl-7 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="75.00"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Auto-fills on new jobs. No more retyping every time.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Service Area (miles)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={companyForm.service_area_radius}
                        onChange={(e) => setCompanyForm({ ...companyForm, service_area_radius: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="25"
                      />
                      <p className="text-xs text-gray-500 mt-1">Jenny AI filters out-of-area leads automatically.</p>
                    </div>
                  </div>

                  {/* Business Hours */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Hours</label>
                    <div className="space-y-2">
                      {DAYS_OF_WEEK.map(({ key, label }) => {
                        const dayHours = companyForm.business_hours[key]
                        const isOpen = !!dayHours
                        return (
                          <div key={key} className="flex items-center gap-3">
                            <label className="flex items-center gap-2 w-16">
                              <input
                                type="checkbox"
                                checked={isOpen}
                                onChange={(e) => {
                                  const updated = { ...companyForm.business_hours }
                                  if (e.target.checked) {
                                    updated[key] = { ...DEFAULT_HOURS }
                                  } else {
                                    delete updated[key]
                                  }
                                  setCompanyForm({ ...companyForm, business_hours: updated })
                                }}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{label}</span>
                            </label>
                            {isOpen ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="time"
                                  value={dayHours.open}
                                  onChange={(e) => {
                                    const updated = { ...companyForm.business_hours }
                                    updated[key] = { ...updated[key], open: e.target.value }
                                    setCompanyForm({ ...companyForm, business_hours: updated })
                                  }}
                                  className="px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <span className="text-gray-400 text-sm">to</span>
                                <input
                                  type="time"
                                  value={dayHours.close}
                                  onChange={(e) => {
                                    const updated = { ...companyForm.business_hours }
                                    updated[key] = { ...updated[key], close: e.target.value }
                                    setCompanyForm({ ...companyForm, business_hours: updated })
                                  }}
                                  className="px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">Closed</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Used for your booking page and Jenny AI after-hours auto-responses.
                    </p>
                  </div>
                </div>

                {/* === INVOICING & QUOTES === */}
                <div className="border-t pt-6">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">Invoicing &amp; Quotes</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Quote Terms &amp; Conditions
                    </label>
                    <textarea
                      value={companyForm.default_quote_terms}
                      onChange={(e) => setCompanyForm({ ...companyForm, default_quote_terms: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. Net 30 payment terms. 50% deposit required before work begins. All work guaranteed for 90 days."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Auto-populates on new quotes. You can edit per quote.
                    </p>
                  </div>

                </div>

                <div className="pt-4 border-t">
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

          {/* Quote Approval Workflow — Owner only */}
          {dbUser?.role === 'owner' && company && (
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Quote Approval Workflow</h2>
              <p className="text-sm text-gray-500 mb-4">
                Control whether quotes need internal approval before being sent to customers.
              </p>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={quoteApprovalRequired}
                  onChange={(e) => {
                    setQuoteApprovalRequired(e.target.checked)
                    if (!e.target.checked) setQuoteApproverIds([])
                  }}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Require approval before sending quotes</span>
                  <p className="text-xs text-gray-500">
                    When enabled, team members must submit quotes for approval. Only designated approvers can send quotes to customers.
                  </p>
                </div>
              </label>

              {quoteApprovalRequired && (
                <div className="mt-4 pl-8">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Who can approve &amp; send quotes?
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    You (the owner) can always approve. Select additional team members below.
                  </p>
                  {teamMembers.filter(m => m.id !== user?.id).length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No other team members found. Only you can approve quotes.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {teamMembers
                        .filter(m => m.id !== user?.id)
                        .map((member) => (
                          <label key={member.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={quoteApproverIds.includes(member.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setQuoteApproverIds([...quoteApproverIds, member.id])
                                } else {
                                  setQuoteApproverIds(quoteApproverIds.filter(id => id !== member.id))
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                              <span className="text-sm text-gray-900">{member.full_name}</span>
                              <span className="text-xs text-gray-400 ml-2 capitalize">({member.role.replace('_', ' ')})</span>
                            </div>
                          </label>
                        ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={saveQuoteApprovalSettings}
                  disabled={savingApproval}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {savingApproval ? 'Saving...' : 'Save Approval Settings'}
                </button>
              </div>
            </div>
          )}
          {/* Payment Methods */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Payment Methods</h2>
            <p className="text-sm text-gray-500 mb-4">
              Select how your customers can pay you. These options appear on your invoices.
            </p>

            <div className="space-y-3">
              {PAYMENT_METHOD_OPTIONS.map((opt) => {
                const active = paymentMethods.find(m => m.method === opt.id)
                const isPreferred = active?.is_preferred
                return (
                  <div key={opt.id}>
                    <button
                      type="button"
                      onClick={() => toggleSettingsPaymentMethod(opt.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors text-left ${
                        active
                          ? 'border-emerald-400 bg-emerald-50'
                          : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                      }`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <span className="text-sm font-medium text-gray-900 flex-1">{opt.label}</span>
                      {active && (
                        <span
                          onClick={(e) => { e.stopPropagation(); setPreferredMethod(opt.id) }}
                          className={`text-xs px-2 py-0.5 rounded-full cursor-pointer ${
                            isPreferred
                              ? 'bg-amber-100 text-amber-700 border border-amber-300'
                              : 'bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-600'
                          }`}
                        >
                          {isPreferred ? 'Preferred' : 'Set preferred'}
                        </span>
                      )}
                      {active && (
                        <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    {active && opt.placeholder && (
                      <div className="ml-12 mt-2 mb-1">
                        <input
                          type="text"
                          value={active.handle}
                          onChange={(e) => updatePaymentHandle(opt.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder={opt.placeholder}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="pt-4 mt-4 border-t">
              <button
                onClick={savePaymentMethods}
                disabled={savingPaymentMethods}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {savingPaymentMethods ? 'Saving...' : 'Save Payment Methods'}
              </button>
            </div>
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

            {/* Google Calendar Integration */}
            <GoogleCalendarConnect />
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
  const [smsConsent, setSmsConsent] = useState(false)
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

    if (!smsConsent) {
      setMessage({ type: 'error', text: 'You must agree to receive SMS verification codes to enable 2FA.' })
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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={smsConsent}
                onChange={(e) => setSmsConsent(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm text-gray-700">
                I agree to receive SMS text messages containing verification codes for two-factor authentication at the phone number provided above.
                Msg &amp; data rates may apply. Frequency varies based on login activity. Reply <strong>STOP</strong> to opt out or <strong>HELP</strong> for help at any time.
                View our{' '}
                <a href="/sms" target="_blank" className="text-blue-600 underline">SMS Terms</a>
                {' '}and{' '}
                <a href="/privacy" target="_blank" className="text-blue-600 underline">Privacy Policy</a>.
              </span>
            </label>
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
