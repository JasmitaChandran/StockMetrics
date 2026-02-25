'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, MoonStar, SunMedium } from 'lucide-react';
import { useUiStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils/cn';
import { PillToggle } from '@/components/common/pill-toggle';
import { AuthControls } from '@/components/auth/auth-controls';
import { UniversalSearch } from '@/components/search/universal-search';

const tabs = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/screener', label: 'Screener' },
  { href: '/watchlist', label: 'Watchlist' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/learning', label: 'Learning' },
];

export function Navbar() {
  const pathname = usePathname();
  const uiMode = useUiStore((s) => s.uiMode);
  const setUiMode = useUiStore((s) => s.setUiMode);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-3 px-4 py-3 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
        <div className="order-1 flex w-full min-w-0 items-center gap-3 md:w-auto md:justify-self-start">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2 rounded-xl px-2 py-1 hover:bg-muted/60">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-900 shadow-glow">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Stock Metrics</div>
              <div className="hidden text-[10px] uppercase tracking-[0.18em] text-slate-500 lg:block">Invest with Insight</div>
            </div>
          </Link>
          <div className="min-w-0 flex-1 md:w-[260px] md:flex-none lg:w-[300px]">
            <UniversalSearch placeholder="Search stocks and mutual funds..." />
          </div>
        </div>

        <nav className="order-3 flex w-full justify-center gap-1 rounded-2xl border border-border/60 bg-card/70 p-1 md:order-2 md:w-auto md:justify-self-center">
          {tabs.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'rounded-xl px-3 py-2 text-sm transition',
                  active ? 'bg-accent text-white shadow' : 'text-slate-600 hover:bg-muted dark:text-slate-300',
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="order-2 flex items-center gap-2 md:order-3 md:justify-self-end">
          <PillToggle
            options={[
              { value: 'beginner', label: 'Beginner' },
              { value: 'pro', label: 'PRO' },
            ]}
            value={uiMode}
            onChange={setUiMode}
          />
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card hover:bg-muted"
            aria-label="Toggle theme"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
          </button>
          <AuthControls />
        </div>
      </div>
    </header>
  );
}
