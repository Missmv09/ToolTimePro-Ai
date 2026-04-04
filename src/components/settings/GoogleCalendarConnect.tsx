'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Calendar, RefreshCw, CheckCircle, Link2, Unlink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export default function GoogleCalendarConnect() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [isConnected, setIsConnected] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Check connection status on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (!user?.id) return

      try {
        const { data, error } = await supabase
          .from('google_calendar_connections')
          .select('last_sync_at')
          .eq('user_id', user.id)
          .single()

        if (data && !error) {
          setIsConnected(true)
          setLastSyncAt(data.last_sync_at)
        }
      } catch {
        // No connection found
      }
    }

    checkConnection()
  }, [user])

  // Detect gcal=connected URL param
  useEffect(() => {
    const gcalStatus = searchParams.get('gcal')
    if (gcalStatus === 'connected') {
      setIsConnected(true)
      setMessage({ type: 'success', text: 'Google Calendar connected successfully!' })
      setTimeout(() => setMessage(null), 5000)
    } else if (gcalStatus === 'error') {
      setMessage({ type: 'error', text: 'Failed to connect Google Calendar. Please try again.' })
      setTimeout(() => setMessage(null), 5000)
    }
  }, [searchParams])

  const handleConnect = () => {
    setConnecting(true)
    window.location.href = '/api/google-calendar/connect'
  }

  const handleSync = async () => {
    setSyncing(true)
    setMessage(null)

    try {
      const response = await fetch('/api/google-calendar/sync', {
        method: 'POST',
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Sync failed')
      }

      const result = await response.json()
      setLastSyncAt(new Date().toISOString())
      setMessage({
        type: 'success',
        text: `Synced ${result.synced} of ${result.total} jobs to Google Calendar`,
      })
      setTimeout(() => setMessage(null), 5000)
    } catch (error) {
      console.error('Sync failed:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to sync. Please try again.',
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar?')) return

    try {
      const response = await fetch('/api/google-calendar/disconnect', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      setIsConnected(false)
      setLastSyncAt(null)
      setMessage({ type: 'success', text: 'Google Calendar disconnected' })
      setTimeout(() => setMessage(null), 3000)
    } catch {
      setMessage({ type: 'error', text: 'Failed to disconnect Google Calendar' })
    }
  }

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="border rounded-lg p-4 bg-white">
      {/* Toast message */}
      {message && (
        <div
          className={`mb-3 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* Google Calendar Icon */}
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-50">
            <Calendar className="w-7 h-7 text-blue-600" />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">Google Calendar</h3>
            <p className="text-sm text-gray-500">
              Sync your scheduled jobs to Google Calendar
            </p>
          </div>
        </div>

        {/* Connection Status Indicator */}
        {isConnected && (
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-600 font-medium">Connected</span>
          </div>
        )}
      </div>

      {/* Connected State */}
      {isConnected ? (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              <span>Last synced: </span>
              <span className="text-gray-700 font-medium">{formatLastSync(lastSyncAt)}</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>

              <button
                onClick={handleDisconnect}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Unlink className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Not Connected State */
        <div className="mt-4 pt-4 border-t">
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {connecting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4" />
                Connect Google Calendar
              </>
            )}
          </button>
          <p className="mt-2 text-xs text-gray-500">
            You&apos;ll be redirected to Google to authorize calendar access
          </p>
        </div>
      )}
    </div>
  )
}
