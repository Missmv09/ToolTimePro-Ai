import InvoiceViewClient from './InvoiceViewClient';

// Force dynamic rendering — the root layout uses cookies() for i18n,
// which is incompatible with ISR/SSG on Netlify and throws a
// static-to-dynamic 500 on the public invoice link (matches the quote page).
export const dynamic = 'force-dynamic';

export default function InvoicePage({ params }: { params: { id: string } }) {
  return <InvoiceViewClient params={params} />;
}
