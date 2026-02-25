import type { HistorySeries, Quote } from '@/types';
import { withServerCache } from './server-cache';

interface MfApiResponse {
  meta?: {
    scheme_code?: number;
    scheme_name?: string;
    fund_house?: string;
    scheme_type?: string;
    scheme_category?: string;
  };
  data?: Array<{ date: string; nav: string }>;
}

function parseDmY(dateStr: string) {
  const [dd, mm, yyyy] = dateStr.split('-').map(Number);
  if (!dd || !mm || !yyyy) return null;
  return new Date(Date.UTC(yyyy, mm - 1, dd));
}

async function fetchMfScheme(code: string): Promise<MfApiResponse> {
  const res = await fetch(`https://api.mfapi.in/mf/${encodeURIComponent(code)}`, {
    headers: { 'User-Agent': 'StockMetrics/1.0' },
    next: { revalidate: 60 * 60 },
  });
  if (!res.ok) throw new Error(`MFAPI failed ${res.status}`);
  return (await res.json()) as MfApiResponse;
}

export async function getMfApiHistory(symbol: string): Promise<HistorySeries> {
  const code = symbol.replace(/^AMFI:/i, '');
  return withServerCache(`mfapi-history:${code}`, 60 * 60_000, async () => {
    const payload = await fetchMfScheme(code);
    const points = (payload.data ?? [])
      .map((row) => {
        const d = parseDmY(row.date);
        const nav = Number(row.nav);
        if (!d || Number.isNaN(nav)) return null;
        return { ts: d.toISOString(), close: nav };
      })
      .filter(Boolean) as HistorySeries['points'];

    points.sort((a, b) => a.ts.localeCompare(b.ts));

    return {
      symbol: `AMFI:${code}`,
      currency: 'INR',
      points,
      source: 'MFAPI (NAV)',
      delayed: true,
    };
  });
}

export async function getMfApiQuote(symbol: string): Promise<Quote> {
  const history = await getMfApiHistory(symbol);
  const last = history.points[history.points.length - 1];
  const prev = history.points[history.points.length - 2] ?? last;
  const change = last && prev ? last.close - prev.close : null;
  const changePercent = last && prev && prev.close ? (change! / prev.close) * 100 : null;
  return {
    symbol: history.symbol,
    market: 'mf',
    exchange: 'MF',
    currency: 'INR',
    price: last?.close ?? null,
    previousClose: prev?.close ?? null,
    change,
    changePercent,
    timestamp: last?.ts ?? null,
    source: history.source,
    delayed: true,
  };
}
