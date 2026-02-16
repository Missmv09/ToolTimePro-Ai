'use client';

export default function SiteError({ error, reset }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, -apple-system, sans-serif',
        padding: '24px',
        textAlign: 'center',
        background: '#f9fafb',
      }}
    >
      <h1
        style={{
          fontSize: '48px',
          fontWeight: 800,
          color: '#1a1a2e',
          marginBottom: '12px',
        }}
      >
        Something went wrong
      </h1>
      <p
        style={{
          fontSize: '18px',
          color: '#6b7280',
          marginBottom: '32px',
          maxWidth: '480px',
        }}
      >
        This site couldn&apos;t be loaded right now. Please try again in a moment.
      </p>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => reset()}
          style={{
            padding: '12px 28px',
            background: '#f5a623',
            color: '#1a1a2e',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '15px',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
        <a
          href="/"
          style={{
            padding: '12px 28px',
            background: '#e5e7eb',
            color: '#1a1a2e',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '15px',
            textDecoration: 'none',
          }}
        >
          Go to ToolTime Pro
        </a>
      </div>
    </div>
  );
}
