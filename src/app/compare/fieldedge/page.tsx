import ComparisonPage from '@/components/ComparisonPage';
import { getCompetitor } from '@/lib/competitor-data';

export const metadata = {
  title: 'ToolTime Pro vs FieldEdge — Compare Features & Pricing (2026)',
  description: 'FieldEdge hides pricing and focuses on HVAC/plumbing. ToolTime Pro covers 21 trades with transparent pricing, AI, and compliance tools.',
};

export default function FieldEdgeComparison() {
  const data = getCompetitor('fieldedge')!;
  return <ComparisonPage data={data} />;
}
