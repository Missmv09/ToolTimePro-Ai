'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

// Catches errors thrown in the root layout (the last-resort boundary). Reports
// the crash to Sentry and shows the customer a calm "we're on it" message rather
// than a raw stack trace. The digest is a short reference the customer can quote
// to support, which correlates to the Sentry event.
export default function GlobalError({
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
    <html>
      <body>
        <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ color: '#0A0C11', fontSize: '24px', marginBottom: '8px' }}>Something went wrong on our end</h1>
          <p style={{ color: '#4b5563', marginBottom: '16px', lineHeight: 1.6 }}>
            Sorry about that. Our team has been automatically notified and is
            looking into it. Please try again in a moment.
          </p>
          {error.digest && (
            <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '20px' }}>
              If it keeps happening, contact support and quote reference{' '}
              <span style={{ fontFamily: 'monospace', color: '#6b7280' }}>{error.digest}</span>.
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: '10px 20px',
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
          <a
            href="/"
            style={{
              padding: '10px 20px',
              background: '#e5e7eb',
              color: '#374151',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              display: 'inline-block',
            }}
          >
            Go home
          </a>
        </div>
      </body>
    </html>
  )
}
