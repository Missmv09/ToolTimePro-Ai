import QuoteViewClient from './QuoteViewClient';

// Force dynamic rendering — the root layout uses cookies() for i18n,
// which is incompatible with ISR/SSG on Netlify and causes 5xx errors.
export const dynamic = 'force-dynamic';

export default function QuotePage({ params }: { params: { id: string } }) {
  return <QuoteViewClient quoteId={params.id} />;
}
