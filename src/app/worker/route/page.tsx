'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslations } from 'next-intl'
import {
  Navigation,
  MapPin,
  CheckCircle,
  Clock,
  ChevronRight,
  Route,
  RefreshCw,
} from 'lucide-react'

interface RouteStop {
  id: string
  lat: number
  lng: number
  label?: string
}

interface SavedRouteData {
  id: string
  name: string
  route_date: string
  ordered_job_ids: string[]
  route_data: {
    orderedPoints: RouteStop[]
    totalDistanceMiles: number
    totalDriveTimeMinutes: number
    milesSaved: number
    percentImprovement: number
  }
}

interface JobDetails {
  id: string
  title: string
  address: string | null
  city: string | null
  scheduled_time_start: string | null
  status: string
  customer: { name: string } | { name: string }[] | null
}

function getCustomerName(customer: JobDetails['customer']): string {
  if (!customer) return 'Customer'
  if (Array.isArray(customer)) return customer[0]?.name || 'Customer'
  return customer.name || 'Customer'
}

export default function WorkerRoutePage() {
  const t = useTranslations('worker.route')
  const [route, setRoute] = useState<SavedRouteData | null>(null)
  const [jobs, setJobs] = useState<JobDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [completedStops, setCompletedStops] = useState<Set<string>>(new Set())

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const fetchRoute = async () => {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return

        // Fetch assigned route for today
        const res = await fetch(`/api/routes/worker/${user.id}?date=${today}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })

        if (res.ok) {
          const data = await res.json()
          if (data) {
            setRoute(data)

            // Fetch job details for the route
            const jobIds = data.ordered_job_ids || []
            if (jobIds.length > 0) {
              const { data: jobsData } = await supabase
                .from('jobs')
                .select('id, title, address, city, scheduled_time_start, status, customer:customers(name)')
                .in('id', jobIds)

              if (jobsData) {
                // Sort by route order
                const jobMap = new Map(jobsData.map((j: JobDetails) => [j.id, j]))
                const orderedJobs = jobIds.map((id: string) => jobMap.get(id)).filter(Boolean) as JobDetails[]
                setJobs(orderedJobs)

                // Mark completed jobs
                const completed = new Set<string>()
                orderedJobs.forEach((j) => {
                  if (j.status === 'completed') completed.add(j.id)
                })
                setCompletedStops(completed)
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching route:', err)
      }
      setLoading(false)
    }
    fetchRoute()
  }, [today])

  const toggleComplete = (jobId: string) => {
    setCompletedStops((prev) => {
      const next = new Set(prev)
      if (next.has(jobId)) {
        next.delete(jobId)
      } else {
        next.add(jobId)
      }
      return next
    })
  }

  // Find next incomplete stop
  const nextStopIndex = jobs.findIndex((j) => !completedStops.has(j.id))
  const nextStop = nextStopIndex >= 0 ? jobs[nextStopIndex] : null
  const progress = jobs.length > 0 ? Math.round((completedStops.size / jobs.length) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!route || jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <Route className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-500 mb-2">{t('noRoute')}</h2>
        <p className="text-sm text-gray-400">{t('noRouteDescription')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Route Header */}
      <div className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Route className="w-5 h-5 text-blue-600" />
            {t('title')}
          </h1>
          <span className="text-sm text-gray-500">{today}</span>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-500">
          {completedStops.size} / {jobs.length} {t('stopsCompleted')} &middot;{' '}
          {route.route_data?.totalDistanceMiles || 0} mi &middot;{' '}
          ~{route.route_data?.totalDriveTimeMinutes || 0} min
        </p>
      </div>

      {/* Next Stop Card */}
      {nextStop && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-blue-600 uppercase mb-1">{t('nextStop')}</p>
          <h3 className="font-bold text-gray-900 text-lg">{getCustomerName(nextStop.customer)}</h3>
          <p className="text-sm text-gray-600 mb-3">
            {nextStop.address}{nextStop.city ? `, ${nextStop.city}` : ''}
          </p>
          <div className="flex gap-2">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                `${nextStop.address || ''}${nextStop.city ? `, ${nextStop.city}` : ''}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-semibold text-sm"
            >
              <Navigation className="w-4 h-4" /> {t('directions')}
            </a>
            <button
              onClick={() => toggleComplete(nextStop.id)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold text-sm"
            >
              <CheckCircle className="w-4 h-4" /> {t('complete')}
            </button>
          </div>
        </div>
      )}

      {/* All Stops List */}
      <div className="space-y-2">
        {jobs.map((job, index) => {
          const isCompleted = completedStops.has(job.id)
          const isCurrent = index === nextStopIndex
          return (
            <div
              key={job.id}
              className={`bg-white rounded-xl p-3 border-2 transition-all ${
                isCurrent ? 'border-blue-300 shadow-md' : isCompleted ? 'border-green-200 opacity-60' : 'border-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleComplete(job.id)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {isCompleted ? <CheckCircle className="w-4 h-4" /> : <span className="text-sm font-bold">{index + 1}</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${isCompleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {getCustomerName(job.customer)}
                  </p>
                  <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {job.address}{job.city ? `, ${job.city}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {job.scheduled_time_start && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {job.scheduled_time_start}
                    </span>
                  )}
                  {!isCompleted && job.address && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                        `${job.address}${job.city ? `, ${job.city}` : ''}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-blue-500"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
