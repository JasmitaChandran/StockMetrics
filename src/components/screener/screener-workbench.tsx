'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Save, Filter } from 'lucide-react';
import { SectionCard } from '@/components/common/section-card';
import { VirtualizedTable } from '@/components/common/virtualized-table';
import { demoFundamentalsBySymbol, demoUniverse } from '@/lib/data/mock/demo-data';
import { heuristicAiProvider } from '@/lib/ai';
import { formatNumber, formatPercent } from '@/lib/utils/format';
import { listCustomScreens, upsertCustomScreen } from '@/lib/storage/repositories';

interface ScreenerRow {
  id: string;
  symbol: string;
  name: string;
  market: string;
  pe?: number;
  roe?: number;
  roce?: number;
  debtToEquity?: number;
  salesGrowth?: number;
  profitGrowth?: number;
  earningsYield?: number;
  return6m?: number;
  marketCap?: number;
}

function getMetric(symbol: string, key: string) {
  return demoFundamentalsBySymbol[symbol]?.keyMetrics.find((m) => m.key === key)?.value;
}

function buildRows(): ScreenerRow[] {
  return demoUniverse
    .filter((e) => e.type === 'stock')
    .map((e) => ({
      id: e.id,
      symbol: e.symbol,
      name: e.name,
      market: e.market,
      pe: getMetric(e.symbol, 'pe'),
      roe: getMetric(e.symbol, 'roe'),
      roce: getMetric(e.symbol, 'roce'),
      debtToEquity: getMetric(e.symbol, 'debtToEquity'),
      salesGrowth: getMetric(e.symbol, 'salesGrowth'),
      profitGrowth: getMetric(e.symbol, 'profitGrowth'),
      earningsYield: getMetric(e.symbol, 'earningsYield'),
      return6m: getMetric(e.symbol, 'return6m'),
      marketCap: getMetric(e.symbol, 'marketCap'),
    }));
}

const baseRows = buildRows();

function applyFilters(rows: ScreenerRow[], filters: Array<{ field: string; op: string; value: string | number }>) {
  return rows.filter((row) =>
    filters.every((f) => {
      const v = row[f.field as keyof ScreenerRow];
      if (typeof v !== 'number' || typeof f.value !== 'number') return false;
      switch (f.op) {
        case '>':
          return v > f.value;
        case '>=':
          return v >= f.value;
        case '<':
          return v < f.value;
        case '<=':
          return v <= f.value;
        case '=':
          return v === f.value;
        default:
          return true;
      }
    }),
  );
}

function runBuiltInStrategy(name: string, rows: ScreenerRow[]) {
  switch (name) {
    case 'Piotroski (Approx)':
      return rows
        .filter((r) => (r.profitGrowth ?? -999) > 0 && (r.salesGrowth ?? -999) > 0 && (r.debtToEquity ?? 999) < 1.5 && (r.roe ?? -999) > 12)
        .sort((a, b) => (b.roe ?? 0) - (a.roe ?? 0));
    case 'Magic Formula':
      return rows
        .filter((r) => (r.roce ?? 0) > 10 && (r.earningsYield ?? 0) > 2)
        .sort((a, b) => ((b.roce ?? 0) + (b.earningsYield ?? 0)) - ((a.roce ?? 0) + (a.earningsYield ?? 0)));
    case 'Coffee Can Portfolio':
      return rows
        .filter((r) => (r.salesGrowth ?? 0) > 10 && (r.profitGrowth ?? 0) > 10 && (r.roe ?? 0) > 15 && (r.debtToEquity ?? 9) < 1)
        .sort((a, b) => (b.roe ?? 0) - (a.roe ?? 0));
    case 'Quality':
      return rows.filter((r) => (r.roe ?? 0) > 15 && (r.debtToEquity ?? 9) < 1.5).sort((a, b) => (b.roe ?? 0) - (a.roe ?? 0));
    case 'Value':
      return rows.filter((r) => (r.pe ?? 999) < 20 && (r.earningsYield ?? 0) > 4).sort((a, b) => (a.pe ?? 999) - (b.pe ?? 999));
    case 'Momentum':
      return rows.filter((r) => (r.return6m ?? -999) > 10).sort((a, b) => (b.return6m ?? 0) - (a.return6m ?? 0));
    default:
      return rows;
  }
}

