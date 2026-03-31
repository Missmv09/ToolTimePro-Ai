import ComparisonPage from '@/components/ComparisonPage';
import { getCompetitor } from '@/lib/competitor-data';

export const metadata = {
  title: 'ToolTime Pro vs Service Fusion — Compare Features & Pricing (2026)',
  description: 'Service Fusion starts at $225/mo. ToolTime Pro starts at $30/mo with AI, compliance, and bilingual support included. Compare side by side.',
};

export default function ServiceFusionComparison() {
  const data = getCompetitor('service-fusion')!;
  return <ComparisonPage data={data} />;
}
