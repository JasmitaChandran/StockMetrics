import type { FinancialStatementTable, FundamentalsBundle, MetricValue } from '@/types';
import { withServerCache } from './server-cache';
import { METRIC_LABELS } from '@/lib/utils/metrics';

const SEC_HEADERS = {
  'User-Agent': 'Stock Metrics stockmetrics@example.com',
  Accept: 'application/json',
};

interface SecTickerMapEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

type SecTickerMap = Record<string, SecTickerMapEntry>;

type SecFactItem = {
  end?: string;
  val?: number;
  fy?: number;
  fp?: string;
  form?: string;
  filed?: string;
  frame?: string;
};

interface CompanyFactsResponse {
  facts?: {
    'us-gaap'?: Record<string, { label?: string; units?: Record<string, SecFactItem[]> }>;
  };
  entityName?: string;
}

interface SecSubmissionsResponse {
  sicDescription?: string;
  filings?: {
    recent?: {
      accessionNumber?: string[];
      filingDate?: string[];
      form?: string[];
      primaryDocument?: string[];
    };
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: SEC_HEADERS, next: { revalidate: 60 * 60 } });
  if (!res.ok) throw new Error(`SEC fetch failed ${res.status}`);
  return (await res.json()) as T;
}

async function getTickerMap() {
  return withServerCache('sec-tickers', 24 * 60 * 60_000, () =>
    fetchJson<SecTickerMap>('https://www.sec.gov/files/company_tickers.json'),
  );
}

async function getCikForTicker(ticker: string) {
  const map = await getTickerMap();
  const entry = Object.values(map).find((x) => x.ticker.toUpperCase() === ticker.toUpperCase());
  if (!entry) throw new Error('Ticker not found in SEC mapping');
  return String(entry.cik_str).padStart(10, '0');
}

function getFactSeries(facts: CompanyFactsResponse, tags: string[]): SecFactItem[] {
  const gaap = facts.facts?.['us-gaap'] ?? {};
  for (const tag of tags) {
    const obj = gaap[tag];
    if (!obj?.units) continue;
    const unitEntries = Object.values(obj.units)[0];
    if (unitEntries?.length) return unitEntries;
  }
  return [];
}

function latestValue(items: SecFactItem[], predicate?: (i: SecFactItem) => boolean) {
  return items
    .filter((i) => typeof i.val === 'number' && (!predicate || predicate(i)))
    .sort((a, b) => (a.end || '').localeCompare(b.end || ''))
    .at(-1)?.val;
}

function yearlySeries(items: SecFactItem[], max = 5) {
  const annual = items.filter((i) => i.fp === 'FY' && typeof i.val === 'number' && i.end);
  const dedup = new Map<string, number>();
  for (const item of annual) dedup.set(item.end!, item.val!);
  return Array.from(dedup.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-max)
    .map(([end, val]) => ({ end, val }));
}

function quarterlySeries(items: SecFactItem[], max = 5) {
  const quarterly = items.filter((i) => /^Q[1-4]$/.test(i.fp || '') && typeof i.val === 'number' && i.end);
  const dedup = new Map<string, { val: number; fp?: string; fy?: number }>();
  for (const item of quarterly) dedup.set(item.end!, { val: item.val!, fp: item.fp, fy: item.fy });
  return Array.from(dedup.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-max)
    .map(([end, x]) => ({ end, ...x }));
}

function tableFromSeries(
  kind: FinancialStatementTable['kind'],
  title: string,
  rowsInput: Array<{ label: string; series: Array<{ label: string; value: number }> }>,
  source: string,
): FinancialStatementTable {
  const years = Array.from(new Set(rowsInput.flatMap((r) => r.series.map((p) => p.label))));
  return {
    kind,
    title,
    years,
    rows: rowsInput.map((r) => ({
      label: r.label,
      valuesByYear: Object.fromEntries(years.map((y) => [y, r.series.find((p) => p.label === y)?.value ?? null])),
    })),
    consolidatedAvailable: false,
    standaloneAvailable: true,
    activeViewDefault: 'standalone',
    source,
  };
}

