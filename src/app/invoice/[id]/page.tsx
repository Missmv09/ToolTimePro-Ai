import InvoiceViewClient from './InvoiceViewClient';

// Force dynamic rendering — the root layout uses cookies() for i18n,
// which is incompatible with ISR/SSG on Netlify and throws a
// static-to-dynamic 500 on the public invoice link (matches the quote page).
export const dynamic = 'force-dynamic';

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoiceViewClient params={{ id }} />;
}
