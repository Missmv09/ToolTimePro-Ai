import '@/styles/globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ToolTime Pro - All-in-One Platform for Service Businesses',
  description: 'The complete business management platform for landscapers, painters, pool pros, handymen, and cleaners. HR tools, compliance, scheduling, and more.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
