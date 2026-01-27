'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface BusinessHours {
  [key: string]: { open: string; close: string; enabled: boolean }
}

interface BookingSettings {
  days_ahead: number
  slot_duration: number
  business_hours: BusinessHours
}

interface Company {
  id: string
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  website: string
  logo_url: string | null
  booking_settings: BookingSettings | null
}

const DAYS = [
  { key: 'sunday', label: 'Sunday' },
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
]

const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  days_ahead: 14,
  slot_duration: 30,
  business_hours: {
    sunday: { open: '09:00', close: '17:00', enabled: false },
    monday: { open: '09:00', close: '17:00', enabled: true },
    tuesday: { open: '09:00', close: '17:00', enabled: true },
    wednesday: { open: '09:00', close: '17:00', enabled: true },
    thursday: { open: '09:00', close: '17:00', enabled: true },
    friday: { open: '09:00', close: '17:00', enabled: true },
    saturday: { open: '09:00', close: '13:00', enabled: false },
  },
}

export default function SettingsPage() {
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'company' | 'booking'>('company')

  // Company info form
  const [companyForm, setCompanyForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    website: '',
  })

  // Booking settings form
  const [bookingSettings, setBookingSettings] = useState<BookingSettings>(DEFAULT_BOOKING_SETTINGS)

  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (userData?.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', userData.company_id)
          .single()

        if (companyData) {
          setCompany(companyData)
          setCompanyForm({
            name: companyData.name || '',
            email: companyData.email || '',
            phone: companyData.phone || '',
            address: companyData.address || '',
            city: companyData.city || '',
            state: companyData.state || '',
            zip: companyData.zip || '',
            website: companyData.website || '',
          })

          if (companyData.booking_settings) {
            setBookingSettings({
              ...DEFAULT_BOOKING_SETTINGS,
              ...companyData.booking_settings,
            })
          }
        }
      }
      setLoading(false)
    }
    init()
  }, [router])

  const saveCompanyInfo = async () => {
    if (!company) return
    setSaving(true)

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
      alert('Error saving: ' + error.message)
    } else {
      alert('Company info saved!')
    }
    setSaving(false)
  }

  const saveBookingSettings = async () => {
    if (!company) return
    setSaving(true)

    const { error } = await supabase
      .from('companies')
      .update({
        booking_settings: bookingSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', company.id)

    if (error) {
      alert('Error saving: ' + error.message)
    } else {
      alert('Booking settings saved!')
    }
    setSaving(false)
  }

  const updateBusinessHours = (day: string, field: 'open' | 'close' | 'enabled', value: string | boolean) => {
    setBookingSettings({
      ...bookingSettings,
      business_hours: {
        ...bookingSettings.business_hours,
        [day]: {
          ...bookingSettings.business_hours[day],
          [field]: value,
        },
      },
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('company')}
          className={`px-4 py-2 font-medium border-b-2 -mb-px ${
            activeTab === 'company'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Company Info
        </button>
        <button
          onClick={() => setActiveTab('booking')}
          className={`px-4 py-2 font-medium border-b-2 -mb-px ${
            activeTab === 'booking'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          Online Booking
        </button>
      </div>

      {/* Company Info Tab */}
      {activeTab === 'company' && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                value={companyForm.name}
                onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={companyForm.city}
                  onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={companyForm.state}
                  onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="CA"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP
                </label>
                <input
                  type="text"
                  value={companyForm.zip}
                  onChange={(e) => setCompanyForm({ ...companyForm, zip: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                type="url"
                value={companyForm.website}
                onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://yourcompany.com"
              />
            </div>

            <div className="pt-4">
              <button
                onClick={saveCompanyInfo}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Company Info'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Settings Tab */}
      {activeTab === 'booking' && (
        <div className="space-y-6">
          {/* Booking Link */}
          {company && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-medium text-blue-800 mb-1">Your Booking Page</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded border text-sm">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/book/{company.id}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/book/${company.id}`)
                    alert('Link copied!')
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Copy
                </button>
                <a
                  href={`/book/${company.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 text-sm"
                >
                  Preview
                </a>
              </div>
            </div>
          )}

          {/* General Booking Settings */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Options</h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Days Available for Booking
                </label>
                <select
                  value={bookingSettings.days_ahead}
                  onChange={(e) => setBookingSettings({ ...bookingSettings, days_ahead: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={7}>1 week ahead</option>
                  <option value={14}>2 weeks ahead</option>
                  <option value={21}>3 weeks ahead</option>
                  <option value={30}>1 month ahead</option>
                  <option value={60}>2 months ahead</option>
                  <option value={90}>3 months ahead</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  How far in advance customers can book
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Slot Duration
                </label>
                <select
                  value={bookingSettings.slot_duration}
                  onChange={(e) => setBookingSettings({ ...bookingSettings, slot_duration: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Duration of each booking slot
                </p>
              </div>
            </div>
          </div>

          {/* Business Hours */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Hours</h2>
            <p className="text-sm text-gray-500 mb-4">
              Set the hours when customers can book appointments. Disabled days won&apos;t show on the booking page.
            </p>

            <div className="space-y-3">
              {DAYS.map((day) => (
                <div key={day.key} className="flex items-center gap-4 py-2 border-b last:border-0">
                  <div className="w-32">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bookingSettings.business_hours[day.key]?.enabled || false}
                        onChange={(e) => updateBusinessHours(day.key, 'enabled', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className={`text-sm font-medium ${
                        bookingSettings.business_hours[day.key]?.enabled ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {day.label}
                      </span>
                    </label>
                  </div>

                  {bookingSettings.business_hours[day.key]?.enabled ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={bookingSettings.business_hours[day.key]?.open || '09:00'}
                        onChange={(e) => updateBusinessHours(day.key, 'open', e.target.value)}
                        className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={bookingSettings.business_hours[day.key]?.close || '17:00'}
                        onChange={(e) => updateBusinessHours(day.key, 'close', e.target.value)}
                        className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Closed</span>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-6">
              <button
                onClick={saveBookingSettings}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Booking Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
