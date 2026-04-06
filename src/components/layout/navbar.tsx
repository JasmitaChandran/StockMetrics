'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoonStar, SunMedium } from 'lucide-react';
import { useUiStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils/cn';
import { PillToggle } from '@/components/common/pill-toggle';
import { AuthControls } from '@/components/auth/auth-controls';
import { UniversalSearch } from '@/components/search/universal-search';
import { StockMetricsLogo } from '@/components/common/stock-metrics-logo';
import { MarketTickerStrip } from './market-ticker-strip';

const tabs = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/screener', label: 'Screener' },
  { href: '/agentic', label: 'Personalized Agent' },
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
    <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/75 backdrop-blur-2xl">
      <div className="border-b border-white/10 bg-slate-950/95">
        <div className="mx-auto max-w-[1800px] px-2 sm:px-4">
          <MarketTickerStrip />
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="order-1 flex w-full min-w-0 items-center gap-3 md:w-auto md:justify-self-start">
            <Link href="/dashboard" className="flex shrink-0 items-center gap-2 rounded-xl px-2 py-1 transition hover:bg-muted/45">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/95 p-1 shadow-violet ring-1 ring-indigo-300/30 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 dark:ring-slate-500/55">
                <StockMetricsLogo className="h-7 w-7" />
              </div>
              <div>
                <div className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">Stock Metrics</div>
                <div className="hidden text-[10px] uppercase tracking-[0.18em] text-slate-500 lg:block">Intelligence Beyond Data.</div>
              </div>
            </Link>
            <div className="min-w-0 flex-1 md:w-[340px] md:flex-none lg:w-[430px] xl:w-[500px]">
              <UniversalSearch />
            </div>
          </div>

          <div className="order-2 flex items-center gap-2 md:justify-self-end">
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
              className="ui-panel glass inline-flex h-9 w-9 items-center justify-center rounded-xl shadow-panel transition hover:bg-muted/40"
              aria-label="Toggle theme"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
            </button>
            <AuthControls />
          </div>
        </div>

        <div className="mt-3 flex">
          <nav className="ui-panel glass flex w-full min-w-0 gap-1 overflow-x-auto rounded-2xl p-1 shadow-panel md:mx-auto md:w-auto md:max-w-full">
            {tabs.map((tab) => {
              const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-sm transition',
                    active
                      ? 'bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500 text-white shadow-violet'
                      : 'text-slate-600 hover:bg-muted/60 dark:text-slate-300',
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
