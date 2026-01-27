'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

type Language = 'en' | 'es';

const translations = {
  en: {
    emergency: 'Emergency?',
    emergencyDesc: 'For life-threatening emergencies, call 911 immediately',
    call911: 'Call 911',
    report: 'Report',
    myReports: 'My Reports',
    safetyInfo: 'Safety Info',
    reportSafetyIssue: 'Report a Safety Issue',
    reportDesc: 'Report injuries, hazards, near misses, or equipment problems.',
    emergencyContacts: 'Emergency Contacts',
    reportsSubmitted: 'reports submitted',
    noIncidents: 'No incidents reported',
    greatJob: 'Great job staying safe!',
    dailySafetyReminders: 'Daily Safety Reminders',
    tip1: 'Wear appropriate PPE for the job',
    tip2: 'Stay hydrated, especially in hot weather',
    tip3: 'Use proper lifting techniques',
    tip4: 'Report hazards immediately',
    tip5: 'Take required breaks',
    californiaRequirements: 'California Requirements',
    caReq1: 'Heat Illness Prevention Plan required',
    caReq2: 'Access to water and shade',
    caReq3: 'Rest breaks in cool areas when hot',
    caReq4: 'Injury & Illness Prevention Program (IIPP)',
    ifInjured: "If You're Injured",
    injury1: 'Get medical attention if needed',
    injury2: 'Report injury to supervisor immediately',
    injury3: 'Fill out incident report (use Report tab)',
    injury4: "You have the right to workers' compensation",
    reportSafetyIssueModal: 'Report Safety Issue',
    whatType: 'What type of issue are you reporting?',
    howSerious: 'How serious is this issue?',
    continue: 'Continue',
    back: 'Back',
    briefTitle: 'Brief Title',
    location: 'Location',
    description: 'Description',
    titlePlaceholder: 'e.g., Broken ladder, Slippery floor',
    locationPlaceholder: 'e.g., 123 Main St backyard, Warehouse B',
    descPlaceholder: 'What happened? What did you see? Any injuries?',
    noteSubmit: 'Your report will be sent to your supervisor. For emergencies, call 911 first.',
    submitting: 'Submitting...',
    submitReport: 'Submit Report',
    enterTitle: 'Please enter a title for the incident',
    errorSubmitting: 'Error submitting report: ',
    // Incident types
    injury: 'Injury',
    nearMiss: 'Near Miss',
    hazard: 'Hazard',
    equipment: 'Equipment Issue',
    vehicle: 'Vehicle Incident',
    other: 'Other',
    // Severity
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  },
  es: {
    emergency: '¿Emergencia?',
    emergencyDesc: 'Para emergencias que amenazan la vida, llame al 911 inmediatamente',
    call911: 'Llamar 911',
    report: 'Reportar',
    myReports: 'Mis Reportes',
    safetyInfo: 'Info Seguridad',
    reportSafetyIssue: 'Reportar un Problema de Seguridad',
    reportDesc: 'Reporta lesiones, peligros, casi accidentes o problemas de equipo.',
    emergencyContacts: 'Contactos de Emergencia',
    reportsSubmitted: 'reportes enviados',
    noIncidents: 'No hay incidentes reportados',
    greatJob: '¡Excelente trabajo manteniéndote seguro!',
    dailySafetyReminders: 'Recordatorios de Seguridad Diarios',
    tip1: 'Usa el EPP apropiado para el trabajo',
    tip2: 'Mantente hidratado, especialmente en clima caliente',
    tip3: 'Usa técnicas apropiadas de levantamiento',
    tip4: 'Reporta peligros inmediatamente',
    tip5: 'Toma los descansos requeridos',
    californiaRequirements: 'Requisitos de California',
    caReq1: 'Plan de Prevención de Enfermedades por Calor requerido',
    caReq2: 'Acceso a agua y sombra',
    caReq3: 'Descansos en áreas frescas cuando hace calor',
    caReq4: 'Programa de Prevención de Lesiones y Enfermedades (IIPP)',
    ifInjured: 'Si Te Lesionas',
    injury1: 'Obtén atención médica si es necesario',
    injury2: 'Reporta la lesión a tu supervisor inmediatamente',
    injury3: 'Llena el reporte de incidentes (usa la pestaña Reportar)',
    injury4: 'Tienes derecho a compensación laboral',
    reportSafetyIssueModal: 'Reportar Problema de Seguridad',
    whatType: '¿Qué tipo de problema estás reportando?',
    howSerious: '¿Qué tan serio es este problema?',
    continue: 'Continuar',
    back: 'Atrás',
    briefTitle: 'Título Breve',
    location: 'Ubicación',
    description: 'Descripción',
    titlePlaceholder: 'ej., Escalera rota, Piso resbaloso',
    locationPlaceholder: 'ej., 123 Calle Main patio trasero, Bodega B',
    descPlaceholder: '¿Qué pasó? ¿Qué viste? ¿Alguna lesión?',
    noteSubmit: 'Tu reporte será enviado a tu supervisor. Para emergencias, llama al 911 primero.',
    submitting: 'Enviando...',
    submitReport: 'Enviar Reporte',
    enterTitle: 'Por favor ingresa un título para el incidente',
    errorSubmitting: 'Error al enviar reporte: ',
    // Incident types
    injury: 'Lesión',
    nearMiss: 'Casi Accidente',
    hazard: 'Peligro',
    equipment: 'Problema de Equipo',
    vehicle: 'Incidente Vehicular',
    other: 'Otro',
    // Severity
    low: 'Bajo',
    medium: 'Medio',
    high: 'Alto',
    critical: 'Crítico',
  },
};

