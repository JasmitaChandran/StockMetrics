import './globals.css';
import type { Metadata } from 'next';
import { Manrope, Sora } from 'next/font/google';
import { AppProviders } from './providers';
import { AppShell } from '@/components/layout/app-shell';

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
});

const sora = Sora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sora',
});

export const metadata: Metadata = {
  title: 'Stock Metrics',
  description: 'Stock research and portfolio analysis platform with beginner and pro modes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${sora.variable}`}>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
