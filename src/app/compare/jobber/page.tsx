import ComparisonPage from '@/components/ComparisonPage';
import { getCompetitor } from '@/lib/competitor-data';

export const metadata = {
  title: 'ToolTime Pro vs Jobber — Compare Features & Pricing (2026)',
  description: 'See why contractors switch from Jobber to ToolTime Pro. Same scheduling and quoting, plus AI automation, compliance tools, and bilingual support at a lower price.',
};

export default function JobberComparison() {
  const data = getCompetitor('jobber')!;
  return <ComparisonPage data={data} />;
}
