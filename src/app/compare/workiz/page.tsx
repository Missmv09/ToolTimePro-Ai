import ComparisonPage from '@/components/ComparisonPage';
import { getCompetitor } from '@/lib/competitor-data';

export const metadata = {
  title: 'ToolTime Pro vs Workiz — Compare Features & Pricing (2026)',
  description: 'Workiz charges $198/mo to start and extra for AI. ToolTime Pro starts at $30/mo with Jenny AI included. See the full comparison.',
};

export default function WorkizComparison() {
  const data = getCompetitor('workiz')!;
  return <ComparisonPage data={data} />;
}
