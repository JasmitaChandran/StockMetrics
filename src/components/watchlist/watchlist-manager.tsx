'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { SectionCard } from '@/components/common/section-card';
import { demoUniverse, generateDemoHistory } from '@/lib/data/mock/demo-data';
import { listWatchlists, upsertWatchlist } from '@/lib/storage/repositories';
import type { WatchlistRecord } from '@/lib/storage/idb';
import { formatPercent } from '@/lib/utils/format';

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
  const [addSymbol, setAddSymbol] = useState('HDFCBANK');

  useEffect(() => {
    listWatchlists().then((rows) => {
      if (!rows.length) {
        const seed: WatchlistRecord = {
          id: crypto.randomUUID(),
          name: 'My Watchlist',
          symbols: ['HDFCBANK.NS', 'AAPL', 'TCS.NS'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        upsertWatchlist(seed).then(() => {
          setWatchlists([seed]);
          setSelectedId(seed.id);
        });
      } else {
        setWatchlists(rows);
        setSelectedId(rows[0].id);
      }
    });
  }, []);

  const current = watchlists.find((w) => w.id === selectedId) ?? watchlists[0];

  async function createWatchlist() {
    const record: WatchlistRecord = {
      id: crypto.randomUUID(),
      name: newName.trim() || `Watchlist ${watchlists.length + 1}`,
      symbols: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await upsertWatchlist(record);
    setWatchlists((prev) => [...prev, record]);
    setSelectedId(record.id);
  }

  async function addToCurrent() {
    if (!current) return;
    const q = addSymbol.trim().toUpperCase();
    const match = demoUniverse.find((e) => e.symbol.toUpperCase() === q || e.displaySymbol.toUpperCase() === q || e.name.toUpperCase().includes(q));
    if (!match) return;
    const updated: WatchlistRecord = {
      ...current,
      symbols: Array.from(new Set([...current.symbols, match.symbol])),
      updatedAt: new Date().toISOString(),
    };
    await upsertWatchlist(updated);
    setWatchlists((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    setAddSymbol('');
  }

  async function removeSymbol(symbol: string) {
    if (!current) return;
    const updated = { ...current, symbols: current.symbols.filter((s) => s !== symbol), updatedAt: new Date().toISOString() };
    await upsertWatchlist(updated);
    setWatchlists((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <SectionCard title="Watchlists" subtitle="Create and manage multiple watchlists (local storage).">
        <div className="space-y-3">
          <div className="flex gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm" placeholder="Watchlist name" />
            <button onClick={createWatchlist} className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted">
              <Plus className="h-4 w-4" /> New
            </button>
          </div>
          <div className="space-y-2">
            {watchlists.map((w) => (
              <button key={w.id} onClick={() => setSelectedId(w.id)} className={`block w-full rounded-xl border p-3 text-left ${selectedId === w.id ? 'border-accent bg-accent/10' : 'border-border hover:bg-muted/40'}`}>
                <div className="text-sm font-medium">{w.name}</div>
                <div className="text-xs text-slate-500">{w.symbols.length} symbols</div>
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title={current ? current.name : 'Watchlist'} subtitle="Quick sparkline + local watchlist tracking.">
        {current ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input value={addSymbol} onChange={(e) => setAddSymbol(e.target.value)} placeholder="Add symbol (AAPL, HDFCBANK)" className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm" />
              <button onClick={addToCurrent} className="rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white">Add</button>
            </div>
            <div className="space-y-2">
              {current.symbols.length ? (
                current.symbols.map((symbol) => {
                  const entity = demoUniverse.find((e) => e.symbol === symbol);
                  return (
                    <div key={symbol} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                      <div>
                        <Link href={`/dashboard/${entity?.market ?? 'india'}/${encodeURIComponent(symbol)}`} className="text-sm font-medium hover:text-accent">
                          {entity?.name ?? symbol}
                        </Link>
                        <div className="text-xs text-slate-500">{symbol}</div>
                      </div>
                      <div className="space-y-1">
                        <Sparkline symbol={symbol} />
                        <PeriodChanges symbol={symbol} />
                      </div>
                      <button onClick={() => removeSymbol(symbol)} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted">Remove</button>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-slate-500">No symbols yet in this watchlist.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500">Loading watchlist...</div>
        )}
      </SectionCard>
    </div>
  );
}
