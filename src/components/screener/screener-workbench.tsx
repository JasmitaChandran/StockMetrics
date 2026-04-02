'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Download, Filter, Info, PenLine, Save, Search, Share2, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { VirtualizedTable } from '@/components/common/virtualized-table';
import { demoFundamentalsBySymbol, demoUniverse, generateDemoHistory } from '@/lib/data/mock/demo-data';
import { heuristicAiProvider } from '@/lib/ai';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/format';
import { listCustomScreens, upsertCustomScreen } from '@/lib/storage/repositories';
import { cn } from '@/lib/utils/cn';

type FilterCategory =
  | 'Stock Universe'
  | 'Price & Volume'
  | 'Technical Indicators'
  | 'Valuation'
  | 'Profitability'
  | 'Financial Ratios'
  | 'Balance Sheet & Cash Flow'
  | 'Growth'
  | 'Ownership'
  | 'Income Statement';

interface ScreenerRow {
  id: string;
  symbol: string;
  name: string;
  market: string;
  exchange: string;
  sector: string;
  industry: string;
  stockUniverse: 'India Stocks' | 'US Stocks';
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

type SortField = 'name' | 'marketCap' | 'closePrice' | 'pe' | 'roe' | 'return1m' | 'return1d' | 'dailyVolume';

const FILTER_CATEGORIES: FilterCategory[] = [
  'Stock Universe',
  'Price & Volume',
  'Technical Indicators',
  'Valuation',
  'Profitability',
  'Financial Ratios',
  'Balance Sheet & Cash Flow',
  'Growth',
  'Ownership',
  'Income Statement',
];

const FILTER_DEFINITIONS: FilterDefinition[] = [
  {
    id: 'stock-universe',
    kind: 'enum',
    field: 'stockUniverse',
    label: 'Stock Universe',
    category: 'Stock Universe',
    description: 'Choose India or US stock universe.',
  },
  {
    id: 'market',
    kind: 'enum',
    field: 'market',
    label: 'Market',
    category: 'Stock Universe',
    description: 'Filter by market code.',
  },
  {
    id: 'exchange',
    kind: 'enum',
    field: 'exchange',
    label: 'Exchange',
    category: 'Stock Universe',
    description: 'Filter by exchange (NSE, NASDAQ, etc).',
  },
  {
    id: 'currency',
    kind: 'enum',
    field: 'currency',
    label: 'Currency',
    category: 'Stock Universe',
    description: 'Filter by quote currency (INR / USD).',
  },
  {
    id: 'sector',
    kind: 'enum',
    field: 'sector',
    label: 'Sector',
    category: 'Stock Universe',
    description: 'Filter by sector.',
  },
  {
    id: 'industry',
    kind: 'enum',
    field: 'industry',
    label: 'Industry',
    category: 'Stock Universe',
    description: 'Filter by industry/sub-sector.',
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
    id: 'close-price',
    kind: 'numeric',
    field: 'closePrice',
    label: 'Close Price',
    category: 'Price & Volume',
    description: 'Latest close price.',
    valueType: 'currency',
  },
  {
    id: 'return-1d',
    kind: 'numeric',
    field: 'return1d',
    label: '1D Return',
    category: 'Price & Volume',
    description: 'One-day return percentage.',
    valueType: 'percent',
  },
  {
    id: 'return-1w',
    kind: 'numeric',
    field: 'return1w',
    label: '1W Return',
    category: 'Price & Volume',
    description: 'One-week return percentage.',
    valueType: 'percent',
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
    id: 'return-3m',
    kind: 'numeric',
    field: 'return3m',
    label: '3M Return',
    category: 'Price & Volume',
    description: 'Three-month return percentage.',
    valueType: 'percent',
  },
  {
    id: 'return-6m',
    kind: 'numeric',
    field: 'return6m',
    label: '6M Return',
    category: 'Price & Volume',
    description: 'Six-month return percentage.',
    valueType: 'percent',
  },
  {
    id: 'return-1y',
    kind: 'numeric',
    field: 'return1y',
    label: '1Y Return',
    category: 'Price & Volume',
    description: 'One-year return percentage.',
    valueType: 'percent',
  },
  {
    id: 'return-1m-vs-benchmark',
    kind: 'numeric',
    field: 'return1mVsBenchmark',
    label: '1M Return vs Benchmark',
    category: 'Price & Volume',
    description: 'Excess return vs broad benchmark.',
    valueType: 'percent',
  },
  {
    id: 'return-6m-vs-benchmark',
    kind: 'numeric',
    field: 'return6mVsBenchmark',
    label: '6M Return vs Benchmark',
    category: 'Price & Volume',
    description: 'Excess return vs broad benchmark.',
    valueType: 'percent',
  },
  {
    id: 'return-1y-vs-benchmark',
    kind: 'numeric',
    field: 'return1yVsBenchmark',
    label: '1Y Return vs Benchmark',
    category: 'Price & Volume',
    description: 'Excess return vs broad benchmark.',
    valueType: 'percent',
  },
  {
    id: 'away-52w-high',
    kind: 'numeric',
    field: 'awayFrom52wHigh',
    label: '% Away From 52W High',
    category: 'Price & Volume',
    description: 'Distance from 52-week high.',
    valueType: 'percent',
  },
  {
    id: 'away-52w-low',
    kind: 'numeric',
    field: 'awayFrom52wLow',
    label: '% Away From 52W Low',
    category: 'Price & Volume',
    description: 'Distance from 52-week low.',
    valueType: 'percent',
  },
  {
    id: 'daily-volume',
    kind: 'numeric',
    field: 'dailyVolume',
    label: 'Daily Volume',
    category: 'Price & Volume',
    description: 'Latest daily traded volume.',
    valueType: 'number',
  },
  {
    id: 'avg-volume-1m',
    kind: 'numeric',
    field: 'avgVolume1m',
    label: '1M Average Volume',
    category: 'Price & Volume',
    description: 'Average volume over ~1 month.',
    valueType: 'number',
  },
  {
    id: 'change-volume-1d',
    kind: 'numeric',
    field: 'changeVolume1d',
    label: '1D Change in Volume',
    category: 'Price & Volume',
    description: 'Change in volume vs previous day.',
    valueType: 'percent',
  },
  {
    id: 'volume-vs-1m-avg',
    kind: 'numeric',
    field: 'volumeVsAvg1m',
    label: 'Volume vs 1M Average',
    category: 'Price & Volume',
    description: 'Current daily volume relative to 1M average.',
    valueType: 'number',
  },
  {
    id: 'sma-50',
    kind: 'numeric',
    field: 'sma50',
    label: '50 DMA',
    category: 'Technical Indicators',
    description: '50-day moving average.',
    valueType: 'currency',
  },
  {
    id: 'sma-200',
    kind: 'numeric',
    field: 'sma200',
    label: '200 DMA',
    category: 'Technical Indicators',
    description: '200-day moving average.',
    valueType: 'currency',
  },
  {
    id: 'price-vs-sma-50',
    kind: 'numeric',
    field: 'priceVsSma50',
    label: 'Price vs 50 DMA',
    category: 'Technical Indicators',
    description: 'Percent distance of price from 50 DMA.',
    valueType: 'percent',
  },
  {
    id: 'price-vs-sma-200',
    kind: 'numeric',
    field: 'priceVsSma200',
    label: 'Price vs 200 DMA',
    category: 'Technical Indicators',
    description: 'Percent distance of price from 200 DMA.',
    valueType: 'percent',
  },
  {
    id: 'rsi-14',
    kind: 'numeric',
    field: 'rsi14',
    label: 'RSI (14)',
    category: 'Technical Indicators',
    description: 'Relative Strength Index over 14 sessions.',
    valueType: 'number',
  },
  {
    id: 'volatility-30d',
    kind: 'numeric',
    field: 'volatility30d',
    label: 'Volatility (30D)',
    category: 'Technical Indicators',
    description: 'Annualized volatility using last 30 sessions.',
    valueType: 'percent',
  },
  {
    id: 'volatility-90d',
    kind: 'numeric',
    field: 'volatility90d',
    label: 'Volatility (90D)',
    category: 'Technical Indicators',
    description: 'Annualized volatility using last 90 sessions.',
    valueType: 'percent',
  },
  {
    id: 'drawdown-1y',
    kind: 'numeric',
    field: 'drawdown1y',
    label: 'Max Drawdown (1Y)',
    category: 'Technical Indicators',
    description: 'Largest peak-to-trough drawdown in last 1Y.',
    valueType: 'percent',
  },
  {
    id: 'trend-strength',
    kind: 'numeric',
    field: 'trendStrength',
    label: 'Trend Strength',
    category: 'Technical Indicators',
    description: 'Weighted momentum score from 1M/3M/6M returns.',
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
    id: 'enterprise-value',
    kind: 'numeric',
    field: 'enterpriseValue',
    label: 'Enterprise Value',
    category: 'Valuation',
    description: 'Enterprise value.',
    valueType: 'currency',
  },
  {
    id: 'pe',
    kind: 'numeric',
    field: 'pe',
    label: 'PE Ratio',
    category: 'Valuation',
    description: 'Price to earnings ratio.',
    valueType: 'number',
  },
  {
    id: 'pb',
    kind: 'numeric',
    field: 'pb',
    label: 'PB Ratio',
    category: 'Valuation',
    description: 'Price to book ratio.',
    valueType: 'number',
  },
  {
    id: 'price-to-sales',
    kind: 'numeric',
    field: 'priceToSales',
    label: 'Price to Sales',
    category: 'Valuation',
    description: 'Price to sales ratio.',
    valueType: 'number',
  },
  {
    id: 'price-to-fcf',
    kind: 'numeric',
    field: 'priceToFcf',
    label: 'Price to FCF',
    category: 'Valuation',
    description: 'Price to free cash flow ratio.',
    valueType: 'number',
  },
  {
    id: 'ev-ebitda',
    kind: 'numeric',
    field: 'evEbitda',
    label: 'EV/EBITDA',
    category: 'Valuation',
    description: 'Enterprise value to EBITDA.',
    valueType: 'number',
  },
  {
    id: 'peg-ratio',
    kind: 'numeric',
    field: 'pegRatio',
    label: 'PEG Ratio',
    category: 'Valuation',
    description: 'PE relative to growth.',
    valueType: 'number',
  },
  {
    id: 'opm',
    kind: 'numeric',
    field: 'opm',
    label: 'OPM',
    category: 'Profitability',
    description: 'Operating profit margin.',
    valueType: 'percent',
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
    description: 'Return on capital employed.',
    valueType: 'percent',
  },
  {
    id: 'roa',
    kind: 'numeric',
    field: 'roa',
    label: 'ROA',
    category: 'Profitability',
    description: 'Return on assets.',
    valueType: 'percent',
  },
  {
    id: 'earnings-yield',
    kind: 'numeric',
    field: 'earningsYield',
    label: 'Earnings Yield',
    category: 'Profitability',
    description: 'Earnings yield metric.',
    valueType: 'percent',
  },
  {
    id: 'dividend-yield',
    kind: 'numeric',
    field: 'dividendYield',
    label: 'Dividend Yield',
    category: 'Profitability',
    description: 'Dividend yield.',
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
  {
    id: 'current-ratio',
    kind: 'numeric',
    field: 'currentRatio',
    label: 'Current Ratio',
    category: 'Financial Ratios',
    description: 'Short-term liquidity ratio.',
    valueType: 'number',
  },
  {
    id: 'interest-coverage',
    kind: 'numeric',
    field: 'interestCoverage',
    label: 'Interest Coverage',
    category: 'Financial Ratios',
    description: 'Coverage of interest obligations.',
    valueType: 'number',
  },
  {
    id: 'debt',
    kind: 'numeric',
    field: 'debt',
    label: 'Total Debt',
    category: 'Balance Sheet & Cash Flow',
    description: 'Total debt reported in available fundamentals.',
    valueType: 'currency',
  },
  {
    id: 'debt-to-market-cap',
    kind: 'numeric',
    field: 'debtToMarketCap',
    label: 'Debt to Market Cap',
    category: 'Balance Sheet & Cash Flow',
    description: 'Debt as a percentage of market capitalization.',
    valueType: 'percent',
  },
  {
    id: 'enterprise-to-sales',
    kind: 'numeric',
    field: 'enterpriseToSales',
    label: 'EV to Sales',
    category: 'Balance Sheet & Cash Flow',
    description: 'Enterprise value divided by annual sales.',
    valueType: 'number',
  },
  {
    id: 'net-profit-margin',
    kind: 'numeric',
    field: 'netProfitMargin',
    label: 'Net Profit Margin',
    category: 'Balance Sheet & Cash Flow',
    description: 'Net profit as a percentage of sales.',
    valueType: 'percent',
  },
  {
    id: 'profit-to-debt',
    kind: 'numeric',
    field: 'profitToDebt',
    label: 'Profit to Debt',
    category: 'Balance Sheet & Cash Flow',
    description: 'Profit as percentage of total debt.',
    valueType: 'percent',
  },
  {
    id: 'free-cash-flow-proxy',
    kind: 'numeric',
    field: 'freeCashFlowProxy',
    label: 'Free Cash Flow (Proxy)',
    category: 'Balance Sheet & Cash Flow',
    description: 'Derived from market cap and Price/FCF ratio.',
    valueType: 'currency',
  },
  {
    id: 'sales-growth',
    kind: 'numeric',
    field: 'salesGrowth',
    label: 'Sales Growth',
    category: 'Growth',
    description: 'Sales growth percentage.',
    valueType: 'percent',
  },
  {
    id: 'profit-growth',
    kind: 'numeric',
    field: 'profitGrowth',
    label: 'Profit Growth',
    category: 'Growth',
    description: 'Profit growth percentage.',
    valueType: 'percent',
  },
  {
    id: 'yoy-quarterly-sales-growth',
    kind: 'numeric',
    field: 'yoyQuarterlySalesGrowth',
    label: 'YOY Quarterly Sales Growth',
    category: 'Growth',
    description: 'Quarterly sales growth vs last year.',
    valueType: 'percent',
  },
  {
    id: 'yoy-quarterly-profit-growth',
    kind: 'numeric',
    field: 'yoyQuarterlyProfitGrowth',
    label: 'YOY Quarterly Profit Growth',
    category: 'Growth',
    description: 'Quarterly profit growth vs last year.',
    valueType: 'percent',
  },
  {
    id: 'promoter-holding',
    kind: 'numeric',
    field: 'promoterHolding',
    label: 'Promoter Holding',
    category: 'Ownership',
    description: 'Promoter shareholding percentage.',
    valueType: 'percent',
  },
  {
    id: 'pledged-percentage',
    kind: 'numeric',
    field: 'pledgedPercentage',
    label: 'Pledged Percentage',
    category: 'Ownership',
    description: 'Promoter pledged shares percentage.',
    valueType: 'percent',
  },
  {
    id: 'sales',
    kind: 'numeric',
    field: 'sales',
    label: 'Sales',
    category: 'Income Statement',
    description: 'Annual sales figure.',
    valueType: 'currency',
  },
  {
    id: 'pat',
    kind: 'numeric',
    field: 'pat',
    label: 'Profit After Tax',
    category: 'Income Statement',
    description: 'Annual PAT.',
    valueType: 'currency',
  },
  {
    id: 'sales-latest-quarter',
    kind: 'numeric',
    field: 'salesLatestQuarter',
    label: 'Sales Latest Quarter',
    category: 'Income Statement',
    description: 'Latest quarter sales.',
    valueType: 'currency',
  },
  {
    id: 'pat-latest-quarter',
    kind: 'numeric',
    field: 'patLatestQuarter',
    label: 'PAT Latest Quarter',
    category: 'Income Statement',
    description: 'Latest quarter PAT.',
    valueType: 'currency',
  },
  {
    id: 'eps',
    kind: 'numeric',
    field: 'eps',
    label: 'EPS',
    category: 'Income Statement',
    description: 'Earnings per share.',
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
        stockUniverse: entity.market === 'india' ? 'India Stocks' : 'US Stocks',
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

const baseRows = buildRows();

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

    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b) * multiplier;
    }

    if (typeof a === 'number' && typeof b === 'number') {
      return (a - b) * multiplier;
    }

    if (typeof a === 'number') return -1 * multiplier;
    if (typeof b === 'number') return 1 * multiplier;
    return 0;
  });
}

