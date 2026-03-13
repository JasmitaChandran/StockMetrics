import type { HistorySeries, Quote } from '@/types';
import { withServerCache } from './server-cache';

function rangeToYahoo(range: string) {
  switch (range) {
    case '1m':
      return { range: '1mo', interval: '1d' };
    case '6m':
      return { range: '6mo', interval: '1d' };
    case '3y':
      return { range: '3y', interval: '1wk' };
    case '5y':
      return { range: '5y', interval: '1wk' };
    case 'max':
    default:
      return { range: '10y', interval: '1wk' };
  }
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        currency?: string;
        regularMarketPrice?: number;
        previousClose?: number;
        chartPreviousClose?: number;
        regularMarketTime?: number;
        exchangeName?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
    error?: { description?: string } | null;
  };
}

async function fetchYahooChart(
  symbol: string,
  range: string,
  interval: string,
  options?: { revalidateSeconds?: number },
) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false&events=div,splits`;
  const fetchInit: RequestInit & { next?: { revalidate: number } } = {
    headers: {
      'User-Agent': 'StockMetrics/1.0'
    },
  };
  if (typeof options?.revalidateSeconds === 'number') {
    fetchInit.next = { revalidate: options.revalidateSeconds };
  } else {
    fetchInit.cache = 'no-store';
  }
  const res = await fetch(url, fetchInit);
  if (!res.ok) throw new Error(`Yahoo chart failed: ${res.status}`);
  return (await res.json()) as YahooChartResponse;
}

export async function getYahooHistory(symbol: string, range = 'max'): Promise<HistorySeries> {
  return withServerCache(`yahoo-history:${symbol}:${range}`, 5 * 60_000, async () => {
    const { range: yahooRange, interval } = rangeToYahoo(range);
    const data = await fetchYahooChart(symbol, yahooRange, interval, { revalidateSeconds: 300 });
    const result = data.chart?.result?.[0];
    if (!result) throw new Error(data.chart?.error?.description ?? 'No Yahoo result');
    const q = result.indicators?.quote?.[0];
    const points = (result.timestamp ?? []).map((ts, i) => {
      const close = q?.close?.[i];
      if (typeof close !== 'number') return null;
      return {
        ts: new Date(ts * 1000).toISOString(),
        close,
        open: q?.open?.[i] ?? undefined,
        high: q?.high?.[i] ?? undefined,
        low: q?.low?.[i] ?? undefined,
        volume: q?.volume?.[i] ?? undefined,
      };
    }).filter(Boolean) as HistorySeries['points'];

    return {
      symbol,
      currency: (result.meta?.currency as 'USD' | 'INR') || 'USD',
      points,
      source: 'Yahoo Finance (delayed, subject to availability)',
      delayed: true,
    };
  });
}

export async function getYahooQuote(symbol: string, market: 'us' | 'india' | 'mf'): Promise<Quote> {
  return withServerCache(`yahoo-quote:${symbol}`, 15_000, async () => {
    // Use intraday candles for quote freshness and avoid long revalidation cache.
    const data = await fetchYahooChart(symbol, '1d', '1m');
    const result = data.chart?.result?.[0];
    if (!result) throw new Error(data.chart?.error?.description ?? 'No Yahoo quote result');
    const meta = result.meta ?? {};
    const q = result.indicators?.quote?.[0];
    const closes = (q?.close ?? []).filter((v): v is number => typeof v === 'number');
    const fallbackLastClose = closes.length ? closes[closes.length - 1] : null;
    const fallbackPrevClose = closes.length > 1 ? closes[closes.length - 2] : null;

    const price = meta.regularMarketPrice ?? fallbackLastClose ?? null;

    let previousClose = meta.previousClose ?? meta.chartPreviousClose ?? null;
    if (previousClose === null) {
      if (price !== null && fallbackLastClose !== null) {
        const looksLikeLiveDiff = Math.abs(price - fallbackLastClose) > Math.max(0.01, fallbackLastClose * 0.0001);
        previousClose = looksLikeLiveDiff ? fallbackLastClose : fallbackPrevClose ?? fallbackLastClose;
      } else {
        previousClose = fallbackPrevClose ?? fallbackLastClose;
      }
    }

    const change = price !== null && previousClose !== null ? price - previousClose : null;
    const changePercent = change !== null && previousClose ? (change / previousClose) * 100 : null;
    const fallbackTimestamp =
      result.timestamp && result.timestamp.length ? result.timestamp[result.timestamp.length - 1] : undefined;
    const marketTimeMs = typeof meta.regularMarketTime === 'number' ? meta.regularMarketTime * 1000 : undefined;
    const fallbackTimeMs = typeof fallbackTimestamp === 'number' ? fallbackTimestamp * 1000 : undefined;
    const freshestTimestampMs =
      typeof marketTimeMs === 'number' && typeof fallbackTimeMs === 'number'
        ? Math.max(marketTimeMs, fallbackTimeMs)
        : marketTimeMs ?? fallbackTimeMs;
    return {
      symbol,
      market,
      currency: (meta.currency as 'USD' | 'INR') || (market === 'us' ? 'USD' : 'INR'),
      price,
      previousClose,
      change,
      changePercent,
      timestamp: typeof freshestTimestampMs === 'number' ? new Date(freshestTimestampMs).toISOString() : null,
      source: 'Yahoo Finance (delayed, subject to availability)',
      delayed: true,
      exchange: market === 'india' ? 'NSE' : market === 'us' ? 'NASDAQ' : 'MF',
    };
  });
}
