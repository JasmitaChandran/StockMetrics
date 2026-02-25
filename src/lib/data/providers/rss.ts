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
  let score = 0;
  const names = [symbol, companyName, companyName.split(' ')[0]].filter(Boolean).map((x) => x.toLowerCase());
  for (const n of names) if (t.includes(n)) score += 0.4;
  return Math.min(1, score);
}

export async function fetchRelevantRssNews(symbol: string, companyName: string): Promise<NewsItem[]> {
  const key = `rss:${symbol}:${companyName}`;
  return withServerCache(key, 10 * 60_000, async () => {
    const query = encodeURIComponent(`"${companyName}" OR ${symbol} stock market`);
    const url = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;
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
      .filter((n) => (n.relevanceScore ?? 0) > 0.2)
      .slice(0, 12);
  });
}
