'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type * as LeafletNS from 'leaflet'

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
  techLocation: { lat: number; lng: number } | null
}

// Live map showing the destination and (when en route) the technician's
// current position. Re-renders markers whenever coordinates change.
function TrackMap({
  destination,
  techLocation,
}: {
  destination: { lat: number; lng: number } | null
  techLocation: { lat: number; lng: number } | null
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletNS.Map | null>(null)
  const layerRef = useRef<LeafletNS.LayerGroup | null>(null)

  useEffect(() => {
    if (!containerRef.current || (!destination && !techLocation)) return
    let mounted = true

    Promise.all([
      import('leaflet'),
      // @ts-expect-error - CSS import for leaflet styles has no type declaration
      import('leaflet/dist/leaflet.css'),
    ]).then(([leaflet]) => {
      const L = leaflet.default
      if (!mounted || !containerRef.current) return

      if (!mapRef.current) {
        const center = techLocation || destination!
        mapRef.current = L.map(containerRef.current).setView([center.lat, center.lng], 13)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }).addTo(mapRef.current)
        layerRef.current = L.layerGroup().addTo(mapRef.current)
      }

      const layer = layerRef.current!
      layer.clearLayers()
      const bounds: [number, number][] = []

      const pin = (emoji: string, bg: string) =>
        L.divIcon({
          className: 'track-pin',
          html: `<div style="width:34px;height:34px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-size:17px;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${emoji}</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        })

      if (destination) {
        L.marker([destination.lat, destination.lng], { icon: pin('🏠', '#0A0C11') })
          .bindPopup('Service location')
          .addTo(layer)
        bounds.push([destination.lat, destination.lng])
      }
      if (techLocation) {
        L.marker([techLocation.lat, techLocation.lng], { icon: pin('🚐', '#22c55e') })
          .bindPopup('Your technician')
          .addTo(layer)
        bounds.push([techLocation.lat, techLocation.lng])
        if (destination) {
          L.polyline(
            [
              [techLocation.lat, techLocation.lng],
              [destination.lat, destination.lng],
            ],
            { color: '#22c55e', weight: 3, opacity: 0.7, dashArray: '8, 6' }
          ).addTo(layer)
        }
      }

      if (bounds.length === 1) {
        mapRef.current!.setView(bounds[0], 14)
      } else if (bounds.length > 1) {
        mapRef.current!.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
      }
    })

    return () => {
      mounted = false
    }
  }, [destination, techLocation])

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return <div ref={containerRef} className="w-full h-56 rounded-xl overflow-hidden border border-gray-200 mt-4" style={{ zIndex: 0 }} />
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
    info?.phase === 'enroute' ? '#22c55e' : info?.phase === 'done' ? '#6b7280' : '#1FE3C4'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 text-white" style={{ background: '#0A0C11' }}>
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

              {info.phase === 'enroute' && (
                <p className="text-gray-700 mb-4">
                  {info.techFirstName ? <><strong>{info.techFirstName}</strong> is</> : 'Your technician is'} on the way to you now
                  {info.techLocation ? ' — follow along on the map below.' : '.'}
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

              {(info.destination || info.techLocation) && (
                <TrackMap destination={info.destination} techLocation={info.techLocation} />
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
