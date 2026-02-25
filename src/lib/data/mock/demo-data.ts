import type {
  DocumentLink,
  FinancialStatementTable,
  FundamentalsBundle,
  HistorySeries,
  MarketKind,
  NewsItem,
  PricePoint,
  Quote,
  SearchEntity,
} from '@/types';
import { mapMetricEntries } from '@/lib/utils/metrics';

export const demoUniverse: SearchEntity[] = [
  {
    id: 'india:HDFCBANK',
    symbol: 'HDFCBANK.NS',
    displaySymbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd',
    market: 'india',
    exchange: 'NSE',
    sector: 'Financial Services',
    industry: 'Banks',
    country: 'India',
    website: 'https://www.hdfcbank.com',
    summary: 'Large private sector bank in India offering retail, wholesale and treasury services.',
    aliases: ['hdfc bank', 'hdfcbank'],
    currency: 'INR',
    type: 'stock',
  },
  {
    id: 'india:ICICIBANK',
    symbol: 'ICICIBANK.NS',
    displaySymbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd',
    market: 'india',
    exchange: 'NSE',
    sector: 'Financial Services',
    industry: 'Banks',
    country: 'India',
    website: 'https://www.icicibank.com',
    summary: 'Indian private bank with strong retail and digital banking presence.',
    aliases: ['icici', 'icici bank'],
    currency: 'INR',
    type: 'stock',
  },
  {
    id: 'india:AXISBANK',
    symbol: 'AXISBANK.NS',
    displaySymbol: 'AXISBANK',
    name: 'Axis Bank Ltd',
    market: 'india',
    exchange: 'NSE',
    sector: 'Financial Services',
    industry: 'Banks',
    country: 'India',
    website: 'https://www.axisbank.com',
    summary: 'Major Indian private bank serving consumer and corporate banking segments.',
    aliases: ['axis bank'],
    currency: 'INR',
    type: 'stock',
  },
  {
    id: 'india:KOTAKBANK',
    symbol: 'KOTAKBANK.NS',
    displaySymbol: 'KOTAKBANK',
    name: 'Kotak Mahindra Bank Ltd',
    market: 'india',
    exchange: 'NSE',
    sector: 'Financial Services',
    industry: 'Banks',
    country: 'India',
    website: 'https://www.kotak.com',
    summary: 'Diversified Indian financial services company with banking, broking and insurance.',
    aliases: ['kotak bank', 'kotak'],
    currency: 'INR',
    type: 'stock',
  },
  {
    id: 'india:IDBI',
    symbol: 'IDBI.NS',
    displaySymbol: 'IDBI',
    name: 'IDBI Bank Ltd',
    market: 'india',
    exchange: 'NSE',
    sector: 'Financial Services',
    industry: 'Banks',
    country: 'India',
    website: 'https://www.idbibank.in',
    summary: 'Indian bank with government and institutional shareholding profile.',
    aliases: ['idbi bank'],
    currency: 'INR',
    type: 'stock',
  },
  {
    id: 'india:RELIANCE',
    symbol: 'RELIANCE.NS',
    displaySymbol: 'RELIANCE',
    name: 'Reliance Industries Ltd',
    market: 'india',
    exchange: 'NSE',
    sector: 'Energy',
    industry: 'Refining & Petrochemicals',
    country: 'India',
    website: 'https://www.ril.com',
    summary: 'Indian conglomerate across energy, telecom, retail and digital services.',
    aliases: ['ril', 'reliance industries'],
    currency: 'INR',
    type: 'stock',
  },
  {
    id: 'india:TCS',
    symbol: 'TCS.NS',
    displaySymbol: 'TCS',
    name: 'Tata Consultancy Services Ltd',
    market: 'india',
    exchange: 'NSE',
    sector: 'Technology',
    industry: 'IT Services',
    country: 'India',
    website: 'https://www.tcs.com',
    summary: 'Large Indian IT services exporter with global enterprise clients.',
    aliases: ['tata consultancy services'],
    currency: 'INR',
    type: 'stock',
  },
  {
    id: 'india:INFY',
    symbol: 'INFY.NS',
    displaySymbol: 'INFY',
    name: 'Infosys Ltd',
    market: 'india',
    exchange: 'NSE',
    sector: 'Technology',
    industry: 'IT Services',
    country: 'India',
    website: 'https://www.infosys.com',
    summary: 'Indian IT services and consulting company focused on digital transformation.',
    aliases: ['infosys'],
    currency: 'INR',
    type: 'stock',
  },
  {
    id: 'us:AAPL',
    symbol: 'AAPL',
    displaySymbol: 'AAPL',
    name: 'Apple Inc.',
    market: 'us',
    exchange: 'NASDAQ',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    country: 'United States',
    website: 'https://www.apple.com',
    summary: 'Consumer electronics and software company known for iPhone, Mac and Services.',
    aliases: ['apple'],
    currency: 'USD',
    type: 'stock',
  },
  {
    id: 'us:MSFT',
    symbol: 'MSFT',
    displaySymbol: 'MSFT',
    name: 'Microsoft Corporation',
    market: 'us',
    exchange: 'NASDAQ',
    sector: 'Technology',
    industry: 'Software',
    country: 'United States',
    website: 'https://www.microsoft.com',
    summary: 'Software and cloud computing company with Azure, Office and enterprise products.',
    aliases: ['microsoft'],
    currency: 'USD',
    type: 'stock',
  },
  {
    id: 'us:GOOGL',
    symbol: 'GOOGL',
    displaySymbol: 'GOOGL',
    name: 'Alphabet Inc.',
    market: 'us',
    exchange: 'NASDAQ',
    sector: 'Communication Services',
    industry: 'Internet Content & Information',
    country: 'United States',
    website: 'https://abc.xyz',
    summary: 'Parent company of Google with search, ads, cloud and other ventures.',
    aliases: ['google', 'alphabet'],
    currency: 'USD',
    type: 'stock',
  },
  {
    id: 'mf:UTI_NIFTY50',
    symbol: 'UTI-NIFTY-50-IDX',
    displaySymbol: 'UTI Nifty 50 Index Fund',
    name: 'UTI Nifty 50 Index Fund',
    market: 'mf',
    exchange: 'MF',
    sector: 'Mutual Fund',
    industry: 'Index Fund',
    country: 'India',
    summary: 'Indian mutual fund tracking the Nifty 50 index.',
    aliases: ['uti nifty 50', 'index fund'],
    currency: 'INR',
    type: 'mutual_fund',
  },
  {
    id: 'mf:PARAG_FLEXI',
    symbol: 'PARAG-FLEXI-CAP',
    displaySymbol: 'Parag Parikh Flexi Cap',
    name: 'Parag Parikh Flexi Cap Fund',
    market: 'mf',
    exchange: 'MF',
    sector: 'Mutual Fund',
    industry: 'Flexi Cap',
    country: 'India',
    summary: 'Popular Indian flexi-cap mutual fund investing across market caps.',
    aliases: ['ppfas', 'parag parikh'],
    currency: 'INR',
    type: 'mutual_fund',
  },
];

