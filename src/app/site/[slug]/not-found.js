import Link from 'next/link';

export default function SiteNotFound() {
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
      <h1 style={{ fontSize: '48px', fontWeight: 800, color: '#1a1a2e', marginBottom: '12px' }}>
        404
      </h1>
      <p style={{ fontSize: '18px', color: '#6b7280', marginBottom: '32px' }}>
        This site doesn&apos;t exist or hasn&apos;t been published yet.
      </p>
      <Link
        href="/"
        style={{
          padding: '12px 28px',
          background: '#f5a623',
          color: '#1a1a2e',
          borderRadius: '8px',
          fontWeight: 700,
          textDecoration: 'none',
          fontSize: '15px',
        }}
      >
        Go to ToolTime Pro
      </Link>
    </div>
  );
}
