'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Sparkles, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react'

interface Proposal {
  jobId: string
  customerName: string | null
  title: string | null
  before: { date: string | null; start: string | null; end: string | null }
  after: { date: string | null; start: string | null; end: string | null }
  customerAffecting: boolean
  needsConfirmation: boolean
  summary: string
  customerMessage: string | null
  newDate: string | null
  newStartTime: string | null
  newEndTime: string | null
  customerHasPhone: boolean
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  const date = new Date(`${d}T00:00:00`)
  return isNaN(date.getTime()) ? d : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
function fmtTime(t: string | null): string {
  if (!t) return '—'
  const [h, m] = t.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}:${m} ${ampm}`
}

export default function JennyReschedule({ onApplied }: { onApplied?: () => void }) {
  const [instruction, setInstruction] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [notify, setNotify] = useState(true)
  const [applying, setApplying] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  const reset = () => {
    setProposal(null)
    setError(null)
    setDone(null)
  }

  const preview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!instruction.trim()) return
    setLoading(true)
    reset()
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/jenny/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ instruction }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not understand that request.')
      } else {
        setProposal(data.proposal)
        setNotify(data.proposal.customerAffecting && data.proposal.customerHasPhone)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const confirm = async () => {
    if (!proposal) return
    setApplying(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/jenny/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          confirm: true,
          jobId: proposal.jobId,
          newDate: proposal.newDate,
          newStartTime: proposal.newStartTime,
          newEndTime: proposal.newEndTime,
          notifyCustomer: notify,
          customerMessage: proposal.customerMessage,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to apply the change.')
      } else {
        setProposal(null)
        setInstruction('')
        setDone(
          notify && data.smsSent
            ? 'Rescheduled and the customer was texted the new time.'
            : data.smsError
            ? `Rescheduled, but the text couldn't be sent: ${data.smsError}`
            : 'Rescheduled.'
        )
        onApplied?.()
      }
    } catch {
      setError('Something went wrong applying the change.')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-[#f5a623]" />
        <h3 className="font-semibold text-gray-900">Reschedule with Jenny</h3>
      </div>
      <form onSubmit={preview} className="flex gap-2">
        <input
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder='e.g. "Move Maria Powell to tomorrow afternoon"'
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a1a2e]"
        />
        <button
          type="submit"
          disabled={loading || !instruction.trim()}
          className="px-4 py-2 bg-[#1a1a2e] text-white rounded-lg text-sm font-medium hover:bg-[#2d2d44] disabled:opacity-50"
        >
          {loading ? 'Reading…' : 'Preview'}
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      {done && (
        <p className="text-sm text-green-700 mt-3 flex items-center gap-1">
          <CheckCircle className="w-4 h-4" /> {done}
        </p>
      )}

      {proposal && (
        <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
          <p className="font-medium text-gray-900">{proposal.customerName || proposal.title || 'Job'}</p>
          <div className="flex items-center gap-3 mt-2 text-sm">
            <span className="text-gray-500">
              {fmtDate(proposal.before.date)} · {fmtTime(proposal.before.start)}
            </span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-gray-900">
              {fmtDate(proposal.after.date)} · {fmtTime(proposal.after.start)}
            </span>
          </div>

          {proposal.customerAffecting ? (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800 flex items-center gap-1 font-medium">
                <AlertTriangle className="w-4 h-4" /> This changes the customer&apos;s appointment time.
              </p>
              {proposal.customerHasPhone ? (
                <label className="flex items-start gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-0.5" />
                  <span className="text-sm text-gray-700">
                    Text the customer the new time
                    {proposal.customerMessage && (
                      <span className="block text-xs text-gray-500 mt-1 italic">&ldquo;{proposal.customerMessage}&rdquo;</span>
                    )}
                  </span>
                </label>
              ) : (
                <p className="text-xs text-amber-700 mt-1">No phone on file — the customer can&apos;t be auto-notified.</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500 mt-2">This doesn&apos;t change the customer&apos;s arrival time.</p>
          )}

          <div className="flex gap-2 mt-4">
            <button onClick={reset} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={confirm}
              disabled={applying}
              className="flex-1 px-4 py-2 bg-[#1a1a2e] text-white rounded-lg text-sm font-medium hover:bg-[#2d2d44] disabled:opacity-50"
            >
              {applying ? 'Applying…' : 'Confirm reschedule'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
