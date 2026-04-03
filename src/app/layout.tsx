import '@/styles/globals.css';
import { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { FetchPatch } from '@/lib/patch-fetch';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'ToolTime Pro | AI-Powered Field Service Management',
  description: 'AI-powered FSM for HVAC, plumbing, electrical, landscaping, and roofing contractors. Jenny AI dispatch, Spanish language support, mobile app — starting at $49/month.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#d4a843" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body>
        <FetchPatch />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>{children}</AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
