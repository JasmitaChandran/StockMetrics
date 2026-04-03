import { XMLParser } from 'fast-xml-parser';
import type { NewsItem } from '@/types';
import { withServerCache } from './server-cache';

const parser = new XMLParser({ ignoreAttributes: false });

function normalizeArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function stripHtml(text?: string) {
  return (text ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function scoreRelevance(title: string, description: string, symbol: string, companyName: string) {
  const t = `${title} ${description}`.toLowerCase();
  const titleLower = title.toLowerCase();
  let score = 0;
  const normalizedSymbol = symbol.replace(/\.(NS|BO)$/i, '').toLowerCase();
  const companyTokens = companyName
    .split(/\s+/)
    .map((token) => token.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter((token) => token.length >= 4)
    .filter((token) => !['limited', 'ltd', 'inc', 'corp', 'plc', 'company', 'group'].includes(token));
  const names = Array.from(new Set([normalizedSymbol, companyName.toLowerCase(), ...companyTokens]));
  for (const n of names) {
    if (!n) continue;
    if (titleLower.includes(n)) score += 0.55;
    else if (t.includes(n)) score += 0.3;
  }
  if (titleLower.includes(companyName.toLowerCase())) score += 0.3;
  return Math.min(1, score);
}

export async function fetchRelevantRssNews(
  symbol: string,
  companyName: string,
  market: 'us' | 'india' | 'mf' = 'india',
): Promise<NewsItem[]> {
  const key = `rss:${symbol}:${companyName}:${market}`;
  return withServerCache(key, 10 * 60_000, async () => {
    const query = encodeURIComponent(`"${companyName}" OR ${symbol} stock market`);
    const locale = market === 'us' ? { hl: 'en-US', gl: 'US', ceid: 'US:en' } : { hl: 'en-IN', gl: 'IN', ceid: 'IN:en' };
    const url = `https://news.google.com/rss/search?q=${query}&hl=${locale.hl}&gl=${locale.gl}&ceid=${locale.ceid}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'StockMetrics/1.0' },
      next: { revalidate: 600 },
    });
    if (!res.ok) throw new Error(`RSS fetch failed ${res.status}`);
    const xml = await res.text();
    const data = parser.parse(xml) as {
      rss?: { channel?: { item?: Array<Record<string, unknown>> | Record<string, unknown> } };
    };
    const items = normalizeArray(data.rss?.channel?.item);
    return items
      .map((item, idx) => {
        const title = String(item.title ?? 'Untitled');
        const description = stripHtml(String(item.description ?? ''));
        const relevance = scoreRelevance(title, description, symbol, companyName);
        const sourceNode = item.source as { '#text'?: string } | undefined;
        return {
          id: `${symbol}-${idx}-${String(item.pubDate ?? '')}`,
          title,
          url: String(item.link ?? '#'),
          source: String(sourceNode?.['#text'] ?? 'Google News RSS'),
          publishedAt: item.pubDate ? new Date(String(item.pubDate)).toISOString() : undefined,
          snippet: description,
          relevanceScore: relevance,
        } satisfies NewsItem;
      })
      .filter((n) => (n.relevanceScore ?? 0) > 0.35)
      .slice(0, 12);
  });
}