interface Incident {
  id: string
  incident_type: string
  severity: string
  title: string
  description: string
  location: string
  status: string
  incident_date: string
  created_at: string
}

interface EmergencyContact {
  name: string
  role: string
  phone: string
}

const getIncidentTypes = (t: typeof translations['en']) => [
  { value: 'injury', label: t.injury, icon: '🤕' },
  { value: 'near_miss', label: t.nearMiss, icon: '⚠️' },
  { value: 'hazard', label: t.hazard, icon: '🚧' },
  { value: 'equipment', label: t.equipment, icon: '🔧' },
  { value: 'vehicle', label: t.vehicle, icon: '🚗' },
  { value: 'other', label: t.other, icon: '📋' },
];

const getSeverityLevels = (t: typeof translations['en']) => [
  { value: 'low', label: t.low, color: 'bg-green-100 text-green-700' },
  { value: 'medium', label: t.medium, color: 'bg-yellow-100 text-yellow-700' },
  { value: 'high', label: t.high, color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: t.critical, color: 'bg-red-100 text-red-700' },
];

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
  const [language, setLanguage] = useState<Language>('en')

  const t = translations[language]
  const incidentTypes = getIncidentTypes(t)
  const severityLevels = getSeverityLevels(t)

  const fetchIncidents = useCallback(async (cId: string, uId: string) => {
    const { data } = await supabase
      .from('incidents')
      .select('*')
      .eq('company_id', cId)
      .eq('reported_by', uId)
      .order('created_at', { ascending: false })
      .limit(20)

    setIncidents(data || [])
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      // Get user's company and emergency contacts
      const { data: userData } = await supabase
        .from('users')
        .select('company_id, company:companies(name, phone, emergency_contacts)')
        .eq('id', user.id)
        .single()

      if (userData?.company_id) {
        setCompanyId(userData.company_id)

        // Set emergency contacts from company or defaults
        const companyData = userData.company as { name?: string; phone?: string; emergency_contacts?: EmergencyContact[] } | null
        const companyContacts = companyData?.emergency_contacts || []
        setEmergencyContacts(companyContacts.length > 0 ? companyContacts : [
          { name: 'Emergency Services', role: '911', phone: '911' },
          { name: 'Company Office', role: 'Main Line', phone: companyData?.phone || '' },
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
      {/* Language Toggle */}
      <div className="flex justify-end mb-4">
        <div className="flex rounded-lg overflow-hidden border border-gray-300">
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              language === 'en' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('es')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              language === 'es' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            ES
          </button>
        </div>
      </div>

      {/* Emergency Banner */}
      <div className="bg-red-600 text-white rounded-xl p-4 mb-4">
        <p className="font-bold text-lg mb-1">🚨 {t.emergency}</p>
        <p className="text-red-100 text-sm mb-3">{t.emergencyDesc}</p>
        <a
          href="tel:911"
          className="inline-block bg-white text-red-600 font-bold px-6 py-2 rounded-lg"
        >
          {t.call911}
        </a>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl p-1 mb-4 shadow-sm">
        {[
          { key: 'report', label: t.report, icon: '📝' },
          { key: 'history', label: t.myReports, icon: '📋' },
          { key: 'info', label: t.safetyInfo, icon: 'ℹ️' },
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
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{t.reportSafetyIssue}</h2>
            <p className="text-sm text-gray-500 mb-4">
              {t.reportDesc}
            </p>

            <div className="grid grid-cols-2 gap-3">
              {incidentTypes.map((type) => (
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
            <h3 className="font-semibold text-gray-900 mb-3">{t.emergencyContacts}</h3>
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
            <h2 className="font-semibold text-gray-900">{t.myReports}</h2>
            <p className="text-sm text-gray-500">{incidents.length} {t.reportsSubmitted}</p>
          </div>

          {incidents.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-4xl mb-2">✅</p>
              <p>{t.noIncidents}</p>
              <p className="text-sm">{t.greatJob}</p>
            </div>
          ) : (
            <div className="divide-y">
              {incidents.map((incident) => (
                <div key={incident.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getIncidentIcon(incident.incident_type)}</span>
                      <div>
                        <p className="font-medium text-gray-900">{incident.title}</p>
                        <p className="text-sm text-gray-500">{formatDate(incident.created_at)}</p>
                        {incident.location && (
                          <p className="text-sm text-gray-400">📍 {incident.location}</p>
                        )}
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
            <h3 className="font-semibold text-gray-900 mb-3">{t.dailySafetyReminders}</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                {t.tip1}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                {t.tip2}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                {t.tip3}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                {t.tip4}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                {t.tip5}
              </li>
            </ul>
          </div>

          {/* California Requirements */}
          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
            <h3 className="font-semibold text-yellow-800 mb-2">🏛️ {t.californiaRequirements}</h3>
            <ul className="space-y-2 text-sm text-yellow-700">
              <li>• {t.caReq1}</li>
              <li>• {t.caReq2}</li>
              <li>• {t.caReq3}</li>
              <li>• {t.caReq4}</li>
            </ul>
          </div>

          {/* Workers Comp Info */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">💼 {t.ifInjured}</h3>
            <ol className="space-y-2 text-sm text-blue-700 list-decimal list-inside">
              <li>{t.injury1}</li>
              <li>{t.injury2}</li>
              <li>{t.injury3}</li>
              <li>{t.injury4}</li>
            </ol>
          </div>
        </div>
      )}

      {/* Report Incident Modal */}
      {showReportModal && companyId && userId && (
        <ReportIncidentModal
          companyId={companyId}
          userId={userId}
          language={language}
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

function ReportIncidentModal({ companyId, userId, language, onClose, onSave }: {
  companyId: string
  userId: string
  language: Language
  onClose: () => void
  onSave: () => void
}) {
  const t = translations[language]
  const incidentTypes = getIncidentTypes(t)
  const severityLevels = getSeverityLevels(t)

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
      alert(t.enterTitle)
      return
    }

    setSaving(true)

    const { error } = await supabase.from('incidents').insert({
      company_id: companyId,
      reported_by: userId,
      incident_type: formData.incident_type,
      severity: formData.severity,
      title: formData.title,
      description: formData.description,
      location: formData.location,
      status: 'reported',
      incident_date: new Date().toISOString(),
    })

    if (error) {
      alert(t.errorSubmitting + error.message)
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
          <h2 className="text-lg font-semibold">{t.reportSafetyIssueModal}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            ✕
          </button>
        </div>

        {step === 'type' && (
          <div className="p-4">
            <p className="text-sm text-gray-500 mb-4">{t.whatType}</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {incidentTypes.map((type) => (
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

            <p className="text-sm text-gray-500 mb-3">{t.howSerious}</p>

            <div className="flex gap-2 mb-6">
              {severityLevels.map((level) => (
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
              {t.continue}
            </button>
          </div>
        )}

        {step === 'details' && (
          <div className="p-4">
            <button
              onClick={() => setStep('type')}
              className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1 text-sm"
            >
              ← {t.back}
            </button>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.briefTitle} *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                  placeholder={t.titlePlaceholder}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.location}
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                  placeholder={t.locationPlaceholder}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.description}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
                  placeholder={t.descPlaceholder}
                />
              </div>

              <div className="bg-yellow-50 rounded-xl p-3 text-sm text-yellow-800">
                <strong>Note:</strong> {t.noteSubmit}
              </div>

              <button
                onClick={handleSubmit}
                disabled={saving || !formData.title}
                className="w-full py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? t.submitting : `🚨 ${t.submitReport}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
