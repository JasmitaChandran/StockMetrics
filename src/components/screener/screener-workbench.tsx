'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VirtualizedTable } from '@/components/common/virtualized-table';
import { demoFundamentalsBySymbol, demoUniverse, generateDemoHistory } from '@/lib/data/mock/demo-data';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { SearchEntity } from '@/types';

type FilterCategory =
  | 'Stock Universe'
  | 'Price & Volume'
  | 'Valuation'
  | 'Profitability'
  | 'Financial Ratios';

interface ScreenerRow {
  id: string;
  symbol: string;
  name: string;
  market: string;
  exchange: string;
  sector: string;
  industry: string;
  stockUniverse: 'Indian Stocks' | 'US Stocks';
  marketCapBucket: 'Smallcap' | 'Midcap' | 'Largecap';
  currency: 'USD' | 'INR';
  closePrice?: number;
  marketCap?: number;
  enterpriseValue?: number;
  pe?: number;
  pb?: number;
  priceToSales?: number;
  priceToFcf?: number;
  evEbitda?: number;
  pegRatio?: number;
  roe?: number;
  roce?: number;
  roa?: number;
  opm?: number;
  earningsYield?: number;
  dividendYield?: number;
  debtToEquity?: number;
  debt?: number;
  currentRatio?: number;
  interestCoverage?: number;
  promoterHolding?: number;
  pledgedPercentage?: number;
  salesGrowth?: number;
  profitGrowth?: number;
  yoyQuarterlySalesGrowth?: number;
  yoyQuarterlyProfitGrowth?: number;
  sales?: number;
  pat?: number;
  salesLatestQuarter?: number;
  patLatestQuarter?: number;
  eps?: number;
  return1d?: number;
  return1w?: number;
  return1m?: number;
  return3m?: number;
  return6m?: number;
  return1y?: number;
  return1mVsBenchmark?: number;
  return6mVsBenchmark?: number;
  return1yVsBenchmark?: number;
  awayFrom52wHigh?: number;
  awayFrom52wLow?: number;
  dailyVolume?: number;
  avgVolume1m?: number;
  changeVolume1d?: number;
  volumeVsAvg1m?: number;
  sma50?: number;
  sma200?: number;
  priceVsSma50?: number;
  priceVsSma200?: number;
  rsi14?: number;
  volatility30d?: number;
  volatility90d?: number;
  drawdown1y?: number;
  trendStrength?: number;
  debtToMarketCap?: number;
  enterpriseToSales?: number;
  netProfitMargin?: number;
  profitToDebt?: number;
  freeCashFlowProxy?: number;
}

type NumericField = {
  [K in keyof ScreenerRow]: ScreenerRow[K] extends number | undefined ? K : never;
}[keyof ScreenerRow];

type EnumField = {
  [K in keyof ScreenerRow]: ScreenerRow[K] extends string ? K : never;
}[keyof ScreenerRow];

interface NumericFilterDefinition {
  id: string;
  kind: 'numeric';
  field: NumericField;
  label: string;
  category: FilterCategory;
  description: string;
  valueType: 'number' | 'percent' | 'currency';
}

interface EnumFilterDefinition {
  id: string;
  kind: 'enum';
  field: EnumField;
  label: string;
  category: FilterCategory;
  description: string;
}

type FilterDefinition = NumericFilterDefinition | EnumFilterDefinition;

type ActiveFilter =
  | {
      filterId: string;
      kind: 'numeric';
      min: string;
      max: string;
    }
  | {
      filterId: string;
      kind: 'enum';
      selected: string[];
    };

type SortField =
  | 'name'
  | 'stockUniverse'
  | 'marketCap'
  | 'closePrice'
  | 'pe'
  | 'pb'
  | 'evEbitda'
  | 'priceToSales'
  | 'pegRatio'
  | 'dividendYield'
  | 'roe'
  | 'roce'
  | 'debtToEquity'
  | 'return1m'
  | 'return1d'
  | 'dailyVolume';

const FILTER_CATEGORIES: FilterCategory[] = [
  'Stock Universe',
  'Price & Volume',
  'Valuation',
  'Profitability',
  'Financial Ratios',
];

const FILTER_DEFINITIONS: FilterDefinition[] = [
  {
    id: 'stock-universe',
    kind: 'enum',
    field: 'stockUniverse',
    label: 'Stocks',
    category: 'Stock Universe',
    description: 'Choose India or US stock universe.',
  },
  {
    id: 'market-cap-bucket',
    kind: 'enum',
    field: 'marketCapBucket',
    label: 'Market Cap Bucket',
    category: 'Stock Universe',
    description: 'Smallcap / Midcap / Largecap segmentation.',
  },
  {
    id: 'return-1m',
    kind: 'numeric',
    field: 'return1m',
    label: '1M Return',
    category: 'Price & Volume',
    description: 'One-month return percentage.',
    valueType: 'percent',
  },
  {
    id: 'market-cap',
    kind: 'numeric',
    field: 'marketCap',
    label: 'Market Cap',
    category: 'Valuation',
    description: 'Market capitalization.',
    valueType: 'currency',
  },
  {
    id: 'pe',
    kind: 'numeric',
    field: 'pe',
    label: 'P/E Ratio',
    category: 'Valuation',
    description: 'Price divided by earnings per share; lower can indicate cheaper valuation.',
    valueType: 'number',
  },
  {
    id: 'pb',
    kind: 'numeric',
    field: 'pb',
    label: 'P/B Ratio',
    category: 'Valuation',
    description: 'Price relative to book value per share.',
    valueType: 'number',
  },
  {
    id: 'ev-ebitda',
    kind: 'numeric',
    field: 'evEbitda',
    label: 'EV/EBITDA',
    category: 'Valuation',
    description: 'Enterprise value divided by EBITDA; compares total firm value to operating earnings.',
    valueType: 'number',
  },
  {
    id: 'price-to-sales',
    kind: 'numeric',
    field: 'priceToSales',
    label: 'Price/Sales',
    category: 'Valuation',
    description: 'Price relative to annual sales per share.',
    valueType: 'number',
  },
  {
    id: 'peg-ratio',
    kind: 'numeric',
    field: 'pegRatio',
    label: 'PEG Ratio',
    category: 'Valuation',
    description: 'P/E adjusted by earnings growth rate.',
    valueType: 'number',
  },
  {
    id: 'roe',
    kind: 'numeric',
    field: 'roe',
    label: 'ROE',
    category: 'Profitability',
    description: 'Return on equity.',
    valueType: 'percent',
  },
  {
    id: 'roce',
    kind: 'numeric',
    field: 'roce',
    label: 'ROCE',
    category: 'Profitability',
    description: 'Return on capital employed; efficiency of capital usage.',
    valueType: 'percent',
  },
  {
    id: 'dividend-yield',
    kind: 'numeric',
    field: 'dividendYield',
    label: 'Dividend Yield',
    category: 'Profitability',
    description: 'Annual dividend as a percent of current price.',
    valueType: 'percent',
  },
  {
    id: 'debt-to-equity',
    kind: 'numeric',
    field: 'debtToEquity',
    label: 'Debt to Equity',
    category: 'Financial Ratios',
    description: 'Leverage ratio.',
    valueType: 'number',
  },
];

const FILTER_DEFINITION_BY_ID = Object.fromEntries(FILTER_DEFINITIONS.map((definition) => [definition.id, definition])) as Record<string, FilterDefinition>;

