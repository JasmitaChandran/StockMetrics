import './globals.css';
import type { Metadata } from 'next';
import { AppProviders } from './providers';
import { AppShell } from '@/components/layout/app-shell';

export const metadata: Metadata = {
  title: 'Stock Metrics',
  description: 'Stock research and portfolio analysis platform with beginner and pro modes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
