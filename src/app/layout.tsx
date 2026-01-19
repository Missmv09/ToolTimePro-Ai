export const metadata = {
  title: 'ToolTime Pro',
  description: 'ToolTime Pro',
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
