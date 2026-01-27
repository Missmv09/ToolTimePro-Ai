'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Language = 'en' | 'es';

const translations = {
  en: {
    clockedIn: 'Clocked In',
    clockedOut: 'Clocked Out',
    onMealBreak: 'On Meal Break',
    onRestBreak: 'On Rest Break',
    since: 'Since',
    pleaseWait: 'Please wait...',
    clockIn: 'CLOCK IN',
    clockOut: 'CLOCK OUT',
    endBreak: 'END BREAK',
    mealBreak: 'Meal Break',
    restBreak: 'Rest Break',
    gpsEnabled: 'GPS location enabled',
    gettingLocation: 'Getting location...',
    locationDenied: 'Location access denied. Clock in/out will work without GPS.',
    californiaBreakRules: 'California Break Rules',
    rule1: '30-min meal break before 5th hour',
    rule2: '10-min rest break per 4 hours worked',
    rule3: 'Second meal break if working 10+ hours',
  },
  es: {
    clockedIn: 'Fichado',
    clockedOut: 'No Fichado',
    onMealBreak: 'En Descanso de Comida',
    onRestBreak: 'En Descanso',
    since: 'Desde',
    pleaseWait: 'Por favor espera...',
    clockIn: 'FICHAR ENTRADA',
    clockOut: 'FICHAR SALIDA',
    endBreak: 'TERMINAR DESCANSO',
    mealBreak: 'Descanso Comida',
    restBreak: 'Descanso Corto',
    gpsEnabled: 'Ubicación GPS activada',
    gettingLocation: 'Obteniendo ubicación...',
    locationDenied: 'Acceso a ubicación denegado. Fichar funcionará sin GPS.',
    californiaBreakRules: 'Reglas de Descanso de California',
    rule1: 'Descanso de 30 min antes de la 5ta hora',
    rule2: 'Descanso de 10 min por cada 4 horas trabajadas',
    rule3: 'Segundo descanso de comida si trabajas 10+ horas',
  },
};

interface TimeEntry {
  id: string
  clock_in: string
  clock_out: string | null
  clock_in_location: { lat: number; lng: number } | null
  clock_out_location: { lat: number; lng: number } | null
  total_hours: number | null
  notes: string
}

interface ActiveBreak {
  id: string
  break_start: string
  break_type: 'meal' | 'rest'
}

