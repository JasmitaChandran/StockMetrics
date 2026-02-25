import type { ExchangeCode, MarketKind, SearchEntity } from '@/types';
import { withServerCache } from './server-cache';
import { demoUniverse } from '@/lib/data/mock/demo-data';

const SEARCH_TTL_MS = 12 * 60 * 60_000;

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9.\s:&-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function scoreEntity(entity: SearchEntity, query: string) {
  const q = normalizeText(query);
  if (!q) return 0;
  const symbol = normalizeText(entity.displaySymbol || entity.symbol);
  const fullSymbol = normalizeText(entity.symbol);
  const name = normalizeText(entity.name);
  const aliases = normalizeText((entity.aliases ?? []).join(' '));
  let score = 0;
  if (symbol === q || fullSymbol === q) score += 120;
  if (symbol.startsWith(q) || fullSymbol.startsWith(q)) score += 100;
  if (name.startsWith(q)) score += 90;
  if (name.includes(q)) score += 60;
  if (aliases.includes(q)) score += 50;
  const qTokens = q.split(' ').filter(Boolean);
  const text = `${symbol} ${fullSymbol} ${name} ${aliases}`;
  for (const t of qTokens) {
    if (text.includes(t)) score += 12;
  }
  if (entity.market === 'india' && /nse|bse/.test(q)) score += 5;
  if (entity.market === 'mf' && /fund|mutual/.test(q)) score += 5;
  return score;
}

async function fetchText(url: string) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'StockMetrics/1.0' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed ${res.status} for ${url}`);
  return res.text();
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'StockMetrics/1.0' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed ${res.status} for ${url}`);
  return (await res.json()) as T;
}

function parsePipeFile(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => line.split('|').map((c) => c.trim()));
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out;
}

function usEntity(symbol: string, name: string, exchange: ExchangeCode): SearchEntity {
  return {
    id: `us:${symbol}`,
    symbol,
    displaySymbol: symbol,
    name,
    market: 'us',
    exchange,
    country: 'United States',
    currency: 'USD',
    type: 'stock',
    aliases: [symbol, name],
  };
}

async function loadUsIndex(): Promise<SearchEntity[]> {
  return withServerCache('search-index:us', SEARCH_TTL_MS, async () => {
    const [nasdaqText, otherText] = await Promise.all([
      fetchText('https://www.nasdaqtrader.com/dynamic/symdir/nasdaqlisted.txt'),
      fetchText('https://www.nasdaqtrader.com/dynamic/symdir/otherlisted.txt'),
    ]);

    const nasdaqRows = parsePipeFile(nasdaqText);
    const otherRows = parsePipeFile(otherText);

    const out: SearchEntity[] = [];

    for (const row of nasdaqRows.slice(1)) {
      if (row[0]?.startsWith('File Creation Time')) continue;
      const [symbol, securityName, , testIssue, , , etf] = row;
      if (!symbol || !securityName || testIssue === 'Y') continue;
      if (/warrant|rights|unit/i.test(securityName)) continue;
      out.push({
        ...usEntity(symbol, securityName, 'NASDAQ'),
        type: etf === 'Y' ? 'stock' : 'stock',
      });
    }

    for (const row of otherRows.slice(1)) {
      if (row[0]?.startsWith('File Creation Time')) continue;
      const [actSymbol, securityName, exchangeCode, , etf, , testIssue] = row;
      if (!actSymbol || !securityName || testIssue === 'Y') continue;
      if (/warrant|rights|unit/i.test(securityName)) continue;
      const exchange: ExchangeCode =
        exchangeCode === 'N' ? 'NYSE' : exchangeCode === 'A' ? 'AMEX' : exchangeCode === 'P' ? 'NYSE' : 'UNKNOWN';
      out.push({
        ...usEntity(actSymbol, securityName, exchange),
        type: etf === 'Y' ? 'stock' : 'stock',
      });
    }

    const dedup = new Map<string, SearchEntity>();
    for (const item of out) {
      if (!dedup.has(item.symbol)) dedup.set(item.symbol, item);
    }
    return Array.from(dedup.values());
  });
}

async function loadIndiaIndex(): Promise<SearchEntity[]> {
  return withServerCache('search-index:india', SEARCH_TTL_MS, async () => {
    const csv = await fetchText('https://archives.nseindia.com/content/equities/EQUITY_L.csv');
    const lines = csv.split(/\r?\n/).filter((line) => line.trim());
    const header = parseCsvLine(lines[0] ?? '');
    const symbolIdx = header.findIndex((h) => /symbol/i.test(h));
    const nameIdx = header.findIndex((h) => /name of company/i.test(h));
    const out: SearchEntity[] = [];
    for (const line of lines.slice(1)) {
      const cols = parseCsvLine(line);
      const nseSymbol = cols[symbolIdx]?.trim();
      const name = cols[nameIdx]?.trim();
      if (!nseSymbol || !name) continue;
      out.push({
        id: `india:${nseSymbol}`,
        symbol: `${nseSymbol}.NS`,
        displaySymbol: nseSymbol,
        name,
        market: 'india',
        exchange: 'NSE',
        country: 'India',
        currency: 'INR',
        type: 'stock',
        aliases: [nseSymbol, name],
      });
    }
    return out;
  });
}

