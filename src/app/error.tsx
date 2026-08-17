'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import * as Sentry from '@sentry/nextjs'

// Segment-level error boundary — catches errors thrown while rendering a page
// (the common case) without tearing down the whole app. Reports the crash to
// Sentry (tagged with the signed-in customer via AuthContext) and shows a calm
// "we're on it" message instead of a raw error.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: '520px', textAlign: 'center' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '9999px',
            background: '#fef3d6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '26px',
          }}
          aria-hidden="true"
        >
          ⚠️
        </div>
        <h1 style={{ color: '#0A0C11', fontSize: '22px', marginBottom: '10px' }}>
          Something went wrong on our end
        </h1>
        <p style={{ color: '#4b5563', lineHeight: 1.6, marginBottom: '20px' }}>
          Sorry about that. Our team has been automatically notified and is
          looking into it. Please try again in a moment.
          {error.digest && (
            <>
              {' '}If it keeps happening, contact support and quote reference{' '}
              <span style={{ fontFamily: 'monospace', color: '#6b7280' }}>{error.digest}</span>.
            </>
          )}
        </p>
        <button
          onClick={reset}
          style={{
            padding: '10px 22px',
            background: '#1FE3C4',
            color: '#0A0C11',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            marginRight: '8px',
          }}
        >
          Try again
        </button>
        <Link
          href="/"
          style={{
            padding: '10px 22px',
            background: '#e5e7eb',
            color: '#374151',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            display: 'inline-block',
          }}
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
