import ComparisonPage from '@/components/ComparisonPage';
import { getCompetitor } from '@/lib/competitor-data';

export const metadata = {
  title: 'Task Iguana vs Housecall Pro — Compare Features & Pricing (2026)',
  description: 'See why contractors switch from Housecall Pro to Task Iguana. Same scheduling and dispatch, plus AI quoting, compliance tools, and bilingual support at a lower price.',
};

export default function HousecallProComparison() {
  const data = getCompetitor('housecall-pro')!;
  return <ComparisonPage data={data} />;
}
