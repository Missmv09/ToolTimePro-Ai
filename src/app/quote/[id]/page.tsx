import QuoteViewClient from './QuoteViewClient';

// Force dynamic rendering — the root layout uses cookies() for i18n,
// which is incompatible with ISR/SSG on Netlify and causes 5xx errors.
export const dynamic = 'force-dynamic';

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuoteViewClient quoteId={id} />;
}
