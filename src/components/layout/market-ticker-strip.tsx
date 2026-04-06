'use client';

import { useQuery } from '@tanstack/react-query';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Quote, SearchEntity } from '@/types';
import { marketAdapter } from '@/lib/data/adapters/market-adapter';
import { demoUniverse, deriveQuoteFromHistory, generateDemoHistory } from '@/lib/data/mock/demo-data';
import { cn } from '@/lib/utils/cn';

interface TickerRow {
  entity: SearchEntity;
  quote: Quote;
}

function findDemoEntity(symbol: string) {
  const entity = demoUniverse.find((candidate) => candidate.symbol === symbol);
  if (!entity) {
    throw new Error(`Navbar ticker entity missing for ${symbol}`);
  }
  return entity;
}

const navbarTickerEntities: SearchEntity[] = [
  {
    id: 'india:^NSEI',
    symbol: '^NSEI',
    displaySymbol: 'NIFTY 50',
    name: 'Nifty 50 Index',
    market: 'india',
    exchange: 'NSE',
    country: 'India',
    currency: 'INR',
    type: 'stock',
  },
  {
    id: 'india:^NSEBANK',
    symbol: '^NSEBANK',
    displaySymbol: 'NIFTY BANK',
    name: 'Nifty Bank Index',
    market: 'india',
    exchange: 'NSE',
    country: 'India',
    currency: 'INR',
    type: 'stock',
  },
  findDemoEntity('HDFCBANK.NS'),
  findDemoEntity('ICICIBANK.NS'),
  findDemoEntity('AXISBANK.NS'),
  findDemoEntity('RELIANCE.NS'),
  findDemoEntity('TCS.NS'),
  findDemoEntity('INFY.NS'),
];

const fallbackRows: TickerRow[] = navbarTickerEntities.map((entity) => ({
  entity,
  quote: deriveQuoteFromHistory(entity, generateDemoHistory(entity)),
}));

function formatTickerPrice(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTickerPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '0.00%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

async function fetchTickerRows() {
  const results = await Promise.allSettled(
    navbarTickerEntities.map(async (entity) => ({
      entity,
      quote: await marketAdapter.getQuote(entity),
    })),
  );

  return results.map((result, index) => (result.status === 'fulfilled' ? result.value : fallbackRows[index]));
}

function TickerItem({ row }: { row: TickerRow }) {
  const changePercent = row.quote.changePercent ?? 0;
  const tone =
    changePercent > 0
      ? 'positive'
      : changePercent < 0
        ? 'negative'
        : 'neutral';
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-400'
      : tone === 'negative'
        ? 'text-rose-400'
        : 'text-slate-300';
  const ToneIcon = tone === 'positive' ? TrendingUp : tone === 'negative' ? TrendingDown : Minus;

  return (
    <div
      className="flex items-center gap-2 border-r border-white/10 px-3 py-1 transition hover:bg-white/5"
      title={`${row.entity.name} • ${row.quote.source}`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/92">
        {row.entity.displaySymbol}
      </span>
      <span className="text-sm font-medium tabular-nums text-white">
        {formatTickerPrice(row.quote.price)}
      </span>
      <span className={cn('inline-flex items-center gap-1 text-xs font-semibold tabular-nums', toneClass)}>
        <ToneIcon className="h-3.5 w-3.5" />
        {formatTickerPercent(changePercent)}
      </span>
    </div>
  );
}

export function MarketTickerStrip() {
  const { data = fallbackRows, isFetching } = useQuery({
    queryKey: ['navbar-market-ticker'],
    queryFn: fetchTickerRows,
    initialData: fallbackRows,
    staleTime: 0,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
  });

  const marqueeStyle = {
    '--ticker-duration': `${Math.max(data.length * 7, 34)}s`,
  } as CSSProperties;

  return (
    <div className="market-ticker-shell relative flex h-9 min-w-0 items-center overflow-hidden text-white">
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-slate-950 via-slate-950/90 to-transparent" />
      <div className="market-ticker-track pr-5" style={marqueeStyle}>
        <div className="market-ticker-group">
          {data.map((row) => (
            <TickerItem key={row.entity.symbol} row={row} />
          ))}
        </div>
        <div className="market-ticker-group" aria-hidden="true">
          {data.map((row) => (
            <TickerItem key={`${row.entity.symbol}-clone`} row={row} />
          ))}
        </div>
      </div>
      <div
        aria-hidden
        className={cn(
          'absolute right-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full transition',
          isFetching ? 'animate-pulse bg-sky-400/90' : 'bg-emerald-400/85',
        )}
      />
    </div>
  );
}
