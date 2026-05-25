'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { SectionCard } from '@/components/common/section-card';
import { demoFundamentalsBySymbol, demoUniverse, generateDemoHistory } from '@/lib/data/mock/demo-data';
import { useSearchEntities } from '@/lib/hooks/use-stock-data';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { deleteWatchlist, listWatchlists, upsertWatchlist } from '@/lib/storage/repositories';
import type {
  WatchlistRecord,
  WatchlistRiskLabel,
  WatchlistSymbolProfile,
  WatchlistTrendLabel,
  WatchlistValuationLabel,
} from '@/lib/storage/idb';
import type { SearchEntity } from '@/types';
import { cn } from '@/lib/utils/cn';
import { formatPercent } from '@/lib/utils/format';

function reasonFor(symbol: string, record: WatchlistRecord): string {
  return record.symbolProfiles?.[symbol]?.reasonForAdding?.trim() ?? '';
}

function getMetric(symbol: string, key: string): number | undefined {
  return demoFundamentalsBySymbol[symbol]?.keyMetrics.find((metric) => metric.key === key)?.value;
}

function average(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function safeReturn(current?: number, previous?: number): number | undefined {
  if (typeof current !== 'number' || typeof previous !== 'number' || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

function movingAverage(points: Array<{ close: number }>, periods: number): number | undefined {
  if (points.length < periods) return undefined;
  return average(points.slice(-periods).map((point) => point.close));
}

function annualizedVolatility(points: Array<{ close: number }>, sessions: number): number | undefined {
  if (points.length <= sessions) return undefined;
  const slice = points.slice(-(sessions + 1));
  const returns: number[] = [];
  for (let i = 1; i < slice.length; i += 1) {
    const prev = slice[i - 1].close;
    if (!prev) continue;
    returns.push((slice[i].close - prev) / prev);
  }
  if (returns.length < 2) return undefined;
  const mean = average(returns) ?? 0;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

function maxDrawdown(points: Array<{ close: number }>, lookback: number): number | undefined {
  const slice = points.slice(-lookback);
  if (slice.length < 2) return undefined;
  let peak = slice[0].close;
  let worst = 0;
  for (const point of slice) {
    peak = Math.max(peak, point.close);
    const drawdown = ((point.close - peak) / peak) * 100;
    worst = Math.min(worst, drawdown);
  }
  return worst;
}

const aiProfileCache = new Map<
  string,
  { valuation: WatchlistValuationLabel; quality: 'Strong' | 'Average' | 'Weak'; growth: 'High' | 'Stable' | 'Slow'; risk: WatchlistRiskLabel; trend: WatchlistTrendLabel }
>();

function deriveAiProfile(symbol: string) {
  const cached = aiProfileCache.get(symbol);
  if (cached) return cached;

  const entity = demoUniverse.find((item) => item.symbol === symbol);
  const history = generateDemoHistory(entity ?? demoUniverse[0]).points;
  const latest = history[history.length - 1];
  const lookback1m = history.length > 21 ? history[history.length - 22] : undefined;
  const return1m = safeReturn(latest?.close, lookback1m?.close);
  const sma50 = movingAverage(history, 50);
  const sma200 = movingAverage(history, 200);
  const volatility90d = annualizedVolatility(history, 90);
  const drawdown1y = maxDrawdown(history, 252);

  const pe = getMetric(symbol, 'pe');
  const industryPe = getMetric(symbol, 'industryPe');
  const pb = getMetric(symbol, 'pb');
  const priceToSales = getMetric(symbol, 'priceToSales');
  const evEbitda = getMetric(symbol, 'evEbitda');
  const roe = getMetric(symbol, 'roe');
  const roce = getMetric(symbol, 'roce');
  const roa = getMetric(symbol, 'roa');
  const debtToEquity = getMetric(symbol, 'debtToEquity');
  const currentRatio = getMetric(symbol, 'currentRatio');
  const salesGrowth = getMetric(symbol, 'salesGrowth');
  const profitGrowth = getMetric(symbol, 'profitGrowth');
  const yoyQuarterlySalesGrowth = getMetric(symbol, 'yoyQuarterlySalesGrowth');
  const yoyQuarterlyProfitGrowth = getMetric(symbol, 'yoyQuarterlyProfitGrowth');

  let valuationScore = 0;
  if (typeof pe === 'number') {
    if (typeof industryPe === 'number') {
      if (pe <= industryPe * 0.9) valuationScore += 1;
      else if (pe >= industryPe * 1.2) valuationScore -= 1;
    }
    if (pe <= 18) valuationScore += 1;
    else if (pe >= 30) valuationScore -= 1;
  }
  if (typeof pb === 'number') {
    if (pb <= 2.5) valuationScore += 1;
    else if (pb >= 6) valuationScore -= 1;
  }
  if (typeof priceToSales === 'number') {
    if (priceToSales <= 3) valuationScore += 1;
    else if (priceToSales >= 8) valuationScore -= 1;
  }
  if (typeof evEbitda === 'number') {
    if (evEbitda <= 12) valuationScore += 1;
    else if (evEbitda >= 20) valuationScore -= 1;
  }
  const valuation: WatchlistValuationLabel = valuationScore >= 2 ? 'Undervalued' : valuationScore <= -2 ? 'Expensive' : 'Fair';

  const isBank = /(bank|financial services)/i.test(entity?.industry ?? '') || /(financial services)/i.test(entity?.sector ?? '');
  let qualityScore = 0;
  if (isBank) {
    if (typeof roe === 'number') qualityScore += roe >= 14 ? 1 : roe < 9 ? -1 : 0;
    if (typeof roa === 'number') qualityScore += roa >= 1.2 ? 1 : roa < 0.8 ? -1 : 0;
  } else {
    if (typeof roe === 'number') qualityScore += roe >= 18 ? 1 : roe < 10 ? -1 : 0;
    if (typeof roce === 'number') qualityScore += roce >= 15 ? 1 : roce < 8 ? -1 : 0;
    if (typeof debtToEquity === 'number') qualityScore += debtToEquity <= 0.8 ? 1 : debtToEquity > 2.2 ? -1 : 0;
    if (typeof currentRatio === 'number') qualityScore += currentRatio >= 1.3 ? 1 : currentRatio < 1 ? -1 : 0;
  }
  const quality: 'Strong' | 'Average' | 'Weak' = qualityScore >= 2 ? 'Strong' : qualityScore <= -2 ? 'Weak' : 'Average';

  const growthValues = [salesGrowth, profitGrowth, yoyQuarterlySalesGrowth, yoyQuarterlyProfitGrowth].filter(
    (value): value is number => typeof value === 'number',
  );
  const growthAvg = average(growthValues);
  const growth: 'High' | 'Stable' | 'Slow' =
    typeof growthAvg !== 'number' ? 'Stable' : growthAvg >= 14 ? 'High' : growthAvg >= 6 ? 'Stable' : 'Slow';

  const leverageRiskHigh = typeof debtToEquity === 'number' && !isBank && debtToEquity > 2.5;
  const leverageRiskLow = isBank || (typeof debtToEquity === 'number' && debtToEquity <= 1.2);
  const risk: WatchlistRiskLabel =
    leverageRiskHigh || (typeof volatility90d === 'number' && volatility90d >= 42) || (typeof drawdown1y === 'number' && drawdown1y <= -35)
      ? 'High'
      : leverageRiskLow &&
          typeof volatility90d === 'number' &&
          volatility90d <= 24 &&
          typeof drawdown1y === 'number' &&
          drawdown1y >= -22
        ? 'Low'
        : 'Moderate';

  const trend: WatchlistTrendLabel =
    typeof latest?.close === 'number' &&
    typeof sma50 === 'number' &&
    typeof sma200 === 'number' &&
    typeof return1m === 'number' &&
    latest.close > sma50 &&
    sma50 > sma200 &&
    return1m > 1
      ? 'Bullish'
      : typeof latest?.close === 'number' &&
          typeof sma50 === 'number' &&
          typeof sma200 === 'number' &&
          typeof return1m === 'number' &&
          latest.close < sma50 &&
          sma50 < sma200 &&
          return1m < -1
        ? 'Bearish'
        : 'Sideways';

  const profile = { valuation, quality, growth, risk, trend };
  aiProfileCache.set(symbol, profile);
  return profile;
}

function normalizeWatchlist(record: WatchlistRecord): WatchlistRecord {
  const symbolProfiles = Object.fromEntries(
    Object.entries(record.symbolProfiles ?? {})
      .filter(([symbol]) => record.symbols.includes(symbol))
      .map(([symbol, profile]) => {
        const rawRisk = (profile as { risk?: string }).risk;
        return [
          symbol,
          {
            ...profile,
            risk: rawRisk === 'Medium' ? 'Moderate' : profile.risk,
          },
        ];
      }),
  ) as Record<string, WatchlistSymbolProfile>;
  return { ...record, symbolProfiles };
}

function inferMarketFromSymbol(symbol: string): 'us' | 'india' | 'mf' {
  const normalized = symbol.toUpperCase();
  if (normalized.startsWith('AMFI:')) return 'mf';
  if (normalized.endsWith('.NS') || normalized.endsWith('.BO')) return 'india';
  return 'us';
}

function Sparkline({ symbol }: { symbol: string }) {
  const points = useMemo(() => generateDemoHistory(demoUniverse.find((e) => e.symbol === symbol) ?? demoUniverse[0]).points.slice(-24), [symbol]);
  const closes = points.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const path = closes
    .map((c, i) => {
      const x = (i / Math.max(1, closes.length - 1)) * 100;
      const y = max === min ? 20 : 40 - ((c - min) / (max - min)) * 40;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');
  const change = closes.length > 1 ? ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 100 40" className="h-8 w-24 overflow-visible">
        <path d={path} fill="none" stroke="hsl(var(--accent))" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className={`text-xs ${change >= 0 ? 'text-positive' : 'text-negative'}`}>{formatPercent(change)}</span>
    </div>
  );
}

function PeriodChanges({ symbol }: { symbol: string }) {
  const history = useMemo(
    () => generateDemoHistory(demoUniverse.find((e) => e.symbol === symbol) ?? demoUniverse[0]).points,
    [symbol],
  );
  const closes = history.map((p) => p.close);
  const calc = (n: number) => {
    if (closes.length <= n) return null;
    const prev = closes[closes.length - 1 - n];
    const cur = closes[closes.length - 1];
    return prev ? ((cur - prev) / prev) * 100 : null;
  };
  const items = [
    ['1D', calc(1)],
    ['1W', calc(5)],
    ['1M', calc(22)],
  ] as const;
  return (
    <div className="grid grid-cols-3 gap-1 text-[11px]">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg bg-muted/30 px-2 py-1 text-center">
          <div className="text-slate-500">{label}</div>
          <div className={value !== null && value >= 0 ? 'text-positive' : 'text-negative'}>
            {value === null ? '—' : formatPercent(value)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function WatchlistManager() {
  const [watchlists, setWatchlists] = useState<WatchlistRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [newName, setNewName] = useState('My Watchlist');
  const [renameName, setRenameName] = useState('');
  const [renameError, setRenameError] = useState('');
  const [addSymbol, setAddSymbol] = useState('HDFCBANK');
  const [addReason, setAddReason] = useState('');
  const [addSymbolError, setAddSymbolError] = useState('');
  const [isAddSymbolSuggestionsOpen, setIsAddSymbolSuggestionsOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SearchEntity | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const addSymbolRootRef = useRef<HTMLDivElement>(null);
  const debouncedAddSymbolQuery = useDebouncedValue(addSymbol, 250);
  const { data: addSymbolSearchData, isLoading: isAddSymbolSearching } = useSearchEntities(debouncedAddSymbolQuery);
  const addSymbolSuggestions = useMemo(() => addSymbolSearchData ?? [], [addSymbolSearchData]);
  const hasAddSymbolQuery = addSymbol.trim().length > 0;
  const showAddSymbolSuggestions = isAddSymbolSuggestionsOpen && hasAddSymbolQuery;

  useEffect(() => {
    listWatchlists().then((rows) => {
      if (!rows.length) {
        const seed: WatchlistRecord = {
          id: crypto.randomUUID(),
          name: 'My Watchlist',
          symbols: ['HDFCBANK.NS', 'AAPL', 'TCS.NS'],
          symbolProfiles: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        upsertWatchlist(seed).then(() => {
          setWatchlists([seed]);
          setSelectedId(seed.id);
        });
      } else {
        const normalized = rows.map(normalizeWatchlist);
        setWatchlists(normalized);
        setSelectedId(normalized[0].id);
      }
    });
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!addSymbolRootRef.current || !target) return;
      if (!addSymbolRootRef.current.contains(target)) {
        setIsAddSymbolSuggestionsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsAddSymbolSuggestionsOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const current = watchlists.find((w) => w.id === selectedId) ?? watchlists[0];

  useEffect(() => {
    setRenameName(current?.name ?? '');
    setRenameError('');
  }, [current?.id, current?.name]);

  function pickAddSymbolSuggestion(entity: SearchEntity) {
    setAddSymbol(entity.displaySymbol);
    setSelectedSuggestion(entity);
    setAddSymbolError('');
    setIsAddSymbolSuggestionsOpen(false);
  }

  async function createWatchlist() {
    const record: WatchlistRecord = {
      id: crypto.randomUUID(),
      name: newName.trim() || `Watchlist ${watchlists.length + 1}`,
      symbols: [],
      symbolProfiles: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await upsertWatchlist(record);
    setWatchlists((prev) => [...prev, record]);
    setSelectedId(record.id);
  }

  async function removeWatchlist(id: string) {
    await deleteWatchlist(id);
    setWatchlists((prev) => {
      const next = prev.filter((watchlist) => watchlist.id !== id);
      setSelectedId((currentId) => {
        if (currentId !== id) return currentId;
        return next[0]?.id ?? '';
      });
      return next;
    });
  }

  async function renameCurrentWatchlist() {
    if (!current) return;
    const nextName = renameName.trim();
    if (!nextName) {
      setRenameError('Watchlist name cannot be empty.');
      return;
    }
    if (nextName === current.name) {
      setRenameError('');
      return;
    }

    const updated: WatchlistRecord = {
      ...current,
      name: nextName,
      updatedAt: new Date().toISOString(),
    };
    await upsertWatchlist(updated);
    setWatchlists((prev) => prev.map((watchlist) => (watchlist.id === updated.id ? updated : watchlist)));
    setRenameError('');
  }

  async function addToCurrent(preferredMatch?: SearchEntity) {
    if (!current) return;
    const query = addSymbol.trim();
    if (!query) return;

    const normalizedQuery = query.toUpperCase();
    const exactSuggestion = addSymbolSuggestions.find(
      (entity) => entity.symbol.toUpperCase() === normalizedQuery || entity.displaySymbol.toUpperCase() === normalizedQuery,
    );
    const fallbackSuggestion = addSymbolSuggestions[0];
    const match =
      preferredMatch ??
      selectedSuggestion ??
      exactSuggestion ??
      demoUniverse.find(
        (entity) =>
          entity.symbol.toUpperCase() === normalizedQuery ||
          entity.displaySymbol.toUpperCase() === normalizedQuery ||
          entity.name.toUpperCase() === normalizedQuery,
      ) ??
      fallbackSuggestion;

    if (!match) {
      setAddSymbolError('No matching stock found. Pick a suggestion and try again.');
      return;
    }

    const reason = addReason.trim();
    const existingProfile = current.symbolProfiles?.[match.symbol] ?? {};
    const updated: WatchlistRecord = {
      ...current,
      symbols: Array.from(new Set([...current.symbols, match.symbol])),
      symbolProfiles: {
        ...(current.symbolProfiles ?? {}),
        [match.symbol]: {
          ...existingProfile,
          reasonForAdding: reason,
        },
      },
      updatedAt: new Date().toISOString(),
    };
    await upsertWatchlist(updated);
    setWatchlists((prev) => prev.map((w) => (w.id === updated.id ? normalizeWatchlist(updated) : w)));
    setAddSymbol('');
    setAddReason('');
    setSelectedSuggestion(null);
    setAddSymbolError('');
    setIsAddSymbolSuggestionsOpen(false);
  }

  async function removeSymbol(symbol: string) {
    if (!current) return;
    const symbolProfiles = { ...(current.symbolProfiles ?? {}) };
    delete symbolProfiles[symbol];
    const updated: WatchlistRecord = {
      ...current,
      symbols: current.symbols.filter((s) => s !== symbol),
      symbolProfiles,
      updatedAt: new Date().toISOString(),
    };
    await upsertWatchlist(updated);
    setWatchlists((prev) => prev.map((w) => (w.id === updated.id ? normalizeWatchlist(updated) : w)));
    setNoteDrafts((previous) => {
      const next = { ...previous };
      delete next[`${current.id}:${symbol}`];
      return next;
    });
  }

  async function updateSymbolProfile(symbol: string, patch: Partial<WatchlistSymbolProfile>) {
    if (!current) return;
    const currentProfile = current.symbolProfiles?.[symbol] ?? {};
    const updated: WatchlistRecord = {
      ...current,
      symbolProfiles: {
        ...(current.symbolProfiles ?? {}),
        [symbol]: { ...currentProfile, ...patch },
      },
      updatedAt: new Date().toISOString(),
    };
    await upsertWatchlist(updated);
    setWatchlists((prev) => prev.map((w) => (w.id === updated.id ? normalizeWatchlist(updated) : w)));
  }

  async function saveReason(symbol: string, raw: string) {
    const reasonForAdding = raw.trim();
    await updateSymbolProfile(symbol, { reasonForAdding });
  }

  function draftKey(watchlistId: string, symbol: string) {
    return `${watchlistId}:${symbol}`;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <SectionCard title="Watchlists" subtitle="Create and manage multiple watchlists">
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="min-w-0 rounded-xl border border-border bg-card px-3 py-2 text-sm"
              placeholder="Watchlist name"
            />
            <button onClick={createWatchlist} className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted sm:w-auto sm:shrink-0">
              <Plus className="h-4 w-4" /> New
            </button>
          </div>
          {watchlists.length ? (
            <div className="space-y-2">
              {watchlists.map((w) => {
                const active = selectedId === w.id;
                return (
                  <div
                    key={w.id}
                    className={cn(
                      'group flex items-start gap-2 rounded-xl border p-3 transition',
                      active ? 'border-accent bg-accent/10' : 'border-border hover:bg-muted/40',
                    )}
                  >
                    <button onClick={() => setSelectedId(w.id)} className="min-w-0 flex-1 text-left">
                      <div className="truncate text-sm font-medium">{w.name}</div>
                      <div className="text-xs text-slate-500">{w.symbols.length} symbols</div>
                    </button>
                    <button
                      onClick={() => removeWatchlist(w.id)}
                      className="shrink-0 rounded-lg border border-border px-2 py-2 text-slate-500 transition hover:bg-muted hover:text-rose-500"
                      aria-label={`Delete ${w.name}`}
                      title={`Delete ${w.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-slate-500">
              No watchlists yet. Create one to start tracking stocks.
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title={current ? current.name : 'Watchlist'}>
        {current ? (
          <div className="space-y-3">
            <div className="space-y-2 rounded-xl border border-border p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Rename watchlist</div>
              <div className="flex gap-2">
                <input
                  value={renameName}
                  onChange={(event) => {
                    setRenameName(event.target.value);
                    if (renameError) setRenameError('');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void renameCurrentWatchlist();
                    }
                  }}
                  placeholder="Rename watchlist"
                  className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm"
                />
                <button
                  onClick={() => void renameCurrentWatchlist()}
                  className="rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted"
                >
                  Save Name
                </button>
              </div>
              {renameError ? <p className="text-xs text-rose-500">{renameError}</p> : null}
            </div>

            <div className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex gap-2">
                <div ref={addSymbolRootRef} className="relative flex-1">
                  <input
                    value={addSymbol}
                    onChange={(event) => {
                      const value = event.target.value;
                      setAddSymbol(value);
                      setSelectedSuggestion(null);
                      setAddSymbolError('');
                      setIsAddSymbolSuggestionsOpen(value.trim().length > 0);
                    }}
                    onFocus={() => setIsAddSymbolSuggestionsOpen(addSymbol.trim().length > 0)}
                    onKeyDown={(event) => {
                      if (event.key === 'Tab' && hasAddSymbolQuery && addSymbolSuggestions.length) {
                        event.preventDefault();
                        pickAddSymbolSuggestion(addSymbolSuggestions[0]);
                        return;
                      }
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void addToCurrent(addSymbolSuggestions[0]);
                      }
                    }}
                    placeholder="Add symbol (AAPL, HDFCBANK)"
                    className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                  />
                  {showAddSymbolSuggestions ? (
                    <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-border/80 bg-card shadow-panel">
                      <div className="max-h-72 overflow-auto p-2">
                        {isAddSymbolSearching ? <div className="p-3 text-sm text-slate-500">Searching...</div> : null}
                        {!isAddSymbolSearching && addSymbolSuggestions.length === 0 ? (
                          <div className="p-3 text-sm text-slate-500">
                            No matches. Try ticker (e.g., AAPL, HDFCBANK) or company name.
                          </div>
                        ) : null}
                        {addSymbolSuggestions.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => pickAddSymbolSuggestion(item)}
                            className={cn(
                              'flex w-full items-center justify-between rounded-xl border border-transparent px-3 py-2 text-left text-sm transition hover:border-indigo-400/20 hover:bg-muted/50',
                            )}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium text-slate-900 dark:text-white">{item.name}</div>
                              <div className="text-xs text-slate-500">
                                {item.displaySymbol} • {item.market.toUpperCase()} {item.exchange ? `• ${item.exchange}` : ''}
                              </div>
                            </div>
                            <span className="rounded-lg border border-border/70 bg-muted/50 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">
                              {item.type === 'mutual_fund' ? 'MF' : 'Stock'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <button
                  onClick={() => void addToCurrent()}
                  className="rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white"
                >
                  Add
                </button>
              </div>
              {addSymbolError ? <p className="text-xs text-rose-500">{addSymbolError}</p> : null}
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Your Reason for Adding</span>
                <textarea
                  value={addReason}
                  onChange={(event) => setAddReason(event.target.value)}
                  placeholder="Write your own reason for adding this stock..."
                  rows={3}
                  className="w-full resize-y rounded-xl border border-border bg-card px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="space-y-2">
              {current.symbols.length ? (
                current.symbols.map((symbol) => {
                  const entity = demoUniverse.find((e) => e.symbol === symbol);
                  const market = entity?.market ?? inferMarketFromSymbol(symbol);
                  const aiProfile = deriveAiProfile(symbol);
                  const key = draftKey(current.id, symbol);
                  const originalReason = reasonFor(symbol, current);
                  const reasonDraft = noteDrafts[key] ?? originalReason;
                  return (
                    <div key={symbol} className="space-y-3 rounded-xl border border-border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link href={`/dashboard/${market}/${encodeURIComponent(symbol)}`} className="text-sm font-medium hover:text-accent">
                            {entity?.name ?? symbol}
                          </Link>
                          <div className="text-xs text-slate-500">{symbol}</div>
                        </div>
                        <button onClick={() => removeSymbol(symbol)} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted">
                          Remove
                        </button>
                      </div>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <Sparkline symbol={symbol} />
                        <PeriodChanges symbol={symbol} />
                      </div>
                      <div className="space-y-2">
                        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">AI Snapshot</div>
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                          <div className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs">
                            <div className="text-slate-500">Valuation</div>
                            <div className="font-semibold">{aiProfile.valuation}</div>
                          </div>
                          <div className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs">
                            <div className="text-slate-500">Quality</div>
                            <div className="font-semibold">{aiProfile.quality}</div>
                          </div>
                          <div className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs">
                            <div className="text-slate-500">Growth</div>
                            <div className="font-semibold">{aiProfile.growth}</div>
                          </div>
                          <div className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs">
                            <div className="text-slate-500">Risk</div>
                            <div className="font-semibold">{aiProfile.risk}</div>
                          </div>
                          <div className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs">
                            <div className="text-slate-500">Trend</div>
                            <div className="font-semibold">{aiProfile.trend}</div>
                          </div>
                        </div>
                      </div>
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Your Reason for Adding</span>
                        <textarea
                          value={reasonDraft}
                          onChange={(event) => {
                            const value = event.target.value;
                            setNoteDrafts((previous) => ({ ...previous, [key]: value }));
                          }}
                          onBlur={() => {
                            const next = reasonDraft;
                            if (next.trim() === originalReason.trim()) return;
                            void saveReason(symbol, next);
                          }}
                          placeholder="Write your own reason for adding this stock..."
                          rows={3}
                          className="w-full resize-y rounded-xl border border-border bg-card px-3 py-2 text-sm"
                        />
                      </label>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-slate-500">No symbols yet in this watchlist.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-slate-500">
            Select or create a watchlist to view tracked symbols.
          </div>
        )}
      </SectionCard>
    </div>
  );
}
