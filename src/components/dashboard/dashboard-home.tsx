'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpen, LineChart, Star, Wallet, type LucideIcon } from 'lucide-react';
import { UniversalSearch } from '@/components/search/universal-search';
import { DashboardMarketTabs } from './dashboard-market-tabs';
import { useUiStore } from '@/stores/ui-store';
import { demoUniverse } from '@/lib/data/mock/demo-data';
import { SectionCard } from '@/components/common/section-card';

export function DashboardHome() {
  const market = useUiStore((s) => s.dashboardMarket);
  const uiMode = useUiStore((s) => s.uiMode);
  const featured = demoUniverse.filter((e) => e.market === market).slice(0, 8);
  const quickLinks: Array<{ href: string; title: string; desc: string; icon: LucideIcon }> = [
    {
      href: '/screener',
      title: 'Screener',
      desc: 'AI / rule-based screener, built-in strategies, custom screens',
      icon: LineChart,
    },
    {
      href: '/watchlist',
      title: 'Watchlist',
      desc: 'Multiple watchlists with local persistence and quick changes',
      icon: Star,
    },
    {
      href: '/portfolio',
      title: 'Portfolio',
      desc: 'Track buy/sell transactions, P&L and allocation locally',
      icon: Wallet,
    },
    {
      href: '/learning',
      title: 'Learning',
      desc: 'Finance Q&A using local markdown knowledge + optional LLM',
      icon: BookOpen,
    },
  ];

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-sm"
      >
        <div className="absolute -right-12 top-0 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="relative space-y-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">{uiMode === 'pro' ? 'PRO Dashboard' : 'Beginner Dashboard'}</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Market research and portfolio intelligence</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              Universal search across US stocks, Indian stocks, and mutual funds. Data is cached and refreshed efficiently, and unavailable fields are handled clearly in the interface.
            </p>
          </div>
          <UniversalSearch marketFilter={undefined} />
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Dashboard Market Switch</div>
            <DashboardMarketTabs />
          </div>
        </div>
      </motion.section>

      {uiMode === 'beginner' ? (
        <SectionCard title="Beginner Mode Guide" subtitle="Plain-language investing checks instead of financial jargon.">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ['Is the company growing?', 'Check if sales and profits are increasing over multiple periods.'],
              ['Is debt manageable?', 'High debt can hurt a company during slowdowns.'],
              ['Are profits stable?', 'Avoid businesses with wildly fluctuating profits unless you understand why.'],
              ['Is the price too expensive?', 'Compare price vs earnings and growth, not only the stock chart.'],
            ].map(([title, text]) => (
              <div key={title} className="rounded-xl border border-border p-3">
                <div className="font-medium">{title}</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{text}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <SectionCard title={`Featured ${market === 'us' ? 'US Stocks' : market === 'india' ? 'Indian Stocks' : 'Mutual Funds'}`} subtitle="Selected instruments for quick access. Use search to explore the broader universe.">
          <div className="grid gap-3 md:grid-cols-2">
            {featured.map((item) => (
              <Link
                href={`/dashboard/${item.market}/${encodeURIComponent(item.symbol)}`}
                key={item.id}
                className="rounded-xl border border-border p-3 transition hover:-translate-y-0.5 hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.displaySymbol} • {item.exchange ?? item.market.toUpperCase()}</div>
                  </div>
                  <span className="rounded-lg bg-muted px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">{item.market}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{item.summary}</p>
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Quick Navigation" subtitle="Core app tabs">
          <div className="space-y-2">
            {quickLinks.map(({ href, title, desc, icon: Comp }) => {
              return (
                <Link href={href} key={href} className="flex items-start gap-3 rounded-xl border border-border p-3 hover:bg-muted/40">
                  <div className="mt-0.5 rounded-lg bg-muted p-2"><Comp className="h-4 w-4" /></div>
                  <div>
                    <div className="text-sm font-medium">{title}</div>
                    <div className="text-xs text-slate-500">{desc}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
