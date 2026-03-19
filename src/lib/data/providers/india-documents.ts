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

function isPdfUrl(url: string) {
  return /\.pdf($|[?#])/i.test(url);
}

function extractFirstListAfter(html: string, headingPattern: RegExp): string | null {
  const headingMatch = headingPattern.exec(html);
  if (!headingMatch || typeof headingMatch.index !== 'number') return null;
  const afterHeading = html.slice(headingMatch.index);
  const listStartOffset = afterHeading.search(/<ul\b/i);
  if (listStartOffset < 0) return null;
  const fromList = afterHeading.slice(listStartOffset);
  const listEndOffset = fromList.search(/<\/ul>/i);
  if (listEndOffset < 0) return null;
  return fromList.slice(0, listEndOffset + '</ul>'.length);
}

function pickLatestAnnualFromSection(html: string, baseUrl: string): ParsedAnchor | null {
  const listHtml = extractFirstListAfter(html, /<h3[^>]*>\s*Annual reports\s*<\/h3>/i);
  if (!listHtml) return null;
  const anchors = parseAnchors(listHtml, baseUrl);
  for (const anchor of anchors) {
    if (isPdfUrl(anchor.href)) return anchor;
  }
  return anchors[0] ?? null;
}

function pickLatestPresentationFromConcalls(
  html: string,
  baseUrl: string,
): { anchor: ParsedAnchor; rowYear?: number } | null {
  const listHtml = extractFirstListAfter(html, /<h3[^>]*>\s*Concalls\s*<\/h3>/i);
  if (!listHtml) return null;

  const rowRegex = /<li\b[\s\S]*?<\/li>/gi;
  let rowMatch = rowRegex.exec(listHtml);
  while (rowMatch) {
    const rowHtml = rowMatch[0] ?? '';
    const rowText = stripTags(rowHtml);
    const rowYear = parseYear(rowText);
    const anchors = parseAnchors(rowHtml, baseUrl);
    const pptLink = anchors.find((a) => {
      const text = a.text.toLowerCase();
      const haystack = `${a.text} ${a.href}`.toLowerCase();
      return /\bppt\b/.test(text) || /investor presentation/.test(haystack) || /presentation/.test(a.href.toLowerCase());
    });
    if (pptLink && isPdfUrl(pptLink.href)) {
      return { anchor: pptLink, rowYear };
    }
    rowMatch = rowRegex.exec(listHtml);
  }

  return null;
}

function pickAnnualFallback(anchors: ParsedAnchor[]): ParsedAnchor | null {
  for (const anchor of anchors) {
    const text = anchor.text.toLowerCase();
    const attrs = anchor.attrs.toLowerCase();
    if (!isPdfUrl(anchor.href)) continue;
    if (/annual\s*report|financial year/.test(text) || attrs.includes('annual+report')) return anchor;
  }
  return null;
}

function pickPresentationFallback(anchors: ParsedAnchor[]): ParsedAnchor | null {
  for (const anchor of anchors) {
    if (!isPdfUrl(anchor.href)) continue;
    if (/\bppt\b/i.test(anchor.text)) return anchor;
  }
  for (const anchor of anchors) {
    if (!isPdfUrl(anchor.href)) continue;
    if (/investor presentation/i.test(anchor.text)) return anchor;
  }
  for (const anchor of anchors) {
    if (!isPdfUrl(anchor.href)) continue;
    if (/presentation/i.test(anchor.href.toLowerCase())) return anchor;
  }
  return null;
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

  return withServerCache(`india-docs:v2:${baseSymbol}`, 6 * 60 * 60_000, async () => {
    const pageUrl = `https://www.screener.in/company/${encodeURIComponent(baseSymbol)}/consolidated/`;
    const html = await fetchHtml(pageUrl);
    const anchors = parseAnchors(html, pageUrl);

    const annual = pickLatestAnnualFromSection(html, pageUrl) ?? pickAnnualFallback(anchors);
    const latestPresentation = pickLatestPresentationFromConcalls(html, pageUrl);
    const presentation = latestPresentation?.anchor ?? pickPresentationFallback(anchors);

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
      const year = latestPresentation?.rowYear ?? parseYear(`${presentation.text} ${presentation.href}`);
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