export async function getSecFundamentals(ticker: string): Promise<FundamentalsBundle> {
  return withServerCache(`sec-fundamentals:${ticker}`, 6 * 60 * 60_000, async () => {
    const cik = await getCikForTicker(ticker);
    const [facts, submissions] = await Promise.all([
      fetchJson<CompanyFactsResponse>(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`),
      fetchJson<SecSubmissionsResponse>(`https://data.sec.gov/submissions/CIK${cik}.json`),
    ]);

    const revenues = getFactSeries(facts, ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax']);
    const netIncome = getFactSeries(facts, ['NetIncomeLoss']);
    const assets = getFactSeries(facts, ['Assets']);
    const liabilities = getFactSeries(facts, ['Liabilities']);
    const equity = getFactSeries(facts, ['StockholdersEquity']);
    const debt = getFactSeries(facts, ['LongTermDebtAndFinanceLeaseObligations', 'LongTermDebt']);
    const currentAssets = getFactSeries(facts, ['AssetsCurrent']);
    const currentLiabilities = getFactSeries(facts, ['LiabilitiesCurrent']);
    const epsDiluted = getFactSeries(facts, ['EarningsPerShareDiluted']);
    const opIncome = getFactSeries(facts, ['OperatingIncomeLoss']);
    const interestExpense = getFactSeries(facts, ['InterestExpense']);
    const cfo = getFactSeries(facts, ['NetCashProvidedByUsedInOperatingActivities']);
    const capex = getFactSeries(facts, ['PaymentsToAcquirePropertyPlantAndEquipment']);

    const latestRevenue = latestValue(revenues, (i) => i.fp === 'FY') ?? latestValue(revenues);
    const latestProfit = latestValue(netIncome, (i) => i.fp === 'FY') ?? latestValue(netIncome);
    const latestAssets = latestValue(assets);
    const latestLiabilities = latestValue(liabilities);
    const latestEquity = latestValue(equity);
    const latestDebt = latestValue(debt);
    const latestCurrentAssets = latestValue(currentAssets);
    const latestCurrentLiabilities = latestValue(currentLiabilities);
    const latestEps = latestValue(epsDiluted);
    const latestOpIncome = latestValue(opIncome, (i) => i.fp === 'FY') ?? latestValue(opIncome);
    const latestInterestExpense = Math.abs(latestValue(interestExpense) ?? 0);
    const latestCfo = latestValue(cfo, (i) => i.fp === 'FY') ?? latestValue(cfo);
    const latestCapex = Math.abs(latestValue(capex, (i) => i.fp === 'FY') ?? latestValue(capex) ?? 0);

    const salesGrowthSeries = yearlySeries(revenues);
    const profitGrowthSeries = yearlySeries(netIncome);
    const qSalesSeries = quarterlySeries(revenues);
    const qProfitSeries = quarterlySeries(netIncome);

    const calcGrowth = (series: number[]) => {
      if (series.length < 2 || !series[0]) return undefined;
      const prev = series[series.length - 2];
      const cur = series[series.length - 1];
      return prev ? ((cur - prev) / Math.abs(prev)) * 100 : undefined;
    };

    const yearlySalesValues = salesGrowthSeries.map((x) => x.val);
    const yearlyProfitValues = profitGrowthSeries.map((x) => x.val);
    const qSalesValues = qSalesSeries.map((x) => x.val);
    const qProfitValues = qProfitSeries.map((x) => x.val);

    const keyMetricDefs: Array<MetricValue | null> = [
      latestRevenue
        ? { key: 'sales', label: METRIC_LABELS.sales, value: latestRevenue, unit: 'currency', currency: 'USD' }
        : null,
      latestProfit
        ? { key: 'pat', label: METRIC_LABELS.pat, value: latestProfit, unit: 'currency', currency: 'USD' }
        : null,
      latestOpIncome && latestRevenue
        ? { key: 'opm', label: METRIC_LABELS.opm, value: (latestOpIncome / latestRevenue) * 100, unit: 'percent' }
        : null,
      qSalesValues.at(-1)
        ? {
            key: 'salesLatestQuarter',
            label: METRIC_LABELS.salesLatestQuarter,
            value: qSalesValues.at(-1)!,
            unit: 'currency',
            currency: 'USD',
          }
        : null,
      qProfitValues.at(-1)
        ? {
            key: 'patLatestQuarter',
            label: METRIC_LABELS.patLatestQuarter,
            value: qProfitValues.at(-1)!,
            unit: 'currency',
            currency: 'USD',
          }
        : null,
      calcGrowth(yearlySalesValues) !== undefined
        ? { key: 'salesGrowth', label: METRIC_LABELS.salesGrowth, value: calcGrowth(yearlySalesValues)!, unit: 'percent' }
        : null,
      calcGrowth(yearlyProfitValues) !== undefined
        ? {
            key: 'profitGrowth',
            label: METRIC_LABELS.profitGrowth,
            value: calcGrowth(yearlyProfitValues)!,
            unit: 'percent',
          }
        : null,
      latestEps ? { key: 'eps', label: METRIC_LABELS.eps, value: latestEps, unit: 'ratio' } : null,
      latestDebt ? { key: 'debt', label: METRIC_LABELS.debt, value: latestDebt, unit: 'currency', currency: 'USD' } : null,
      latestAssets && latestLiabilities
        ? {
            key: 'debtToEquity',
            label: METRIC_LABELS.debtToEquity,
            value: latestEquity ? (latestLiabilities / latestEquity) : 0,
            unit: 'ratio',
          }
        : null,
      latestProfit && latestAssets
        ? { key: 'roa', label: METRIC_LABELS.roa, value: (latestProfit / latestAssets) * 100, unit: 'percent' }
        : null,
      latestProfit && latestEquity
        ? { key: 'roe', label: METRIC_LABELS.roe, value: (latestProfit / latestEquity) * 100, unit: 'percent' }
        : null,
      latestCurrentAssets && latestCurrentLiabilities
        ? {
            key: 'currentRatio',
            label: METRIC_LABELS.currentRatio,
            value: latestCurrentAssets / latestCurrentLiabilities,
            unit: 'ratio',
          }
        : null,
      latestOpIncome && latestInterestExpense
        ? {
            key: 'interestCoverage',
            label: METRIC_LABELS.interestCoverage,
            value: latestInterestExpense > 0 ? latestOpIncome / latestInterestExpense : 0,
            unit: 'ratio',
          }
        : null,
      latestRevenue && latestCfo && latestCapex
        ? {
            key: 'priceToFcf',
            label: METRIC_LABELS.priceToFcf,
            value: Math.abs(latestRevenue / Math.max(1, latestCfo - latestCapex)),
            unit: 'ratio',
          }
        : null,
    ];

    const revenueYearly = yearlySeries(revenues).map((x) => ({ label: x.end.slice(0, 4), value: x.val }));
    const profitYearly = yearlySeries(netIncome).map((x) => ({ label: x.end.slice(0, 4), value: x.val }));
    const assetsYearly = yearlySeries(assets).map((x) => ({ label: x.end.slice(0, 4), value: x.val }));
    const liabilitiesYearly = yearlySeries(liabilities).map((x) => ({ label: x.end.slice(0, 4), value: x.val }));
    const cfoYearly = yearlySeries(cfo).map((x) => ({ label: x.end.slice(0, 4), value: x.val }));
    const capexYearly = yearlySeries(capex).map((x) => ({ label: x.end.slice(0, 4), value: -Math.abs(x.val) }));
    const qRevenueRows = quarterlySeries(revenues).map((x) => ({ label: `${x.fp ?? 'Q'} FY${String(x.fy ?? '').slice(-2)}`, value: x.val }));
    const qProfitRows = quarterlySeries(netIncome).map((x) => ({ label: `${x.fp ?? 'Q'} FY${String(x.fy ?? '').slice(-2)}`, value: x.val }));

    const statements: FinancialStatementTable[] = [
      tableFromSeries(
        'profitLoss',
        'Profit and Loss',
        [
          { label: 'Revenue', series: revenueYearly },
          { label: 'Net Profit', series: profitYearly },
        ],
        'SEC EDGAR Company Facts',
      ),
      tableFromSeries(
        'quarterly',
        'Quarterly Results',
        [
          { label: 'Revenue', series: qRevenueRows },
          { label: 'Net Profit', series: qProfitRows },
        ],
        'SEC EDGAR Company Facts',
      ),
      tableFromSeries(
        'balanceSheet',
        'Balance Sheet',
        [
          { label: 'Total Assets', series: assetsYearly },
          { label: 'Total Liabilities', series: liabilitiesYearly },
        ],
        'SEC EDGAR Company Facts',
      ),
      tableFromSeries(
        'cashFlow',
        'Cash Flow',
        [
          { label: 'Cash from Operations', series: cfoYearly },
          { label: 'Capital Expenditure', series: capexYearly },
        ],
        'SEC EDGAR Company Facts',
      ),
    ].filter((t) => t.rows.some((r) => Object.values(r.valuesByYear).some((v) => typeof v === 'number')));

    return {
      companyId: `us:${ticker.toUpperCase()}`,
      companyName: facts.entityName ?? ticker.toUpperCase(),
      sector: undefined,
      industry: submissions.sicDescription,
      currency: 'USD',
      keyMetrics: keyMetricDefs.filter(Boolean) as MetricValue[],
      statements,
      source: 'SEC EDGAR + derived ratios',
      notes: [
        'SEC Company Facts can have gaps depending on filing taxonomy and tags.',
        'Only metrics derivable from available tags are shown. Missing metrics are hidden.',
      ],
      peerSymbols: [],
    };
  });
}

export async function getSecDocuments(ticker: string) {
  return withServerCache(`sec-docs:${ticker}`, 12 * 60 * 60_000, async () => {
    const cik = await getCikForTicker(ticker);
    const submissions = await fetchJson<SecSubmissionsResponse>(`https://data.sec.gov/submissions/CIK${cik}.json`);
    const recent = submissions.filings?.recent;
    if (!recent) return [];
    const out = [] as Array<{
      id: string;
      title: string;
      url: string;
      kind: 'annual_report' | 'filing' | 'presentation' | 'other';
      year?: number;
      source: string;
    }>;
    const len = Math.min(20, recent.form?.length ?? 0);
    for (let i = 0; i < len; i += 1) {
      const form = recent.form?.[i] ?? '';
      if (!['10-K', '10-Q', '8-K', '20-F'].includes(form)) continue;
      const accession = (recent.accessionNumber?.[i] ?? '').replace(/-/g, '');
      const primary = recent.primaryDocument?.[i] ?? '';
      const filingDate = recent.filingDate?.[i];
      const url = `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession}/${primary}`;
      out.push({
        id: `${ticker}-${accession}`,
        title: `${form} ${filingDate ?? ''}`.trim(),
        url,
        kind: form === '10-K' || form === '20-F' ? 'annual_report' : 'filing',
        year: filingDate ? Number(filingDate.slice(0, 4)) : undefined,
        source: 'SEC EDGAR',
      });
    }
    return out;
  });
}
