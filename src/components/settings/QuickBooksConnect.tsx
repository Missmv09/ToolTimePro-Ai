'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

interface QBOStatus {
  connected: boolean
  connected_at?: string
  last_sync_at?: string | null
  sync_status?: string
  pending?: {
    customers: number
    invoices: number
  }
}

interface SyncResult {
  success: boolean
  results?: {
    customers: { synced: number; errors: number }
    invoices: { synced: number; errors: number }
    total_synced: number
    total_errors: number
  }
  error?: string
}

interface QuickBooksConnectProps {
  userId: string
}

export default function QuickBooksConnect({ userId }: QuickBooksConnectProps) {
  const [status, setStatus] = useState<QBOStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/quickbooks/status?user_id=${userId}`)
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Error fetching QBO status:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchStatus()

    // Check for URL params (connection result)
    const urlParams = new URLSearchParams(window.location.search)
    const qboStatus = urlParams.get('qbo')

    if (qboStatus === 'connected') {
      setMessage({ type: 'success', text: 'QuickBooks connected successfully!' })
      // Remove the query param
      window.history.replaceState({}, '', window.location.pathname)
    } else if (qboStatus === 'error') {
      const errorMsg = urlParams.get('message') || 'Connection failed'
      setMessage({ type: 'error', text: `Failed to connect: ${errorMsg}` })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [fetchStatus])

  const handleConnect = () => {
    // Redirect to QuickBooks OAuth
    window.location.href = `/api/quickbooks/connect?user_id=${userId}`
  }

  const handleSync = async () => {
    setSyncing(true)
    setMessage(null)

    try {
      const response = await fetch('/api/quickbooks/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })

      const data: SyncResult = await response.json()

      if (data.success && data.results) {
        const { total_synced, total_errors } = data.results
        if (total_errors > 0) {
          setMessage({
            type: 'error',
            text: `Synced ${total_synced} records with ${total_errors} errors`,
          })
        } else if (total_synced > 0) {
          setMessage({
            type: 'success',
            text: `Successfully synced ${total_synced} records`,
          })
        } else {
          setMessage({
            type: 'success',
            text: 'Everything is up to date!',
          })
        }
        // Refresh status
        fetchStatus()
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Sync failed',
        })
      }
    } catch (error) {
      console.error('Sync error:', error)
      setMessage({
        type: 'error',
        text: 'An error occurred during sync',
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect QuickBooks? This will stop syncing data.')) {
      return
    }

    setDisconnecting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/quickbooks/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage({
          type: 'success',
          text: 'QuickBooks disconnected',
        })
        setStatus({ connected: false })
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to disconnect',
        })
      }
    } catch (error) {
      console.error('Disconnect error:', error)
      setMessage({
        type: 'error',
        text: 'An error occurred',
      })
    } finally {
      setDisconnecting(false)
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-100 rounded-lg animate-pulse"></div>
          <div className="flex-1">
            <div className="h-5 w-32 bg-gray-100 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-48 bg-gray-100 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#2CA01C] rounded-lg flex items-center justify-center">
            <Image
              src="/images/quickbooks-logo.svg"
              alt="QuickBooks"
              width={32}
              height={32}
              className="text-white"
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">QuickBooks Online</h3>
            <p className="text-sm text-gray-500">
              Sync customers and invoices with QuickBooks
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-sm font-medium text-[#f5a623]">$12/mo add-on</span>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Not Connected State */}
      {!status?.connected && (
        <div className="text-center py-6">
          <p className="text-gray-600 mb-4">
            Connect your QuickBooks Online account to automatically sync customers and invoices.
          </p>
          <button
            onClick={handleConnect}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#2CA01C] text-white font-medium rounded-lg hover:bg-[#238515] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Connect QuickBooks
          </button>
        </div>
      )}

      {/* Connected State */}
      {status?.connected && (
        <div className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2 text-green-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Connected</span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 py-4 border-y">
            <div>
              <p className="text-sm text-gray-500">Last Synced</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(status.last_sync_at)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Sync</p>
              <p className="text-sm font-medium text-gray-900">
                {(status.pending?.customers || 0) + (status.pending?.invoices || 0)} records
              </p>
            </div>
          </div>

          {/* Pending Details */}
          {(status.pending?.customers || 0) + (status.pending?.invoices || 0) > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                {status.pending?.customers || 0} customers and {status.pending?.invoices || 0} invoices ready to sync
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a2e] text-white font-medium rounded-lg hover:bg-[#2a2a4e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Syncing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sync Now
                </>
              )}
            </button>

            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
