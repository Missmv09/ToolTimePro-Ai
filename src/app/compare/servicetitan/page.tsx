import ComparisonPage from '@/components/ComparisonPage';
import { getCompetitor } from '@/lib/competitor-data';

export const metadata = {
  title: 'Task Iguana vs ServiceTitan — Compare Features & Pricing (2026)',
  description: 'Enterprise features without the enterprise price. No contracts, no $15K termination fees. See why contractors switch from ServiceTitan to Task Iguana.',
};

export default function ServiceTitanComparison() {
  const data = getCompetitor('servicetitan')!;
  return <ComparisonPage data={data} />;
}
