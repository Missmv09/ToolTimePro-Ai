import '@/styles/globals.css';
import { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import Analytics from '@/components/Analytics';
import { FetchPatch } from '@/lib/patch-fetch';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Task Iguana | AI-Powered Field Service Management',
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
        <meta name="theme-color" content="#1FE3C4" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* iOS ignores SVG here and falls back to a screenshot of the page,
            so this must stay a PNG. 180x180 is the current iOS size. */}
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon-08182026.png" />
      </head>
      <body>
        <FetchPatch />
        <Analytics />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>{children}</AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