const demoMetricInputs: Record<string, Record<string, number>> = {
  'HDFCBANK.NS': {
    sales: 268000,
    opm: 43.2,
    pat: 62000,
    marketCap: 1225000,
    salesLatestQuarter: 71500,
    patLatestQuarter: 16500,
    yoyQuarterlySalesGrowth: 15.5,
    yoyQuarterlyProfitGrowth: 18.1,
    pe: 19.4,
    dividendYield: 1.1,
    pb: 2.7,
    roce: 8.6,
    roa: 1.9,
    debtToEquity: 6.1,
    roe: 15.4,
    eps: 82.6,
    debt: 2480000,
    promoterHolding: 0,
    changeInPromoterHolding: 0,
    earningsYield: 5.1,
    pledgedPercentage: 0,
    industryPe: 18.7,
    salesGrowth: 16.3,
    profitGrowth: 17.8,
    currentPrice: 1662,
    priceToSales: 4.5,
    priceToFcf: 12.1,
    evEbitda: 11.8,
    enterpriseValue: 1560000,
    currentRatio: 1.1,
    interestCoverage: 1.5,
    pegRatio: 1.2,
    return3m: 8.4,
    return6m: 12.7,
  },
  'ICICIBANK.NS': {
    sales: 221000,
    opm: 39.8,
    pat: 46500,
    marketCap: 890000,
    salesLatestQuarter: 59000,
    patLatestQuarter: 12600,
    yoyQuarterlySalesGrowth: 14.2,
    yoyQuarterlyProfitGrowth: 16.5,
    pe: 18.8,
    dividendYield: 0.8,
    pb: 2.9,
    roce: 7.8,
    roa: 1.7,
    debtToEquity: 6.5,
    roe: 16.0,
    eps: 67.4,
    debt: 2190000,
    promoterHolding: 0,
    changeInPromoterHolding: 0,
    earningsYield: 5.3,
    pledgedPercentage: 0,
    industryPe: 18.7,
    salesGrowth: 15.1,
    profitGrowth: 18.9,
    currentPrice: 1268,
    priceToSales: 4.0,
    priceToFcf: 11.2,
    evEbitda: 10.9,
    enterpriseValue: 1120000,
    currentRatio: 1.0,
    interestCoverage: 1.4,
    pegRatio: 1.1,
    return3m: 9.8,
    return6m: 16.4,
  },
  'AAPL': {
    sales: 383285,
    opm: 30.3,
    pat: 96995,
    marketCap: 2900000,
    salesLatestQuarter: 119600,
    patLatestQuarter: 33900,
    yoyQuarterlySalesGrowth: 2.1,
    yoyQuarterlyProfitGrowth: 4.4,
    pe: 29.2,
    dividendYield: 0.5,
    pb: 43.1,
    roce: 54.3,
    roa: 27.7,
    debtToEquity: 1.7,
    roe: 147.4,
    eps: 6.15,
    debt: 123000,
    earningsYield: 3.4,
    industryPe: 28.0,
    salesGrowth: 2.6,
    profitGrowth: 5.2,
    currentPrice: 188,
    priceToSales: 7.5,
    priceToFcf: 29.9,
    evEbitda: 21.4,
    enterpriseValue: 3015000,
    currentRatio: 1.1,
    interestCoverage: 35.2,
    pegRatio: 2.3,
    return3m: -2.5,
    return6m: 6.4,
  },
  'MSFT': {
    sales: 211915,
    opm: 44.6,
    pat: 72361,
    marketCap: 3100000,
    salesLatestQuarter: 62000,
    patLatestQuarter: 22000,
    yoyQuarterlySalesGrowth: 12.7,
    yoyQuarterlyProfitGrowth: 17.5,
    pe: 34.1,
    dividendYield: 0.7,
    pb: 11.3,
    roce: 33.1,
    roa: 16.8,
    debtToEquity: 0.4,
    roe: 35.9,
    eps: 9.67,
    debt: 81000,
    earningsYield: 2.9,
    industryPe: 30.5,
    salesGrowth: 11.4,
    profitGrowth: 16.0,
    currentPrice: 415,
    priceToSales: 14.8,
    priceToFcf: 29.4,
    evEbitda: 24.5,
    enterpriseValue: 3142000,
    currentRatio: 1.8,
    interestCoverage: 42.1,
    pegRatio: 2.1,
    return3m: 4.9,
    return6m: 11.8,
  },
};

