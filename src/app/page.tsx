export default function Home() {
  return (
    <main
      style={{
        padding: 24,
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      }}
    >
      <h1 style={{ marginBottom: 8 }}>ToolTime Pro</h1>
      <p style={{ marginTop: 0, maxWidth: 720 }}>
        Your site is live. This is the homepage placeholder.
      </p>
      <ul style={{ marginTop: 16, lineHeight: 1.8 }}>
        <li>✅ Deployed on Netlify</li>
        <li>✅ DNS + SSL ready</li>
        <li>Next: build your pages and tools</li>
      </ul>
    </main>
  );
}
