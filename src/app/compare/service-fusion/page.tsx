import ComparisonPage from '@/components/ComparisonPage';
import { getCompetitor } from '@/lib/competitor-data';

export const metadata = {
  title: 'Task Iguana vs Service Fusion — Compare Features & Pricing (2026)',
  description: 'Service Fusion starts at $225/mo. Task Iguana starts at $49/mo with AI, compliance, and bilingual support included. Compare side by side.',
};

export default function ServiceFusionComparison() {
  const data = getCompetitor('service-fusion')!;
  return <ComparisonPage data={data} />;
}
