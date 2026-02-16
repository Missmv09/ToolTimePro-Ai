'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ color: '#dc2626', fontSize: '24px' }}>Something went wrong</h1>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            An error occurred while loading this page.
          </p>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ color: '#991b1b', fontSize: '14px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {error.message}
            </p>
            {error.digest && (
              <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '8px' }}>
                Digest: {error.digest}
              </p>
            )}
          </div>
          <button
            onClick={reset}
            style={{
              padding: '10px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              marginRight: '8px',
            }}
          >
            Try again
          </button>
          <a
            href="/auth/login"
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
            Go to Login
          </a>
        </div>
      </body>
    </html>
  )
}
