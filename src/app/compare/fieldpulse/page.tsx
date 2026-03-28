import ComparisonPage from '@/components/ComparisonPage';
import { getCompetitor } from '@/lib/competitor-data';

export const metadata = {
  title: 'ToolTime Pro vs FieldPulse — Compare Features & Pricing (2026)',
  description: 'More AI, more compliance tools, more trade support at a comparable price. See why contractors choose ToolTime Pro over FieldPulse.',
};

export default function FieldPulseComparison() {
  const data = getCompetitor('fieldpulse')!;
  return <ComparisonPage data={data} />;
}
