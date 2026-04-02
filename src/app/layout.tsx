import '@/styles/globals.css';
import { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { FetchPatch } from '@/lib/patch-fetch';

export const metadata: Metadata = {
  title: 'ToolTime Pro | AI-Powered Field Service Management',
  description: 'AI-powered FSM for HVAC, plumbing, electrical, landscaping, and roofing contractors. Jenny AI dispatch, Spanish language support, mobile app — starting at $49/month.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#d4a843" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body>
        <FetchPatch />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