function buildStatementTable(
  kind: FinancialStatementTable['kind'],
  title: string,
  years: string[],
  rows: Array<[string, number[]]>,
  source: string,
): FinancialStatementTable {
  return {
    kind,
    title,
    years,
    rows: rows.map(([label, values]) => ({
      label,
      valuesByYear: Object.fromEntries(years.map((y, i) => [y, values[i] ?? null])),
    })),
    consolidatedAvailable: true,
    standaloneAvailable: true,
    activeViewDefault: 'consolidated',
    source,
  };
}

function mkStatements(base: { revenue: number; profit: number; assets: number; debt: number }): FinancialStatementTable[] {
  const years = ['2021', '2022', '2023', '2024', '2025'];
  const revenue = [0.72, 0.83, 0.91, 1.0, 1.08].map((m) => Math.round(base.revenue * m));
  const profit = [0.65, 0.78, 0.87, 1.0, 1.13].map((m) => Math.round(base.profit * m));
  const assets = [0.82, 0.88, 0.94, 1.0, 1.07].map((m) => Math.round(base.assets * m));
  const debt = [1.15, 1.08, 1.02, 1.0, 0.96].map((m) => Math.round(base.debt * m));
  return [
    buildStatementTable(
      'profitLoss',
      'Profit and Loss',
      years,
      [
        ['Revenue', revenue],
        ['Operating Profit', profit.map((p) => Math.round(p * 1.4))],
        ['Net Profit', profit],
      ],
      'Reference fundamentals dataset',
    ),
    buildStatementTable(
      'quarterly',
      'Quarterly Results',
      ['Q2 FY24', 'Q3 FY24', 'Q4 FY24', 'Q1 FY25', 'Q2 FY25'],
      [
        ['Revenue', [0.2, 0.22, 0.23, 0.24, 0.25].map((m) => Math.round(base.revenue * m))],
        ['Net Profit', [0.045, 0.05, 0.052, 0.054, 0.056].map((m) => Math.round(base.revenue * m))],
      ],
      'Reference fundamentals dataset',
    ),
    buildStatementTable(
      'balanceSheet',
      'Balance Sheet',
      years,
      [
        ['Total Assets', assets],
        ['Total Debt', debt],
        ['Net Worth', assets.map((a, i) => Math.round(a - debt[i] * 0.35))],
      ],
      'Reference fundamentals dataset',
    ),
    buildStatementTable(
      'cashFlow',
      'Cash Flow',
      years,
      [
        ['Cash from Operations', profit.map((p) => Math.round(p * 1.2))],
        ['Capital Expenditure', profit.map((p) => -Math.round(p * 0.4))],
        ['Free Cash Flow', profit.map((p) => Math.round(p * 0.8))],
      ],
      'Reference fundamentals dataset',
    ),
  ];
}

