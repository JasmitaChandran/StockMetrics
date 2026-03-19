'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle, ExternalLink, FileSpreadsheet, Globe2, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AiInsights, BeginnerAssessment, FinancialStatementTable, Quote, StockDetailBundle } from '@/types';
import { SectionCard } from '@/components/common/section-card';
import { PillToggle } from '@/components/common/pill-toggle';
import { useUiStore } from '@/stores/ui-store';
import { useFxUsdInr, useLiveQuote } from '@/lib/hooks/use-stock-data';
import { exportStatementsToXlsx } from '@/lib/utils/excel';
import { formatCurrency, formatDateTime, formatDateTimeWithSeconds, formatNumber, formatPercent } from '@/lib/utils/format';
import { getMarketStatus } from '@/lib/utils/market-hours';
import { getAiProvider } from '@/lib/ai';
import { getNote, upsertNote } from '@/lib/storage/repositories';
import { demoFundamentalsBySymbol, demoUniverse } from '@/lib/data/mock/demo-data';
import { cn } from '@/lib/utils/cn';

const DynamicChartPanel = dynamic(
  () => import('@/components/dashboard/stock-chart-panel').then((m) => m.StockChartPanel),
  {
    ssr: false,
    loading: () => <div className="h-[380px] animate-pulse rounded-2xl border border-border bg-card" />,
  },
);

type StatementTab = FinancialStatementTable['kind'];

const statementOrder: StatementTab[] = ['profitLoss', 'quarterly', 'balanceSheet', 'cashFlow'];
const statementLabels: Record<StatementTab, string> = {
  profitLoss: 'Profit and Loss',
  quarterly: 'Quarterly Results',
  balanceSheet: 'Balance Sheet',
  cashFlow: 'Cash Flow',
};

type SummaryTone = 'positive' | 'caution' | 'neutral';

function inferSummaryTone(text: string): SummaryTone {
  const value = text.toLowerCase();
  if (
    /good sign|positive|constructive|healthy|supportive|improving|manageable|strong|safer|reasonable|comfortable/.test(value)
  ) {
    return 'positive';
  }
  if (/caution|warning|risk|weak|decline|defensive|deferred|defer|mixed|uncertain|soft|pressure|hold\/watch/.test(value)) {
    return 'caution';
  }
  return 'neutral';
}

function splitSummaryLine(raw: string): { main: string; simple?: string; tone: SummaryTone } {
  const marker = '(Simple view:';
  const idx = raw.lastIndexOf(marker);
  if (idx === -1) return { main: raw, tone: inferSummaryTone(raw) };
  const main = raw.slice(0, idx).trim();
  const simpleWithPrefix = raw.slice(idx + 1).trim();
  const simple = (simpleWithPrefix.endsWith(')') ? simpleWithPrefix.slice(0, -1) : simpleWithPrefix).trim();
  return {
    main,
    simple,
    tone: inferSummaryTone(simple),
  };
}

function metricValueToDisplay(
  metric: StockDetailBundle['fundamentals']['keyMetrics'][number],
  currencyOverride: 'USD' | 'INR',
  fxRate?: number,
) {
  if (metric.unit === 'currency') {
    const raw = metric.value;
    const isUsdMetric = metric.currency === 'USD';
    const converted = isUsdMetric && currencyOverride === 'INR' && fxRate ? raw * fxRate : raw;
    return formatCurrency(converted, currencyOverride);
  }
  if (metric.unit === 'percent') return formatPercent(metric.value);
  return formatNumber(metric.value, 2);
}

function convertHistoryIfNeeded(bundle: StockDetailBundle, targetCurrency: 'USD' | 'INR', fxRate?: number) {
  if (bundle.history.currency !== 'USD' || targetCurrency !== 'INR' || !fxRate) return bundle.history;
  return {
    ...bundle.history,
    currency: 'INR' as const,
    points: bundle.history.points.map((p) => ({ ...p, close: p.close * fxRate })),
    source: `${bundle.history.source} + FX converted`,
  };
}

function convertQuoteIfNeeded(quote: Quote, targetCurrency: 'USD' | 'INR', fxRate?: number) {
  if (quote.currency !== 'USD' || targetCurrency !== 'INR' || !fxRate) return quote;
  const hasNumber = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value);
  return {
    ...quote,
    currency: 'INR' as const,
    price: hasNumber(quote.price) ? quote.price * fxRate : quote.price,
    previousClose: hasNumber(quote.previousClose) ? quote.previousClose * fxRate : quote.previousClose,
    change: hasNumber(quote.change) ? quote.change * fxRate : quote.change,
  };
}

