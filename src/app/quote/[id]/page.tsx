import QuoteViewClient from './QuoteViewClient';

// Generate static params for static export
export function generateStaticParams() {
  // Demo quote IDs for static generation
  return [
    { id: 'demo' },
    { id: 'QT-2024-001' },
    { id: 'q-001' },
    { id: 'q-002' },
    { id: 'q-003' },
  ];
}

export default function QuotePage({ params }: { params: { id: string } }) {
  return <QuoteViewClient params={params} />;
}
