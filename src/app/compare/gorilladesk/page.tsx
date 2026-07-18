import ComparisonPage from '@/components/ComparisonPage';
import { getCompetitor } from '@/lib/competitor-data';

export const metadata = {
  title: 'Task Iguana vs GorillaDesk — Compare Features & Pricing (2026)',
  description: 'GorillaDesk focuses on pest control and lawn care. Task Iguana covers all 21 trades with AI, compliance tools, and bilingual support.',
};

export default function GorillaDeskComparison() {
  const data = getCompetitor('gorilladesk')!;
  return <ComparisonPage data={data} />;
}
