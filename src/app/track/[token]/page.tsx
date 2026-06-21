'use client'

import { useEffect, useState, useCallback } from 'react'

interface TrackingInfo {
  companyName: string
  customerName: string | null
  techFirstName: string | null
  status: string
  statusLabel: string
  phase: 'scheduled' | 'enroute' | 'done'
  scheduledDate: string | null
  windowStart: string | null
  windowEnd: string | null
  destination: { lat: number; lng: number; city: string | null } | null
}

function formatTime(t: string | null): string {
  if (!t) return ''
  // t is "HH:MM" or "HH:MM:SS"
  const [h, m] = t.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}:${m} ${ampm}`
}

export default function TrackingPage({ params }: { params: { token: string } }) {
  const [info, setInfo] = useState<TrackingInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/track/${params.token}`, { cache: 'no-store' })
      if (!res.ok) {
        setError(res.status === 404 ? 'This tracking link is no longer available.' : 'Unable to load tracking info.')
        setInfo(null)
      } else {
        setInfo(await res.json())
        setError(null)
      }
    } catch {
      setError('Unable to load tracking info.')
    } finally {
      setLoading(false)
    }
  }, [params.token])

  useEffect(() => {
    load()
    // Poll for live status changes (e.g., tech marks "on the way").
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [load])

  const phaseColor =
    info?.phase === 'enroute' ? '#22c55e' : info?.phase === 'done' ? '#6b7280' : '#f5a623'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 text-white" style={{ background: '#1a1a2e' }}>
          <p className="text-sm opacity-80">{info?.companyName || 'Service Tracking'}</p>
          <h1 className="text-xl font-bold mt-1">Track your appointment</h1>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-10 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
            </div>
          ) : error ? (
            <p className="text-center text-gray-500 py-8">{error}</p>
          ) : info ? (
            <>
              <div className="flex items-center gap-3 mb-5">
                <span
                  className="inline-flex items-center justify-center w-3 h-3 rounded-full"
                  style={{ background: phaseColor }}
                />
                <span className="text-lg font-semibold" style={{ color: phaseColor }}>
                  {info.statusLabel}
                </span>
              </div>

              {info.phase === 'enroute' && info.techFirstName && (
                <p className="text-gray-700 mb-4">
                  <strong>{info.techFirstName}</strong> is on the way to you now.
                </p>
              )}
              {info.phase === 'scheduled' && (
                <p className="text-gray-700 mb-4">
                  {info.techFirstName ? <><strong>{info.techFirstName}</strong> is </> : 'Your technician is '}
                  scheduled to arrive
                  {info.windowStart && (
                    <>
                      {' '}between <strong>{formatTime(info.windowStart)}</strong>
                      {info.windowEnd && <> and <strong>{formatTime(info.windowEnd)}</strong></>}
                    </>
                  )}
                  .
                </p>
              )}
              {info.phase === 'done' && (
                <p className="text-gray-700 mb-4">
                  {info.status === 'completed'
                    ? 'This appointment is complete. Thank you!'
                    : 'This appointment has been cancelled.'}
                </p>
              )}

              {info.destination && (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${info.destination.lat}&mlon=${info.destination.lng}#map=15/${info.destination.lat}/${info.destination.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-sm text-blue-600 underline mt-2"
                >
                  View service location{info.destination.city ? ` in ${info.destination.city}` : ''}
                </a>
              )}

              <p className="text-xs text-gray-400 text-center mt-6">
                This page updates automatically.
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
