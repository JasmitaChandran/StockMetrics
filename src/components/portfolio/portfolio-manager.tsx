'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Calendar, Search } from 'lucide-react';
import { SectionCard } from '@/components/common/section-card';
import { demoUniverse, demoFundamentalsBySymbol } from '@/lib/data/mock/demo-data';
import { listPortfolioTxns, upsertPortfolioTxn } from '@/lib/storage/repositories';
import type { PortfolioTxn } from '@/lib/storage/idb';
import type { SearchEntity } from '@/types';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { useFxUsdInr, useSearchEntities } from '@/lib/hooks/use-stock-data';
import { useAuthStore } from '@/stores/auth-store';

interface HoldingRow {
  symbol: string;
  market: 'us' | 'india' | 'mf';
  currency: 'USD' | 'INR';
  quantity: number;
  avgCost: number;
  currentPrice: number;
  invested: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
}

function getCurrentPrice(symbol: string) {
  return demoFundamentalsBySymbol[symbol]?.keyMetrics.find((m) => m.key === 'currentPrice')?.value ?? 100;
}

function deriveHoldings(txns: PortfolioTxn[]): HoldingRow[] {
  const map = new Map<string, { qty: number; cost: number; market: 'us' | 'india' | 'mf' }>();
  for (const t of txns) {
    const key = t.symbol;
    const cur = map.get(key) ?? { qty: 0, cost: 0, market: t.market };
    if (t.side === 'buy') {
      cur.qty += t.quantity;
      cur.cost += t.quantity * t.price;
    } else {
      const avg = cur.qty > 0 ? cur.cost / cur.qty : 0;
      cur.qty -= t.quantity;
      cur.cost -= t.quantity * avg;
      if (cur.qty < 0) cur.qty = 0;
      if (cur.cost < 0) cur.cost = 0;
    }
    map.set(key, cur);
  }

  return Array.from(map.entries())
    .filter(([, v]) => v.qty > 0)
    .map(([symbol, v]) => {
      const currentPrice = getCurrentPrice(symbol);
      const currency = (demoUniverse.find((e) => e.symbol === symbol)?.currency ?? 'USD') as 'USD' | 'INR';
      const invested = v.cost;
      const currentValue = v.qty * currentPrice;
      const pnl = currentValue - invested;
      const pnlPct = invested ? (pnl / invested) * 100 : 0;
      return {
        symbol,
        market: v.market,
        currency,
        quantity: v.qty,
        avgCost: v.cost / v.qty,
        currentPrice,
        invested,
        currentValue,
        pnl,
        pnlPct,
      };
    });
}