function normalizeHeaderQuote(bundle: StockDetailBundle, incomingQuote?: Quote | null): Quote {
  const baseQuote = incomingQuote ?? bundle.quote;
  const historyPoints = bundle.history.points.filter((p) => typeof p.close === 'number');
  const lastHistory = historyPoints[historyPoints.length - 1];
  const prevHistory = historyPoints[historyPoints.length - 2] ?? lastHistory;

  const price = typeof baseQuote.price === 'number' ? baseQuote.price : lastHistory?.close ?? null;
  const previousClose =
    typeof baseQuote.previousClose === 'number'
      ? baseQuote.previousClose
      : prevHistory?.close ?? (typeof bundle.quote.previousClose === 'number' ? bundle.quote.previousClose : null);

  const change =
    typeof baseQuote.change === 'number'
      ? baseQuote.change
      : price !== null && previousClose !== null
        ? price - previousClose
        : null;

  const changePercent =
    typeof baseQuote.changePercent === 'number'
      ? baseQuote.changePercent
      : change !== null && previousClose
        ? (change / previousClose) * 100
        : null;

  return {
    ...baseQuote,
    price,
    previousClose,
    change,
    changePercent,
    timestamp: baseQuote.timestamp ?? bundle.quote.timestamp ?? lastHistory?.ts ?? null,
  };
}

type AboutHighlight = { label: string; value: string };