function shareholdingFor(symbol: string) {
  if (symbol.endsWith('.NS')) {
    const bank = /BANK|IDBI/.test(symbol);
    return {
      promoters: bank ? 0 : 49.1,
      fiis: bank ? 41.2 : 22.4,
      diis: bank ? 33.4 : 18.7,
      government: /IDBI/.test(symbol) ? 45.5 : 0,
      public: bank ? 25.4 : 9.8,
      asOf: '2025-12-31',
    };
  }
  return {
    promoters: 0,
    fiis: 72,
    diis: 18,
    public: 10,
    asOf: '2025-12-31',
  };
}

export const demoFundamentalsBySymbol: Record<string, FundamentalsBundle> = Object.fromEntries(
  demoUniverse
    .filter((e) => e.type === 'stock')
    .map((entity) => {
      const metricInput = demoMetricInputs[entity.symbol] ?? {
        sales: entity.market === 'us' ? 120000 : 150000,
        opm: 22,
        pat: entity.market === 'us' ? 22000 : 18000,
        marketCap: entity.market === 'us' ? 650000 : 350000,
        salesLatestQuarter: entity.market === 'us' ? 30000 : 38000,
        patLatestQuarter: entity.market === 'us' ? 7000 : 6000,
        yoyQuarterlySalesGrowth: 9,
        yoyQuarterlyProfitGrowth: 11,
        pe: 22,
        dividendYield: 1,
        pb: 3,
        roce: 18,
        roa: 9,
        debtToEquity: 0.5,
        roe: 17,
        eps: 28,
        debt: entity.market === 'us' ? 32000 : 44000,
        earningsYield: 4.5,
        industryPe: 23,
        salesGrowth: 12,
        profitGrowth: 13,
        currentPrice: entity.market === 'us' ? 120 : 1200,
        priceToSales: 4,
        priceToFcf: 18,
        evEbitda: 14,
        enterpriseValue: entity.market === 'us' ? 700000 : 410000,
        currentRatio: 1.6,
        interestCoverage: 8,
        pegRatio: 1.4,
        return3m: 5,
        return6m: 10,
      };
      const statements = mkStatements({
        revenue: metricInput.sales,
        profit: metricInput.pat,
        assets: (metricInput.enterpriseValue || metricInput.marketCap) * 0.8,
        debt: metricInput.debt || 0,
      });
      const peers =
        entity.industry === 'Banks'
          ? ['HDFCBANK.NS', 'ICICIBANK.NS', 'AXISBANK.NS', 'KOTAKBANK.NS', 'IDBI.NS'].filter(
              (s) => s !== entity.symbol,
            )
          : entity.industry === 'IT Services'
            ? ['TCS.NS', 'INFY.NS'].filter((s) => s !== entity.symbol)
            : entity.market === 'us'
              ? ['AAPL', 'MSFT', 'GOOGL'].filter((s) => s !== entity.symbol)
              : [];
      const bundle: FundamentalsBundle = {
        companyId: entity.id,
        companyName: entity.name,
        summary: entity.summary,
        website: entity.website,
        sector: entity.sector,
        industry: entity.industry,
        marketCap: metricInput.marketCap,
        currency: entity.currency ?? 'INR',
        keyMetrics: mapMetricEntries(metricInput, entity.currency ?? 'INR'),
        statements,
        shareholding: shareholdingFor(entity.symbol),
        peerSymbols: peers,
        source: entity.market === 'india' ? 'Reference fundamentals dataset + market data (India coverage varies by source)' : 'Reference fundamentals dataset',
        notes: [
          'Some advanced ratios may be unavailable for certain securities depending on data coverage.',
          'The UI hides missing metrics instead of showing placeholders.',
        ],
      };
      return [entity.symbol, bundle];
    }),
);

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateDemoHistory(entity: SearchEntity): HistorySeries {
  const rand = seededRandom(Array.from(entity.symbol).reduce((a, c) => a + c.charCodeAt(0), 0));
  const points: PricePoint[] = [];
  const days = entity.market === 'mf' ? 520 : 1600;
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  let price =
    demoFundamentalsBySymbol[entity.symbol]?.keyMetrics.find((m) => m.key === 'currentPrice')?.value ??
    (entity.market === 'us' ? 100 : 1000);
  for (let i = 0; i <= days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const weekday = d.getDay();
    if (weekday === 0 || weekday === 6) continue;
    const drift = entity.market === 'mf' ? 0.0002 : 0.00035;
    const shock = (rand() - 0.5) * (entity.market === 'mf' ? 0.015 : 0.03);
    price = Math.max(1, price * (1 + drift + shock));
    points.push({
      ts: d.toISOString(),
      close: Number(price.toFixed(2)),
      volume: entity.market === 'mf' ? undefined : Math.round(1_000_000 + rand() * 5_000_000),
    });
  }
  return {
    symbol: entity.symbol,
    currency: entity.currency ?? 'INR',
    points,
    source: 'Reference historical series',
    delayed: true,
  };
}

