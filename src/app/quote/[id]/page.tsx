import QuoteViewClient from './QuoteViewClient';

// Dynamic routes — no static prerendering of demo data
export function generateStaticParams() {
  return [];
}

export default function QuotePage({ params }: { params: { id: string } }) {
  return <QuoteViewClient params={params} />;
}
