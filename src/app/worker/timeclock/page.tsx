'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslations } from 'next-intl'

interface TimeEntry {
  id: string
  job_id: string | null
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

interface WorkerJob {
  id: string
  title: string | null
  status: string
  scheduled_time_start: string | null
  customer: { name: string | null } | { name: string | null }[] | null
}

export default function TimeclockPage() {
  const t = useTranslations('worker.timeclock')
  const [userId, setUserId] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null)
  const [activeBreak, setActiveBreak] = useState<ActiveBreak | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [jobs, setJobs] = useState<WorkerJob[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>('')

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

  // Every exit from this has to clear `loading` — the page renders nothing but
  // a spinner while it is set, and no clock button exists in that state. When
  // only the happy path cleared it, a worker whose session or profile lookup
  // hiccuped was left on a spinner forever, with no error and no way to retry.
  const init = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      // No session is the logged-out case, not a fault: the layout above owns
      // the redirect to /worker/login, so bail quietly rather than flashing an
      // error card on the way out. Check the user before the error — Supabase
      // reports a missing session as one.
      if (!user) return

      if (authError) throw authError

      setUserId(user.id)

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (userError) throw userError
      if (!userData) throw new Error('No worker profile found for this account')

      setCompanyId(userData.company_id)

      // Clock state decides which button renders, so it must resolve before the
      // spinner clears. Today's jobs only fill a dropdown — load them in the
      // background instead of holding the whole page behind them.
      await fetchCurrentEntry(user.id)
      void fetchTodaysJobs(user.id, userData.company_id)
    } catch (err) {
      console.error('Error initializing timeclock:', err)
      // Supabase rejects with a plain `{ code, message }`, not an Error, so
      // String(err) here would put "[object Object]" on screen.
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : String(err)
      setLoadError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void init()
  }, [init])

  // Today's jobs assigned to this worker, so clocked time attaches to a real
  // job + customer instead of being orphaned ("Unknown Customer" / "No job").
  const fetchTodaysJobs = async (uId: string, compId: string) => {
    try {
      const { data: assignments } = await supabase
        .from('job_assignments')
        .select('job_id')
        .eq('user_id', uId)

      const jobIds = (assignments || []).map((a) => a.job_id).filter(Boolean)
      if (jobIds.length === 0) return

      const today = new Date().toISOString().split('T')[0]
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('id, title, status, scheduled_time_start, scheduled_date, customer:customers(name)')
        .in('id', jobIds)
        .eq('company_id', compId)
        .in('status', ['scheduled', 'in_progress'])

      const todays = ((jobsData as unknown as (WorkerJob & { scheduled_date: string | null })[]) || [])
        .filter((j) => j.scheduled_date === today)
      setJobs(todays)

      // Pre-select the most relevant job: one already in progress, else the
      // first of today's. The worker can still change or clear it.
      const preferred = todays.find((j) => j.status === 'in_progress') || todays[0]
      if (preferred) setSelectedJobId(preferred.id)
    } catch (err) {
      console.error('Error loading today\'s jobs for timeclock:', err)
    }
  }

  // Throws on a real failure so init() can show an error instead of guessing.
  // Reporting "clocked out" when the query actually failed is the dangerous
  // wrong answer: the worker clocks in again and opens a second entry.
  const fetchCurrentEntry = async (uId: string) => {
    // Today's open time entry (no clock_out). PGRST116 is .single()'s "no rows",
    // which is the ordinary clocked-out case rather than an error.
    const today = new Date().toISOString().split('T')[0]

    const { data: entry, error: entryError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', uId)
      .is('clock_out', null)
      .gte('clock_in', today)
      .order('clock_in', { ascending: false })
      .limit(1)
      .single()

    if (entryError && entryError.code !== 'PGRST116') throw entryError

    setCurrentEntry(entry || null)

    if (!entry) {
      setActiveBreak(null)
      return
    }

    // The break lookup stays best-effort: unlike the entry above it only drives
    // a label and the break buttons, and clockOut() clears breaks regardless —
    // not worth blocking the page (and the clock-out it offers) over.
    const { data: breakData, error: breakError } = await supabase
      .from('breaks')
      .select('*')
      .eq('time_entry_id', entry.id)
      .is('break_end', null)
      .single()

    if (breakError && breakError.code !== 'PGRST116') {
      console.error('Error fetching active break:', breakError.message)
    }

    setActiveBreak(breakData || null)
  }

  const clockIn = async () => {
    if (!userId || !companyId) return
    setActionLoading(true)

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        user_id: userId,
        company_id: companyId,
        job_id: selectedJobId || null,
        clock_in: new Date().toISOString(),
        clock_in_location: location,
      })
      .select()
      .single()

    if (error) {
      // Silently ignoring this left the button reading CLOCK IN with no entry
      // created and nothing said — the worker taps again and again, and the
      // shift never starts. Match clockOut()/startBreak() and say so.
      alert(t('clockInFailed') + error.message)
      setActionLoading(false)
      return
    }

    if (data) {
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

    const clockOutData: Record<string, unknown> = {
      clock_out: clockOutTime.toISOString(),
      clock_out_location: location,
      total_hours: Math.round(totalHours * 100) / 100,
      status: 'completed',
    }

    let { error } = await supabase
      .from('time_entries')
      .update(clockOutData)
      .eq('id', currentEntry.id)

    // A DB behind on migration 046 lacks time_entries.total_hours; strip it and
    // retry so the worker can still clock out.
    if (error && (error.code === '42703' || /total_hours/.test(error.message || ''))) {
      const retryData = { ...clockOutData }
      delete retryData.total_hours
      ;({ error } = await supabase.from('time_entries').update(retryData).eq('id', currentEntry.id))
    }

    if (error) {
      alert('Failed to clock out: ' + error.message)
      setActionLoading(false)
      return
    }

    setCurrentEntry(null)
    setActiveBreak(null)
    setActionLoading(false)
  }

  const startBreak = async (type: 'meal' | 'rest') => {
    if (!currentEntry || !userId) return
    setActionLoading(true)

    const { data, error } = await supabase
      .from('breaks')
      .insert({
        time_entry_id: currentEntry.id,
        user_id: userId,
        break_type: type,
        break_start: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      alert('Failed to start break: ' + error.message)
      setActionLoading(false)
      return
    }

    if (data) {
      setActiveBreak(data)
    }
    setActionLoading(false)
  }

  const endBreak = async () => {
    if (!activeBreak) return
    setActionLoading(true)

    const breakEnd = new Date()

    const { error } = await supabase
      .from('breaks')
      .update({
        break_end: breakEnd.toISOString(),
      })
      .eq('id', activeBreak.id)

    if (error) {
      alert('Failed to end break: ' + error.message)
      setActionLoading(false)
      return
    }

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

  if (loadError) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 text-center">
          <p className="text-lg font-semibold text-red-800 mb-2">{t('loadFailed')}</p>
          <p className="text-sm text-red-700 mb-4 break-words">{loadError}</p>
          <button
            onClick={() => void init()}
            className="w-full py-4 bg-red-600 text-white text-lg font-bold rounded-xl hover:bg-red-700 transition-colors"
          >
            {t('tryAgain')}
          </button>
        </div>
      </div>
    )
  }

  const isClockedIn = !!currentEntry
  const isOnBreak = !!activeBreak

  const jobLabel = (j: WorkerJob) => {
    const c = j.customer
    const name = Array.isArray(c) ? c[0]?.name : c?.name
    const cust = name || t('noCustomer')
    const title = j.title ? ` — ${j.title}` : ''
    return `${cust}${title}`
  }
  const currentJob = currentEntry?.job_id ? jobs.find((j) => j.id === currentEntry.job_id) : null

  return (
    <div className="max-w-md mx-auto">
      {/* Current Time Display */}
      <div className="bg-white rounded-2xl shadow-sm p-6 text-center mb-4">
        <p className="text-sm text-gray-500 mb-1">
          {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
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
            {isOnBreak ? (activeBreak.break_type === 'meal' ? t('onMealBreak') : t('onRestBreak')) :
             isClockedIn ? t('clockedIn') : t('clockedOut')}
          </p>

          {isClockedIn && (
            <>
              {currentJob && (
                <p className="text-sm font-medium text-gray-700">
                  {t('workingOn')}: {jobLabel(currentJob)}
                </p>
              )}
              <p className="text-sm text-gray-600">
                {t('since')} {new Date(currentEntry.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
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

      {/* Job selector — attach the shift to a job so hours aren't orphaned */}
      {!isClockedIn && jobs.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <label htmlFor="timeclock-job" className="block text-sm font-medium text-gray-700 mb-2">
            {t('jobForShift')}
          </label>
          <select
            id="timeclock-job"
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="w-full px-3 py-3 border rounded-xl text-base focus:ring-2 focus:ring-green-500"
          >
            <option value="">{t('generalShift')}</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{jobLabel(j)}</option>
            ))}
          </select>
        </div>
      )}

      {/* Main Action Button */}
      {!isClockedIn ? (
        <button
          onClick={clockIn}
          disabled={actionLoading}
          className="w-full py-6 bg-green-600 text-white text-2xl font-bold rounded-2xl hover:bg-green-700 disabled:opacity-50 transition-colors shadow-lg"
        >
          {actionLoading ? t('pleaseWait') : `▶ ${t('clockIn')}`}
        </button>
      ) : isOnBreak ? (
        <button
          onClick={endBreak}
          disabled={actionLoading}
          className="w-full py-6 bg-blue-600 text-white text-2xl font-bold rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg"
        >
          {actionLoading ? t('pleaseWait') : `✓ ${t('endBreak')}`}
        </button>
      ) : (
        <div className="space-y-3">
          <button
            onClick={clockOut}
            disabled={actionLoading}
            className="w-full py-6 bg-red-600 text-white text-2xl font-bold rounded-2xl hover:bg-red-700 disabled:opacity-50 transition-colors shadow-lg"
          >
            {actionLoading ? t('pleaseWait') : `⏹ ${t('clockOut')}`}
          </button>

          {/* Break Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => startBreak('meal')}
              disabled={actionLoading}
              className="py-4 bg-yellow-500 text-white font-semibold rounded-xl hover:bg-yellow-600 disabled:opacity-50 transition-colors"
            >
              🍽️ {t('mealBreak')}
            </button>
            <button
              onClick={() => startBreak('rest')}
              disabled={actionLoading}
              className="py-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              ☕ {t('restBreak')}
            </button>
          </div>
        </div>
      )}

      {/* Location Status */}
      <div className="mt-4 text-center">
        {location ? (
          <p className="text-sm text-green-600">📍 {t('gpsEnabled')}</p>
        ) : locationError ? (
          <p className="text-sm text-yellow-600">⚠️ {t('locationDenied')}</p>
        ) : (
          <p className="text-sm text-gray-500">📍 {t('gettingLocation')}</p>
        )}
      </div>

      {/* California Break Rules Notice */}
      <div className="mt-6 bg-blue-50 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-800 mb-2">{t('californiaBreakRules')}</p>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• {t('mealBreakRule')}</li>
          <li>• {t('restBreakRule')}</li>
          <li>• {t('secondMealRule')}</li>
        </ul>
      </div>
    </div>
  )
}
