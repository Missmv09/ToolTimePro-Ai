'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Job {
  id: string
  title: string
  address: string
  scheduled_date: string
  scheduled_time_start: string
  scheduled_time_end: string
  status: string
  customer: { name: string } | { name: string }[] | null
  assigned_users: { user: { full_name: string } | { full_name: string }[] | null }[]
}

export default function SchedulePage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')

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
        setCompanyId(userData.company_id)
        fetchJobs(userData.company_id, selectedDate)
      }
    }
    init()
  }, [router])

  const fetchJobs = async (compId: string, date: string) => {
    setLoading(true)

    let startDate = date
    let endDate = date

    if (viewMode === 'week') {
      const d = new Date(date)
      const day = d.getDay()
      const diff = d.getDate() - day
      startDate = new Date(d.setDate(diff)).toISOString().split('T')[0]
      endDate = new Date(d.setDate(diff + 6)).toISOString().split('T')[0]
    }

    const { data, error } = await supabase
      .from('jobs')
      .select(`
        id, title, address, scheduled_date, scheduled_time_start, scheduled_time_end, status,
        customer:customers(name),
        assigned_users:job_assignments(user:users(full_name))
      `)
      .eq('company_id', compId)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .order('scheduled_time_start')

    if (error) {
      console.error('Error fetching jobs:', error)
    } else {
      setJobs(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (companyId) {
      fetchJobs(companyId, selectedDate)
    }
  }, [selectedDate, viewMode, companyId])

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate.toISOString().split('T')[0])
  }

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0])
  }

  const statusColors: Record<string, string> = {
    scheduled: 'border-l-blue-500 bg-blue-50',
    in_progress: 'border-l-yellow-500 bg-yellow-50',
    completed: 'border-l-green-500 bg-green-50',
    cancelled: 'border-l-gray-500 bg-gray-50',
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Helper to get customer name (handles both object and array from Supabase)
  const getCustomerName = (customer: Job['customer']): string => {
    if (!customer) return 'No customer'
    if (Array.isArray(customer)) {
      return customer[0]?.name || 'No customer'
    }
    return customer.name || 'No customer'
  }

  // Group jobs by date for week view
  const jobsByDate = jobs.reduce((acc, job) => {
    const date = job.scheduled_date
    if (!acc[date]) acc[date] = []
    acc[date].push(job)
    return acc
  }, {} as Record<string, Job[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <Link
          href="/dashboard/jobs"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Job
        </Link>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeDate(viewMode === 'week' ? -7 : -1)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
          >
            ←
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium"
          >
            Today
          </button>
          <button
            onClick={() => changeDate(viewMode === 'week' ? 7 : 1)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
          >
            →
          </button>
        </div>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        />

        <div className="flex rounded-lg overflow-hidden border">
          <button
            onClick={() => setViewMode('day')}
            className={`px-4 py-2 text-sm font-medium ${viewMode === 'day' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}`}
          >
            Day
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 text-sm font-medium ${viewMode === 'week' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}`}
          >
            Week
          </button>
        </div>

        <p className="text-lg font-semibold text-gray-700 ml-auto">
          {formatDate(selectedDate)}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-600">Scheduled</p>
          <p className="text-2xl font-bold text-blue-700">
            {jobs.filter(j => j.status === 'scheduled').length}
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-600">In Progress</p>
          <p className="text-2xl font-bold text-yellow-700">
            {jobs.filter(j => j.status === 'in_progress').length}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-600">Completed</p>
          <p className="text-2xl font-bold text-green-700">
            {jobs.filter(j => j.status === 'completed').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold">{jobs.length}</p>
        </div>
      </div>

      {/* Schedule View */}
      {viewMode === 'day' ? (
        // Day View
        <div className="bg-white rounded-xl shadow-sm border">
          {jobs.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No jobs scheduled for this day.
              <Link href="/dashboard/jobs" className="block mt-2 text-blue-600 hover:text-blue-800">
                Create a new job →
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {jobs.map((job) => (
                <Link key={job.id} href={`/dashboard/jobs?edit=${job.id}`}>
                  <div className={`p-4 border-l-4 hover:bg-gray-50 ${statusColors[job.status] || ''}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{job.title}</p>
                        <p className="text-sm text-gray-600">{getCustomerName(job.customer)}</p>
                        <p className="text-sm text-gray-500">{job.address}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {job.scheduled_time_start || 'TBD'}
                          {job.scheduled_time_end && ` - ${job.scheduled_time_end}`}
                        </p>
                        <p className="text-sm text-gray-500">
                          {job.assigned_users?.map(a => {
                            if (!a.user) return null
                            if (Array.isArray(a.user)) return a.user[0]?.full_name
                            return a.user.full_name
                          }).filter(Boolean).join(', ') || 'Unassigned'}
                        </p>
                        <span className={`inline-block mt-1 text-xs px-2 py-1 rounded-full ${
                          job.status === 'completed' ? 'bg-green-100 text-green-700' :
                          job.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Week View
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(selectedDate)
            const day = d.getDay()
            const diff = d.getDate() - day + i
            const date = new Date(d.setDate(diff))
            const dateStr = date.toISOString().split('T')[0]
            const dayJobs = jobsByDate[dateStr] || []
            const isToday = dateStr === new Date().toISOString().split('T')[0]

            return (
              <div key={i} className={`bg-white rounded-lg border min-h-[200px] ${isToday ? 'ring-2 ring-blue-500' : ''}`}>
                <div className={`p-2 border-b text-center ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-500">{date.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                  <p className={`text-lg font-bold ${isToday ? 'text-blue-600' : ''}`}>{date.getDate()}</p>
                </div>
                <div className="p-2 space-y-1">
                  {dayJobs.map((job) => (
                    <Link key={job.id} href={`/dashboard/jobs?edit=${job.id}`}>
                      <div className={`p-2 rounded text-xs border-l-2 ${statusColors[job.status] || 'border-l-gray-300'} hover:opacity-80`}>
                        <p className="font-medium truncate">{job.title}</p>
                        <p className="text-gray-500">{job.scheduled_time_start || 'TBD'}</p>
                      </div>
                    </Link>
                  ))}
                  {dayJobs.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">No jobs</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