async function loadMutualFundIndex(): Promise<SearchEntity[]> {
  return withServerCache('search-index:mf', SEARCH_TTL_MS, async () => {
    try {
      const list = await fetchJson<Array<{ schemeCode: number; schemeName: string }>>('https://api.mfapi.in/mf');
      return list
        .filter((x) => x.schemeCode && x.schemeName)
        .map((x) => ({
          id: `mf:AMFI_${x.schemeCode}`,
          symbol: `AMFI:${x.schemeCode}`,
          displaySymbol: String(x.schemeCode),
          name: x.schemeName.trim(),
          market: 'mf',
          exchange: 'MF',
          country: 'India',
          currency: 'INR',
          type: 'mutual_fund',
          aliases: [String(x.schemeCode), x.schemeName, 'mutual fund'],
          summary: 'Indian mutual fund scheme (MFAPI/AMFI dataset).',
        }));
    } catch {
      const txt = await fetchText('https://www.amfiindia.com/spages/NAVAll.txt');
      const lines = txt.split(/\r?\n/);
      const out: SearchEntity[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (!/^\d+;/.test(trimmed)) continue;
        const parts = trimmed.split(';');
        if (parts.length < 6) continue;
        const [schemeCode, , , schemeName] = parts;
        if (!schemeCode || !schemeName) continue;
        out.push({
          id: `mf:AMFI_${schemeCode}`,
          symbol: `AMFI:${schemeCode}`,
          displaySymbol: schemeCode,
          name: schemeName.trim(),
          market: 'mf',
          exchange: 'MF',
          country: 'India',
          currency: 'INR',
          type: 'mutual_fund',
          aliases: [schemeCode, schemeName, 'mutual fund'],
          summary: 'Indian mutual fund scheme (AMFI).',
        });
      }
      return out;
    }
  });
}

export async function getSearchIndex(market?: MarketKind): Promise<SearchEntity[]> {
  if (market === 'us') {
    try {
      return await loadUsIndex();
    } catch {
      return demoUniverse.filter((e) => e.market === 'us');
    }
  }
  if (market === 'india') {
    try {
      return await loadIndiaIndex();
    } catch {
      return demoUniverse.filter((e) => e.market === 'india');
    }
  }
  if (market === 'mf') {
    try {
      return await loadMutualFundIndex();
    } catch {
      return demoUniverse.filter((e) => e.market === 'mf');
    }
  }

  const settled = await Promise.allSettled([loadUsIndex(), loadIndiaIndex(), loadMutualFundIndex()]);
  const us = settled[0].status === 'fulfilled' ? settled[0].value : demoUniverse.filter((e) => e.market === 'us');
  const india =
    settled[1].status === 'fulfilled' ? settled[1].value : demoUniverse.filter((e) => e.market === 'india');
  const mf = settled[2].status === 'fulfilled' ? settled[2].value : demoUniverse.filter((e) => e.market === 'mf');
  return [...demoUniverse, ...india, ...us, ...mf];
}

export async function universalSearch(query: string, opts?: { market?: MarketKind; limit?: number }): Promise<SearchEntity[]> {
  const limit = opts?.limit ?? 12;
  const q = query.trim();
  const base = await getSearchIndex(opts?.market);
  if (!q) return base.slice(0, limit);

  const scored = base
    .map((entity) => ({ entity, score: scoreEntity(entity, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.entity.name.localeCompare(b.entity.name);
    });

  const dedup = new Map<string, SearchEntity>();
  for (const item of scored) {
    if (!dedup.has(item.entity.symbol)) dedup.set(item.entity.symbol, item.entity);
    if (dedup.size >= limit) break;
  }
  return Array.from(dedup.values());
}

export async function resolveSearchEntityBySymbol(symbol: string): Promise<SearchEntity | null> {
  const target = symbol.trim().toUpperCase();
  if (!target) return null;
  const demo = demoUniverse.find(
    (e) => e.symbol.toUpperCase() === target || e.displaySymbol.toUpperCase() === target || e.id.toUpperCase() === target,
  );
  if (demo) return demo;

  if (target.startsWith('AMFI:')) {
    const all = await getSearchIndex('mf');
    const match = all.find((e) => e.symbol.toUpperCase() === target || e.displaySymbol.toUpperCase() === target.replace('AMFI:', ''));
    if (match) return match;
  }

  if (target.endsWith('.NS')) {
    const all = await getSearchIndex('india');
    const match = all.find((e) => e.symbol.toUpperCase() === target || `${e.displaySymbol}.NS`.toUpperCase() === target);
    if (match) return match;
    const base = target.replace(/\.NS$/, '');
    return {
      id: `india:${base}`,
      symbol: `${base}.NS`,
      displaySymbol: base,
      name: base,
      market: 'india',
      exchange: 'NSE',
      country: 'India',
      currency: 'INR',
      type: 'stock',
      aliases: [base],
    };
  }

  if (target.endsWith('.BO')) {
    const base = target.replace(/\.BO$/, '');
    return {
      id: `india:${base}:BSE`,
      symbol: `${base}.BO`,
      displaySymbol: base,
      name: base,
      market: 'india',
      exchange: 'BSE',
      country: 'India',
      currency: 'INR',
      type: 'stock',
      aliases: [base],
    };
  }

  const us = await getSearchIndex('us');
  const usMatch = us.find((e) => e.symbol.toUpperCase() === target || e.displaySymbol.toUpperCase() === target);
  if (usMatch) return usMatch;

  const india = await getSearchIndex('india');
  const indiaMatch = india.find((e) => e.displaySymbol.toUpperCase() === target || e.symbol.toUpperCase() === `${target}.NS`);
  if (indiaMatch) return indiaMatch;

  const mf = await getSearchIndex('mf');
  const mfByCode = mf.find((e) => e.displaySymbol.toUpperCase() === target || e.symbol.toUpperCase() === `AMFI:${target}`);
  if (mfByCode) return mfByCode;

  // Final fallback: best-effort US ticker stub for direct symbol URLs.
  return {
    id: `us:${target}`,
    symbol: target,
    displaySymbol: target,
    name: target,
    market: 'us',
    exchange: 'UNKNOWN',
    country: 'United States',
    currency: 'USD',
    type: 'stock',
    aliases: [target],
  };
}