function displayOption(field: EnumField, value: string) {
  if (field === 'market') return value.toUpperCase();
  return value;
}

function formatByDefinition(definition: NumericFilterDefinition, value?: number, currency?: 'USD' | 'INR') {
  if (typeof value !== 'number') return '—';
  if (definition.valueType === 'percent') return formatPercent(value);
  if (definition.valueType === 'currency') return formatCurrency(value, currency ?? 'INR');
  return formatNumber(value, 2);
}

function sortIndicator(isActive: boolean, direction: 'asc' | 'desc') {
  if (!isActive) return '↕';
  return direction === 'asc' ? '↑' : '↓';
}

const TABLE_GRID_CLASS =
  'grid grid-cols-[minmax(250px,2.4fr)_minmax(170px,1.4fr)_minmax(125px,1fr)_minmax(120px,0.9fr)_minmax(90px,0.7fr)_minmax(90px,0.7fr)_minmax(95px,0.75fr)_minmax(95px,0.75fr)_minmax(120px,0.85fr)] gap-3';

export function ScreenerWorkbench() {
  const [query, setQuery] = useState('Show profitable low debt companies with rising sales and high ROE');
  const [explanation, setExplanation] = useState('');
  const [strategy, setStrategy] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [saved, setSaved] = useState<Array<{ id: string; name: string; query: string }>>([]);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCategory, setPickerCategory] = useState<FilterCategory>('Price & Volume');
  const [filterSearch, setFilterSearch] = useState('');
  const [expandedSidebarSection, setExpandedSidebarSection] = useState<string | null>('market-cap');
  const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: 'asc' | 'desc' }>({
    field: 'marketCap',
    direction: 'desc',
  });

  useEffect(() => {
    listCustomScreens().then((records) => setSaved(records.map((record) => ({ id: record.id, name: record.name, query: record.query }))));
  }, []);

  const enumOptionsByField = useMemo(() => {
    const unique = <T,>(values: T[]) => Array.from(new Set(values));
    return {
      stockUniverse: unique(baseRows.map((row) => row.stockUniverse)),
      market: unique(baseRows.map((row) => row.market)),
      exchange: unique(baseRows.map((row) => row.exchange)),
      sector: unique(baseRows.map((row) => row.sector)).sort((a, b) => a.localeCompare(b)),
      industry: unique(baseRows.map((row) => row.industry)).sort((a, b) => a.localeCompare(b)),
      marketCapBucket: ['Largecap', 'Midcap', 'Smallcap'],
      currency: unique(baseRows.map((row) => row.currency)),
      id: [],
      symbol: [],
      name: [],
    } as Record<string, string[]>;
  }, []);

  const categoryCounts = useMemo(
    () =>
      FILTER_CATEGORIES.reduce(
        (acc, category) => {
          acc[category] = FILTER_DEFINITIONS.filter((definition) => definition.category === category).length;
          return acc;
        },
        {} as Record<FilterCategory, number>,
      ),
    [],
  );

  const pickerList = useMemo(() => {
    const search = normalizeForSearch(filterSearch);
    return FILTER_DEFINITIONS.filter((definition) => {
      if (search) {
        return (
          normalizeForSearch(definition.label).includes(search) ||
          normalizeForSearch(definition.description).includes(search) ||
          normalizeForSearch(definition.category).includes(search)
        );
      }
      return definition.category === pickerCategory;
    });
  }, [filterSearch, pickerCategory]);

  const activeCount = activeFilters.length;
  const marketCapValues = useMemo(() => baseRows.map((row) => row.marketCap).filter((value): value is number => typeof value === 'number'), []);
  const marketCapBounds = useMemo(
    () => ({
      min: marketCapValues.length ? Math.min(...marketCapValues) : 0,
      max: marketCapValues.length ? Math.max(...marketCapValues) : 1,
    }),
    [marketCapValues],
  );

  const activeById = useMemo(() => new Map(activeFilters.map((active) => [active.filterId, active])), [activeFilters]);

  const strategyRows = useMemo(() => {
    if (!strategy) return baseRows;
    return runBuiltInStrategy(strategy, baseRows);
  }, [strategy]);

  const filteredRows = useMemo(() => applyAdvancedFilters(strategyRows, activeFilters), [strategyRows, activeFilters]);

  const rows = useMemo(() => sortRows(filteredRows, sortConfig.field, sortConfig.direction), [filteredRows, sortConfig]);

  const activeEntries = useMemo(
    () =>
      activeFilters
        .map((active) => ({
          active,
          definition: FILTER_DEFINITION_BY_ID[active.filterId],
        }))
        .filter((entry): entry is { active: ActiveFilter; definition: FilterDefinition } => Boolean(entry.definition)),
    [activeFilters],
  );

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

  function isFilterActive(filterId: string) {
    return activeFilters.some((active) => active.filterId === filterId);
  }

  function toggleFilter(definition: FilterDefinition) {
    setActiveFilters((previous) => {
      const existingIndex = previous.findIndex((active) => active.filterId === definition.id);
      if (existingIndex >= 0) {
        const next = [...previous];
        next.splice(existingIndex, 1);
        return next;
      }
      if (definition.kind === 'numeric') {
        return [...previous, { filterId: definition.id, kind: 'numeric', min: '', max: '' }];
      }
      return [...previous, { filterId: definition.id, kind: 'enum', selected: [] }];
    });
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

  function toggleEnumSelection(filterId: string, value: string) {
    setActiveFilters((previous) => {
      const existingIndex = previous.findIndex((active) => active.filterId === filterId && active.kind === 'enum');
      if (existingIndex >= 0) {
        const next = [...previous];
        const existing = next[existingIndex];
        if (existing.kind !== 'enum') return previous;
        const alreadySelected = existing.selected.some((selected) => normalizeForSearch(selected) === normalizeForSearch(value));
        const updated = alreadySelected
          ? existing.selected.filter((selected) => normalizeForSearch(selected) !== normalizeForSearch(value))
          : [...existing.selected, value];
        if (!updated.length) {
          next.splice(existingIndex, 1);
          return next;
        }
        next[existingIndex] = { ...existing, selected: updated };
        return next;
      }
      return [...previous, { filterId, kind: 'enum', selected: [value] }];
    });
  }

  function clearAllFilters() {
    setActiveFilters([]);
    setStrategy('');
    setExplanation('');
  }

  async function parseAiQuery() {
    const parsed = await heuristicAiProvider.parseScreenerQuery({ query });
    const { activeFilters: mappedFilters, ignored } = buildAiFilters(parsed.filters);

    setActiveFilters(mappedFilters);
    setStrategy('');

    setExplanation(
      ignored
        ? `${parsed.explanation} ${ignored} parsed condition(s) could not be mapped to available filters.`
        : parsed.explanation,
    );
  }

  async function saveScreen() {
    const name = customName.trim() || `Screen ${saved.length + 1}`;
    const record = {
      id: crypto.randomUUID(),
      name,
      query,
      createdAt: new Date().toISOString(),
    };
    await upsertCustomScreen(record);
    setSaved((previous) => [...previous, { id: record.id, name: record.name, query: record.query }]);
    setCustomName('');
  }

  function setNumericBounds(filterId: string, nextMin: string, nextMax: string) {
    if (!nextMin.trim() && !nextMax.trim()) {
      setActiveFilters((previous) => previous.filter((active) => active.filterId !== filterId));
      return;
    }
    updateNumericFilter(filterId, { min: nextMin, max: nextMax });
  }

  const marketCapActive = activeById.get('market-cap');
  const marketCapMinRaw = marketCapActive?.kind === 'numeric' ? marketCapActive.min : '';
  const marketCapMaxRaw = marketCapActive?.kind === 'numeric' ? marketCapActive.max : '';
  const marketCapMinParsed = parseNumber(marketCapMinRaw) ?? marketCapBounds.min;
  const marketCapMaxParsed = parseNumber(marketCapMaxRaw) ?? marketCapBounds.max;
  const marketCapMinValue = Math.min(marketCapMinParsed, marketCapMaxParsed);
  const marketCapMaxValue = Math.max(marketCapMinParsed, marketCapMaxParsed);

  const stockUniverseEntry = activeById.get('stock-universe');
  const stockUniverseSelection = stockUniverseEntry?.kind === 'enum' ? stockUniverseEntry.selected : [];
  const sectorEntry = activeById.get('sector');
  const sectorSelection = sectorEntry?.kind === 'enum' ? sectorEntry.selected : [];
  const marketCapBucketEntry = activeById.get('market-cap-bucket');
  const marketCapBucketSelection = marketCapBucketEntry?.kind === 'enum' ? marketCapBucketEntry.selected : [];

  const quickNumericFilters = [
    { id: 'close-price', label: 'Close Price (Rs)' },
    { id: 'pe', label: 'PE Ratio' },
    { id: 'return-1m', label: '1M Return (%)' },
    { id: 'return-1d', label: '1D Return (%)' },
    { id: 'roe', label: 'Return on Equity (%)' },
    { id: 'pb', label: 'PB Ratio' },
  ] as const;

  const showingFrom = rows.length ? 1 : 0;
  const showingTo = Math.min(rows.length, 20);
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
        <div className="grid xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="border-r border-slate-200 bg-slate-50/90 dark:border-border dark:bg-muted/10">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-border">
              <div className="text-[15px] font-medium text-slate-700 dark:text-slate-100">
                {activeCount ? `${activeCount} filter${activeCount === 1 ? '' : 's'} applied` : 'No filters applied'}
              </div>
              <button
                onClick={clearAllFilters}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-border dark:bg-card dark:text-slate-200 dark:hover:bg-muted"
              >
                Reset all
              </button>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-border">
              <div className="p-4">
                <button
                  onClick={() => setExpandedSidebarSection((current) => (current === 'stock-universe' ? null : 'stock-universe'))}
                  className="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-800 dark:text-slate-200"
                >
                  <span>Stock Universe</span>
                  {expandedSidebarSection === 'stock-universe' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                {expandedSidebarSection === 'stock-universe' ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(enumOptionsByField.stockUniverse ?? []).map((option) => {
                      const checked = stockUniverseSelection.some((selected) => normalizeForSearch(selected) === normalizeForSearch(option));
                      return (
                        <button
                          key={option}
                          onClick={() => toggleEnumSelection('stock-universe', option)}
                          className={cn(
                            'rounded-md border px-3 py-1.5 text-xs font-medium',
                            checked
                              ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/60 dark:bg-blue-500/15 dark:text-blue-200'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-border dark:bg-card dark:text-slate-300 dark:hover:bg-muted',
                          )}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className="p-4">
                <button
                  onClick={() => setExpandedSidebarSection((current) => (current === 'sector' ? null : 'sector'))}
                  className="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-800 dark:text-slate-200"
                >
                  <span>Sector</span>
                  {expandedSidebarSection === 'sector' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                {expandedSidebarSection === 'sector' ? (
                  <div className="mt-3 flex max-h-36 flex-wrap gap-2 overflow-auto pr-1">
                    {(enumOptionsByField.sector ?? []).slice(0, 16).map((option) => {
                      const checked = sectorSelection.some((selected) => normalizeForSearch(selected) === normalizeForSearch(option));
                      return (
                        <button
                          key={option}
                          onClick={() => toggleEnumSelection('sector', option)}
                          className={cn(
                            'rounded-md border px-2.5 py-1 text-xs font-medium',
                            checked
                              ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/60 dark:bg-blue-500/15 dark:text-blue-200'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-border dark:bg-card dark:text-slate-300 dark:hover:bg-muted',
                          )}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className="p-4">
                <button
                  onClick={() => setExpandedSidebarSection((current) => (current === 'market-cap' ? null : 'market-cap'))}
                  className="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-800 dark:text-slate-200"
                >
                  <span>Market Cap</span>
                  {expandedSidebarSection === 'market-cap' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                {expandedSidebarSection === 'market-cap' ? (
                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <input
                        type="range"
                        min={Math.round(marketCapBounds.min)}
                        max={Math.round(marketCapBounds.max)}
                        value={Math.round(marketCapMinValue)}
                        onChange={(event) => {
                          const nextMin = Math.min(Number(event.target.value), marketCapMaxValue);
                          setNumericBounds('market-cap', String(Math.round(nextMin)), String(Math.round(marketCapMaxValue)));
                        }}
                        className="w-full accent-slate-700"
                      />
                      <input
                        type="range"
                        min={Math.round(marketCapBounds.min)}
                        max={Math.round(marketCapBounds.max)}
                        value={Math.round(marketCapMaxValue)}
                        onChange={(event) => {
                          const nextMax = Math.max(Number(event.target.value), marketCapMinValue);
                          setNumericBounds('market-cap', String(Math.round(marketCapMinValue)), String(Math.round(nextMax)));
                        }}
                        className="w-full accent-slate-700"
                      />
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <input
                        value={marketCapMinRaw}
                        onChange={(event) => setNumericBounds('market-cap', event.target.value, marketCapMaxRaw || String(Math.round(marketCapBounds.max)))}
                        inputMode="decimal"
                        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-border dark:bg-card"
                      />
                      <span className="text-xs text-slate-500">to</span>
                      <input
                        value={marketCapMaxRaw}
                        onChange={(event) => setNumericBounds('market-cap', marketCapMinRaw || String(Math.round(marketCapBounds.min)), event.target.value)}
                        inputMode="decimal"
                        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-border dark:bg-card"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {['Smallcap', 'Midcap', 'Largecap'].map((bucket) => {
                        const checked = marketCapBucketSelection.some((selected) => normalizeForSearch(selected) === normalizeForSearch(bucket));
                        return (
                          <button
                            key={bucket}
                            onClick={() => toggleEnumSelection('market-cap-bucket', bucket)}
                            className={cn(
                              'rounded-md border px-2 py-1.5 text-xs font-medium',
                              checked
                                ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/60 dark:bg-blue-500/15 dark:text-blue-200'
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-border dark:bg-card dark:text-slate-300 dark:hover:bg-muted',
                            )}
                          >
                            {bucket}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              {quickNumericFilters.map((item) => {
                const definition = FILTER_DEFINITION_BY_ID[item.id];
                if (!definition || definition.kind !== 'numeric') return null;
                const active = activeById.get(item.id);
                const currentMin = active?.kind === 'numeric' ? active.min : '';
                const currentMax = active?.kind === 'numeric' ? active.max : '';
                const isOpen = expandedSidebarSection === item.id;
                return (
                  <div key={item.id} className="p-4">
                    <button
                      onClick={() => setExpandedSidebarSection((current) => (current === item.id ? null : item.id))}
                      className="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-800 dark:text-slate-200"
                    >
                      <span>{item.label}</span>
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    {isOpen ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <input
                          value={currentMin}
                          onChange={(event) => setNumericBounds(item.id, event.target.value, currentMax)}
                          inputMode="decimal"
                          placeholder="Min"
                          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-border dark:bg-card"
                        />
                        <input
                          value={currentMax}
                          onChange={(event) => setNumericBounds(item.id, currentMin, event.target.value)}
                          inputMode="decimal"
                          placeholder="Max"
                          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-border dark:bg-card"
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}

              <div className="p-4">
                <button
                  onClick={() => setPickerOpen((value) => !value)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-border dark:bg-card dark:text-slate-200 dark:hover:bg-muted"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {pickerOpen ? 'Hide More Filters' : `Add More Filters (${FILTER_DEFINITIONS.length})`}
                </button>
                {pickerOpen ? (
                  <div className="mt-3 space-y-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        value={filterSearch}
                        onChange={(event) => setFilterSearch(event.target.value)}
                        placeholder="Search filters"
                        className="w-full rounded-md border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm dark:border-border dark:bg-card"
                      />
                    </div>
                    <div className="grid gap-2 md:grid-cols-[130px_1fr]">
                      <div className="space-y-1 rounded-md border border-slate-300 bg-white p-1.5 dark:border-border dark:bg-card">
                        {FILTER_CATEGORIES.map((category) => (
                          <button
                            key={category}
                            onClick={() => {
                              setPickerCategory(category);
                              setFilterSearch('');
                            }}
                            className={cn(
                              'flex w-full items-center justify-between rounded px-2 py-1 text-left text-[11px]',
                              pickerCategory === category ? 'bg-slate-100 text-slate-900 dark:bg-muted dark:text-slate-100' : 'hover:bg-slate-100 dark:hover:bg-muted',
                            )}
                          >
                            <span>{category}</span>
                            <span className="text-[10px] text-slate-500">{categoryCounts[category]}</span>
                          </button>
                        ))}
                      </div>
                      <div className="max-h-56 space-y-1 overflow-auto rounded-md border border-slate-300 bg-white p-1.5 dark:border-border dark:bg-card">
                        {pickerList.map((definition) => {
                          const active = isFilterActive(definition.id);
                          return (
                            <button
                              key={definition.id}
                              onClick={() => toggleFilter(definition)}
                              className={cn(
                                'flex w-full items-start justify-between gap-2 rounded border px-2 py-1.5 text-left text-xs',
                                active
                                  ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/50 dark:bg-blue-500/10 dark:text-blue-200'
                                  : 'border-slate-200 hover:bg-slate-50 dark:border-border dark:hover:bg-muted/60',
                              )}
                            >
                              <span>{definition.label}</span>
                              <span className="font-semibold uppercase">{active ? 'Added' : 'Add'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-border">
              <div>
                <h2 className="text-[28px] font-semibold text-slate-900 dark:text-white">Stock Screener</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Add a note to remember why you created this, like large-cap low PE or sector-specific picks.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-border dark:bg-card dark:text-slate-300 dark:hover:bg-muted">
                  <PenLine className="h-4 w-4" />
                </button>
                <button className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-border dark:bg-card dark:text-slate-300 dark:hover:bg-muted">
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  onClick={saveScreen}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-400 bg-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:border-border dark:bg-muted dark:text-slate-100 dark:hover:bg-muted/80"
                >
                  <Save className="h-4 w-4" /> Save
                </button>
              </div>
            </div>

            <div className="border-b border-slate-200 px-5 py-3 dark:border-border">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[260px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Type conditions like: low debt, high ROE, PE < 20"
                    className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-border dark:bg-card"
                  />
                </div>
                <button
                  onClick={parseAiQuery}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Sparkles className="h-4 w-4" /> Run AI
                </button>
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:border-border dark:bg-card dark:text-slate-200 dark:hover:bg-muted"
                >
                  <Filter className="h-4 w-4" /> Reset
                </button>
              </div>
              {explanation ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{explanation}</p> : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3 text-sm dark:border-border">
              <div className="font-medium text-slate-700 dark:text-slate-200">
                Showing {showingFrom} - {showingTo} of {rows.length} results
              </div>
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <span>last updated at {refreshedAt} IST</span>
                <Info className="h-4 w-4" />
                <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-border dark:bg-card dark:text-slate-200 dark:hover:bg-muted">
                  <Download className="h-4 w-4" /> Export
                </button>
              </div>
            </div>

            {activeEntries.length ? (
              <div className="flex flex-wrap gap-2 border-b border-slate-200 px-5 py-2 dark:border-border">
                {activeEntries.map(({ active, definition }) => (
                  <span
                    key={definition.id}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 dark:border-border dark:bg-card dark:text-slate-200"
                  >
                    {definition.label}
                    <button
                      onClick={() => setActiveFilters((previous) => previous.filter((item) => item.filterId !== definition.id))}
                      className="ml-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            <VirtualizedTable
              rows={rows}
              height={700}
              estimateRowHeight={72}
              headerClassName="bg-slate-100 px-4 py-3 text-[14px] text-slate-700 dark:bg-muted/70 dark:text-slate-200"
              className="rounded-none border-0"
              header={
                <div className={TABLE_GRID_CLASS}>
                  <button onClick={() => onSort('name')} className="flex items-center gap-1 text-left font-semibold">
                    Name <span className="text-[10px] text-slate-500">{sortIndicator(sortConfig.field === 'name', sortConfig.direction)}</span>
                  </button>
                  <span className="font-semibold">Sub-Sector</span>
                  <button onClick={() => onSort('marketCap')} className="flex items-center justify-end gap-1 font-semibold">
                    Market Cap <span className="text-[10px] text-slate-500">{sortIndicator(sortConfig.field === 'marketCap', sortConfig.direction)}</span>
                  </button>
                  <button onClick={() => onSort('closePrice')} className="flex items-center justify-end gap-1 font-semibold">
                    Close Price <span className="text-[10px] text-slate-500">{sortIndicator(sortConfig.field === 'closePrice', sortConfig.direction)}</span>
                  </button>
                  <button onClick={() => onSort('pe')} className="flex items-center justify-end gap-1 font-semibold">
                    PE Ratio <span className="text-[10px] text-slate-500">{sortIndicator(sortConfig.field === 'pe', sortConfig.direction)}</span>
                  </button>
                  <button onClick={() => onSort('return1m')} className="flex items-center justify-end gap-1 font-semibold">
                    1M Return <span className="text-[10px] text-slate-500">{sortIndicator(sortConfig.field === 'return1m', sortConfig.direction)}</span>
                  </button>
                  <button onClick={() => onSort('return1d')} className="flex items-center justify-end gap-1 font-semibold">
                    1D Return <span className="text-[10px] text-slate-500">{sortIndicator(sortConfig.field === 'return1d', sortConfig.direction)}</span>
                  </button>
                  <button onClick={() => onSort('roe')} className="flex items-center justify-end gap-1 font-semibold">
                    ROE <span className="text-[10px] text-slate-500">{sortIndicator(sortConfig.field === 'roe', sortConfig.direction)}</span>
                  </button>
                  <button onClick={() => onSort('dailyVolume')} className="flex items-center justify-end gap-1 font-semibold">
                    Volume <span className="text-[10px] text-slate-500">{sortIndicator(sortConfig.field === 'dailyVolume', sortConfig.direction)}</span>
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
                    <div className="text-[13px] text-slate-500 dark:text-slate-400">{row.industry}</div>
                    <div className="text-right tabular-nums">{typeof row.marketCap === 'number' ? formatCurrency(row.marketCap, row.currency) : '—'}</div>
                    <div className="text-right tabular-nums">{typeof row.closePrice === 'number' ? formatCurrency(row.closePrice, row.currency) : '—'}</div>
                    <div className="text-right tabular-nums">{typeof row.pe === 'number' ? formatNumber(row.pe, 2) : '—'}</div>
                    <div className="text-right tabular-nums">{typeof row.return1m === 'number' ? formatPercent(row.return1m) : '—'}</div>
                    <div className="text-right tabular-nums">{typeof row.return1d === 'number' ? formatPercent(row.return1d) : '—'}</div>
                    <div className="text-right tabular-nums">{typeof row.roe === 'number' ? formatPercent(row.roe) : '—'}</div>
                    <div className="text-right tabular-nums">{typeof row.dailyVolume === 'number' ? formatNumber(row.dailyVolume, 0) : '—'}</div>
                  </div>
                </div>
              )}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
