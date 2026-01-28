'use client'

import { useState } from 'react'

interface QuickBooksConnectProps {
  isConnected: boolean
  lastSyncAt?: string | null
  syncStatus?: string
  onDisconnect: () => Promise<void>
}

export default function QuickBooksConnect({
  isConnected,
  lastSyncAt,
  syncStatus,
  onDisconnect,
}: QuickBooksConnectProps) {
  const [syncing, setSyncing] = useState(false)
  const [connecting, setConnecting] = useState(false)

  const handleConnect = async () => {
    setConnecting(true)
    try {
      // Redirect to QuickBooks OAuth flow
      window.location.href = '/api/quickbooks/connect'
    } catch (error) {
      console.error('Failed to initiate QuickBooks connection:', error)
      setConnecting(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/quickbooks/sync', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Sync failed')
      }

      // Reload to show updated sync status
      window.location.reload()
    } catch (error) {
      console.error('Sync failed:', error)
      alert('Failed to sync with QuickBooks. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  const formatLastSync = (dateStr: string | null | undefined) => {
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
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* QuickBooks Logo */}
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#2CA01C]/10">
            <svg
              className="w-8 h-8"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="10" fill="#2CA01C" />
              <path
                d="M7.5 12C7.5 10.067 9.067 8.5 11 8.5H12V7H11C8.239 7 6 9.239 6 12C6 14.761 8.239 17 11 17H12V15.5H11C9.067 15.5 7.5 13.933 7.5 12Z"
                fill="white"
              />
              <path
                d="M16.5 12C16.5 13.933 14.933 15.5 13 15.5H12V17H13C15.761 17 18 14.761 18 12C18 9.239 15.761 7 13 7H12V8.5H13C14.933 8.5 16.5 10.067 16.5 12Z"
                fill="white"
              />
            </svg>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">QuickBooks Online</h3>
            <p className="text-sm text-gray-500">
              Sync customers, invoices, and payments with QuickBooks
            </p>
          </div>
        </div>

        {/* Connection Status Indicator */}
        {isConnected && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
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
              {syncStatus && syncStatus !== 'active' && (
                <span className="ml-2 px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700">
                  {syncStatus}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-4 py-2 text-sm font-medium text-[#2CA01C] border border-[#2CA01C] rounded-lg hover:bg-[#2CA01C]/5 disabled:opacity-50 transition-colors"
              >
                {syncing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Syncing...
                  </span>
                ) : (
                  'Sync Now'
                )}
              </button>

              <button
                onClick={onDisconnect}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
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
            className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#2CA01C' }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#248a17')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2CA01C')}
          >
            {connecting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Connecting...
              </span>
            ) : (
              'Connect QuickBooks'
            )}
          </button>
          <p className="mt-2 text-xs text-gray-500">
            You&apos;ll be redirected to Intuit to authorize the connection
          </p>
        </div>
      )}
    </div>
  )
}