const STRATEGIES = [
  'Quality Compounders',
  'Value + Yield',
  'Growth Leaders',
  'Low Leverage',
  'Momentum',
  'Largecap Stability',
] as const;

function getMetric(symbol: string, key: string) {
  return demoFundamentalsBySymbol[symbol]?.keyMetrics.find((m) => m.key === key)?.value;
}

function marketCapBucket(marketCap?: number): ScreenerRow['marketCapBucket'] {
  if ((marketCap ?? 0) >= 500000) return 'Largecap';
  if ((marketCap ?? 0) >= 100000) return 'Midcap';
  return 'Smallcap';
}

function safeReturn(current?: number, previous?: number): number | undefined {
  if (typeof current !== 'number' || typeof previous !== 'number' || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

function pointAtLookback<T extends { close: number }>(points: T[], sessionsBack: number): T | undefined {
  if (points.length <= sessionsBack) return undefined;
  return points[points.length - 1 - sessionsBack];
}

function average(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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

function calculateRsi(points: Array<{ close: number }>, period = 14): number | undefined {
  if (points.length <= period) return undefined;
  let gains = 0;
  let losses = 0;
  const start = points.length - period;
  for (let i = start; i < points.length; i += 1) {
    const prev = points[i - 1]?.close;
    const curr = points[i]?.close;
    if (typeof prev !== 'number' || typeof curr !== 'number') continue;
    const change = curr - prev;
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  if (losses === 0) return 100;
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function buildRows(): ScreenerRow[] {
  const benchmarkByMarket: Record<string, { return1m: number; return6m: number; return1y: number }> = {
    india: { return1m: 2.1, return6m: 8.5, return1y: 13.4 },
    us: { return1m: 2.4, return6m: 9.1, return1y: 14.2 },
  };

  return demoUniverse
    .filter((entity) => entity.type === 'stock')
    .map((entity) => {
      const history = generateDemoHistory(entity).points;
      const latest = history[history.length - 1];
      const prev = pointAtLookback(history, 1);
      const week = pointAtLookback(history, 5);
      const month = pointAtLookback(history, 21);
      const quarter = pointAtLookback(history, 63);
      const halfYear = pointAtLookback(history, 126);
      const year = pointAtLookback(history, 252);

      const rolling52w = history.slice(-252);
      const high52w = rolling52w.length ? Math.max(...rolling52w.map((point) => point.close)) : undefined;
      const low52w = rolling52w.length ? Math.min(...rolling52w.map((point) => point.close)) : undefined;

      const recentVolumes = history
        .slice(-22)
        .map((point) => point.volume)
        .filter((value): value is number => typeof value === 'number');
      const prevVolume = prev?.volume;
      const currentVolume = latest?.volume;
      const avgVolume1m = average(recentVolumes);

      const metricMarketCap = getMetric(entity.symbol, 'marketCap');
      const closePrice = getMetric(entity.symbol, 'currentPrice') ?? latest?.close;
      const enterpriseValue = getMetric(entity.symbol, 'enterpriseValue');
      const pe = getMetric(entity.symbol, 'pe');
      const pb = getMetric(entity.symbol, 'pb');
      const priceToSales = getMetric(entity.symbol, 'priceToSales');
      const priceToFcf = getMetric(entity.symbol, 'priceToFcf');
      const evEbitda = getMetric(entity.symbol, 'evEbitda');
      const pegRatio = getMetric(entity.symbol, 'pegRatio');
      const roe = getMetric(entity.symbol, 'roe');
      const roce = getMetric(entity.symbol, 'roce');
      const roa = getMetric(entity.symbol, 'roa');
      const opm = getMetric(entity.symbol, 'opm');
      const earningsYield = getMetric(entity.symbol, 'earningsYield');
      const dividendYield = getMetric(entity.symbol, 'dividendYield');
      const debtToEquity = getMetric(entity.symbol, 'debtToEquity');
      const debt = getMetric(entity.symbol, 'debt');
      const currentRatio = getMetric(entity.symbol, 'currentRatio');
      const interestCoverage = getMetric(entity.symbol, 'interestCoverage');
      const promoterHolding = getMetric(entity.symbol, 'promoterHolding');
      const pledgedPercentage = getMetric(entity.symbol, 'pledgedPercentage');
      const salesGrowth = getMetric(entity.symbol, 'salesGrowth');
      const profitGrowth = getMetric(entity.symbol, 'profitGrowth');
      const yoyQuarterlySalesGrowth = getMetric(entity.symbol, 'yoyQuarterlySalesGrowth');
      const yoyQuarterlyProfitGrowth = getMetric(entity.symbol, 'yoyQuarterlyProfitGrowth');
      const sales = getMetric(entity.symbol, 'sales');
      const pat = getMetric(entity.symbol, 'pat');
      const salesLatestQuarter = getMetric(entity.symbol, 'salesLatestQuarter');
      const patLatestQuarter = getMetric(entity.symbol, 'patLatestQuarter');
      const eps = getMetric(entity.symbol, 'eps');

      const return1m = safeReturn(latest?.close, month?.close);
      const return3m = safeReturn(latest?.close, quarter?.close) ?? getMetric(entity.symbol, 'return3m');
      const return6m = safeReturn(latest?.close, halfYear?.close) ?? getMetric(entity.symbol, 'return6m');
      const return1y = safeReturn(latest?.close, year?.close);
      const benchmark = benchmarkByMarket[entity.market] ?? benchmarkByMarket.india;

      const sma50 = movingAverage(history, 50);
      const sma200 = movingAverage(history, 200);
      const priceVsSma50 = typeof closePrice === 'number' && typeof sma50 === 'number' && sma50 !== 0 ? ((closePrice - sma50) / sma50) * 100 : undefined;
      const priceVsSma200 = typeof closePrice === 'number' && typeof sma200 === 'number' && sma200 !== 0 ? ((closePrice - sma200) / sma200) * 100 : undefined;
      const volatility30d = annualizedVolatility(history, 30);
      const volatility90d = annualizedVolatility(history, 90);
      const rsi14 = calculateRsi(history, 14);
      const drawdown1y = maxDrawdown(history, 252);
      const trendParts = [
        { value: return1m, weight: 0.2 },
        { value: return3m, weight: 0.3 },
        { value: return6m, weight: 0.5 },
      ].filter((item): item is { value: number; weight: number } => typeof item.value === 'number');
      const trendStrength = trendParts.length
        ? trendParts.reduce((sum, item) => sum + item.value * item.weight, 0) / trendParts.reduce((sum, item) => sum + item.weight, 0)
        : undefined;
      const volumeVsAvg1m = typeof currentVolume === 'number' && typeof avgVolume1m === 'number' && avgVolume1m !== 0 ? currentVolume / avgVolume1m : undefined;
      const debtToMarketCap = typeof debt === 'number' && typeof metricMarketCap === 'number' && metricMarketCap !== 0 ? (debt / metricMarketCap) * 100 : undefined;
      const enterpriseToSales = typeof enterpriseValue === 'number' && typeof sales === 'number' && sales !== 0 ? enterpriseValue / sales : undefined;
      const netProfitMargin = typeof pat === 'number' && typeof sales === 'number' && sales !== 0 ? (pat / sales) * 100 : undefined;
      const profitToDebt = typeof pat === 'number' && typeof debt === 'number' && debt !== 0 ? (pat / debt) * 100 : undefined;
      const freeCashFlowProxy = typeof metricMarketCap === 'number' && typeof priceToFcf === 'number' && priceToFcf > 0 ? metricMarketCap / priceToFcf : undefined;

      return {
        id: entity.id,
        symbol: entity.symbol,
        name: entity.name,
        market: entity.market,
        exchange: entity.exchange ?? 'UNKNOWN',
        sector: entity.sector ?? 'Unknown',
        industry: entity.industry ?? 'Unknown',
        stockUniverse: entity.market === 'india' ? 'Indian Stocks' : 'US Stocks',
        marketCapBucket: marketCapBucket(metricMarketCap),
        currency: entity.currency ?? 'INR',
        closePrice,
        marketCap: metricMarketCap,
        enterpriseValue,
        pe,
        pb,
        priceToSales,
        priceToFcf,
        evEbitda,
        pegRatio,
        roe,
        roce,
        roa,
        opm,
        earningsYield,
        dividendYield,
        debtToEquity,
        debt,
        currentRatio,
        interestCoverage,
        promoterHolding,
        pledgedPercentage,
        salesGrowth,
        profitGrowth,
        yoyQuarterlySalesGrowth,
        yoyQuarterlyProfitGrowth,
        sales,
        pat,
        salesLatestQuarter,
        patLatestQuarter,
        eps,
        return1d: safeReturn(latest?.close, prev?.close),
        return1w: safeReturn(latest?.close, week?.close),
        return1m,
        return3m,
        return6m,
        return1y,
        return1mVsBenchmark: typeof return1m === 'number' ? return1m - benchmark.return1m : undefined,
        return6mVsBenchmark: typeof return6m === 'number' ? return6m - benchmark.return6m : undefined,
        return1yVsBenchmark: typeof return1y === 'number' ? return1y - benchmark.return1y : undefined,
        awayFrom52wHigh: typeof latest?.close === 'number' && typeof high52w === 'number' ? ((latest.close - high52w) / high52w) * 100 : undefined,
        awayFrom52wLow: typeof latest?.close === 'number' && typeof low52w === 'number' ? ((latest.close - low52w) / low52w) * 100 : undefined,
        dailyVolume: currentVolume,
        avgVolume1m,
        changeVolume1d: typeof currentVolume === 'number' && typeof prevVolume === 'number' && prevVolume !== 0 ? ((currentVolume - prevVolume) / prevVolume) * 100 : undefined,
        volumeVsAvg1m,
        sma50,
        sma200,
        priceVsSma50,
        priceVsSma200,
        rsi14,
        volatility30d,
        volatility90d,
        drawdown1y,
        trendStrength,
        debtToMarketCap,
        enterpriseToSales,
        netProfitMargin,
        profitToDebt,
        freeCashFlowProxy,
      };
    });
}

const demoRows = buildRows();
const demoRowsBySymbol = new Map(demoRows.map((row) => [row.symbol, row]));

function toScreenerRow(entity: SearchEntity): ScreenerRow | null {
  if (entity.type !== 'stock') return null;
  if (entity.market !== 'india' && entity.market !== 'us') return null;
  const fromDemo = demoRowsBySymbol.get(entity.symbol);
  if (fromDemo) return fromDemo;

  return {
    id: entity.id,
    symbol: entity.symbol,
    name: entity.name,
    market: entity.market,
    exchange: entity.exchange ?? 'UNKNOWN',
    sector: entity.sector ?? 'Unknown',
    industry: entity.industry ?? 'Unknown',
    stockUniverse: entity.market === 'india' ? 'Indian Stocks' : 'US Stocks',
    marketCapBucket: 'Smallcap',
    currency: entity.currency ?? (entity.market === 'us' ? 'USD' : 'INR'),
  };
}

async function fetchAllMarketStocks(market: 'india' | 'us'): Promise<SearchEntity[]> {
  const limit = 1000;
  const all: SearchEntity[] = [];
  let offset = 0;

  while (offset <= 100000) {
    const params = new URLSearchParams({
      market,
      limit: String(limit),
      offset: String(offset),
    });
    const response = await fetch(`/api/search/universal?${params.toString()}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed loading ${market} universe (${response.status})`);
    }
    const batch = (await response.json()) as SearchEntity[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }

  return all;
}

function mergeUniverseRows(entities: SearchEntity[]): ScreenerRow[] {
  const merged = new Map<string, ScreenerRow>();

  for (const entity of entities) {
    const row = toScreenerRow(entity);
    if (!row) continue;
    if (!merged.has(row.symbol)) merged.set(row.symbol, row);
  }

  for (const row of demoRows) {
    if (!merged.has(row.symbol)) merged.set(row.symbol, row);
  }

  return Array.from(merged.values());
}

const QUOTE_HYDRATION_MAX_CONCURRENT = 4;
const QUOTE_HYDRATION_BATCH_LIMIT = 24;
const ADVANCED_HYDRATION_MAX_CONCURRENT = 1;
const ADVANCED_HYDRATION_BATCH_LIMIT = 8;
const LIGHT_NUMERIC_FILTER_IDS = new Set(['market-cap', 'debt-to-equity']);

function computeReturnPercent(current?: number, previous?: number): number | undefined {
  if (typeof current !== 'number' || typeof previous !== 'number' || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

async function fetchQuoteSnapshot(row: ScreenerRow): Promise<Partial<ScreenerRow> | null> {
  const market = row.market === 'india' ? 'india' : row.market === 'us' ? 'us' : row.stockUniverse === 'Indian Stocks' ? 'india' : 'us';
  const response = await fetch(
    `/api/market/quote?symbol=${encodeURIComponent(row.symbol)}&market=${encodeURIComponent(market)}`,
    { cache: 'no-store' },
  );
  if (!response.ok) return null;

  const quote = (await response.json()) as {
    currency?: 'USD' | 'INR';
    price?: number | null;
    changePercent?: number | null;
    volume?: number | null;
  };

  const patch: Partial<ScreenerRow> = {};
  if (typeof quote.price === 'number') patch.closePrice = quote.price;
  if (typeof quote.changePercent === 'number') patch.return1d = quote.changePercent;
  if (typeof quote.volume === 'number') patch.dailyVolume = quote.volume;
  if (quote.currency === 'USD' || quote.currency === 'INR') patch.currency = quote.currency;
  return Object.keys(patch).length ? patch : null;
}

async function fetchAdvancedSnapshot(row: ScreenerRow): Promise<Partial<ScreenerRow> | null> {
  const market = row.market === 'india' ? 'india' : row.market === 'us' ? 'us' : row.stockUniverse === 'Indian Stocks' ? 'india' : 'us';
  const patch: Partial<ScreenerRow> = {};

  try {
    const historyResponse = await fetch(
      `/api/market/history?symbol=${encodeURIComponent(row.symbol)}&market=${encodeURIComponent(market)}&range=1m`,
      { cache: 'no-store' },
    );
    if (historyResponse.ok) {
      const history = (await historyResponse.json()) as { points?: Array<{ close?: number }> };
      const points = Array.isArray(history.points) ? history.points.filter((point): point is { close: number } => typeof point.close === 'number') : [];
      if (points.length >= 2) {
        const first = points[0].close;
        const last = points[points.length - 1].close;
        const return1m = computeReturnPercent(last, first);
        if (typeof return1m === 'number') patch.return1m = return1m;
      }
    }
  } catch {
    // History is best-effort for screener hydration.
  }

  if (market === 'us') {
    try {
      const fundamentalsResponse = await fetch(`/api/fundamentals/us?ticker=${encodeURIComponent(row.symbol)}`, {
        cache: 'no-store',
      });
      if (fundamentalsResponse.ok) {
        const fundamentals = (await fundamentalsResponse.json()) as {
          keyMetrics?: Array<{ key?: string; value?: number }>;
          marketCap?: number;
        };
        const metricMap = new Map<string, number>();
        for (const metric of fundamentals.keyMetrics ?? []) {
          if (typeof metric?.key === 'string' && typeof metric?.value === 'number') {
            metricMap.set(metric.key, metric.value);
          }
        }

        const roe = metricMap.get('roe');
        if (typeof roe === 'number') patch.roe = roe;

        const marketCap = fundamentals.marketCap ?? metricMap.get('marketCap');
        if (typeof marketCap === 'number') patch.marketCap = marketCap;

        const effectivePrice =
          typeof patch.closePrice === 'number'
            ? patch.closePrice
            : typeof row.closePrice === 'number'
              ? row.closePrice
              : undefined;

        const eps = metricMap.get('eps');
        if (typeof eps === 'number' && eps > 0 && typeof effectivePrice === 'number') {
          patch.pe = effectivePrice / eps;
        }

        const sharesOutstanding = metricMap.get('sharesOutstanding');
        if (typeof sharesOutstanding === 'number' && typeof effectivePrice === 'number' && typeof patch.marketCap !== 'number') {
          patch.marketCap = sharesOutstanding * effectivePrice;
        }
      }
    } catch {
      // Fundamentals are best-effort for screener hydration.
    }
  }

  return Object.keys(patch).length ? patch : null;
}

function parseNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeForSearch(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function buildAiFilters(parsedFilters: Array<{ field: string; op: string; value: string | number }>) {
  const numericMap = new Map<string, { filterId: string; kind: 'numeric'; min: string; max: string }>();
  const enumMap = new Map<string, { filterId: string; kind: 'enum'; selected: string[] }>();
  let ignored = 0;

  const definitionByField = new Map<string, FilterDefinition>();
  for (const definition of FILTER_DEFINITIONS) {
    const field = definition.field as string;
    if (!definitionByField.has(field)) definitionByField.set(field, definition);
  }

  for (const parsed of parsedFilters) {
    const definition = definitionByField.get(parsed.field);
    if (!definition) {
      ignored += 1;
      continue;
    }

    if (definition.kind === 'numeric') {
      const numericValue = typeof parsed.value === 'number' ? parsed.value : Number(parsed.value);
      if (!Number.isFinite(numericValue)) {
        ignored += 1;
        continue;
      }
      const existing = numericMap.get(definition.id) ?? {
        filterId: definition.id,
        kind: 'numeric' as const,
        min: '',
        max: '',
      };

      const applyMin = (candidate: number) => {
        const current = parseNumber(existing.min);
        if (current === undefined || candidate > current) existing.min = String(candidate);
      };
      const applyMax = (candidate: number) => {
        const current = parseNumber(existing.max);
        if (current === undefined || candidate < current) existing.max = String(candidate);
      };

      switch (parsed.op) {
        case '>':
        case '>=':
          applyMin(numericValue);
          break;
        case '<':
        case '<=':
          applyMax(numericValue);
          break;
        case '=':
          existing.min = String(numericValue);
          existing.max = String(numericValue);
          break;
        default:
          ignored += 1;
          continue;
      }
      numericMap.set(definition.id, existing);
      continue;
    }

    const enumValue = String(parsed.value);
    if (!enumValue.trim()) {
      ignored += 1;
      continue;
    }
    const existing = enumMap.get(definition.id) ?? {
      filterId: definition.id,
      kind: 'enum' as const,
      selected: [],
    };
    if (!existing.selected.some((value) => normalizeForSearch(value) === normalizeForSearch(enumValue))) {
      existing.selected.push(enumValue);
    }
    enumMap.set(definition.id, existing);
  }

  return {
    activeFilters: [...numericMap.values(), ...enumMap.values()] as ActiveFilter[],
    ignored,
  };
}

function applyAdvancedFilters(rows: ScreenerRow[], activeFilters: ActiveFilter[]) {
  return rows.filter((row) =>
    activeFilters.every((active) => {
      const definition = FILTER_DEFINITION_BY_ID[active.filterId];
      if (!definition) return true;

      if (active.kind === 'numeric' && definition.kind === 'numeric') {
        const value = row[definition.field as keyof ScreenerRow];
        if (typeof value !== 'number' || Number.isNaN(value)) return false;
        const min = parseNumber(active.min);
        const max = parseNumber(active.max);
        if (typeof min === 'number' && value < min) return false;
        if (typeof max === 'number' && value > max) return false;
        return true;
      }

      if (active.kind === 'enum' && definition.kind === 'enum') {
        if (!active.selected.length) return true;
        const value = row[definition.field as keyof ScreenerRow];
        if (typeof value !== 'string') return false;
        return active.selected.some((selected) => normalizeForSearch(selected) === normalizeForSearch(value));
      }

      return true;
    }),
  );
}

function runBuiltInStrategy(name: string, rows: ScreenerRow[]) {
  switch (name) {
    case 'Quality Compounders':
      return rows.filter((row) => (row.roe ?? -999) > 15 && (row.salesGrowth ?? -999) > 10 && (row.debtToEquity ?? 999) < 1.2);
    case 'Value + Yield':
      return rows.filter((row) => (row.pe ?? 999) < 20 && (row.pb ?? 999) < 4 && (row.dividendYield ?? 0) >= 0.8);
    case 'Growth Leaders':
      return rows.filter((row) => (row.salesGrowth ?? 0) > 12 && (row.profitGrowth ?? 0) > 12 && (row.yoyQuarterlyProfitGrowth ?? 0) > 10);
    case 'Low Leverage':
      return rows.filter((row) => (row.debtToEquity ?? 999) < 0.8 && (row.currentRatio ?? 0) >= 1.2 && (row.interestCoverage ?? 0) > 3);
    case 'Momentum':
      return rows.filter((row) => (row.return1m ?? -999) > 3 && (row.return6m ?? -999) > 10);
    case 'Largecap Stability':
      return rows.filter((row) => row.marketCapBucket === 'Largecap' && (row.return1d ?? 0) > -3 && (row.debtToEquity ?? 999) < 2);
    default:
      return rows;
  }
}

function sortRows(rows: ScreenerRow[], field: SortField, direction: 'asc' | 'desc') {
  const multiplier = direction === 'asc' ? 1 : -1;
  return [...rows].sort((left, right) => {
    const a = left[field];
    const b = right[field];
    const aMissing = a === undefined || a === null;
    const bMissing = b === undefined || b === null;

    if (aMissing && bMissing) return left.name.localeCompare(right.name);
    if (aMissing) return 1;
    if (bMissing) return -1;

    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b) * multiplier;
    }

    if (typeof a === 'number' && typeof b === 'number') {
      return (a - b) * multiplier;
    }

    return left.name.localeCompare(right.name);
  });
}

function sortIndicator(isActive: boolean, direction: 'asc' | 'desc') {
  if (!isActive) return '↕';
  return direction === 'asc' ? '↑' : '↓';
}

const TABLE_GRID_CLASS =
  'grid grid-cols-[minmax(220px,2fr)_minmax(120px,0.95fr)_minmax(100px,0.8fr)_minmax(90px,0.75fr)_minmax(105px,0.85fr)_minmax(95px,0.8fr)_minmax(90px,0.75fr)_minmax(110px,0.9fr)_minmax(95px,0.8fr)_minmax(95px,0.8fr)_minmax(110px,0.9fr)_minmax(110px,0.9fr)] gap-3';

function metricFilterHelp(filterId: string): string {
  const definition = FILTER_DEFINITION_BY_ID[filterId];
  return definition?.description ?? '';
}

function MetricLabel({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
      <span>{label}</span>
      <span className="group relative inline-flex cursor-help">
        <span
          aria-label={tooltip}
          className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold leading-none text-slate-500 dark:border-slate-600 dark:text-slate-300"
        >
          i
        </span>
        <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 w-56 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-[11px] font-normal text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 dark:bg-slate-100 dark:text-slate-900">
          {tooltip}
        </span>
      </span>
    </span>
  );
}

export function ScreenerWorkbench() {
  const [baseRows, setBaseRows] = useState<ScreenerRow[]>(demoRows);
  const [universeLoading, setUniverseLoading] = useState(true);
  const [universeError, setUniverseError] = useState('');
  const [liveMetricsBySymbol, setLiveMetricsBySymbol] = useState<Record<string, Partial<ScreenerRow>>>({});
  const liveMetricsRef = useRef<Record<string, Partial<ScreenerRow>>>({});
  const quoteQueueRef = useRef<string[]>([]);
  const quoteQueuedSetRef = useRef(new Set<string>());
  const quoteInFlightRef = useRef(new Set<string>());
  const quoteHydratedSymbolsRef = useRef(new Set<string>());
  const advancedQueueRef = useRef<string[]>([]);
  const advancedQueuedSetRef = useRef(new Set<string>());
  const advancedInFlightRef = useRef(new Set<string>());
  const advancedHydratedSymbolsRef = useRef(new Set<string>());
  const advancedCandidateSymbolsRef = useRef(new Set<string>());
  const rowLookupRef = useRef<Map<string, ScreenerRow>>(new Map());
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: 'asc' | 'desc' }>({
    field: 'marketCap',
    direction: 'desc',
  });

  useEffect(() => {
    let cancelled = false;

    async function loadUniverse() {
      setUniverseLoading(true);
      setUniverseError('');
      try {
        const [indiaStocks, usStocks] = await Promise.all([fetchAllMarketStocks('india'), fetchAllMarketStocks('us')]);
        if (cancelled) return;
        setBaseRows(mergeUniverseRows([...indiaStocks, ...usStocks]));
      } catch {
        if (cancelled) return;
        setBaseRows(demoRows);
        setUniverseError('Could not load full universe right now. Showing demo coverage.');
      } finally {
        if (!cancelled) setUniverseLoading(false);
      }
    }

    loadUniverse();
    return () => {
      cancelled = true;
    };
  }, []);

  const hydratedBaseRows = useMemo(
    () =>
      baseRows.map((row) => {
        const livePatch = liveMetricsBySymbol[row.symbol];
        return livePatch ? { ...row, ...livePatch } : row;
      }),
    [baseRows, liveMetricsBySymbol],
  );

  const enumOptionsByField = useMemo(() => {
    const unique = <T,>(values: T[]) => Array.from(new Set(values));
    return {
      stockUniverse: unique(hydratedBaseRows.map((row) => row.stockUniverse)),
    } as Record<string, string[]>;
  }, [hydratedBaseRows]);

  const activeById = useMemo(() => new Map(activeFilters.map((active) => [active.filterId, active])), [activeFilters]);
  const numericFilterErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    for (const active of activeFilters) {
      if (active.kind !== 'numeric') continue;
      const definition = FILTER_DEFINITION_BY_ID[active.filterId];
      if (!definition || definition.kind !== 'numeric') continue;
      const minRaw = active.min.trim();
      const maxRaw = active.max.trim();
      const minValue = minRaw ? Number(minRaw) : undefined;
      const maxValue = maxRaw ? Number(maxRaw) : undefined;

      if (minRaw && !Number.isFinite(minValue)) {
        errors[active.filterId] = `${definition.label}: enter a valid minimum number.`;
        continue;
      }
      if (maxRaw && !Number.isFinite(maxValue)) {
        errors[active.filterId] = `${definition.label}: enter a valid maximum number.`;
        continue;
      }
      if (typeof minValue === 'number' && typeof maxValue === 'number' && minValue > maxValue) {
        errors[active.filterId] = `${definition.label}: minimum cannot be greater than maximum.`;
      }
    }
    return errors;
  }, [activeFilters]);
  const filteredRows = useMemo(() => applyAdvancedFilters(hydratedBaseRows, activeFilters), [hydratedBaseRows, activeFilters]);

  const rows = useMemo(() => sortRows(filteredRows, sortConfig.field, sortConfig.direction), [filteredRows, sortConfig]);

  const shouldRunAdvancedHydration = useMemo(() => {
    if (
      sortConfig.field === 'marketCap' ||
      sortConfig.field === 'pe' ||
      sortConfig.field === 'roe' ||
      sortConfig.field === 'debtToEquity' ||
      sortConfig.field === 'return1m'
    ) {
      return true;
    }
    return activeFilters.some((active) => active.kind === 'numeric' && !LIGHT_NUMERIC_FILTER_IDS.has(active.filterId));
  }, [activeFilters, sortConfig.field]);

  useEffect(() => {
    rowLookupRef.current = new Map(rows.map((row) => [row.symbol, row]));
  }, [rows]);

  useEffect(() => {
    liveMetricsRef.current = liveMetricsBySymbol;
  }, [liveMetricsBySymbol]);

  const pumpAdvancedQueue = useCallback(() => {
    while (advancedInFlightRef.current.size < ADVANCED_HYDRATION_MAX_CONCURRENT && advancedQueueRef.current.length) {
      const symbol = advancedQueueRef.current.shift();
      if (!symbol) break;
      advancedQueuedSetRef.current.delete(symbol);
      if (!shouldRunAdvancedHydration) continue;
      if (!advancedCandidateSymbolsRef.current.has(symbol)) continue;
      if (advancedHydratedSymbolsRef.current.has(symbol) || advancedInFlightRef.current.has(symbol)) continue;
      if (!quoteHydratedSymbolsRef.current.has(symbol)) continue;
      const row = rowLookupRef.current.get(symbol);
      if (!row) continue;
      const rowWithLiveValues = { ...row, ...(liveMetricsRef.current[symbol] ?? {}) };

      advancedInFlightRef.current.add(symbol);
      void fetchAdvancedSnapshot(rowWithLiveValues)
        .then((patch) => {
          if (!patch) return;
          setLiveMetricsBySymbol((previous) => ({
            ...previous,
            [symbol]: { ...(previous[symbol] ?? {}), ...patch },
          }));
        })
        .catch(() => {
          // Skip symbols that fail advanced fetch to keep the queue moving.
        })
        .finally(() => {
          advancedInFlightRef.current.delete(symbol);
          advancedHydratedSymbolsRef.current.add(symbol);
          pumpAdvancedQueue();
        });
    }
  }, [shouldRunAdvancedHydration]);

  const pumpQuoteQueue = useCallback(() => {
    while (quoteInFlightRef.current.size < QUOTE_HYDRATION_MAX_CONCURRENT && quoteQueueRef.current.length) {
      const symbol = quoteQueueRef.current.shift();
      if (!symbol) break;
      quoteQueuedSetRef.current.delete(symbol);
      if (quoteHydratedSymbolsRef.current.has(symbol) || quoteInFlightRef.current.has(symbol)) continue;
      const row = rowLookupRef.current.get(symbol);
      if (!row) continue;

      quoteInFlightRef.current.add(symbol);
      void fetchQuoteSnapshot(row)
        .then((patch) => {
          if (!patch) return;
          setLiveMetricsBySymbol((previous) => ({
            ...previous,
            [symbol]: { ...(previous[symbol] ?? {}), ...patch },
          }));
        })
        .catch(() => {
          // Skip symbols that fail quote fetch to keep the queue moving.
        })
        .finally(() => {
          quoteInFlightRef.current.delete(symbol);
          quoteHydratedSymbolsRef.current.add(symbol);

          if (
            shouldRunAdvancedHydration &&
            advancedCandidateSymbolsRef.current.has(symbol) &&
            !advancedHydratedSymbolsRef.current.has(symbol) &&
            !advancedInFlightRef.current.has(symbol) &&
            !advancedQueuedSetRef.current.has(symbol)
          ) {
            advancedQueueRef.current.push(symbol);
            advancedQueuedSetRef.current.add(symbol);
          }

          pumpQuoteQueue();
          pumpAdvancedQueue();
        });
    }
  }, [pumpAdvancedQueue, shouldRunAdvancedHydration]);

  const handleVisibleRowsChange = useCallback(
    (visibleRows: ScreenerRow[]) => {
      for (const row of visibleRows.slice(0, QUOTE_HYDRATION_BATCH_LIMIT)) {
        const symbol = row.symbol;
        if (quoteHydratedSymbolsRef.current.has(symbol)) continue;
        if (quoteInFlightRef.current.has(symbol)) continue;
        if (quoteQueuedSetRef.current.has(symbol)) continue;
        quoteQueueRef.current.push(symbol);
        quoteQueuedSetRef.current.add(symbol);
      }

      if (shouldRunAdvancedHydration) {
        const advancedSlice = visibleRows.slice(0, ADVANCED_HYDRATION_BATCH_LIMIT);
        advancedCandidateSymbolsRef.current = new Set(advancedSlice.map((row) => row.symbol));
        for (const row of advancedSlice) {
          const symbol = row.symbol;
          if (advancedHydratedSymbolsRef.current.has(symbol)) continue;
          if (advancedInFlightRef.current.has(symbol)) continue;
          if (advancedQueuedSetRef.current.has(symbol)) continue;
          if (!quoteHydratedSymbolsRef.current.has(symbol)) continue;
          advancedQueueRef.current.push(symbol);
          advancedQueuedSetRef.current.add(symbol);
        }
      } else {
        advancedCandidateSymbolsRef.current = new Set();
      }

      pumpQuoteQueue();
      pumpAdvancedQueue();
    },
    [pumpAdvancedQueue, pumpQuoteQueue, shouldRunAdvancedHydration],
  );

  useEffect(() => {
    handleVisibleRowsChange(rows.slice(0, QUOTE_HYDRATION_BATCH_LIMIT));
  }, [rows, handleVisibleRowsChange]);

  function onSort(field: SortField) {
    setSortConfig((current) =>
      current.field === field
        ? {
            field,
            direction: current.direction === 'asc' ? 'desc' : 'asc',
          }
        : {
            field,
            direction: field === 'name' ? 'asc' : 'desc',
        },
    );
  }

  function updateNumericFilter(filterId: string, patch: Partial<{ min: string; max: string }>) {
    setActiveFilters((previous) => {
      const existingIndex = previous.findIndex((active) => active.filterId === filterId && active.kind === 'numeric');
      if (existingIndex >= 0) {
        const next = [...previous];
        const existing = next[existingIndex];
        if (existing.kind !== 'numeric') return previous;
        next[existingIndex] = { ...existing, ...patch };
        return next;
      }
      return [
        ...previous.filter((active) => active.filterId !== filterId),
        {
          filterId,
          kind: 'numeric',
          min: patch.min ?? '',
          max: patch.max ?? '',
        },
      ];
    });
  }

  function setEnumFilterValue(filterId: string, value: string) {
    setActiveFilters((previous) => {
      const rest = previous.filter((active) => active.filterId !== filterId);
      if (!value) return rest;
      return [...rest, { filterId, kind: 'enum', selected: [value] }];
    });
  }

  function clearAllFilters() {
    setActiveFilters([]);
  }

  function setNumericBounds(filterId: string, nextMin: string, nextMax: string) {
    if (!nextMin.trim() && !nextMax.trim()) {
      setActiveFilters((previous) => previous.filter((active) => active.filterId !== filterId));
      return;
    }
    updateNumericFilter(filterId, { min: nextMin, max: nextMax });
  }

  const stockUniverseEntry = activeById.get('stock-universe');
  const stockUniverseValue = stockUniverseEntry?.kind === 'enum' ? stockUniverseEntry.selected[0] ?? '' : '';

  const peEntry = activeById.get('pe');
  const peMin = peEntry?.kind === 'numeric' ? peEntry.min : '';
  const peMax = peEntry?.kind === 'numeric' ? peEntry.max : '';
  const pbEntry = activeById.get('pb');
  const pbMin = pbEntry?.kind === 'numeric' ? pbEntry.min : '';
  const pbMax = pbEntry?.kind === 'numeric' ? pbEntry.max : '';
  const evEbitdaEntry = activeById.get('ev-ebitda');
  const evEbitdaMin = evEbitdaEntry?.kind === 'numeric' ? evEbitdaEntry.min : '';
  const evEbitdaMax = evEbitdaEntry?.kind === 'numeric' ? evEbitdaEntry.max : '';
  const priceToSalesEntry = activeById.get('price-to-sales');
  const priceToSalesMin = priceToSalesEntry?.kind === 'numeric' ? priceToSalesEntry.min : '';
  const priceToSalesMax = priceToSalesEntry?.kind === 'numeric' ? priceToSalesEntry.max : '';
  const pegRatioEntry = activeById.get('peg-ratio');
  const pegRatioMin = pegRatioEntry?.kind === 'numeric' ? pegRatioEntry.min : '';
  const pegRatioMax = pegRatioEntry?.kind === 'numeric' ? pegRatioEntry.max : '';
  const dividendYieldEntry = activeById.get('dividend-yield');
  const dividendYieldMin = dividendYieldEntry?.kind === 'numeric' ? dividendYieldEntry.min : '';
  const dividendYieldMax = dividendYieldEntry?.kind === 'numeric' ? dividendYieldEntry.max : '';
  const roeEntry = activeById.get('roe');
  const roeMin = roeEntry?.kind === 'numeric' ? roeEntry.min : '';
  const roeMax = roeEntry?.kind === 'numeric' ? roeEntry.max : '';
  const roceEntry = activeById.get('roce');
  const roceMin = roceEntry?.kind === 'numeric' ? roceEntry.min : '';
  const roceMax = roceEntry?.kind === 'numeric' ? roceEntry.max : '';
  const debtToEquityEntry = activeById.get('debt-to-equity');
  const debtToEquityMin = debtToEquityEntry?.kind === 'numeric' ? debtToEquityEntry.min : '';
  const debtToEquityMax = debtToEquityEntry?.kind === 'numeric' ? debtToEquityEntry.max : '';
  const return1mEntry = activeById.get('return-1m');
  const return1mMin = return1mEntry?.kind === 'numeric' ? return1mEntry.min : '';
  const return1mMax = return1mEntry?.kind === 'numeric' ? return1mEntry.max : '';
  const numericInputClass = (filterId: string) =>
    cn(
      'w-full rounded-md border bg-white px-2.5 py-2 text-sm dark:border-border dark:bg-card',
      numericFilterErrors[filterId] ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300',
    );

  const showingFrom = rows.length ? 1 : 0;
  const showingTo = rows.length;
  const refreshedAt = useMemo(
    () =>
      new Intl.DateTimeFormat('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date()),
    [],
  );

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm dark:border-border dark:bg-card/40">
        <div className="border-b border-slate-200 px-3 py-4 sm:px-5 dark:border-border">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white sm:text-[28px]">Stock Screener</h2>
            </div>
            <button
              onClick={clearAllFilters}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-border dark:bg-card dark:text-slate-200 dark:hover:bg-muted"
            >
              Reset filters
            </button>
          </div>
        </div>

        <div className="border-b border-slate-200 px-3 py-3 sm:px-5 dark:border-border">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            <label className="space-y-1">
              <span className="block text-xs font-medium text-slate-600 dark:text-slate-300">Stocks</span>
              <select
                value={stockUniverseValue}
                onChange={(event) => setEnumFilterValue('stock-universe', event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm dark:border-border dark:bg-card"
              >
                <option value="">All</option>
                {(enumOptionsByField.stockUniverse ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <MetricLabel label="P/E Ratio (Max)" tooltip={metricFilterHelp('pe')} />
              <input
                value={peMax}
                onChange={(event) => setNumericBounds('pe', peMin, event.target.value)}
                inputMode="decimal"
                placeholder="e.g. 20"
                className={numericInputClass('pe')}
              />
            </label>

            <label className="space-y-1">
              <MetricLabel label="P/B Ratio (Max)" tooltip={metricFilterHelp('pb')} />
              <input
                value={pbMax}
                onChange={(event) => setNumericBounds('pb', pbMin, event.target.value)}
                inputMode="decimal"
                placeholder="e.g. 4"
                className={numericInputClass('pb')}
              />
            </label>

            <label className="space-y-1">
              <MetricLabel label="EV/EBITDA (Max)" tooltip={metricFilterHelp('ev-ebitda')} />
              <input
                value={evEbitdaMax}
                onChange={(event) => setNumericBounds('ev-ebitda', evEbitdaMin, event.target.value)}
                inputMode="decimal"
                placeholder="e.g. 15"
                className={numericInputClass('ev-ebitda')}
              />
            </label>

            <label className="space-y-1">
              <MetricLabel label="Price/Sales (Max)" tooltip={metricFilterHelp('price-to-sales')} />
              <input
                value={priceToSalesMax}
                onChange={(event) => setNumericBounds('price-to-sales', priceToSalesMin, event.target.value)}
                inputMode="decimal"
                placeholder="e.g. 5"
                className={numericInputClass('price-to-sales')}
              />
            </label>

            <label className="space-y-1">
              <MetricLabel label="PEG Ratio (Max)" tooltip={metricFilterHelp('peg-ratio')} />
              <input
                value={pegRatioMax}
                onChange={(event) => setNumericBounds('peg-ratio', pegRatioMin, event.target.value)}
                inputMode="decimal"
                placeholder="e.g. 1.5"
                className={numericInputClass('peg-ratio')}
              />
            </label>

            <label className="space-y-1">
              <MetricLabel label="Dividend Yield Min (%)" tooltip={metricFilterHelp('dividend-yield')} />
              <input
                value={dividendYieldMin}
                onChange={(event) => setNumericBounds('dividend-yield', event.target.value, dividendYieldMax)}
                inputMode="decimal"
                placeholder="e.g. 1"
                className={numericInputClass('dividend-yield')}
              />
            </label>

            <label className="space-y-1">
              <MetricLabel label="ROE Min (%)" tooltip={metricFilterHelp('roe')} />
              <input
                value={roeMin}
                onChange={(event) => setNumericBounds('roe', event.target.value, roeMax)}
                inputMode="decimal"
                placeholder="e.g. 15"
                className={numericInputClass('roe')}
              />
            </label>

            <label className="space-y-1">
              <MetricLabel label="Debt/Equity Max" tooltip={metricFilterHelp('debt-to-equity')} />
              <input
                value={debtToEquityMax}
                onChange={(event) => setNumericBounds('debt-to-equity', debtToEquityMin, event.target.value)}
                inputMode="decimal"
                placeholder="e.g. 1"
                className={numericInputClass('debt-to-equity')}
              />
            </label>

            <label className="space-y-1">
              <MetricLabel label="1M Return Min (%)" tooltip={metricFilterHelp('return-1m')} />
              <input
                value={return1mMin}
                onChange={(event) => setNumericBounds('return-1m', event.target.value, return1mMax)}
                inputMode="decimal"
                placeholder="e.g. 3"
                className={numericInputClass('return-1m')}
              />
            </label>

            <label className="space-y-1">
              <MetricLabel label="ROCE Min (%)" tooltip={metricFilterHelp('roce')} />
              <input
                value={roceMin}
                onChange={(event) => setNumericBounds('roce', event.target.value, roceMax)}
                inputMode="decimal"
                placeholder="e.g. 15"
                className={numericInputClass('roce')}
              />
            </label>
          </div>
          {Object.values(numericFilterErrors).length ? (
            <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
              {Object.entries(numericFilterErrors).map(([filterId, message]) => (
                <p key={filterId}>{message}</p>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-3 text-sm sm:px-5 dark:border-border">
          <div className="font-medium text-slate-700 dark:text-slate-200">
            Showing {showingFrom} - {showingTo} of {rows.length} results
          </div>
          <div className="text-slate-500 dark:text-slate-400">Updated {refreshedAt} IST</div>
        </div>
        {universeLoading || universeError ? (
          <div className="border-b border-slate-200 px-3 py-2 text-xs text-slate-500 sm:px-5 dark:border-border dark:text-slate-400">
            {universeLoading ? 'Loading full India + US stock universe...' : universeError}
          </div>
        ) : null}

        <div className="space-y-2 p-3 lg:hidden">
          {rows.slice(0, 120).map((row) => (
            <div key={row.id} className="rounded-xl border border-slate-200 bg-white/90 p-3 dark:border-border dark:bg-card/55">
              <Link
                href={`/dashboard/${row.market}/${encodeURIComponent(row.symbol)}`}
                className="text-sm font-semibold text-slate-900 hover:text-blue-700 dark:text-slate-100 dark:hover:text-blue-300"
              >
                {row.name}
              </Link>
              <div className="mt-1 text-xs text-slate-500">
                {row.symbol} • {row.exchange} • {row.stockUniverse}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-2 py-1 dark:border-border dark:bg-muted/30">
                  <div className="text-slate-500">P/E</div>
                  <div className="font-semibold">{typeof row.pe === 'number' ? formatNumber(row.pe, 2) : '—'}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-2 py-1 dark:border-border dark:bg-muted/30">
                  <div className="text-slate-500">ROE</div>
                  <div className="font-semibold">{typeof row.roe === 'number' ? formatPercent(row.roe) : '—'}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-2 py-1 dark:border-border dark:bg-muted/30">
                  <div className="text-slate-500">Debt/Equity</div>
                  <div className="font-semibold">{typeof row.debtToEquity === 'number' ? formatNumber(row.debtToEquity, 2) : '—'}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-2 py-1 dark:border-border dark:bg-muted/30">
                  <div className="text-slate-500">1M Return</div>
                  <div className="font-semibold">{typeof row.return1m === 'number' ? formatPercent(row.return1m) : '—'}</div>
                </div>
              </div>
            </div>
          ))}
          {rows.length > 120 ? (
            <p className="px-1 text-xs text-slate-500 dark:text-slate-400">
              Showing first 120 matches on mobile. Use tablet/desktop view for the full sortable table.
            </p>
          ) : null}
          {!rows.length ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-border dark:text-slate-400">
              No stocks matched the current filters.
            </div>
          ) : null}
        </div>

        <div className="hidden lg:block">
          <VirtualizedTable
            rows={rows}
            height={700}
            estimateRowHeight={72}
            onVisibleRowsChange={handleVisibleRowsChange}
            headerClassName="bg-slate-100 px-4 py-3 text-[14px] text-slate-700 dark:bg-muted/70 dark:text-slate-200"
            className="rounded-none border-0"
            header={
              <div className={TABLE_GRID_CLASS}>
                <button onClick={() => onSort('name')} className="flex items-center gap-1 text-left font-semibold">
                  Name <span className="text-[10px] text-slate-500">{sortIndicator(sortConfig.field === 'name', sortConfig.direction)}</span>
                </button>
                <button onClick={() => onSort('stockUniverse')} className="flex items-center gap-1 text-left font-semibold">
                  Stocks <span className="text-[10px] text-slate-500">{sortIndicator(sortConfig.field === 'stockUniverse', sortConfig.direction)}</span>
                </button>
                <button onClick={() => onSort('pe')} className="flex items-center justify-end gap-1 font-semibold">
                  P/E <span className="text-[10px] text-slate-500">{sortIndicator(sortConfig.field === 'pe', sortConfig.direction)}</span>
                </button>
                <button onClick={() => onSort('pb')} className="flex items-center justify-end gap-1 font-semibold">
                  P/B <span className="text-[10px] text-slate-500">{sortIndicator(sortConfig.field === 'pb', sortConfig.direction)}</span>
                </button>
                <button onClick={() => onSort('evEbitda')} className="flex items-center justify-end gap-1 font-semibold">
                  EV/EBITDA <span className="text-[10px] text-slate-500">{sortIndicator(sortConfig.field === 'evEbitda', sortConfig.direction)}</span>
                </button>
                <button onClick={() => onSort('priceToSales')} className="flex items-center justify-end gap-1 font-semibold">
                  P/S <span className="text-[10px] text-slate-500">{sortIndicator(sortConfig.field === 'priceToSales', sortConfig.direction)}</span>
                </button>
                <button onClick={() => onSort('pegRatio')} className="flex items-center justify-end gap-1 font-semibold">
                  PEG <span className="text-[10px] text-slate-500">{sortIndicator(sortConfig.field === 'pegRatio', sortConfig.direction)}</span>
                </button>
                <button onClick={() => onSort('dividendYield')} className="flex items-center justify-end gap-1 font-semibold">
                  Div Yield <span className="text-[10px] text-slate-500">{sortIndicator(sortConfig.field === 'dividendYield', sortConfig.direction)}</span>
                </button>
                <button onClick={() => onSort('roe')} className="flex items-center justify-end gap-1 font-semibold">
                  ROE <span className="text-[10px] text-slate-500">{sortIndicator(sortConfig.field === 'roe', sortConfig.direction)}</span>
                </button>
                <button onClick={() => onSort('roce')} className="flex items-center justify-end gap-1 font-semibold">
                  ROCE <span className="text-[10px] text-slate-500">{sortIndicator(sortConfig.field === 'roce', sortConfig.direction)}</span>
                </button>
                <button onClick={() => onSort('debtToEquity')} className="flex items-center justify-end gap-1 font-semibold">
                  Debt/Equity <span className="text-[10px] text-slate-500">{sortIndicator(sortConfig.field === 'debtToEquity', sortConfig.direction)}</span>
                </button>
                <button onClick={() => onSort('return1m')} className="flex items-center justify-end gap-1 font-semibold">
                  1M Return <span className="text-[10px] text-slate-500">{sortIndicator(sortConfig.field === 'return1m', sortConfig.direction)}</span>
                </button>
              </div>
            }
            renderRow={(row) => (
              <div className="border-t border-slate-200 px-4 py-3 text-sm first:border-t-0 hover:bg-slate-50 dark:border-border dark:hover:bg-muted/40">
                <div className={cn(TABLE_GRID_CLASS, 'items-center')}>
                  <div>
                    <Link href={`/dashboard/${row.market}/${encodeURIComponent(row.symbol)}`} className="text-[15px] font-semibold text-slate-800 hover:text-blue-700 dark:text-slate-100 dark:hover:text-blue-300">
                      {row.name}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      <span>{row.symbol}</span>
                      <span>•</span>
                      <span>{row.exchange}</span>
                    </div>
                  </div>
                  <div className="text-[13px] text-slate-500 dark:text-slate-400">{row.stockUniverse}</div>
                  <div className="text-right tabular-nums">{typeof row.pe === 'number' ? formatNumber(row.pe, 2) : '—'}</div>
                  <div className="text-right tabular-nums">{typeof row.pb === 'number' ? formatNumber(row.pb, 2) : '—'}</div>
                  <div className="text-right tabular-nums">{typeof row.evEbitda === 'number' ? formatNumber(row.evEbitda, 2) : '—'}</div>
                  <div className="text-right tabular-nums">{typeof row.priceToSales === 'number' ? formatNumber(row.priceToSales, 2) : '—'}</div>
                  <div className="text-right tabular-nums">{typeof row.pegRatio === 'number' ? formatNumber(row.pegRatio, 2) : '—'}</div>
                  <div className="text-right tabular-nums">{typeof row.dividendYield === 'number' ? formatPercent(row.dividendYield) : '—'}</div>
                  <div className="text-right tabular-nums">{typeof row.roe === 'number' ? formatPercent(row.roe) : '—'}</div>
                  <div className="text-right tabular-nums">{typeof row.roce === 'number' ? formatPercent(row.roce) : '—'}</div>
                  <div className="text-right tabular-nums">{typeof row.debtToEquity === 'number' ? formatNumber(row.debtToEquity, 2) : '—'}</div>
                  <div className="text-right tabular-nums">{typeof row.return1m === 'number' ? formatPercent(row.return1m) : '—'}</div>
                </div>
              </div>
            )}
          />
        </div>
      </section>
    </div>
  );
}
