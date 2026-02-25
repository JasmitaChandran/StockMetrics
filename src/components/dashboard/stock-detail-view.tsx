'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle, ExternalLink, FileSpreadsheet, Globe2, Info, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { AiInsights, BeginnerAssessment, FinancialStatementTable, StockDetailBundle } from '@/types';
import { SectionCard } from '@/components/common/section-card';
import { PillToggle } from '@/components/common/pill-toggle';
import { useUiStore } from '@/stores/ui-store';
import { useFxUsdInr } from '@/lib/hooks/use-stock-data';
import { exportStatementsToXlsx } from '@/lib/utils/excel';
import { formatCurrency, formatDateTime, formatNumber, formatPercent } from '@/lib/utils/format';
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

function convertQuoteIfNeeded(bundle: StockDetailBundle, targetCurrency: 'USD' | 'INR', fxRate?: number) {
  if (bundle.quote.currency !== 'USD' || targetCurrency !== 'INR' || !fxRate) return bundle.quote;
  return {
    ...bundle.quote,
    currency: 'INR' as const,
    price: bundle.quote.price ? bundle.quote.price * fxRate : bundle.quote.price,
    previousClose: bundle.quote.previousClose ? bundle.quote.previousClose * fxRate : bundle.quote.previousClose,
    change: bundle.quote.change ? bundle.quote.change * fxRate : bundle.quote.change,
  };
}

function StatementTableView({ table }: { table: FinancialStatementTable }) {
  const [view, setView] = useState<'consolidated' | 'standalone'>(table.activeViewDefault);
  const [summary, setSummary] = useState<{ bullets: string[]; title: string } | null>(null);

  useEffect(() => {
    let active = true;
    getAiProvider()
      .summarizeStatement({ table, currentView: view })
      .then((res) => {
        if (active) setSummary(res);
      });
    return () => {
      active = false;
    };
  }, [table, view]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-slate-500">Years: {table.years.join(', ') || 'No data'}</div>
        <PillToggle
          options={[
            { value: 'consolidated', label: 'Consolidated' },
            { value: 'standalone', label: 'Standalone' },
          ]}
          value={view}
          onChange={(v) => setView(v as 'consolidated' | 'standalone')}
        />
      </div>
      <div className="overflow-auto rounded-xl border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Particulars</th>
              {table.years.map((year) => (
                <th key={year} className="px-3 py-2 text-right font-medium">
                  {year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.length === 0 ? (
              <tr>
                <td colSpan={table.years.length + 1} className="px-3 py-4 text-center text-sm text-slate-500">
                  Statement data is not currently available.
                </td>
              </tr>
            ) : (
              table.rows.map((row) => (
                <tr key={row.label} className="border-t border-border/70">
                  <td className="px-3 py-2 font-medium">{row.label}</td>
                  {table.years.map((year) => (
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
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">AI Summary</div>
        {summary ? (
          <ul className="space-y-1 text-sm">
            {summary.bullets.map((b) => (
              <li key={b} className="text-slate-600 dark:text-slate-300">• {b}</li>
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
    <SectionCard title="Notes" subtitle="Saved locally in IndexedDB per stock.">
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
    Green: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30',
    Yellow: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30',
    Red: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30',
  } as const;
  return (
    <SectionCard title="Beginner Assistant" subtitle="Educational only. Avoids jargon and explains what to check.">
      {!assessment ? (
        <p className="text-sm text-slate-500">Preparing beginner-friendly checks...</p>
      ) : (
        <div className="space-y-3">
          <div className={cn('inline-flex rounded-xl border px-3 py-2 text-sm font-semibold', colorMap[assessment.verdict])}>
            Should I consider buying? {assessment.verdict}
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

  const displayCurrency = bundle.entity.market === 'us' ? preferredCurrencyForUs : bundle.quote.currency;
  const quote = useMemo(
    () => convertQuoteIfNeeded(bundle, displayCurrency, fx?.rate),
    [bundle, displayCurrency, fx?.rate],
  );
  const chartHistory = useMemo(
    () => convertHistoryIfNeeded(bundle, displayCurrency, fx?.rate),
    [bundle, displayCurrency, fx?.rate],
  );
  const status = useMemo(() => getMarketStatus(bundle.entity.market), [bundle.entity.market]);
  const metrics = bundle.fundamentals.keyMetrics;
  const visibleMetrics = metrics;
  const statements = bundle.fundamentals.statements;
  const activeStatement = statements.find((t) => t.kind === statementTab) ?? statements[0];

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

  const headerChangeUp = (quote.change ?? 0) >= 0;

  return (
    <div className="space-y-6">
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl border border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{bundle.entity.name}</h1>
              <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-slate-500">
                {bundle.entity.displaySymbol}
              </span>
              {bundle.entity.exchange ? (
                <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-slate-500">{bundle.entity.exchange}</span>
              ) : null}
              {bundle.entity.market === 'india' && bundle.entity.exchange ? (
                <span className="rounded-full border border-border px-2 py-1 text-xs">{bundle.entity.exchange} stock</span>
              ) : null}
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <div className="text-2xl font-semibold">{formatCurrency(quote.price, quote.currency)}</div>
              <div className={cn('inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm', headerChangeUp ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500')}>
                {headerChangeUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {formatCurrency(quote.change ?? null, quote.currency)} ({formatPercent(quote.changePercent ?? null)})
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span className={cn('rounded-full px-2 py-1', status.isOpen ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500')}>
                {status.isOpen ? 'Market Open' : 'Market Closed'}
              </span>
              <span>Last updated: {formatDateTime(quote.timestamp)}</span>
              {!status.isOpen ? <span>Next open (IST): {status.nextOpenIst}</span> : null}
              <span>{quote.source}</span>
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
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm hover:bg-muted"
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
          <SectionCard title="About" subtitle={bundle.fundamentals.source}>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <p>{bundle.fundamentals.summary ?? bundle.entity.summary ?? 'Company summary is not currently available.'}</p>
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
              <div className="text-xs text-slate-500">Unavailable fields are hidden to preserve data quality and clarity.</div>
            </div>
          </SectionCard>

          {uiMode === 'beginner' ? <BeginnerPanel assessment={beginnerAssessment} /> : null}

          {uiMode === 'pro' ? (
            <SectionCard title="Key Metrics" subtitle="Displays available metrics for the selected security.">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visibleMetrics.length ? (
                  visibleMetrics.map((metric) => (
                    <div key={metric.key} className="rounded-xl border border-border bg-card p-3">
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
                    <div key={metric.key} className="rounded-xl border border-border bg-card p-3">
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
                    statementTab === kind ? 'bg-accent text-white' : 'border border-border bg-card hover:bg-muted',
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

          <SectionCard title="Data Quality Notes" subtitle="Accuracy and transparency">
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <p>
                  This application uses publicly available market data sources. Quotes and historical series may be delayed or temporarily unavailable depending on source coverage.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <p>
                  Data is cached and refreshed automatically to support a responsive experience and reliable operation during temporary source limits.
                </p>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