export function deriveQuoteFromHistory(entity: SearchEntity, history: HistorySeries): Quote {
  const last = history.points[history.points.length - 1];
  const prev = history.points[history.points.length - 2] ?? last;
  const change = last ? last.close - prev.close : null;
  const changePercent = last && prev?.close ? (change! / prev.close) * 100 : null;
  return {
    symbol: entity.symbol,
    market: entity.market,
    exchange: entity.exchange,
    currency: history.currency,
    price: last?.close ?? null,
    previousClose: prev?.close ?? null,
    change,
    changePercent,
    timestamp: last?.ts ?? null,
    source: history.source,
    delayed: true,
  };
}

export function getDemoNews(entity: SearchEntity): NewsItem[] {
  return [
    {
      id: `${entity.symbol}-news-1`,
      title: `${entity.name} quarterly update highlights steady growth`,
      source: 'Market News',
      url: entity.website ?? 'https://example.com',
      publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      snippet: `${entity.name} reported business updates and management commentary relevant for long-term investors.`,
      relevanceScore: 0.9,
    },
    {
      id: `${entity.symbol}-news-2`,
      title: `Sector peers move after macro policy commentary`,
      source: 'Market News',
      url: 'https://example.com/markets',
      publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      snippet: `Sector sentiment remains mixed; investors focus on margin outlook and capital allocation.`,
      relevanceScore: 0.65,
    },
  ];
}

export function getDemoDocuments(entity: SearchEntity): DocumentLink[] {
  if (entity.market === 'mf') return [];
  return [
    {
      id: `${entity.symbol}-ar-2024`,
      title: 'Annual Report 2024',
      url: entity.website ?? 'https://example.com',
      kind: 'annual_report',
      year: 2024,
      source: 'Company Documents',
    },
    {
      id: `${entity.symbol}-presentation`,
      title: 'Investor Presentation',
      url: entity.website ?? 'https://example.com',
      kind: 'presentation',
      source: 'Company Documents',
    },
  ];
}
