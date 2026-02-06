'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface Incident {
  id: string
  incident_type: string
  severity: string
  description: string
  status: string
  created_at: string
}

interface EmergencyContact {
  name: string
  role: string
  phone: string
}

const INCIDENT_TYPES = [
  { value: 'injury', label: 'Injury', icon: '🤕' },
  { value: 'near_miss', label: 'Near Miss', icon: '⚠️' },
  { value: 'hazard', label: 'Hazard', icon: '🚧' },
  { value: 'equipment', label: 'Equipment Issue', icon: '🔧' },
  { value: 'vehicle', label: 'Vehicle Incident', icon: '🚗' },
  { value: 'other', label: 'Other', icon: '📋' },
]

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-700' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700' },
]

export default function WorkerSafetyPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([])
  const [loading, setLoading] = useState(true)
  const [showReportModal, setShowReportModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'report' | 'history' | 'info'>('report')

  const fetchIncidents = useCallback(async (cId: string, uId: string) => {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('company_id', cId)
      .eq('user_id', uId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching incidents:', error)
    }
    setIncidents(data || [])
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      // Get user's company info
      const { data: userData } = await supabase
        .from('users')
        .select('company_id, company:companies(name, phone)')
        .eq('id', user.id)
        .single()

      if (userData?.company_id) {
        setCompanyId(userData.company_id)

        // Set emergency contacts with defaults
        const companyData = userData.company as { name?: string; phone?: string } | null
        setEmergencyContacts([
          { name: 'Emergency Services', role: '911', phone: '911' },
          { name: companyData?.name || 'Company Office', role: 'Main Line', phone: companyData?.phone || '' },
        ])

        fetchIncidents(userData.company_id, user.id)
      }
      setLoading(false)
    }
    init()
  }, [fetchIncidents])

  const getSeverityStyle = (severity: string) => {
    return SEVERITY_LEVELS.find(s => s.value === severity)?.color || 'bg-gray-100 text-gray-700'
  }

  const getIncidentIcon = (type: string) => {
    return INCIDENT_TYPES.find(t => t.value === type)?.icon || '📋'
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-4">
      {/* Emergency Banner */}
      <div className="bg-red-600 text-white rounded-xl p-4 mb-4">
        <p className="font-bold text-lg mb-1">🚨 Emergency?</p>
        <p className="text-red-100 text-sm mb-3">For life-threatening emergencies, call 911 immediately</p>
        <a
          href="tel:911"
          className="inline-block bg-white text-red-600 font-bold px-6 py-2 rounded-lg"
        >
          Call 911
        </a>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl p-1 mb-4 shadow-sm">
        {[
          { key: 'report', label: 'Report', icon: '📝' },
          { key: 'history', label: 'My Reports', icon: '📋' },
          { key: 'info', label: 'Safety Info', icon: 'ℹ️' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'report' | 'history' | 'info')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Report Tab */}
      {activeTab === 'report' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Report a Safety Issue</h2>
            <p className="text-sm text-gray-500 mb-4">
              Report injuries, hazards, near misses, or equipment problems.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {INCIDENT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setShowReportModal(true)}
                  className="flex flex-col items-center p-4 bg-gray-50 rounded-xl hover:bg-blue-50 hover:border-blue-300 border-2 border-transparent transition-colors"
                >
                  <span className="text-3xl mb-2">{type.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Emergency Contacts */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Emergency Contacts</h3>
            <div className="space-y-2">
              {emergencyContacts.map((contact, index) => (
                <a
                  key={index}
                  href={`tel:${contact.phone}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div>
                    <p className="font-medium text-gray-900">{contact.name}</p>
                    <p className="text-sm text-gray-500">{contact.role}</p>
                  </div>
                  <span className="text-blue-600 font-medium">📞 {contact.phone}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900">My Reports</h2>
            <p className="text-sm text-gray-500">{incidents.length} reports submitted</p>
          </div>

          {incidents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-4xl mb-2">✅</p>
              <p>No incidents reported</p>
              <p className="text-sm">Great job staying safe!</p>
            </div>
          ) : (
            <div className="divide-y">
              {incidents.map((incident) => (
                <div key={incident.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getIncidentIcon(incident.incident_type)}</span>
                      <div>
                        <p className="font-medium text-gray-900">{incident.description?.split('\n')[0] || 'Incident'}</p>
                        <p className="text-sm text-gray-500">{formatDate(incident.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs px-2 py-1 rounded-full ${getSeverityStyle(incident.severity)}`}>
                        {incident.severity}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        incident.status === 'resolved' ? 'bg-green-100 text-green-700' :
                        incident.status === 'investigating' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {incident.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info Tab */}
      {activeTab === 'info' && (
        <div className="space-y-4">
          {/* Safety Tips */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Daily Safety Reminders</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Wear appropriate PPE for the job
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Stay hydrated, especially in hot weather
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Use proper lifting techniques
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Report hazards immediately
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Take required breaks
              </li>
            </ul>
          </div>

          {/* California Requirements */}
          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
            <h3 className="font-semibold text-yellow-800 mb-2">🏛️ California Requirements</h3>
            <ul className="space-y-2 text-sm text-yellow-700">
              <li>• Heat Illness Prevention Plan required</li>
              <li>• Access to water and shade</li>
              <li>• Rest breaks in cool areas when hot</li>
              <li>• Injury & Illness Prevention Program (IIPP)</li>
            </ul>
          </div>

          {/* Workers Comp Info */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">💼 If You&apos;re Injured</h3>
            <ol className="space-y-2 text-sm text-blue-700 list-decimal list-inside">
              <li>Get medical attention if needed</li>
              <li>Report injury to supervisor immediately</li>
              <li>Fill out incident report (use Report tab)</li>
              <li>You have the right to workers&apos; compensation</li>
            </ol>
          </div>
        </div>
      )}

      {/* Report Incident Modal */}
      {showReportModal && companyId && userId && (
        <ReportIncidentModal
          companyId={companyId}
          userId={userId}
          onClose={() => setShowReportModal(false)}
          onSave={() => {
            setShowReportModal(false)
            if (companyId && userId) fetchIncidents(companyId, userId)
          }}
        />
      )}
    </div>
  )
}

function ReportIncidentModal({ companyId, userId, onClose, onSave }: {
  companyId: string
  userId: string
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    incident_type: 'hazard',
    severity: 'medium',
    title: '',
    description: '',
    location: '',
  })
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState<'type' | 'details'>('type')

  const handleSubmit = async () => {
    if (!formData.title) {
      alert('Please enter a title for the incident')
      return
    }

    setSaving(true)

    // Build a comprehensive description that includes title and location
    const fullDescription = [
      formData.title,
      formData.location ? `Location: ${formData.location}` : '',
      formData.description,
    ].filter(Boolean).join('\n')

    const { error } = await supabase.from('incidents').insert({
      company_id: companyId,
      user_id: userId,
      incident_type: formData.incident_type,
      severity: formData.severity,
      description: fullDescription,
      status: 'open',
    })

    if (error) {
      alert('Error submitting report: ' + error.message)
      setSaving(false)
      return
    }

    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Report Safety Issue</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            ✕
          </button>
        </div>

        {step === 'type' && (
          <div className="p-4">
            <p className="text-sm text-gray-500 mb-4">What type of issue are you reporting?</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {INCIDENT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setFormData({ ...formData, incident_type: type.value })}
                  className={`flex flex-col items-center p-4 rounded-xl border-2 transition-colors ${
                    formData.incident_type === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl mb-1">{type.icon}</span>
                  <span className="text-sm font-medium">{type.label}</span>
                </button>
              ))}
            </div>

            <p className="text-sm text-gray-500 mb-3">How serious is this issue?</p>

            <div className="flex gap-2 mb-6">
              {SEVERITY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setFormData({ ...formData, severity: level.value })}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                    formData.severity === level.value
                      ? `${level.color} border-current`
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep('details')}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700"
            >
              Continue
            </button>
          </div>
        )}

        {step === 'details' && (
          <div className="p-4">
            <button
              onClick={() => setStep('type')}
              className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1 text-sm"
            >
              ← Back
            </button>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brief Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Broken ladder, Slippery floor"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 123 Main St backyard, Warehouse B"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                  placeholder="What happened? What did you see? Any injuries?"
                />
              </div>

              <div className="bg-yellow-50 rounded-xl p-3 text-sm text-yellow-800">
                <strong>Note:</strong> Your report will be sent to your supervisor. For emergencies, call 911 first.
              </div>

              <button
                onClick={handleSubmit}
                disabled={saving || !formData.title}
                className="w-full py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Submitting...' : '🚨 Submit Report'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