export default function TimeclockPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null)
  const [activeBreak, setActiveBreak] = useState<ActiveBreak | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [language, setLanguage] = useState<Language>('en')

  const t = translations[language]

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Get location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        () => {
          setLocationError('Location access denied. Clock in/out will work without GPS.')
        }
      )
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (userData) {
        setCompanyId(userData.company_id)
        fetchCurrentEntry(user.id)
      }
    }
    init()
  }, [])

  const fetchCurrentEntry = async (uId: string) => {
    // Get today's open time entry (no clock_out)
    const today = new Date().toISOString().split('T')[0]

    const { data: entry } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', uId)
      .is('clock_out', null)
      .gte('clock_in', today)
      .order('clock_in', { ascending: false })
      .limit(1)
      .single()

    if (entry) {
      setCurrentEntry(entry)

      // Check for active break
      const { data: breakData } = await supabase
        .from('breaks')
        .select('*')
        .eq('time_entry_id', entry.id)
        .is('break_end', null)
        .single()

      if (breakData) {
        setActiveBreak(breakData)
      }
    }

    setLoading(false)
  }

  const clockIn = async () => {
    if (!userId || !companyId) return
    setActionLoading(true)

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        user_id: userId,
        company_id: companyId,
        clock_in: new Date().toISOString(),
        clock_in_location: location,
      })
      .select()
      .single()

    if (!error && data) {
      setCurrentEntry(data)
    }
    setActionLoading(false)
  }

  const clockOut = async () => {
    if (!currentEntry) return
    setActionLoading(true)

    const clockOutTime = new Date()
    const clockInTime = new Date(currentEntry.clock_in)
    const totalHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)

    await supabase
      .from('time_entries')
      .update({
        clock_out: clockOutTime.toISOString(),
        clock_out_location: location,
        total_hours: Math.round(totalHours * 100) / 100,
      })
      .eq('id', currentEntry.id)

    setCurrentEntry(null)
    setActiveBreak(null)
    setActionLoading(false)
  }

  const startBreak = async (type: 'meal' | 'rest') => {
    if (!currentEntry) return
    setActionLoading(true)

    const { data } = await supabase
      .from('breaks')
      .insert({
        time_entry_id: currentEntry.id,
        break_type: type,
        break_start: new Date().toISOString(),
      })
      .select()
      .single()

    if (data) {
      setActiveBreak(data)
    }
    setActionLoading(false)
  }

  const endBreak = async () => {
    if (!activeBreak) return
    setActionLoading(true)

    const breakStart = new Date(activeBreak.break_start)
    const breakEnd = new Date()
    const duration = Math.round((breakEnd.getTime() - breakStart.getTime()) / (1000 * 60))

    await supabase
      .from('breaks')
      .update({
        break_end: breakEnd.toISOString(),
        duration_minutes: duration,
      })
      .eq('id', activeBreak.id)

    setActiveBreak(null)
    setActionLoading(false)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  }

  const formatDuration = (start: string) => {
    const startTime = new Date(start)
    const now = new Date()
    const diff = now.getTime() - startTime.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const isClockedIn = !!currentEntry
  const isOnBreak = !!activeBreak

  return (
    <div className="max-w-md mx-auto">
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

      {/* Current Time Display */}
      <div className="bg-white rounded-2xl shadow-sm p-6 text-center mb-4">
        <p className="text-sm text-gray-500 mb-1">
          {currentTime.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <p className="text-4xl font-bold text-gray-900 font-mono">
          {formatTime(currentTime)}
        </p>
      </div>

      {/* Status Card */}
      <div className={`rounded-2xl shadow-sm p-6 mb-4 ${
        isOnBreak ? 'bg-yellow-50 border-2 border-yellow-300' :
        isClockedIn ? 'bg-green-50 border-2 border-green-300' :
        'bg-gray-50 border-2 border-gray-200'
      }`}>
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">
            {isOnBreak ? (activeBreak.break_type === 'meal' ? t.onMealBreak : t.onRestBreak) :
             isClockedIn ? t.clockedIn : t.clockedOut}
          </p>

          {isClockedIn && (
            <>
              <p className="text-sm text-gray-600">
                {t.since} {new Date(currentEntry.clock_in).toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatDuration(currentEntry.clock_in)}
              </p>
            </>
          )}

          {isOnBreak && (
            <p className="text-2xl font-bold text-yellow-700 mt-2">
              {formatDuration(activeBreak.break_start)}
            </p>
          )}
        </div>
      </div>

      {/* Main Action Button */}
      {!isClockedIn ? (
        <button
          onClick={clockIn}
          disabled={actionLoading}
          className="w-full py-6 bg-green-600 text-white text-2xl font-bold rounded-2xl hover:bg-green-700 disabled:opacity-50 transition-colors shadow-lg"
        >
          {actionLoading ? t.pleaseWait : `▶ ${t.clockIn}`}
        </button>
      ) : isOnBreak ? (
        <button
          onClick={endBreak}
          disabled={actionLoading}
          className="w-full py-6 bg-blue-600 text-white text-2xl font-bold rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg"
        >
          {actionLoading ? t.pleaseWait : `✓ ${t.endBreak}`}
        </button>
      ) : (
        <div className="space-y-3">
          <button
            onClick={clockOut}
            disabled={actionLoading}
            className="w-full py-6 bg-red-600 text-white text-2xl font-bold rounded-2xl hover:bg-red-700 disabled:opacity-50 transition-colors shadow-lg"
          >
            {actionLoading ? t.pleaseWait : `⏹ ${t.clockOut}`}
          </button>

          {/* Break Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => startBreak('meal')}
              disabled={actionLoading}
              className="py-4 bg-yellow-500 text-white font-semibold rounded-xl hover:bg-yellow-600 disabled:opacity-50 transition-colors"
            >
              🍽️ {t.mealBreak}
            </button>
            <button
              onClick={() => startBreak('rest')}
              disabled={actionLoading}
              className="py-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              ☕ {t.restBreak}
            </button>
          </div>
        </div>
      )}

      {/* Location Status */}
      <div className="mt-4 text-center">
        {location ? (
          <p className="text-sm text-green-600">📍 {t.gpsEnabled}</p>
        ) : locationError ? (
          <p className="text-sm text-yellow-600">⚠️ {t.locationDenied}</p>
        ) : (
          <p className="text-sm text-gray-500">📍 {t.gettingLocation}</p>
        )}
      </div>

      {/* California Break Rules Notice */}
      <div className="mt-6 bg-blue-50 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-800 mb-2">{t.californiaBreakRules}</p>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• {t.rule1}</li>
          <li>• {t.rule2}</li>
          <li>• {t.rule3}</li>
        </ul>
      </div>
    </div>
  )
}
