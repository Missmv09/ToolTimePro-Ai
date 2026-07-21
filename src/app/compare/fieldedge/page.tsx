import ComparisonPage from '@/components/ComparisonPage';
import { getCompetitor } from '@/lib/competitor-data';

export const metadata = {
  title: 'Task Iguana vs FieldEdge — Compare Features & Pricing (2026)',
  description: 'FieldEdge hides pricing and focuses on HVAC/plumbing. Task Iguana covers 21 trades with transparent pricing, AI, and compliance tools.',
};

export default function FieldEdgeComparison() {
  const data = getCompetitor('fieldedge')!;
  return <ComparisonPage data={data} />;
}
