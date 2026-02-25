'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpen, LineChart, Star, Wallet, type LucideIcon } from 'lucide-react';
import { DashboardMarketTabs } from './dashboard-market-tabs';
import { useUiStore } from '@/stores/ui-store';
import { SectionCard } from '@/components/common/section-card';
import { MarketTabPanel } from './market-tab-panel';

export function DashboardHome() {
  const market = useUiStore((s) => s.dashboardMarket);
  const uiMode = useUiStore((s) => s.uiMode);
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
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="ui-panel hero-glow dashboard-grid-bg relative overflow-hidden rounded-3xl p-5 shadow-panel md:p-6"
      >
        <div className="absolute left-8 top-6 h-28 w-28 rounded-full bg-indigo-500/20 blur-3xl motion-safe:animate-pulseSoft" />
        <div className="absolute right-8 top-8 h-36 w-36 rounded-full bg-blue-500/14 blur-3xl motion-safe:animate-float" />
        <div className="absolute bottom-6 left-1/3 h-24 w-24 rounded-full bg-violet-500/12 blur-2xl motion-safe:animate-driftSlow" />
        <div className="relative space-y-5">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center rounded-full purple-chip px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-indigo-200">
              {uiMode === 'pro' ? 'PRO Stock Intelligence' : 'Beginner-Friendly Investing'}
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white md:text-5xl">
              <span className="title-gradient">Smarter Research Workflows</span>
              <br />
              <span className="text-slate-900 dark:text-white">Start with </span>
              <span className="accent-script">Stock Metrics</span>
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-sm text-slate-600 dark:text-slate-300 md:text-base">
              Use the search bar in the navigation header to look up U.S. stocks, Indian stocks, and mutual funds. Data is cached and refreshed efficiently, and unavailable fields are handled clearly in the interface.
            </p>
          </div>

          <div className="mx-auto max-w-2xl">
            <div className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Dashboard Market Switch</div>
            <div className="flex justify-center">
              <DashboardMarketTabs />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              ['Universal Search', 'Search stocks and mutual funds from the header'],
              [uiMode === 'pro' ? 'PRO Mode Analytics' : 'Beginner Mode Guidance', uiMode === 'pro' ? 'Ratios, statements, AI insights, peers' : 'Plain-language checks and simple explanations'],
              ['Personal Workspace', 'Watchlists, portfolio, notes, and learning in one place'],
            ].map(([title, text], idx) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx, duration: 0.22 }}
                className="surface-hover ui-panel glass rounded-2xl p-4"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-200 dark:text-indigo-200">{title}</div>
                <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{text}</div>
              </motion.div>
            ))}
          </div>

          <div className="ui-panel glass relative overflow-hidden rounded-2xl p-4">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/50 to-transparent" />
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Dashboard Overview</div>
                <div className="text-xs text-slate-500">Fast navigation into research workflows</div>
              </div>
              <div className="hidden rounded-full purple-chip px-3 py-1 text-xs text-indigo-200 md:block">Live workspace</div>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {[
                ['Watchlists', 'Track ideas and spot moves quickly', 'Create multiple local watchlists'],
                ['Screeners', 'Run strategy scans and custom filters', 'Magic Formula, Quality, Value, Momentum'],
                ['Portfolio', 'Review allocation and P&L summaries', 'Transactions and notes saved locally'],
              ].map(([label, desc, meta]) => (
                <div key={label} className="surface-hover rounded-xl border border-border/70 bg-card/45 p-4">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{label}</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{desc}</div>
                  <div className="mt-3 h-1.5 w-full rounded-full bg-muted/70">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500" style={{ width: `${label === 'Watchlists' ? 72 : label === 'Screeners' ? 86 : 64}%` }} />
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{meta}</div>
                </div>
              ))}
            </div>
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
              <div key={title} className="surface-hover rounded-xl border border-border/70 bg-card/40 p-3">
                <div className="font-medium">{title}</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{text}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <MarketTabPanel market={market} />

        <SectionCard title="Quick Navigation" subtitle="Core app tabs">
          <div className="space-y-2">
            {quickLinks.map(({ href, title, desc, icon: Comp }) => {
              return (
                <Link href={href} key={href} className="surface-hover ui-panel glass flex items-start gap-3 rounded-xl p-3 shadow-panel">
                  <div className="mt-0.5 rounded-lg bg-gradient-to-br from-indigo-500/20 to-blue-500/20 p-2 text-indigo-200 dark:text-indigo-200"><Comp className="h-4 w-4" /></div>
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{title}</div>
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
