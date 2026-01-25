export const metadata = {
  title: 'ToolTime Pro',
  description: 'All-in-One Platform for Service Businesses',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
