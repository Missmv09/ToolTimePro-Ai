export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1>ToolTime Pro</h1>
      <p>Welcome! Deployed on Netlify with Next.js.</p>
      <ul style={{ marginTop: 16, lineHeight: 1.8 }}>
        <li><a href="/pricing">Pricing</a></li>
        <li><a href="/dashboard">Dashboard</a></li>
        <li><a href="/dashboard/shield/calculator">Shield Calculator</a></li>
      </ul>
    </main>
  );
}
