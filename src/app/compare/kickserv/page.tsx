import ComparisonPage from '@/components/ComparisonPage';
import { getCompetitor } from '@/lib/competitor-data';

export const metadata = {
  title: 'Task Iguana vs Kickserv — Compare Features & Pricing (2026)',
  description: 'Kickserv keeps it simple but misses AI, compliance, and bilingual support. See how Task Iguana delivers more for growing contractors.',
};

export default function KickservComparison() {
  const data = getCompetitor('kickserv')!;
  return <ComparisonPage data={data} />;
}
