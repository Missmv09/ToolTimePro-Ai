'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Accessibility,
  Heart,
  Palmtree,
  ThermometerSun,
  Users,
  Calendar,
  ArrowLeft
} from 'lucide-react'

// Note types with colors
const NOTE_TYPE_CONFIG = {
  injury: { label: 'Injury', icon: AlertTriangle, color: 'bg-red-500', lightColor: 'bg-red-100 text-red-700' },
  ada: { label: 'ADA', icon: Accessibility, color: 'bg-purple-500', lightColor: 'bg-purple-100 text-purple-700' },
  fmla: { label: 'FMLA', icon: Heart, color: 'bg-orange-500', lightColor: 'bg-orange-100 text-orange-700' },
  vacation: { label: 'Time Off', icon: Palmtree, color: 'bg-blue-500', lightColor: 'bg-blue-100 text-blue-700' },
  sick: { label: 'Sick', icon: ThermometerSun, color: 'bg-yellow-500', lightColor: 'bg-yellow-100 text-yellow-700' },
} as const

type NoteType = keyof typeof NOTE_TYPE_CONFIG

interface WorkerNote {
  id: string
  worker_id: string
  note_type: NoteType
  title: string
  start_date: string | null
  end_date: string | null
  expected_return_date: string | null
  is_active: boolean
  worker?: { id: string; full_name: string }
}

interface DayEntry {
  date: Date
  workers: {
    id: string
    name: string
    noteType: NoteType
    title: string
  }[]
}

export default function AvailabilityCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [notes, setNotes] = useState<WorkerNote[]>([])
  const [loading, setLoading] = useState(true)

  const router = useRouter()
  const { user, dbUser, isLoading: authLoading } = useAuth()
  const companyId = dbUser?.company_id || null

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/auth/login')
      return
    }
    if (companyId) {
      fetchNotes(companyId)
    } else {
      setLoading(false)
    }
  }, [authLoading, user, companyId, router])

  const fetchNotes = async (companyId: string) => {
    const { data, error } = await supabase
      .from('worker_notes')
      .select(`
        id,
        worker_id,
        note_type,
        title,
        start_date,
        end_date,
        expected_return_date,
        is_active,
        worker:users!worker_notes_worker_id_fkey(id, full_name)
      `)
      .eq('company_id', companyId)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching notes:', error)
    } else {
      // Transform the data to handle Supabase's array return for joins
      const transformedData = (data || []).map(note => ({
        ...note,
        worker: Array.isArray(note.worker) ? note.worker[0] : note.worker
      })) as WorkerNote[]
      setNotes(transformedData)
    }
    setLoading(false)
  }

  // Get calendar days for current month
  const getCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const days: Date[] = []

    // Add days from previous month to fill first week
    const startPadding = firstDay.getDay()
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i))
    }

    // Add all days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }

    // Add days from next month to fill last week
    const endPadding = 6 - lastDay.getDay()
    for (let i = 1; i <= endPadding; i++) {
      days.push(new Date(year, month + 1, i))
    }

    return days
  }

  // Check if a worker is out on a specific date
  const getWorkersOutOnDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]

    return notes.filter(note => {
      const startDate = note.start_date
      const endDate = note.end_date || note.expected_return_date

      if (!startDate) return false

      const isAfterStart = dateStr >= startDate
      const isBeforeEnd = !endDate || dateStr <= endDate

      return isAfterStart && isBeforeEnd
    }).map(note => ({
      id: note.worker_id,
      name: (note.worker as any)?.full_name || 'Unknown',
      noteType: note.note_type,
      title: note.title
    }))
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  const calendarDays = getCalendarDays()
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  // Get unique workers out this month for the legend
  const workersOutThisMonth = [...new Set(
    calendarDays
      .filter(d => isCurrentMonth(d))
      .flatMap(d => getWorkersOutOnDate(d))
      .map(w => JSON.stringify({ id: w.id, name: w.name, noteType: w.noteType }))
  )].map(s => JSON.parse(s))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/team"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-navy-500">Team Availability</h1>
            <p className="text-gray-500 text-sm mt-1">See who&apos;s out and when</p>
          </div>
        </div>
        <Link
          href="/dashboard/team"
          className="px-4 py-2 border border-navy-500 text-navy-500 rounded-lg hover:bg-navy-50 flex items-center gap-2 transition-colors"
        >
          <Users size={18} />
          Team List
        </Link>
      </div>

      {/* Calendar Controls */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-card mb-6">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
            <h2 className="text-lg font-semibold text-navy-500 ml-2">{monthName}</h2>
          </div>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm bg-navy-500 text-white rounded-lg hover:bg-navy-600 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, idx) => {
              const workersOut = getWorkersOutOnDate(date)
              const inCurrentMonth = isCurrentMonth(date)
              const today = isToday(date)

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] p-2 rounded-lg border transition-colors ${
                    today
                      ? 'border-gold-500 bg-gold-50'
                      : inCurrentMonth
                        ? 'border-gray-200 bg-white hover:border-gray-300'
                        : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    today
                      ? 'text-gold-600'
                      : inCurrentMonth
                        ? 'text-navy-500'
                        : 'text-gray-400'
                  }`}>
                    {date.getDate()}
                  </div>

                  {/* Workers out */}
                  <div className="space-y-1">
                    {workersOut.slice(0, 3).map((worker, wIdx) => {
                      const config = NOTE_TYPE_CONFIG[worker.noteType]
                      return (
                        <div
                          key={wIdx}
                          className={`text-xs px-1.5 py-0.5 rounded truncate ${config.lightColor}`}
                          title={`${worker.name} - ${worker.title}`}
                        >
                          {worker.name.split(' ')[0]}
                        </div>
                      )
                    })}
                    {workersOut.length > 3 && (
                      <div className="text-xs text-gray-500 px-1.5">
                        +{workersOut.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-card p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Calendar size={16} />
          Out This Month ({workersOutThisMonth.length})
        </h3>

        {workersOutThisMonth.length === 0 ? (
          <p className="text-sm text-gray-500">No one is scheduled to be out this month.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {workersOutThisMonth.map((worker, idx) => {
              const config = NOTE_TYPE_CONFIG[worker.noteType as NoteType]
              const Icon = config.icon
              return (
                <div
                  key={idx}
                  className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-2 ${config.lightColor}`}
                >
                  <Icon size={14} />
                  {worker.name}
                  <span className="opacity-75">({config.label})</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Note Type Legend */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap gap-4 text-xs">
            {Object.entries(NOTE_TYPE_CONFIG).map(([key, config]) => {
              const Icon = config.icon
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded ${config.color}`} />
                  <Icon size={12} className="text-gray-500" />
                  <span className="text-gray-600">{config.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