export function ScreenerWorkbench() {
  const [query, setQuery] = useState('Show profitable low debt companies with rising sales');
  const [explanation, setExplanation] = useState('');
  const [filters, setFilters] = useState<Array<{ field: string; op: string; value: string | number }>>([]);
  const [strategy, setStrategy] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [saved, setSaved] = useState<Array<{ id: string; name: string; query: string }>>([]);

  useEffect(() => {
    listCustomScreens().then((records) => setSaved(records.map((r) => ({ id: r.id, name: r.name, query: r.query }))));
  }, []);

  async function parseAiQuery() {
    const parsed = await heuristicAiProvider.parseScreenerQuery({ query });
    setFilters(parsed.filters);
    setExplanation(parsed.explanation);
    setStrategy('');
  }

  async function saveScreen() {
    const name = customName.trim() || `Screen ${saved.length + 1}`;
    const record = { id: crypto.randomUUID(), name, query, createdAt: new Date().toISOString() };
    await upsertCustomScreen(record);
    setSaved((prev) => [...prev, { id: record.id, name: record.name, query: record.query }]);
    setCustomName('');
  }

  const rows = useMemo(() => {
    const filtered = strategy ? runBuiltInStrategy(strategy, baseRows) : applyFilters(baseRows, filters);
    return filtered;
  }, [filters, strategy]);

  return (
    <div className="space-y-6">
      <SectionCard title="AI Screener" subtitle="Natural-language screening with structured filter parsing for common investment criteria.">
        <div className="space-y-3">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={3}
            placeholder="Ask: Show profitable low debt companies with rising sales"
            className="w-full rounded-xl border border-border bg-card p-3 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button onClick={parseAiQuery} className="inline-flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white">
              <Sparkles className="h-4 w-4" /> Run AI Screener
            </button>
            <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
              <Filter className="h-4 w-4" /> {filters.length} filter(s)
            </div>
            <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Custom screen name" className="rounded-xl border border-border bg-card px-3 py-2 text-sm" />
            <button onClick={saveScreen} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted">
              <Save className="h-4 w-4" /> Save Screen
            </button>
          </div>
          {explanation ? <p className="text-sm text-slate-600 dark:text-slate-300">{explanation}</p> : null}
          {filters.length ? (
            <div className="flex flex-wrap gap-2">
              {filters.map((f, idx) => (
                <span key={`${f.field}-${idx}`} className="rounded-full bg-muted px-3 py-1 text-xs">
                  {f.field} {f.op} {String(f.value)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Built-in Strategies" subtitle="Popular screening strategies based on available financial and price metrics.">
        <div className="grid gap-2 md:grid-cols-3">
          {['Piotroski (Approx)', 'Magic Formula', 'Coffee Can Portfolio', 'Quality', 'Value', 'Momentum'].map((name) => (
            <button
              key={name}
              onClick={() => setStrategy(name)}
              className={`rounded-xl border px-3 py-2 text-left text-sm ${strategy === name ? 'border-accent bg-accent/10' : 'border-border hover:bg-muted/40'}`}
            >
              {name}
            </button>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <SectionCard title="Screener Results" subtitle={`${rows.length} result(s) • virtualized table optimized for larger datasets`}>
          <VirtualizedTable
            rows={rows}
            height={420}
            header={
              <div className="grid grid-cols-[1.8fr_repeat(6,0.8fr)] gap-2">
                <span>Company</span>
                <span className="text-right">P/E</span>
                <span className="text-right">ROE</span>
                <span className="text-right">ROCE</span>
                <span className="text-right">Debt/Eq</span>
                <span className="text-right">Sales G</span>
                <span className="text-right">6M Ret</span>
              </div>
            }
            renderRow={(row) => (
              <div className="border-t border-border/60 px-3 py-2 text-sm first:border-t-0">
                <div className="grid grid-cols-[1.8fr_repeat(6,0.8fr)] items-center gap-2">
                  <div>
                    <Link href={`/dashboard/${row.market}/${encodeURIComponent(row.symbol)}`} className="font-medium hover:text-accent">
                      {row.name}
                    </Link>
                    <div className="text-xs text-slate-500">{row.symbol}</div>
                  </div>
                  <div className="text-right">{row.pe ? formatNumber(row.pe) : '—'}</div>
                  <div className="text-right">{row.roe ? formatPercent(row.roe) : '—'}</div>
                  <div className="text-right">{row.roce ? formatPercent(row.roce) : '—'}</div>
                  <div className="text-right">{row.debtToEquity ? formatNumber(row.debtToEquity) : '—'}</div>
                  <div className="text-right">{row.salesGrowth ? formatPercent(row.salesGrowth) : '—'}</div>
                  <div className="text-right">{row.return6m ? formatPercent(row.return6m) : '—'}</div>
                </div>
              </div>
            )}
          />
        </SectionCard>

        <SectionCard title="Saved Custom Screens" subtitle="Stored locally in IndexedDB.">
          <div className="space-y-2">
            {saved.length ? (
              saved.map((s) => (
                <button key={s.id} onClick={() => { setQuery(s.query); setStrategy(''); }} className="block w-full rounded-xl border border-border p-3 text-left hover:bg-muted/40">
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="mt-1 text-xs text-slate-500 line-clamp-2">{s.query}</div>
                </button>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border p-3 text-sm text-slate-500">No custom screens yet.</div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
