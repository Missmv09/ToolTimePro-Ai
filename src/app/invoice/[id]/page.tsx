import InvoiceViewClient from './InvoiceViewClient';

export function generateStaticParams() {
  return [];
}

export default function InvoicePage({ params }: { params: { id: string } }) {
  return <InvoiceViewClient params={params} />;
}