function StatementTableView({ table }: { table: FinancialStatementTable }) {
  type StatementView = 'consolidated' | 'standalone';
  const availableViews = [
    ...(table.consolidatedAvailable ? (['consolidated'] as const) : []),
    ...(table.standaloneAvailable ? (['standalone'] as const) : []),
  ] as StatementView[];
  const resolvedDefaultView = availableViews.includes(table.activeViewDefault) ? table.activeViewDefault : (availableViews[0] ?? 'standalone');
  const [view, setView] = useState<StatementView>(resolvedDefaultView);
  const [summary, setSummary] = useState<{
    bullets: string[];
    title: string;
    confidence?: 'low' | 'medium' | 'high';
  } | null>(null);
  const activeView: StatementView = availableViews.includes(view) ? view : resolvedDefaultView;
  const activeViewData = table.viewData?.[activeView];
  const years = activeViewData?.years ?? table.years;
  const rows = activeViewData?.rows ?? table.rows;
  const parsedSummaryBullets = useMemo(() => summary?.bullets.map((line) => splitSummaryLine(line)) ?? [], [summary]);

  const confidenceStyle = useMemo(() => {
    if (summary?.confidence === 'high') return 'border-emerald-500/35 bg-emerald-500/12 text-emerald-300';
    if (summary?.confidence === 'medium') return 'border-sky-500/35 bg-sky-500/12 text-sky-300';
    return 'border-amber-500/35 bg-amber-500/12 text-amber-300';
  }, [summary?.confidence]);

  useEffect(() => {
    setView(resolvedDefaultView);
  }, [table, resolvedDefaultView]);

  useEffect(() => {
    let active = true;
    getAiProvider()
      .summarizeStatement({ table, currentView: activeView })
      .then((res) => {
        if (active) setSummary(res);
      });
    return () => {
      active = false;
    };
  }, [table, activeView]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-slate-500">Years: {years.join(', ') || 'No data'}</div>
        {availableViews.length > 1 ? (
          <PillToggle
            options={availableViews.map((v) => ({ value: v, label: v === 'consolidated' ? 'Consolidated' : 'Standalone' }))}
            value={activeView}
            onChange={(v) => setView(v as StatementView)}
          />
        ) : (
          <div className="rounded-full border border-border/70 bg-muted/50 px-3 py-1 text-xs text-slate-500">
            {availableViews[0] === 'consolidated' ? 'Consolidated only' : 'Standalone only'}
          </div>
        )}
      </div>
      <div className="overflow-auto rounded-xl border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Particulars</th>
              {years.map((year) => (
                <th key={year} className="px-3 py-2 text-right font-medium">
                  {year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={years.length + 1} className="px-3 py-4 text-center text-sm text-slate-500">
                  Statement data is not currently available.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.label} className="border-t border-border/70">
                  <td className="px-3 py-2 font-medium">{row.label}</td>
                  {years.map((year) => (
                    <td key={`${row.label}-${year}`} className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">
                      {typeof row.valuesByYear[year] === 'number' ? formatNumber(row.valuesByYear[year] as number) : '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI Summary</div>
          {summary?.confidence ? (
            <div className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', confidenceStyle)}>
              {summary.confidence} confidence
            </div>
          ) : null}
        </div>
        {summary ? (
          <ul className="space-y-2">
            {parsedSummaryBullets.map((line, idx) => (
              <li
                key={`${line.main}-${idx}`}
                className={cn('rounded-xl border p-3', {
                  'border-emerald-500/20 bg-emerald-500/5': line.tone === 'positive',
                  'border-amber-500/20 bg-amber-500/5': line.tone === 'caution',
                  'border-slate-500/20 bg-slate-500/5': line.tone === 'neutral',
                })}
              >
                <p className="text-sm leading-relaxed text-slate-100">{line.main}</p>
                {line.simple ? (
                  <div
                    className={cn('mt-2 rounded-lg border px-3 py-2 text-xs leading-relaxed', {
                      'border-emerald-400/30 bg-emerald-400/10 text-emerald-100': line.tone === 'positive',
                      'border-amber-400/30 bg-amber-400/10 text-amber-100': line.tone === 'caution',
                      'border-sky-400/30 bg-sky-400/10 text-sky-100': line.tone === 'neutral',
                    })}
                  >
                    <span className="mr-1 font-semibold uppercase tracking-wide text-[10px]">Simple view:</span>
                    {line.simple.replace(/^Simple view:\s*/i, '')}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-slate-500">Generating summary...</div>
        )}
      </div>
    </div>
  );
}

function NotesSection({ stockId }: { stockId: string }) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getNote(stockId).then((note) => {
      if (!active) return;
      setValue(note?.content ?? '');
      setSavedAt(note?.updatedAt ?? null);
    });
    return () => {
      active = false;
    };
  }, [stockId]);

  async function save() {
    setSaving(true);
    const updatedAt = new Date().toISOString();
    await upsertNote({ id: `note:${stockId}`, stockId, content: value, updatedAt });
    setSavedAt(updatedAt);
    setSaving(false);
  }

  return (
    <SectionCard title="Notes">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={5}
        placeholder="Write your own notes for this stock..."
        className="w-full rounded-xl border border-border bg-card p-3 text-sm"
      />
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{savedAt ? `Last saved: ${formatDateTime(savedAt)}` : 'Not saved yet'}</span>
        <button onClick={save} disabled={saving} className="rounded-lg bg-accent px-3 py-1.5 text-white disabled:opacity-60">
          {saving ? 'Saving...' : 'Save Notes'}
        </button>
      </div>
    </SectionCard>
  );
}

function BeginnerPanel({ assessment }: { assessment: BeginnerAssessment | null }) {
  const colorMap = {
    Yes: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
    Neutral: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30',
    No: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30',
  } as const;
  return (
    <SectionCard title="Beginner Assistant" subtitle="Educational only. Avoids jargon and explains what to check.">
      {!assessment ? (
        <p className="text-sm text-slate-500">Preparing beginner-friendly checks...</p>
      ) : (
        <div className="space-y-3">
          <div className={cn('inline-flex rounded-xl border px-3 py-2 text-sm font-semibold', colorMap[assessment.recommendation])}>
            Should I consider buying? {assessment.recommendation} • Buy score {assessment.buyScore}/5
          </div>
          <ul className="space-y-2 text-sm">
            {assessment.simpleChecks.map((check) => (
              <li key={check.label} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{check.label}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs', {
                    'bg-emerald-500/15 text-emerald-500': check.status === 'good',
                    'bg-amber-500/15 text-amber-500': check.status === 'watch',
                    'bg-rose-500/15 text-rose-500': check.status === 'bad',
                  })}>{check.status}</span>
                </div>
                <p className="mt-1 text-slate-600 dark:text-slate-300">{check.explanation}</p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">{assessment.disclaimer}</p>
        </div>
      )}
    </SectionCard>
  );
}

function AiInsightsPanel({ insights }: { insights: AiInsights | null }) {
  if (!insights) {
    return (
      <SectionCard title="AI Insights" subtitle="Automated analytical indicators generated from available data.">
        <div className="text-sm text-slate-500">Generating trend, risk, sentiment, and forecast analysis...</div>
      </SectionCard>
    );
  }
  return (
    <SectionCard title="AI Insights" subtitle="Automated analytical indicators. For research and education purposes only.">
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-3">
          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Bull / Bear Periods</div>
            <div className="space-y-2 text-sm">
              {insights.trendPeriods.length ? (
                insights.trendPeriods.map((p) => (
                  <div key={`${p.start}-${p.end}`} className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-2 py-1.5">
                    <span className="text-xs text-slate-500">{new Date(p.start).toLocaleDateString()} → {new Date(p.end).toLocaleDateString()}</span>
                    <span className={cn('inline-flex items-center gap-1 text-sm font-medium', p.type === 'bull' ? 'text-positive' : 'text-negative')}>
                      {p.type === 'bull' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {formatPercent(p.returnPct)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500">Not enough history for trend segmentation.</div>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Risk Analysis</div>
            <div className="mb-2 text-sm font-medium">Risk Level: {insights.risk.riskLevel}</div>
            <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
              {insights.risk.notes.map((n) => (
                <li key={n}>• {n}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Fraud / Governance Red Flags</div>
            {insights.fraudFlags.length ? (
              <div className="space-y-2">
                {insights.fraudFlags.map((flag) => (
                  <div key={flag.id} className="rounded-lg border border-border p-2 text-sm">
                    <div className="flex items-center gap-2 font-medium">
                      <AlertTriangle className="h-4 w-4 text-warning" /> {flag.title}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">{flag.severity}</span>
                    </div>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">{flag.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No red flags were triggered by the current analytical checks.</p>
            )}
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">News Sentiment + BUY/SELL/HOLD Heuristic</div>
            <div className="mb-2 text-sm font-medium">Sentiment: {insights.sentiment.label}</div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-lg bg-emerald-500/10 p-2">BUY {insights.sentiment.buyProbability}%</div>
              <div className="rounded-lg bg-amber-500/10 p-2">HOLD {insights.sentiment.holdProbability}%</div>
              <div className="rounded-lg bg-rose-500/10 p-2">SELL {insights.sentiment.sellProbability}%</div>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
              {insights.sentiment.rationale.map((r) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Forecast (Baseline Trend)</div>
            <div className="overflow-auto rounded-lg border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/30 text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Period</th>
                    <th className="px-3 py-2 text-right">Sales</th>
                    <th className="px-3 py-2 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.forecast.map((f) => (
                    <tr key={f.period} className="border-t border-border">
                      <td className="px-3 py-2">{f.period}</td>
                      <td className="px-3 py-2 text-right">{f.sales ? formatNumber(f.sales) : '—'}</td>
                      <td className="px-3 py-2 text-right">{f.profit ? formatNumber(f.profit) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-border p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">AI Pros</div>
              <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {insights.prosCons.pros.map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">AI Cons</div>
              <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {insights.prosCons.cons.map((c) => (
                  <li key={c}>• {c}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function PeerComparisonPanel({ bundle }: { bundle: StockDetailBundle }) {
  const [manual, setManual] = useState('');
  const [manualPeers, setManualPeers] = useState<string[]>([]);

  const peerSymbols = useMemo(() => {
    const base = bundle.fundamentals.peerSymbols ?? [];
    return Array.from(new Set([...base, ...manualPeers])).slice(0, 8);
  }, [bundle.fundamentals.peerSymbols, manualPeers]);

  const rows = useMemo(() => {
    const symbols = [bundle.entity.symbol, ...peerSymbols];
    return symbols
      .map((symbol) => {
        const f = symbol === bundle.entity.symbol ? bundle.fundamentals : demoFundamentalsBySymbol[symbol];
        const metric = (key: string) => f?.keyMetrics.find((m) => m.key === key)?.value;
        return {
          symbol,
          name: demoUniverse.find((e) => e.symbol === symbol)?.displaySymbol ?? symbol,
          pe: metric('pe'),
          roe: metric('roe'),
          salesGrowth: metric('salesGrowth'),
          profitGrowth: metric('profitGrowth'),
          debtToEquity: metric('debtToEquity'),
        };
      })
      .filter(Boolean);
  }, [bundle, peerSymbols]);

  function addManualPeer() {
    const q = manual.trim().toUpperCase();
    if (!q) return;
    const match = demoUniverse.find(
      (e) => e.symbol.toUpperCase() === q || e.displaySymbol.toUpperCase() === q || e.name.toUpperCase().includes(q),
    );
    if (match) setManualPeers((prev) => Array.from(new Set([...prev, match.symbol])));
    setManual('');
  }

  return (
    <SectionCard title="Peer Comparison" subtitle="Auto-suggested + add your own company for detailed comparison.">
      <div className="overflow-auto rounded-xl border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Company</th>
              <th className="px-3 py-2 text-right">P/E</th>
              <th className="px-3 py-2 text-right">ROE</th>
              <th className="px-3 py-2 text-right">Sales Growth</th>
              <th className="px-3 py-2 text-right">Profit Growth</th>
              <th className="px-3 py-2 text-right">Debt/Equity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.symbol} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{row.name}</td>
                <td className="px-3 py-2 text-right">{row.pe ? formatNumber(row.pe) : '—'}</td>
                <td className="px-3 py-2 text-right">{row.roe ? formatPercent(row.roe) : '—'}</td>
                <td className="px-3 py-2 text-right">{row.salesGrowth ? formatPercent(row.salesGrowth) : '—'}</td>
                <td className="px-3 py-2 text-right">{row.profitGrowth ? formatPercent(row.profitGrowth) : '—'}</td>
                <td className="px-3 py-2 text-right">{row.debtToEquity ? formatNumber(row.debtToEquity) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-sm font-medium">Detailed Comparison with</label>
        <div className="flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Add company / symbol (e.g., ICICIBANK, MSFT)"
            className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm"
          />
          <button onClick={addManualPeer} className="rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted">
            Add
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

function ShareholdingPanel({ shareholding }: { shareholding: StockDetailBundle['fundamentals']['shareholding'] }) {
  if (!shareholding) {
    return (
      <SectionCard title="Shareholding Pattern" subtitle="Promoters, FIIs, DIIs, Government, Public">
        <p className="text-sm text-slate-500">Shareholding data is not currently available for this security.</p>
      </SectionCard>
    );
  }

  const rows = [
    ['Promoters', shareholding.promoters],
    ['FIIs', shareholding.fiis],
    ['DIIs', shareholding.diis],
    ['Government', shareholding.government],
    ['Public', shareholding.public],
  ].filter(([, v]) => typeof v === 'number') as Array<[string, number]>;

  return (
    <SectionCard title="Shareholding Pattern" subtitle={shareholding.asOf ? `As of ${shareholding.asOf}` : undefined}>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{label}</span>
              <span className="text-slate-500">{formatPercent(value)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function StockDetailView({ bundle }: { bundle: StockDetailBundle }) {
  const uiMode = useUiStore((s) => s.uiMode);
  const preferredCurrencyForUs = useUiStore((s) => s.preferredCurrencyForUs);
  const setPreferredCurrencyForUs = useUiStore((s) => s.setPreferredCurrencyForUs);
  const { data: fx } = useFxUsdInr();
  const [statementTab, setStatementTab] = useState<StatementTab>('profitLoss');
  const [insights, setInsights] = useState<AiInsights | null>(null);
  const [beginnerAssessment, setBeginnerAssessment] = useState<BeginnerAssessment | null>(null);
  const [statusTick, setStatusTick] = useState(0);
  const [pricePulseKey, setPricePulseKey] = useState(0);
  const [priceTickDirection, setPriceTickDirection] = useState<'up' | 'down' | 'flat'>('flat');
  const previousPriceRef = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setStatusTick((v) => v + 1), 1_000);
    return () => window.clearInterval(id);
  }, []);

  const status = useMemo(() => {
    void statusTick;
    return getMarketStatus(bundle.entity.market);
  }, [bundle.entity.market, statusTick]);
  const { data: polledQuote } = useLiveQuote(bundle.entity, {
    initialData: bundle.quote,
    refetchMs: bundle.entity.market === 'mf' ? 60_000 : status.isOpen ? 1_000 : 15_000,
  });
  const normalizedQuote = useMemo(() => normalizeHeaderQuote(bundle, polledQuote), [bundle, polledQuote]);
  const displayCurrency = bundle.entity.market === 'us' ? preferredCurrencyForUs : normalizedQuote.currency;
  const quote = useMemo(
    () => convertQuoteIfNeeded(normalizedQuote, displayCurrency, fx?.rate),
    [normalizedQuote, displayCurrency, fx?.rate],
  );
  useEffect(() => {
    const currentPrice = typeof quote.price === 'number' ? quote.price : null;
    if (currentPrice === null) return;
    const previousPrice = previousPriceRef.current;
    if (typeof previousPrice === 'number' && currentPrice !== previousPrice) {
      setPriceTickDirection(currentPrice > previousPrice ? 'up' : 'down');
      setPricePulseKey((v) => v + 1);
      const id = window.setTimeout(() => setPriceTickDirection('flat'), 700);
      previousPriceRef.current = currentPrice;
      return () => window.clearTimeout(id);
    }
    previousPriceRef.current = currentPrice;
  }, [quote.price]);
  const chartHistory = useMemo(
    () => convertHistoryIfNeeded(bundle, displayCurrency, fx?.rate),
    [bundle, displayCurrency, fx?.rate],
  );
  const metrics = bundle.fundamentals.keyMetrics;
  const visibleMetrics = metrics;
  const statements = bundle.fundamentals.statements;
  const activeStatement = statements.find((t) => t.kind === statementTab) ?? statements[0];
  const aboutProfile = useMemo(() => {
    const getMetric = (key: string) => metrics.find((m) => m.key === key);
    const metricText = (key: string) => {
      const metric = getMetric(key);
      return metric ? metricValueToDisplay(metric, displayCurrency, fx?.rate) : null;
    };

    const baseSummary = (bundle.fundamentals.summary ?? bundle.entity.summary ?? 'Company summary is not currently available.')
      .trim()
      .replace(/\s+/g, ' ');
    const withPeriod = (value: string) => (/[.!?]$/.test(value) ? value : `${value}.`);
    const valueOr = (key: string, fallback = 'not currently available') => metricText(key) ?? fallback;

    const segmentHints = [
      /energy/i.test(baseSummary) ? 'energy' : null,
      /telecom/i.test(baseSummary) ? 'telecom' : null,
      /retail/i.test(baseSummary) ? 'retail' : null,
      /digital/i.test(baseSummary) ? 'digital services' : null,
      /technology|it services/i.test(baseSummary) ? 'technology services' : null,
      /bank|banking/i.test(baseSummary) ? 'banking and financial services' : null,
    ].filter(Boolean) as string[];

    const aboutLines = [
      withPeriod(baseSummary),
      bundle.entity.industry
        ? `${bundle.entity.name} mainly operates in the ${bundle.entity.industry.toLowerCase()} business.`
        : bundle.entity.sector
          ? `${bundle.entity.name} mainly operates in the ${bundle.entity.sector.toLowerCase()} sector.`
          : `${bundle.entity.name} operates across multiple business areas.`,
      segmentHints.length >= 2
        ? `Its business mix includes ${segmentHints.slice(0, 4).join(', ')}.`
        : `${bundle.entity.name} serves customers through a mix of core operations and supporting businesses.`,
      bundle.entity.country
        ? `Its primary operating market is ${bundle.entity.country}.`
        : 'Its primary operating market information is currently limited.',
      bundle.entity.exchange
        ? `The company is listed on ${bundle.entity.exchange} under the symbol ${bundle.entity.displaySymbol}.`
        : `The tracked symbol for this company is ${bundle.entity.displaySymbol}.`,
      `Company size snapshot: market capitalization is ${valueOr('marketCap')}.`,
      `Valuation snapshot: P/E ${valueOr('pe')}, P/B ${valueOr('pb')}, and EV/EBITDA ${valueOr('evEbitda')}.`,
      `Growth snapshot: sales growth is ${valueOr('salesGrowth')} and profit growth is ${valueOr('profitGrowth')}.`,
      `Profitability snapshot: OPM ${valueOr('opm')}, ROE ${valueOr('roe')}, and ROCE ${valueOr('roce')}.`,
      `Balance-sheet snapshot: debt/equity ${valueOr('debtToEquity')}, current ratio ${valueOr('currentRatio')}, and interest coverage ${valueOr('interestCoverage')}.`,
      `Shareholder-return snapshot: dividend yield ${valueOr('dividendYield')} and 6-month return ${valueOr('return6m')}.`,
      `Latest tracked price is ${formatCurrency(quote.price, quote.currency)} with a day move of ${formatCurrency(quote.change ?? null, quote.currency)} (${formatPercent(quote.changePercent ?? null)}).`,
      'For a practical review, focus on revenue growth consistency, profit quality, debt control, and cash-flow strength over multiple periods.',
    ].filter(Boolean) as string[];

    const highlights: AboutHighlight[] = [
      { label: 'Market Cap', value: metricText('marketCap') ?? '—' },
      { label: 'P/E', value: metricText('pe') ?? '—' },
      { label: 'P/B', value: metricText('pb') ?? '—' },
      { label: 'ROE', value: metricText('roe') ?? '—' },
      { label: 'Debt / Equity', value: metricText('debtToEquity') ?? '—' },
      { label: 'Current Ratio', value: metricText('currentRatio') ?? '—' },
      { label: 'Dividend Yield', value: metricText('dividendYield') ?? '—' },
      { label: '6M Return', value: metricText('return6m') ?? '—' },
    ];

    return { aboutText: aboutLines.join(' '), highlights };
  }, [bundle, metrics, displayCurrency, fx?.rate, quote.price, quote.change, quote.changePercent, quote.currency]);

  useEffect(() => {
    let active = true;
    const ai = getAiProvider();
    const context = {
      companyName: bundle.entity.name,
      symbol: bundle.entity.displaySymbol,
      market: bundle.entity.market,
      history: bundle.history,
      statements,
      shareholding: bundle.fundamentals.shareholding,
      news: bundle.news,
      metrics: visibleMetrics.map((m) => ({ key: m.key, label: m.label, value: m.value })),
    };
    ai.generateInsights(context).then((res) => {
      if (active) setInsights(res);
    });
    ai.beginnerAssessment(context).then((res) => {
      if (active) setBeginnerAssessment(res);
    });
    return () => {
      active = false;
    };
  }, [bundle, statements, visibleMetrics]);

  const hasHeaderChange = typeof quote.change === 'number' && typeof quote.changePercent === 'number';
  const headerChangeUp = (quote.change ?? 0) >= 0;

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'ui-panel hero-glow glass relative rounded-2xl p-4 shadow-panel transition-all duration-500',
          priceTickDirection === 'up' && 'ring-1 ring-emerald-400/35',
          priceTickDirection === 'down' && 'ring-1 ring-rose-400/35',
        )}
      >
        <div className="absolute left-6 top-4 h-20 w-20 rounded-full bg-indigo-500/12 blur-2xl" />
        <div className="absolute right-8 top-6 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl" />
        <div
          className={cn(
            'pointer-events-none absolute inset-x-8 bottom-3 h-[2px] rounded-full transition-all duration-500',
            priceTickDirection === 'up'
              ? 'bg-emerald-400/70 opacity-100'
              : priceTickDirection === 'down'
                ? 'bg-rose-400/70 opacity-100'
                : 'opacity-0',
          )}
        />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{bundle.entity.name}</h1>
              <span className="rounded-full border border-border/70 bg-card/50 px-2 py-1 text-xs font-medium text-slate-500">
                {bundle.entity.displaySymbol}
              </span>
              {bundle.entity.exchange ? (
                <span className="rounded-full border border-border/70 bg-card/50 px-2 py-1 text-xs font-medium text-slate-500">{bundle.entity.exchange}</span>
              ) : null}
              {bundle.entity.market === 'india' && bundle.entity.exchange ? (
                <span className="rounded-full border border-border px-2 py-1 text-xs">{bundle.entity.exchange} stock</span>
              ) : null}
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <motion.div
                key={`price-${pricePulseKey}`}
                initial={{ opacity: 0.68, y: priceTickDirection === 'up' ? 6 : priceTickDirection === 'down' ? -6 : 0 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
                className={cn(
                  'text-3xl font-semibold tracking-tight tabular-nums sm:text-[2.2rem]',
                  priceTickDirection === 'up' && 'text-emerald-300',
                  priceTickDirection === 'down' && 'text-rose-300',
                )}
              >
                {formatCurrency(quote.price, quote.currency)}
              </motion.div>
              <motion.div
                key={`change-${pricePulseKey}`}
                initial={{ opacity: 0.7, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-sm tabular-nums',
                  !hasHeaderChange
                    ? 'border-border bg-muted/40 text-slate-500'
                    : headerChangeUp
                      ? 'border-emerald-500/25 bg-emerald-500/15 text-emerald-500'
                      : 'border-rose-500/25 bg-rose-500/15 text-rose-500',
                )}
              >
                {hasHeaderChange ? (headerChangeUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />) : null}
                {formatCurrency(quote.change ?? null, quote.currency)} ({formatPercent(quote.changePercent ?? null)})
              </motion.div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className={cn('rounded-full px-2 py-1 font-medium', status.isOpen ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400')}>
                {status.isOpen ? 'Market Open' : 'Market Closed'}
              </span>
              <motion.span
                key={status.localTime}
                initial={{ opacity: 0.55, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="rounded-full border border-border/70 bg-card/45 px-2 py-1 font-mono tabular-nums text-slate-400"
              >
                IST now: {status.localTime}
              </motion.span>
              <motion.span
                key={quote.timestamp ?? 'quote-ts-na'}
                initial={{ opacity: 0.6, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="rounded-full border border-border/70 bg-card/45 px-2 py-1 font-mono tabular-nums text-slate-400"
              >
                Last updated: {formatDateTimeWithSeconds(quote.timestamp)}
              </motion.span>
              {!status.isOpen ? (
                <span className="rounded-full border border-border/70 bg-card/45 px-2 py-1 font-mono tabular-nums text-slate-400">
                  Next open (IST): {status.nextOpenIst}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {bundle.entity.market === 'us' ? (
              <PillToggle
                options={[
                  { value: 'USD', label: 'USD' },
                  { value: 'INR', label: 'INR' },
                ]}
                value={preferredCurrencyForUs}
                onChange={(v) => setPreferredCurrencyForUs(v as 'USD' | 'INR')}
              />
            ) : null}
            <button
              onClick={() => exportStatementsToXlsx(bundle.fundamentals.statements, `${bundle.entity.displaySymbol}-income-statements`)}
              className="ui-panel glass surface-hover inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm shadow-panel"
            >
              <FileSpreadsheet className="h-4 w-4" /> Export to Excel
            </button>
            {bundle.entity.market === 'us' && preferredCurrencyForUs === 'INR' ? (
              <div className="text-[11px] text-slate-500">
                USD→INR rate: {fx?.rate ? formatNumber(fx.rate, 2) : 'Loading...'} {fx?.stale ? '(stale cache)' : ''}
              </div>
            ) : null}
          </div>
        </div>
      </motion.section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <SectionCard title="About">
            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <p className="leading-relaxed">{aboutProfile.aboutText}</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {aboutProfile.highlights.map((item) => (
                  <div key={item.label} className="rounded-xl border border-border bg-card/40 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{item.value}</div>
                  </div>
                ))}
              </div>
              {bundle.fundamentals.website || bundle.entity.website ? (
                <Link
                  href={bundle.fundamentals.website ?? bundle.entity.website ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-accent hover:underline"
                >
                  <Globe2 className="h-4 w-4" /> Official Website <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>
          </SectionCard>

          {uiMode === 'beginner' ? <BeginnerPanel assessment={beginnerAssessment} /> : null}

          {uiMode === 'pro' ? (
            <SectionCard title="Key Metrics">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visibleMetrics.length ? (
                  visibleMetrics.map((metric) => (
                    <div key={metric.key} className="ui-panel glass surface-hover rounded-xl p-3 shadow-panel">
                      <div className="text-xs text-slate-500">{metric.label}</div>
                      <div className="mt-1 text-lg font-semibold">
                        {metricValueToDisplay(metric, displayCurrency, fx?.rate)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full rounded-xl border border-border p-4 text-sm text-slate-500">
                    Fundamental metrics are not currently available for this security.
                  </div>
                )}
              </div>
            </SectionCard>
          ) : (
            <SectionCard title="Simple Snapshot" subtitle="Beginner-friendly summary without heavy jargon.">
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleMetrics
                  .filter((m) => ['salesGrowth', 'profitGrowth', 'debtToEquity', 'pe', 'roe', 'dividendYield'].includes(m.key))
                  .map((metric) => (
                    <div key={metric.key} className="ui-panel glass surface-hover rounded-xl p-3 shadow-panel">
                      <div className="text-xs text-slate-500">{metric.label}</div>
                      <div className="mt-1 text-lg font-semibold">{metricValueToDisplay(metric, displayCurrency, fx?.rate)}</div>
                    </div>
                  ))}
                <div className="rounded-xl border border-dashed border-border p-3 text-sm text-slate-600 dark:text-slate-300">
                  Beginner mode hides many technical metrics. Switch to PRO mode for the full ratio and statement view.
                </div>
              </div>
            </SectionCard>
          )}

          <DynamicChartPanel history={chartHistory} displayCurrency={displayCurrency} />

          <SectionCard title="Income Statements" subtitle="Profit & Loss, Quarterly Results, Balance Sheet, and Cash Flow with automated summaries.">
            <div className="mb-3 flex flex-wrap gap-2">
              {statementOrder.map((kind) => (
                <button
                  key={kind}
                  onClick={() => setStatementTab(kind)}
                  className={cn(
                    'rounded-xl px-3 py-2 text-sm transition',
                    statementTab === kind
                      ? 'bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500 text-white shadow-violet'
                      : 'ui-panel glass hover:bg-muted/40',
                  )}
                >
                  {statementLabels[kind]}
                </button>
              ))}
            </div>
            {activeStatement ? <StatementTableView table={activeStatement} /> : <p className="text-sm text-slate-500">No statements available.</p>}
          </SectionCard>

          <AiInsightsPanel insights={insights} />
          <PeerComparisonPanel bundle={bundle} />
        </div>

        <div className="space-y-6">
          <ShareholdingPanel shareholding={bundle.fundamentals.shareholding} />

          <SectionCard title="News" subtitle="RSS-based relevance filtering (ticker + company name).">
            <div className="space-y-3">
              {bundle.news.length ? (
                bundle.news.map((n) => (
                  <a
                    key={n.id}
                    href={n.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-border p-3 transition hover:bg-muted/40"
                  >
                    <div className="text-sm font-medium leading-snug">{n.title}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {n.source} • {n.publishedAt ? formatDateTime(n.publishedAt) : 'Unknown time'}
                    </div>
                    {n.snippet ? <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{n.snippet}</p> : null}
                  </a>
                ))
              ) : (
                <div className="text-sm text-slate-500">No relevant news found.</div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Documents" subtitle="Annual reports, filings, and related documents when available.">
            <div className="space-y-2">
              {bundle.documents.length ? (
                bundle.documents.map((d) => (
                  <a key={d.id} href={d.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-border p-3 text-sm hover:bg-muted/40">
                    <div>
                      <div className="font-medium">{d.title}</div>
                      <div className="text-xs text-slate-500">{d.source}{d.year ? ` • ${d.year}` : ''}</div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                  </a>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border p-3 text-sm text-slate-500">
                  Documents are not currently available for this security.
                </div>
              )}
            </div>
          </SectionCard>

          <NotesSection stockId={bundle.entity.id} />

        </div>
      </div>
    </div>
  );
}
