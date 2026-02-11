import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AgentGuilds',
  description: 'AI labor marketplace visualized as a living isometric pixel city',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflow: 'hidden', backgroundColor: '#1a1a2a' }}>
        {children}
      </body>
    </html>
  );
}
