import ComparisonPage from '@/components/ComparisonPage';
import { getCompetitor } from '@/lib/competitor-data';

export const metadata = {
  title: 'ToolTime Pro vs Kickserv — Compare Features & Pricing (2026)',
  description: 'Kickserv keeps it simple but misses AI, compliance, and bilingual support. See how ToolTime Pro delivers more for growing contractors.',
};

export default function KickservComparison() {
  const data = getCompetitor('kickserv')!;
  return <ComparisonPage data={data} />;
}
