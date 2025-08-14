import Link from 'next/link';

export default function Page() {
  return (
    <main className="space-y-4">
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/auth">Sign in</Link>
    </main>
  );
}
