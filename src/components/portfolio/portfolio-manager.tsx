'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SectionCard } from '@/components/common/section-card';
import { demoUniverse, demoFundamentalsBySymbol } from '@/lib/data/mock/demo-data';
import { listPortfolioTxns, upsertPortfolioTxn } from '@/lib/storage/repositories';
import type { PortfolioTxn } from '@/lib/storage/idb';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/format';
import { useFxUsdInr } from '@/lib/hooks/use-stock-data';

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
  const { data: fx } = useFxUsdInr();
  const [txns, setTxns] = useState<PortfolioTxn[]>([]);
  const [symbol, setSymbol] = useState('AAPL');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState(10);
  const [price, setPrice] = useState(100);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    listPortfolioTxns().then((records) => {
      if (!records.length) {
        const seed: PortfolioTxn[] = [
          { id: crypto.randomUUID(), symbol: 'AAPL', market: 'us', side: 'buy', quantity: 5, price: 175, date: '2025-11-02' },
          { id: crypto.randomUUID(), symbol: 'HDFCBANK.NS', market: 'india', side: 'buy', quantity: 12, price: 1510, date: '2025-11-18' },
          { id: crypto.randomUUID(), symbol: 'TCS.NS', market: 'india', side: 'buy', quantity: 4, price: 3820, date: '2025-12-01' },
        ];
        Promise.all(seed.map((t) => upsertPortfolioTxn(t))).then(() => setTxns(seed));
      } else {
        setTxns(records);
      }
    });
  }, []);

  async function addTxn() {
    const match = demoUniverse.find((e) => e.symbol.toUpperCase() === symbol.toUpperCase() || e.displaySymbol.toUpperCase() === symbol.toUpperCase());
    const txn: PortfolioTxn = {
      id: crypto.randomUUID(),
      symbol: match?.symbol ?? symbol.toUpperCase(),
      market: (match?.market ?? 'us') as PortfolioTxn['market'],
      side,
      quantity,
      price,
      date,
    };
    await upsertPortfolioTxn(txn);
    setTxns((prev) => [...prev, txn]);
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
      <SectionCard title="Portfolio" subtitle="Add buy/sell transactions; holdings and P&L are stored locally in IndexedDB.">
        <div className="grid gap-3 md:grid-cols-6">
          <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Symbol" className="rounded-xl border border-border bg-card px-3 py-2 text-sm" />
          <select value={side} onChange={(e) => setSide(e.target.value as 'buy' | 'sell')} className="rounded-xl border border-border bg-card px-3 py-2 text-sm">
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
          <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="rounded-xl border border-border bg-card px-3 py-2 text-sm" />
          <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="rounded-xl border border-border bg-card px-3 py-2 text-sm" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm" />
          <button onClick={addTxn} className="rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white">Add Transaction</button>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <SectionCard title="Holdings" subtitle="Current values are based on available market price feeds and may be delayed.">
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
                    return (
                      <tr key={h.symbol} className="border-t border-border">
                        <td className="px-3 py-2">
                          <Link href={`/dashboard/${entity?.market ?? 'us'}/${encodeURIComponent(h.symbol)}`} className="font-medium hover:text-accent">
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

        <SectionCard title="Allocation" subtitle="Portfolio summary and allocation chart (lightweight bars).">
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
