import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MoltiGuild',
  description: 'AI labor marketplace visualized as a living isometric pixel city',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
