'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Database,
  LineChart,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { DashboardMarketTabs } from './dashboard-market-tabs';
import { useUiStore } from '@/stores/ui-store';
import { SectionCard } from '@/components/common/section-card';
import { MarketTabPanel } from './market-tab-panel';

function HeroMarketIllustration() {
  const candles = [
    { x: 10, low: 68, high: 28, open: 56, close: 44, up: true },
    { x: 16, low: 72, high: 34, open: 44, close: 58, up: false },
    { x: 22, low: 66, high: 24, open: 52, close: 40, up: true },
    { x: 28, low: 62, high: 22, open: 38, close: 48, up: true },
    { x: 34, low: 76, high: 38, open: 52, close: 68, up: false },
    { x: 40, low: 70, high: 26, open: 62, close: 46, up: true },
    { x: 46, low: 60, high: 18, open: 46, close: 30, up: true },
    { x: 52, low: 64, high: 22, open: 34, close: 48, up: false },
    { x: 58, low: 56, high: 16, open: 42, close: 22, up: true },
    { x: 64, low: 50, high: 12, open: 18, close: 30, up: false },
    { x: 70, low: 46, high: 10, open: 28, close: 14, up: true },
    { x: 76, low: 44, high: 8, open: 24, close: 12, up: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.28 }}
      className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[28px]"
    >
      <div className="relative rounded-[28px] bg-gradient-to-br from-indigo-400/30 via-violet-500/12 to-blue-500/24 p-[1px] shadow-violet">
        <div className="ui-panel glass relative overflow-hidden rounded-[28px] p-3 md:p-4">
          <div className="pointer-events-none absolute left-1/2 top-6 h-20 w-40 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-2 left-1/2 h-16 w-2/3 -translate-x-1/2 rounded-full bg-violet-500/20 blur-2xl" />

          <div className="relative rounded-[20px] border border-indigo-300/15 bg-[#050916]/90 p-2 shadow-panel md:p-3">
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-indigo-300/10 bg-white/[0.02] px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              </div>
              <div className="mx-auto hidden w-44 rounded-full border border-indigo-200/10 bg-indigo-500/5 px-3 py-1 text-center text-[10px] text-indigo-100/70 sm:block">
                stockmetrics.app / dashboard
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.45fr_1fr]">
              <div className="rounded-2xl border border-indigo-300/12 bg-white/[0.02] p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-white">Market Overview</div>
                    <div className="text-xs text-indigo-100/60">Signals, momentum, and comparative moves</div>
                  </div>
                  <div className="rounded-full border border-indigo-300/15 bg-indigo-500/10 px-2.5 py-1 text-[11px] text-indigo-200">
                    Live Workspace
                  </div>
                </div>

                <div className="relative h-48 overflow-hidden rounded-xl border border-indigo-300/10 bg-[#070c1f] p-3 sm:h-56">
                  <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(129,140,248,0.13)_1px,transparent_1px),linear-gradient(90deg,rgba(129,140,248,0.13)_1px,transparent_1px)] [background-size:26px_26px]" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-violet-500/14 to-transparent" />

                  <div className="relative flex h-full flex-col justify-between">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'NIFTY 50', change: '+1.82%', up: true },
                        { label: 'S&P 500', change: '+0.94%', up: true },
                        { label: 'NASDAQ', change: '-0.21%', up: false },
                      ].map(({ label, change, up }) => (
                        <div key={label} className="rounded-lg border border-indigo-300/10 bg-white/[0.02] px-2 py-1.5">
                          <div className="text-[10px] uppercase tracking-[0.14em] text-indigo-100/55">{label}</div>
                          <div className={`mt-1 text-xs font-semibold ${up ? 'text-emerald-300' : 'text-rose-300'}`}>{change}</div>
                        </div>
                      ))}
                    </div>

                    <div className="relative h-32">
                      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
                        <path
                          d="M0 78 C 9 70, 14 68, 20 74 C 28 82, 35 56, 42 62 C 50 70, 56 46, 64 52 C 71 56, 76 42, 82 48 C 90 54, 94 30, 100 24"
                          fill="none"
                          stroke="rgba(56, 189, 248, 0.95)"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <path
                          d="M0 88 C 10 80, 18 82, 24 86 C 30 90, 38 74, 44 78 C 51 84, 58 66, 64 72 C 70 78, 78 58, 84 64 C 92 70, 95 56, 100 50"
                          fill="none"
                          stroke="rgba(217, 70, 239, 0.9)"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>

                      {candles.map((c, idx) => (
                        <div
                          key={`${c.x}-${idx}`}
                          className="absolute bottom-0"
                          style={{ left: `${c.x}%`, width: '10px', transform: 'translateX(-50%)' }}
                        >
                          <div
                            className={`absolute left-1/2 w-px -translate-x-1/2 ${c.up ? 'bg-cyan-300/85' : 'bg-rose-300/85'}`}
                            style={{ top: `${c.high}%`, bottom: `${100 - c.low}%` }}
                          />
                          <div
                            className={`absolute left-1/2 w-[7px] -translate-x-1/2 rounded-sm ${c.up ? 'bg-cyan-300/85' : 'bg-rose-300/85'}`}
                            style={{
                              top: `${Math.min(c.open, c.close)}%`,
                              height: `${Math.max(Math.abs(c.close - c.open), 5)}%`,
                              boxShadow: c.up ? '0 0 10px rgba(34,211,238,0.2)' : '0 0 10px rgba(251,113,133,0.16)',
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-indigo-100/55">
                      <span>1D</span>
                      <span>1W</span>
                      <span>1M</span>
                      <span>3M</span>
                      <span>YTD</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-indigo-300/12 bg-white/[0.02] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-200">
                      <Activity className="h-3.5 w-3.5" />
                      Market Pulse
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-cyan-200" />
                  </div>
                  <div className="text-2xl font-semibold text-white">82</div>
                  <div className="text-xs text-indigo-100/60">active signals across tracked lists</div>
                  <div className="mt-3 h-1.5 rounded-full bg-white/5">
                    <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400" />
                  </div>
                </div>

                <div className="rounded-2xl border border-indigo-300/12 bg-white/[0.02] p-3">
                  <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-200">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Summary
                  </div>
                  <ul className="space-y-2 text-xs text-indigo-100/75">
                    <li className="flex items-center gap-2 rounded-lg border border-indigo-300/10 bg-white/[0.02] px-2 py-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                      Momentum improving in large caps
                    </li>
                    <li className="flex items-center gap-2 rounded-lg border border-indigo-300/10 bg-white/[0.02] px-2 py-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                      Watch earnings-heavy sessions
                    </li>
                    <li className="flex items-center gap-2 rounded-lg border border-indigo-300/10 bg-white/[0.02] px-2 py-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-300" />
                      Peer spreads widened in banking
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-indigo-300/12 bg-white/[0.02] p-3 sm:col-span-2 lg:col-span-1">
                  <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-200">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Coverage
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ['US', 'Stocks', 'from-cyan-400/20 to-sky-400/10'],
                      ['IND', 'Stocks', 'from-violet-400/20 to-indigo-400/10'],
                      ['MF', 'Funds', 'from-blue-400/20 to-cyan-400/10'],
                    ].map(([code, label, bg]) => (
                      <div key={code} className={`rounded-xl border border-indigo-300/10 bg-gradient-to-br ${bg} px-2 py-2 text-center`}>
                        <div className="text-sm font-semibold text-white">{code}</div>
                        <div className="text-[10px] uppercase tracking-[0.14em] text-indigo-100/60">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

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
  const beginnerCards: Array<{ title: string; text: string; icon: LucideIcon }> = [
    {
      title: 'Is the company growing?',
      text: 'Check if sales and profits are increasing over multiple periods.',
      icon: TrendingUp,
    },
    {
      title: 'Is debt manageable?',
      text: 'High debt can hurt a company during slowdowns.',
      icon: ShieldCheck,
    },
    {
      title: 'Are profits stable?',
      text: 'Avoid businesses with wildly fluctuating profits unless you understand why.',
      icon: Activity,
    },
    {
      title: 'Is the price too expensive?',
      text: 'Compare price vs earnings and growth, not only the stock chart.',
      icon: BarChart3,
    },
  ];
  const heroInfoCards: Array<{ title: string; text: string; icon: LucideIcon }> = [
    {
      title: 'Universal Search',
      text: 'Search stocks and mutual funds from the header',
      icon: Search,
    },
    {
      title: uiMode === 'pro' ? 'PRO Mode Analytics' : 'Beginner Mode Guidance',
      text:
        uiMode === 'pro'
          ? 'Ratios, statements, AI insights, peers'
          : 'Plain-language checks and simple explanations',
      icon: Sparkles,
    },
    {
      title: 'Personal Workspace',
      text: 'Watchlists, portfolio, notes, and learning in one place',
      icon: Database,
    },
  ];
  const overviewCards: Array<{ label: string; desc: string; meta: string; icon: LucideIcon; progress: number }> = [
    {
      label: 'Watchlists',
      desc: 'Track ideas and spot moves quickly',
      meta: 'Create multiple local watchlists',
      icon: Star,
      progress: 72,
    },
    {
      label: 'Screeners',
      desc: 'Run strategy scans and custom filters',
      meta: 'Magic Formula, Quality, Value, Momentum',
      icon: LineChart,
      progress: 86,
    },
    {
      label: 'Portfolio',
      desc: 'Review allocation and P&L summaries',
      meta: 'Transactions and notes saved locally',
      icon: Wallet,
      progress: 64,
    },
  ];

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="ui-panel hero-glow dashboard-grid-bg relative overflow-hidden rounded-3xl px-5 pb-5 pt-2 shadow-panel md:px-6 md:pb-6 md:pt-2"
      >
        <div className="absolute left-8 top-6 h-28 w-28 rounded-full bg-indigo-500/20 blur-3xl motion-safe:animate-pulseSoft" />
        <div className="absolute right-8 top-8 h-36 w-36 rounded-full bg-blue-500/14 blur-3xl motion-safe:animate-float" />
        <div className="absolute bottom-6 left-1/3 h-24 w-24 rounded-full bg-violet-500/12 blur-2xl motion-safe:animate-driftSlow" />
        <div className="relative space-y-4 md:space-y-5">
          <div className="mx-auto max-w-4xl -translate-y-1 text-center md:-translate-y-60 lg:-translate-y-30">
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

          <div className="relative -translate-y-40">
            <HeroMarketIllustration />
          </div>

          <div className="mx-auto max-w-2xl">
            <div className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Dashboard Market Switch</div>
            <div className="flex justify-center">
              <DashboardMarketTabs />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {heroInfoCards.map(({ title, text, icon: Icon }, idx) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx, duration: 0.22 }}
                className="surface-hover ui-panel glass rounded-2xl p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-200 dark:text-indigo-200">
                    <span className="rounded-lg border border-indigo-300/15 bg-indigo-400/10 p-1.5">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {title}
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-indigo-200/70" />
                </div>
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
              {overviewCards.map(({ label, desc, meta, icon: Icon, progress }) => (
                <div key={label} className="surface-hover rounded-xl border border-border/70 bg-card/45 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2">
                      <span className="rounded-lg border border-indigo-300/15 bg-indigo-400/10 p-2 text-indigo-200">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">{label}</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-indigo-200/70" />
                  </div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{desc}</div>
                  <div className="mt-3 h-1.5 w-full rounded-full bg-muted/70">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500" style={{ width: `${progress}%` }} />
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
            {beginnerCards.map(({ title, text, icon: Icon }) => (
              <div key={title} className="surface-hover rounded-xl border border-border/70 bg-card/40 p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg border border-indigo-300/15 bg-indigo-400/10 p-1.5 text-indigo-200">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="font-medium">{title}</div>
                </div>
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
