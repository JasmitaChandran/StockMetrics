import { withServerCache } from './server-cache';

type DocumentKind = 'annual_report' | 'filing' | 'presentation' | 'other';

type DiscoveredDocument = {
  id: string;
  title: string;
  url: string;
  kind: DocumentKind;
  year?: number;
  source: string;
};

type ParsedAnchor = {
  href: string;
  text: string;
  attrs: string;
};

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function toAbsoluteUrl(rawHref: string, baseUrl: string): string | null {
  try {
    const href = rawHref.trim();
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return null;
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function parseAnchors(html: string, baseUrl: string): ParsedAnchor[] {
  const out: ParsedAnchor[] = [];
  const anchorRegex = /<a\s+([^>]*?)href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/gi;
  let match = anchorRegex.exec(html);
  while (match) {
    const attrs = `${match[1] ?? ''} ${match[3] ?? ''}`.trim();
    const href = toAbsoluteUrl(match[2] ?? '', baseUrl);
    const text = stripTags(match[4] ?? '');
    if (href) out.push({ href, text, attrs });
    match = anchorRegex.exec(html);
  }
  return out;
}

function parseYear(value: string): number | undefined {
  const yearMatch = value.match(/\b(20\d{2}|19\d{2})\b/);
  if (!yearMatch) return undefined;
  return Number(yearMatch[1]);
}

function annualScore(a: ParsedAnchor): number {
  const haystack = `${a.text} ${a.attrs} ${a.href}`.toLowerCase();
  if (!/annual\s*report/.test(haystack)) return -1;
  let score = 0;
  if (haystack.includes('plausible-event-name=annual+report')) score += 10;
  if (a.href.toLowerCase().endsWith('.pdf')) score += 5;
  if (/financial year \d{4}/i.test(a.text)) score += 3;
  const year = parseYear(`${a.text} ${a.href}`);
  if (year) score += year / 10000;
  return score;
}

function presentationScore(a: ParsedAnchor): number {
  const haystack = `${a.text} ${a.attrs} ${a.href}`.toLowerCase();
  const isPresentation =
    /\bppt\b/.test(a.text.toLowerCase()) ||
    /investor presentation/.test(haystack) ||
    /presentation/.test(a.href.toLowerCase());
  if (!isPresentation) return -1;
  let score = 0;
  if (/\bppt\b/.test(a.text.toLowerCase())) score += 8;
  if (/presentation/.test(a.href.toLowerCase())) score += 6;
  if (a.href.toLowerCase().endsWith('.pdf')) score += 5;
  const year = parseYear(`${a.text} ${a.href}`);
  if (year) score += year / 10000;
  return score;
}

function pickBestAnchor(anchors: ParsedAnchor[], scorer: (a: ParsedAnchor) => number): ParsedAnchor | null {
  let best: ParsedAnchor | null = null;
  let bestScore = -1;
  for (const anchor of anchors) {
    const score = scorer(anchor);
    if (score > bestScore) {
      best = anchor;
      bestScore = score;
    }
  }
  return best;
}

function normalizeIndianSymbol(symbol: string) {
  return symbol.trim().toUpperCase().replace(/\.NS$|\.BO$/i, '');
}

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'StockMetrics/1.0',
      Accept: 'text/html,application/xhtml+xml',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed ${res.status} for ${url}`);
  return res.text();
}

export async function getIndiaDocuments(symbol: string): Promise<DiscoveredDocument[]> {
  const baseSymbol = normalizeIndianSymbol(symbol);
  if (!baseSymbol) return [];

  return withServerCache(`india-docs:${baseSymbol}`, 6 * 60 * 60_000, async () => {
    const pageUrl = `https://www.screener.in/company/${encodeURIComponent(baseSymbol)}/consolidated/`;
    const html = await fetchHtml(pageUrl);
    const anchors = parseAnchors(html, pageUrl);

    const annual = pickBestAnchor(anchors, annualScore);
    const presentation = pickBestAnchor(anchors, presentationScore);

    const out: DiscoveredDocument[] = [];
    if (annual) {
      const year = parseYear(`${annual.text} ${annual.href}`);
      out.push({
        id: `${baseSymbol}-annual-${year ?? 'latest'}`,
        title: year ? `Annual Report ${year}` : 'Annual Report',
        url: annual.href,
        kind: 'annual_report',
        year,
        source: 'Screener / BSE',
      });
    }
    if (presentation) {
      const year = parseYear(`${presentation.text} ${presentation.href}`);
      out.push({
        id: `${baseSymbol}-presentation-${year ?? 'latest'}`,
        title: year ? `Investor Presentation ${year}` : 'Investor Presentation',
        url: presentation.href,
        kind: 'presentation',
        year,
        source: 'Screener / Company IR',
      });
    }

    return out;
  });
}