export function PortfolioManager() {
  const userId = useAuthStore((state) => state.user?.id);
  const authLoading = useAuthStore((state) => state.loading);
  const { data: fx } = useFxUsdInr();
  const [txns, setTxns] = useState<PortfolioTxn[]>([]);
  const [symbol, setSymbol] = useState('');
  const [selectedSymbolSuggestion, setSelectedSymbolSuggestion] = useState<SearchEntity | null>(null);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantityInput, setQuantityInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const dateInputRef = useRef<HTMLInputElement>(null);
  const debouncedSymbolQuery = useDebouncedValue(symbol, 250);
  const { data: symbolSearchData, isLoading: isSymbolSearching } = useSearchEntities(debouncedSymbolQuery);
  const symbolSuggestions = useMemo(() => symbolSearchData ?? [], [symbolSearchData]);
  const visibleSymbolSuggestions = useMemo(() => symbolSuggestions.slice(0, 6), [symbolSuggestions]);
  const hasSymbolQuery = symbol.trim().length >= 2;
  const showSymbolSuggestions = hasSymbolQuery && !selectedSymbolSuggestion;

  useEffect(() => {
    if (authLoading) return;
    let disposed = false;
    setTxns([]);
    setSymbol('');
    setSelectedSymbolSuggestion(null);
    setQuantityInput('');
    setPriceInput('');

    async function loadPortfolio() {
      const records = await listPortfolioTxns({ userId });
      if (disposed) return;
      setTxns(records);
    }

    void loadPortfolio();
    return () => {
      disposed = true;
    };
  }, [authLoading, userId]);

  function pickSymbolSuggestion(entity: SearchEntity) {
    setSymbol(entity.displaySymbol);
    setSelectedSymbolSuggestion(entity);
  }

  function openDatePicker() {
    const input = dateInputRef.current;
    if (!input) return;
    input.focus();
    if (typeof input.showPicker === 'function') input.showPicker();
  }

  async function addTxn(preferredMatch?: SearchEntity) {
    const normalizedSymbol = symbol.trim().toUpperCase();
    if (!normalizedSymbol) return;
    const quantity = Number(quantityInput);
    const price = Number(priceInput);
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) return;
    const exactSuggestion = symbolSuggestions.find(
      (entity) => entity.symbol.toUpperCase() === normalizedSymbol || entity.displaySymbol.toUpperCase() === normalizedSymbol,
    );
    const match =
      preferredMatch ??
      selectedSymbolSuggestion ??
      exactSuggestion ??
      demoUniverse.find((entity) => entity.symbol.toUpperCase() === normalizedSymbol || entity.displaySymbol.toUpperCase() === normalizedSymbol);

    const finalSymbol = match?.symbol ?? normalizedSymbol;
    const txn: PortfolioTxn = {
      id: crypto.randomUUID(),
      symbol: finalSymbol,
      market: (match?.market ?? 'us') as PortfolioTxn['market'],
      side,
      quantity,
      price,
      date,
    };
    await upsertPortfolioTxn(txn, { userId });
    setTxns((prev) => [...prev, txn]);
    setSymbol('');
    setQuantityInput('');
    setPriceInput('');
    setSelectedSymbolSuggestion(null);
  }

  const holdings = useMemo(() => deriveHoldings(txns), [txns]);
  const totals = useMemo(() => {
    const usdInr = fx?.rate ?? 83;
    const toInr = (amount: number, currency: 'USD' | 'INR') => (currency === 'USD' ? amount * usdInr : amount);
    const invested = holdings.reduce((sum, h) => sum + toInr(h.invested, h.currency), 0);
    const current = holdings.reduce((sum, h) => sum + toInr(h.currentValue, h.currency), 0);
    const pnl = current - invested;
    return { invested, current, pnl, pnlPct: invested ? (pnl / invested) * 100 : 0, usdInr };
  }, [fx?.rate, holdings]);

  return (
    <div className="space-y-6">
      <SectionCard title="Portfolio" subtitle="Add buy/sell transactions">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1.6fr)_120px_120px_140px_180px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={symbol}
              onChange={(event) => {
                const value = event.target.value;
                setSymbol(value);
                setSelectedSymbolSuggestion(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Tab' && hasSymbolQuery && visibleSymbolSuggestions.length) {
                  event.preventDefault();
                  pickSymbolSuggestion(visibleSymbolSuggestions[0]);
                  return;
                }
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (showSymbolSuggestions && visibleSymbolSuggestions.length) {
                    void addTxn(visibleSymbolSuggestions[0]);
                    return;
                  }
                  void addTxn();
                }
              }}
              placeholder="Search stock (e.g., AAPL, HDFCBANK)"
              className="w-full rounded-xl border border-border bg-card py-2 pl-10 pr-3 text-sm"
            />
          </div>
          <select value={side} onChange={(e) => setSide(e.target.value as 'buy' | 'sell')} className="rounded-xl border border-border bg-card px-3 py-2 text-sm">
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
          <input type="number" value={quantityInput} onChange={(e) => setQuantityInput(e.target.value)} placeholder="Qty" className="rounded-xl border border-border bg-card px-3 py-2 text-sm" />
          <input type="number" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} placeholder="Price" className="rounded-xl border border-border bg-card px-3 py-2 text-sm" />
          <div className="portfolio-date-field flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
            <input
              ref={dateInputRef}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="portfolio-date-input min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none"
            />
            <button
              type="button"
              onClick={openDatePicker}
              className="shrink-0 text-slate-500 transition hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
              aria-label="Open date picker"
            >
              <Calendar className="h-4 w-4" />
            </button>
          </div>
          <button onClick={() => void addTxn()} className="rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white">Add</button>
        </div>
      </SectionCard>
      {showSymbolSuggestions ? (
        <div className="rounded-xl border border-border/80 bg-card/80">
          {isSymbolSearching ? <div className="px-3 py-2 text-sm text-slate-500">Searching...</div> : null}
          {!isSymbolSearching && visibleSymbolSuggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">
              No matches. Try ticker (e.g., AAPL, HDFCBANK) or company name.
            </div>
          ) : null}
          {!isSymbolSearching && visibleSymbolSuggestions.length > 0 ? (
            <div className="divide-y divide-border/60">
              {visibleSymbolSuggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pickSymbolSuggestion(item)}
                  className={cn('flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-muted/40')}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-900 dark:text-white">{item.name}</div>
                    <div className="text-xs text-slate-500">
                      {item.displaySymbol} • {item.market.toUpperCase()} {item.exchange ? `• ${item.exchange}` : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <SectionCard title="Holdings">
          <div className="overflow-auto rounded-xl border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Holding</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Avg Cost</th>
                  <th className="px-3 py-2 text-right">Current</th>
                  <th className="px-3 py-2 text-right">Value</th>
                  <th className="px-3 py-2 text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {holdings.length ? (
                  holdings.map((h) => {
                    const entity = demoUniverse.find((e) => e.symbol === h.symbol);
                    const currency = h.currency;
                    const market = entity?.market ?? h.market;
                    return (
                      <tr key={h.symbol} className="border-t border-border">
                        <td className="px-3 py-2">
                          <Link href={`/dashboard/${market}/${encodeURIComponent(h.symbol)}`} className="font-medium hover:text-accent">
                            {entity?.displaySymbol ?? h.symbol}
                          </Link>
                          <div className="text-xs text-slate-500">{entity?.name ?? h.symbol}</div>
                        </td>
                        <td className="px-3 py-2 text-right">{formatNumber(h.quantity)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(h.avgCost, currency)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(h.currentPrice, currency)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(h.currentValue, currency)}</td>
                        <td className={`px-3 py-2 text-right ${h.pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                          {formatCurrency(h.pnl, currency)} ({formatPercent(h.pnlPct)})
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-slate-500">No holdings yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Allocation" subtitle="Portfolio summary and allocation chart">
          <div className="space-y-3">
            <div className="rounded-xl border border-border p-3">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between"><span>Invested</span><span>{formatCurrency(totals.invested, 'INR')}</span></div>
                <div className="flex justify-between"><span>Current Value</span><span>{formatCurrency(totals.current, 'INR')}</span></div>
                <div className="flex justify-between"><span>Total P&L</span><span className={totals.pnl >= 0 ? 'text-positive' : 'text-negative'}>{formatCurrency(totals.pnl, 'INR')} ({formatPercent(totals.pnlPct)})</span></div>
                <div className="text-[11px] text-slate-500">Mixed currencies are normalized to INR using the latest available USD→INR conversion ({totals.usdInr.toFixed(2)}).</div>
              </div>
            </div>
            <div className="space-y-2">
              {holdings.map((h) => {
                const valueInr = h.currency === 'USD' ? h.currentValue * totals.usdInr : h.currentValue;
                const pct = totals.current ? (valueInr / totals.current) * 100 : 0;
                return (
                  <div key={`alloc-${h.symbol}`}>
                    <div className="mb-1 flex justify-between text-sm"><span>{h.symbol}</span><span>{pct.toFixed(1)}%</span></div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400" style={{ width: `${Math.max(4, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
