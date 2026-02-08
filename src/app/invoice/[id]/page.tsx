import InvoiceViewClient from './InvoiceViewClient';

export function generateStaticParams() {
  return [
    { id: 'demo' },
  ];
}

export default function InvoicePage({ params }: { params: { id: string } }) {
  return <InvoiceViewClient params={params} />;
}
