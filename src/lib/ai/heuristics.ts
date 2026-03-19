import type {
  AiContextInput,
  AiInsights,
  BeginnerAssessment,
  FraudFlag,
  ParsedScreenFilter,
  PeerSuggestionResult,
  StatementSummaryInput,
  StatementSummaryOutput,
  TrendPeriod,
} from '@/types';
import { POSITIVE_WORDS, NEGATIVE_WORDS } from './sentiment-lexicon';

function getMetric(input: AiContextInput, key: string): number | undefined {
  return input.metrics?.find((m) => m.key === key)?.value;
}

function calcTrendPeriods(prices: number[], timestamps: string[]): TrendPeriod[] {
  if (prices.length < 20) return [];
  const out: TrendPeriod[] = [];
  let startIdx = 0;
  let segmentHigh = prices[0];
  let segmentLow = prices[0];
  for (let i = 1; i < prices.length; i += 1) {
    segmentHigh = Math.max(segmentHigh, prices[i]);
    segmentLow = Math.min(segmentLow, prices[i]);
    const ret = ((prices[i] - prices[startIdx]) / prices[startIdx]) * 100;
    if (Math.abs(ret) >= 15) {
      out.push({
        start: timestamps[startIdx],
        end: timestamps[i],
        returnPct: Number(ret.toFixed(2)),
        type: ret >= 0 ? 'bull' : 'bear',
      });
      startIdx = i;
      segmentHigh = prices[i];
      segmentLow = prices[i];
    }
  }
  return out.slice(-8);
}

function computeRisk(input: AiContextInput): AiInsights['risk'] {
  const points = input.history?.points ?? [];
  if (points.length < 5) return { riskLevel: 'Medium', notes: ['Not enough price history for risk analysis.'] };
  const returns: number[] = [];
  for (let i = 1; i < points.length; i += 1) {
    returns.push((points[i].close - points[i - 1].close) / points[i - 1].close);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / returns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;
  let peak = points[0].close;
  let maxDd = 0;
  for (const p of points) {
    peak = Math.max(peak, p.close);
    const dd = ((p.close - peak) / peak) * 100;
    maxDd = Math.min(maxDd, dd);
  }
  const riskLevel = volatility > 40 || maxDd < -45 ? 'High' : volatility > 25 || maxDd < -25 ? 'Medium' : 'Low';
  const notes = [
    `Annualized volatility is approximately ${volatility.toFixed(1)}%.`,
    `Maximum drawdown in available history is ${maxDd.toFixed(1)}%.`,
  ];
  return { volatility, maxDrawdown: maxDd, riskLevel, notes };
}

function computeFraudFlags(input: AiContextInput): FraudFlag[] {
  const flags: FraudFlag[] = [];
  const pledge = getMetric(input, 'pledgedPercentage');
  const opm = getMetric(input, 'opm');
  const debtToEquity = getMetric(input, 'debtToEquity');
  const salesGrowth = getMetric(input, 'salesGrowth');
  const profitGrowth = getMetric(input, 'profitGrowth');

  if ((pledge ?? 0) > 20) {
    flags.push({
      id: 'pledge-high',
      severity: 'high',
      title: 'High promoter pledge',
      detail: 'Promoter pledged shares are elevated. This can increase financial and governance risk.',
    });
  }
  if ((salesGrowth ?? 0) > 12 && (profitGrowth ?? 0) < 0) {
    flags.push({
      id: 'growth-profit-mismatch',
      severity: 'medium',
      title: 'Sales up but profit not keeping pace',
      detail: 'Revenue growth without profit growth may indicate margin pressure or aggressive accounting assumptions.',
    });
  }
  if ((opm ?? 0) < 5 && (salesGrowth ?? 0) > 10) {
    flags.push({
      id: 'margin-collapse',
      severity: 'medium',
      title: 'Low operating margin',
      detail: 'Low or falling operating margin can be a sign of poor pricing power or rising costs.',
    });
  }
  if ((debtToEquity ?? 0) > 2.5) {
    flags.push({
      id: 'leverage-high',
      severity: 'medium',
      title: 'High leverage',
      detail: 'Debt-to-equity appears high. Verify business model and debt servicing ability before relying on growth assumptions.',
    });
  }
  return flags;
}

function computeSentiment(input: AiContextInput): AiInsights['sentiment'] {
  const articles = input.news ?? [];
  if (!articles.length) {
    return {
      score: 0,
      label: 'Neutral',
      buyProbability: 33,
      holdProbability: 34,
      sellProbability: 33,
      rationale: ['No recent relevant news found. Sentiment score is neutral by default.'],
    };
  }
  let score = 0;
  for (const item of articles) {
    const text = `${item.title} ${item.snippet ?? ''}`.toLowerCase();
    for (const p of POSITIVE_WORDS) if (text.includes(p)) score += 1;
    for (const n of NEGATIVE_WORDS) if (text.includes(n)) score -= 1;
  }
  const label = score > 1 ? 'Bullish' : score < -1 ? 'Bearish' : 'Neutral';
  const buyProbability = Math.max(5, Math.min(90, Math.round(40 + score * 8)));
  const sellProbability = Math.max(5, Math.min(90, Math.round(30 - score * 8)));
  const holdProbability = Math.max(5, 100 - buyProbability - sellProbability);
  return {
    score,
    label,
    buyProbability,
    holdProbability,
    sellProbability,
    rationale: [`Lexicon-based sentiment over ${articles.length} news items.`, 'Use alongside fundamentals and price action.'],
  };
}

function linearForecast(values: number[], labels: string[]): { period: string; value: number }[] {
  if (values.length < 2) return [];
  const n = values.length;
  const xs = values.map((_, i) => i + 1);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  const slopeNum = xs.reduce((acc, x, i) => acc + (x - xMean) * (values[i] - yMean), 0);
  const slopeDen = xs.reduce((acc, x) => acc + (x - xMean) ** 2, 0) || 1;
  const slope = slopeNum / slopeDen;
  const intercept = yMean - slope * xMean;
  return [1, 2].map((step) => {
    const x = n + step;
    const y = Math.max(0, intercept + slope * x);
    return {
      period: `${labels[labels.length - 1]}+${step}`,
      value: Number(y.toFixed(2)),
    };
  });
}

function buildProsCons(input: AiContextInput, riskLevel: 'Low' | 'Medium' | 'High'): AiInsights['prosCons'] {
  const pros: string[] = [];
  const cons: string[] = [];
  const roe = getMetric(input, 'roe');
  const debtToEquity = getMetric(input, 'debtToEquity');
  const salesGrowth = getMetric(input, 'salesGrowth');
  const pe = getMetric(input, 'pe');
  const industryPe = getMetric(input, 'industryPe');
  const dividendYield = getMetric(input, 'dividendYield');

  if ((salesGrowth ?? 0) > 10) pros.push('Revenue growth trend looks healthy based on available data.');
  if ((roe ?? 0) > 15) pros.push('Return on equity is strong, indicating efficient use of capital.');
  if ((debtToEquity ?? 9) < 0.8) pros.push('Balance sheet leverage appears manageable.');
  if ((dividendYield ?? 0) > 1) pros.push('Company offers a measurable dividend yield.');

  if ((pe ?? 0) > (industryPe ?? Infinity) * 1.2) cons.push('Valuation appears richer than industry average P/E.');
  if ((debtToEquity ?? 0) > 2) cons.push('High debt load can amplify downside risk in weak cycles.');
  if (riskLevel === 'High') cons.push('Price volatility/drawdown profile is high in available history.');
  if (!pros.length) pros.push('No strong metric-based positives were detected from the available dataset.');
  if (!cons.length) cons.push('No major metric-based concerns were flagged by the current analytical checks.');
  return { pros, cons };
}

function latestFromStatement(input: AiContextInput, labelRegex: RegExp) {
  for (const table of input.statements ?? []) {
    const row = table.rows.find((r) => labelRegex.test(r.label));
    if (row && table.years.length) {
      const years = table.years;
      const values = years.map((y) => row.valuesByYear[y]).filter((v): v is number => typeof v === 'number');
      if (values.length) return { values, labels: years };
    }
  }
  return { values: [], labels: [] as string[] };
}

export function generateAiInsights(input: AiContextInput): AiInsights {
  const points = input.history?.points ?? [];
  const prices = points.map((p) => p.close);
  const ts = points.map((p) => p.ts);
  const trendPeriods = calcTrendPeriods(prices, ts);
  const risk = computeRisk(input);
  const fraudFlags = computeFraudFlags(input);
  const sentiment = computeSentiment(input);

  const salesSeries = latestFromStatement(input, /revenue|sales/i);
  const profitSeries = latestFromStatement(input, /net profit|profit/i);
  const salesForecast = linearForecast(salesSeries.values, salesSeries.labels);
  const profitForecast = linearForecast(profitSeries.values, profitSeries.labels);

  return {
    trendPeriods,
    risk,
    fraudFlags,
    sentiment,
    forecast: [0, 1].map((i) => ({
      period: salesForecast[i]?.period ?? profitForecast[i]?.period ?? `F+${i + 1}`,
      sales: salesForecast[i]?.value,
      profit: profitForecast[i]?.value,
    })),
    prosCons: buildProsCons(input, risk.riskLevel),
  };
}

export function buildBeginnerAssessment(input: AiContextInput): BeginnerAssessment {
  const salesGrowth = getMetric(input, 'salesGrowth');
  const profitGrowth = getMetric(input, 'profitGrowth');
  const debtToEquity = getMetric(input, 'debtToEquity');
  const pe = getMetric(input, 'pe');
  const industryPe = getMetric(input, 'industryPe');

  const simpleChecks = [
    {
      label: 'Is the company growing?',
      status:
        salesGrowth === undefined || profitGrowth === undefined
          ? 'watch'
          : salesGrowth > 10 && profitGrowth > 10
            ? 'good'
            : salesGrowth > 0 && profitGrowth > 0
              ? 'watch'
              : 'bad',
      explanation:
        salesGrowth === undefined || profitGrowth === undefined
          ? 'Growth data is incomplete. Use caution until trend data is available.'
          : salesGrowth > 10 && profitGrowth > 10
          ? 'Sales and profits are growing at a healthy pace.'
          : salesGrowth > 0 && profitGrowth > 0
            ? 'Sales/profit are growing, but not very strongly.'
            : 'Growth looks weak or inconsistent from available data.',
    },
    {
      label: 'Is debt high?',
      status: debtToEquity === undefined ? 'watch' : debtToEquity < 0.8 ? 'good' : debtToEquity < 2 ? 'watch' : 'bad',
      explanation:
        debtToEquity === undefined
          ? 'Debt data is not currently available for this stock.'
          : debtToEquity < 0.8
            ? 'Debt appears manageable.'
            : debtToEquity < 2
              ? 'Debt is moderate. Check if profits are stable.'
              : 'Debt looks high and needs extra caution.',
    },
    {
      label: 'Is the price expensive?',
      status:
        pe === undefined || industryPe === undefined
          ? 'watch'
          : pe <= industryPe
            ? 'good'
            : pe <= industryPe * 1.25
              ? 'watch'
              : 'bad',
      explanation:
        pe === undefined || industryPe === undefined
          ? 'Not enough valuation data to compare with peers.'
          : pe <= industryPe
            ? 'Price is not more expensive than the industry average P/E.'
            : pe <= industryPe * 1.25
              ? 'Valuation is somewhat expensive versus peers.'
              : 'Valuation looks expensive versus industry average.',
    },
  ] as BeginnerAssessment['simpleChecks'];

  const score = simpleChecks.reduce((acc, check) => {
    if (check.status === 'good') return acc + 1;
    if (check.status === 'bad') return acc - 1;
    return acc;
  }, 0);
  const recommendation: BeginnerAssessment['recommendation'] =
    score >= 2 ? 'Yes' : score <= -2 ? 'No' : 'Neutral';
  const buyScore: BeginnerAssessment['buyScore'] =
    score >= 3 ? 5 : score === 2 ? 4 : score === 1 ? 3 : score === 0 ? 3 : score === -1 ? 2 : score === -2 ? 2 : 1;
  const reasons = simpleChecks.map((c) => `${c.label}: ${c.explanation}`);

  return {
    recommendation,
    buyScore,
    reasons,
    simpleChecks,
    disclaimer: 'Educational only. This is not financial advice. Always do your own research.',
  };
}

type SeriesPoint = { year: string; value: number };
type StatementSeries = { label: string; points: SeriesPoint[] };
type MetricTrendPreference = 'higherBetter' | 'lowerBetter' | 'context';

function formatCompact(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatSigned(value: number, digits = 1, suffix = ''): string {
  const abs = Math.abs(value).toFixed(digits);
  return `${value >= 0 ? '+' : '-'}${abs}${suffix}`;
}

function changePct(start: number, end: number): number {
  return ((end - start) / (Math.abs(start) || 1)) * 100;
}

function cagrPct(start: number, end: number, periods: number): number | undefined {
  if (periods <= 0 || start <= 0 || end <= 0) return undefined;
  return ((end / start) ** (1 / periods) - 1) * 100;
}

function withSimple(base: string, simple: string): string {
  return `${base} (${simple})`;
}

function trendPreference(label: string): MetricTrendPreference {
  const l = label.toLowerCase();
  if (/\bdebt\b|\bliabilit|\bfinance cost\b|\binterest\b|\bleverage\b|\bborrowings?\b/.test(l)) return 'lowerBetter';
  if (/\btax\b/.test(l)) return 'context';
  if (/\brevenue\b|\bsales\b|\bprofit\b|\bincome\b|\bmargin\b|\beps\b|\bcash from operations\b|\bfree cash flow\b|\bassets?\b|\bequity\b|\bnet worth\b|\breserves?\b/.test(l)) {
    return 'higherBetter';
  }
  return 'context';
}

function simpleTrendExplanation(label: string, overallChange: number, latestChange: number): string {
  const preference = trendPreference(label);
  const flat = Math.abs(overallChange) < 1.5 && Math.abs(latestChange) < 1.5;
  if (flat) {
    return 'Simple view: this is mostly flat, so wait for a clearer trend before taking a strong buy/sell decision.';
  }

  const improving =
    preference === 'higherBetter' ? overallChange > 0 : preference === 'lowerBetter' ? overallChange < 0 : overallChange > 0 && latestChange > 0;
  const worsening =
    preference === 'higherBetter' ? overallChange < 0 : preference === 'lowerBetter' ? overallChange > 0 : overallChange < 0 && latestChange < 0;

  if (improving) {
    return 'Simple view: this is a good sign and supports a positive view, but still confirm with profit quality, debt, and valuation.';
  }
  if (worsening) {
    return 'Simple view: this is a caution signal and supports a hold/watch approach until the trend improves.';
  }
  return 'Simple view: mixed signal; do not decide from this alone and cross-check other statements.';
}

function simpleToplineExplanation(cagr: number | undefined, latestDelta: number): string {
  if (cagr !== undefined && cagr >= 10 && latestDelta >= 0) {
    return 'Simple view: sales are growing well, which is usually positive for future scale and earnings if margins stay healthy.';
  }
  if (cagr !== undefined && cagr > 0 && latestDelta < 0) {
    return 'Simple view: long-term growth is okay, but the latest slowdown needs monitoring before aggressive buying.';
  }
  if (cagr !== undefined && cagr < 0) {
    return 'Simple view: sales trend is weak, so future profit growth may be difficult; stay cautious until recovery appears.';
  }
  return latestDelta >= 0
    ? 'Simple view: recent sales trend is improving, but confirm this strength over more periods.'
    : 'Simple view: recent sales trend is soft, so wait for stabilization before a strong decision.';
}

function simpleProfitExplanation(cagr: number | undefined, latestDelta: number, latestValue: number): string {
  if (latestValue <= 0) {
    return 'Simple view: current profitability is weak, which is a risk signal; avoid aggressive exposure until profits normalize.';
  }
  if (cagr !== undefined && cagr >= 12 && latestDelta >= 0) {
    return 'Simple view: profit growth is strong and consistent, which supports a constructive long-term view.';
  }
  if (cagr !== undefined && cagr < 0) {
    return 'Simple view: falling profits are a warning sign; prefer caution until earnings recover.';
  }
  if (latestDelta < 0) {
    return 'Simple view: recent profit decline can pressure sentiment; wait for the next result for confirmation.';
  }
  return 'Simple view: profit trend is acceptable, but verify if this is supported by cash flow and not one-off items.';
}

function simpleMarginExplanation(marginDelta: number, latestMargin: number): string {
  if (marginDelta >= 2 && latestMargin >= 8) {
    return 'Simple view: margin expansion is positive; the company is keeping more profit from each unit of sales.';
  }
  if (marginDelta <= -2) {
    return 'Simple view: margin compression is a warning; cost pressure may reduce future earnings quality.';
  }
  if (latestMargin < 5) {
    return 'Simple view: low margin gives less safety in weak markets, so keep a conservative view.';
  }
  return 'Simple view: margins are relatively stable; look at future consistency for conviction.';
}

function simpleInterestShareExplanation(interestShare: number): string {
  if (interestShare > 45) {
    return 'Simple view: heavy interest burden can cap profit growth and increase risk; stay cautious.';
  }
  if (interestShare > 25) {
    return 'Simple view: interest cost is noticeable; growth needs to remain strong to offset this pressure.';
  }
  return 'Simple view: interest burden looks manageable, which is supportive for earnings stability.';
}

function simpleCoverageExplanation(coverage: number): string {
  if (coverage < 2) {
    return 'Simple view: low coverage means profits are only just covering finance cost, which is risky.';
  }
  if (coverage < 4) {
    return 'Simple view: coverage is moderate; not a crisis, but not very comfortable either.';
  }
  return 'Simple view: healthy coverage gives better safety against debt-related pressure.';
}

function simpleTaxExplanation(effectiveTax: number): string {
  if (effectiveTax > 40) {
    return 'Simple view: high tax outgo reduces what shareholders keep; this can limit net-profit growth.';
  }
  if (effectiveTax < 10) {
    return 'Simple view: very low tax may include one-time effects; confirm if this is sustainable.';
  }
  return 'Simple view: tax level looks normal and does not signal a major concern by itself.';
}

function simpleMomentumExplanation(revMomentum: number, profitMomentum: number): string {
  if (revMomentum > 0 && profitMomentum > 0) {
    return 'Simple view: recent momentum is healthy, which supports a positive near-term stance.';
  }
  if (revMomentum < 0 && profitMomentum < 0) {
    return 'Simple view: both sales and profit are weakening, so a cautious stance is safer.';
  }
  if (revMomentum > 0 && profitMomentum < 0) {
    return 'Simple view: sales are growing but profits are not, so quality of growth is weak right now.';
  }
  if (revMomentum < 0 && profitMomentum > 0) {
    return 'Simple view: profits rose despite weaker sales; verify if this came from temporary cost cuts or one-offs.';
  }
  return 'Simple view: mixed short-term trend, so wait for the next quarter for clarity.';
}

function simpleDecisionExplanation(score: number): string {
  if (score >= 5) return 'Simple view: income statement signals are strong; positive bias is reasonable, but avoid overpaying on valuation.';
  if (score >= 2) return 'Simple view: signals are more good than bad; a gradual/controlled approach is better than aggressive entry.';
  if (score <= -4) return 'Simple view: risk signals dominate; defensive positioning is safer until numbers improve.';
  if (score < 0) return 'Simple view: below-average quality right now; stay selective and wait for stronger confirmation.';
  return 'Simple view: mixed setup; prefer hold/watch until clearer trend confirmation.';
}

function extractSeries(rows: StatementSummaryInput['table']['rows'], yearList: string[], patterns: RegExp[], avoid?: RegExp): StatementSeries | undefined {
  for (const pattern of patterns) {
    const row = rows.find((candidate) => pattern.test(candidate.label) && (!avoid || !avoid.test(candidate.label)));
    if (!row) continue;
    const points = yearList
      .map((year) => ({ year, raw: row.valuesByYear[year] }))
      .filter((point): point is { year: string; raw: number } => typeof point.raw === 'number' && Number.isFinite(point.raw))
      .map((point) => ({ year: point.year, value: point.raw }));
    if (points.length) return { label: row.label, points };
  }
  return undefined;
}

function marginSeries(numerator: StatementSeries, denominator: StatementSeries): StatementSeries | undefined {
  const denByYear = new Map(denominator.points.map((p) => [p.year, p.value]));
  const points = numerator.points
    .map((p) => {
      const den = denByYear.get(p.year);
      if (den === undefined || den === 0) return null;
      return { year: p.year, value: (p.value / den) * 100 };
    })
    .filter((p): p is SeriesPoint => p !== null && Number.isFinite(p.value));
  if (!points.length) return undefined;
  return { label: `${numerator.label} Margin`, points };
}

function summarizeGenericStatement(table: StatementSummaryInput['table'], years: string[], rows: StatementSummaryInput['table']['rows']): StatementSummaryOutput {
  const bullets: string[] = [];
  for (const row of rows.slice(0, 6)) {
    const values = years.map((y) => row.valuesByYear[y]).filter((v): v is number => typeof v === 'number');
    if (values.length < 2) continue;
    const first = values[0];
    const last = values[values.length - 1];
    const delta = changePct(first, last);
    const recentDelta = changePct(values[values.length - 2], last);
    const base = `${row.label}: ${delta >= 0 ? 'up' : 'down'} ${Math.abs(delta).toFixed(1)}% overall, with latest period ${recentDelta >= 0 ? 'up' : 'down'} ${Math.abs(recentDelta).toFixed(1)}%.`;
    bullets.push(withSimple(base, simpleTrendExplanation(row.label, delta, recentDelta)));
  }
  if (!bullets.length) {
    bullets.push('No analyzable numeric trends were found in this statement.');
  }
  bullets.push(withSimple(`Periods reviewed: ${years.join(', ')}`, 'Simple view: more periods usually means a more reliable trend check.'));
  return {
    title: `${table.title} summary`,
    bullets,
    confidence: bullets.length >= 4 ? 'medium' : 'low',
  };
}

function summarizeIncomeStatement(table: StatementSummaryInput['table'], years: string[], rows: StatementSummaryInput['table']['rows']): StatementSummaryOutput {
  const revenue = extractSeries(rows, years, [/^\s*revenue\b/i, /^\s*sales\b/i, /\btotal income\b/i, /\bturnover\b/i]);
  const netProfit = extractSeries(rows, years, [/\bnet\s*profit\b/i, /\bprofit after tax\b/i, /\bpat\b/i, /\bnet income\b/i]);
  const operating = extractSeries(rows, years, [/\boperating income\b/i, /\boperating profit\b/i, /\bebit\b/i], /\bmargin\b/i);
  const ebitda = extractSeries(rows, years, [/\bebitda\b/i], /\bmargin\b/i);
  const marginRow = extractSeries(rows, years, [/\bebitda margin\b/i, /\boperating margin\b/i, /\bopm\b/i, /\bnet margin\b/i]);
  const interest = extractSeries(rows, years, [/\bfinance cost\b/i, /\binterest expense\b/i, /\binterest\b/i]);
  const pbt = extractSeries(rows, years, [/\bprofit before tax\b/i, /\bpbt\b/i]);
  const tax = extractSeries(rows, years, [/^\s*tax\b/i, /\btax expense\b/i, /\bincome tax\b/i]);

  const bullets: string[] = [];
  let signalCount = 0;
  let score = 0;
  const scoreDrivers: string[] = [];

  const derivedMargin = revenue && netProfit ? marginSeries(netProfit, revenue) : undefined;
  const usableMargin = marginRow ?? derivedMargin;

  if (revenue && revenue.points.length >= 2) {
    signalCount += 1;
    const first = revenue.points[0];
    const last = revenue.points[revenue.points.length - 1];
    const delta = changePct(first.value, last.value);
    const cagr = cagrPct(first.value, last.value, revenue.points.length - 1);
    const latestDelta = changePct(revenue.points[revenue.points.length - 2].value, last.value);
    const base = `Topline: ${revenue.label} moved from ${formatCompact(first.value)} (${first.year}) to ${formatCompact(last.value)} (${last.year}), ${formatSigned(delta, 1, '%')} overall${cagr === undefined ? '' : ` (CAGR ${formatSigned(cagr, 1, '%')})`}. Latest period change is ${formatSigned(latestDelta, 1, '%')}.`;
    bullets.push(withSimple(base, simpleToplineExplanation(cagr, latestDelta)));
    if (cagr !== undefined) {
      if (cagr >= 12) {
        score += 2;
        scoreDrivers.push('strong revenue CAGR');
      } else if (cagr >= 6) {
        score += 1;
        scoreDrivers.push('steady revenue growth');
      } else if (cagr < 0) {
        score -= 2;
        scoreDrivers.push('contracting revenue base');
      }
    }
  }

  if (netProfit && netProfit.points.length >= 2) {
    signalCount += 1;
    const first = netProfit.points[0];
    const last = netProfit.points[netProfit.points.length - 1];
    const delta = changePct(first.value, last.value);
    const cagr = cagrPct(first.value, last.value, netProfit.points.length - 1);
    const latestDelta = changePct(netProfit.points[netProfit.points.length - 2].value, last.value);
    const base = `Bottom line: ${netProfit.label} moved from ${formatCompact(first.value)} (${first.year}) to ${formatCompact(last.value)} (${last.year}), ${formatSigned(delta, 1, '%')} overall${cagr === undefined ? '' : ` (CAGR ${formatSigned(cagr, 1, '%')})`}. Latest period change is ${formatSigned(latestDelta, 1, '%')}.`;
    bullets.push(withSimple(base, simpleProfitExplanation(cagr, latestDelta, last.value)));

    if (last.value <= 0) {
      score -= 3;
      scoreDrivers.push('latest period profitability is weak');
    } else if (cagr !== undefined) {
      if (cagr >= 15) {
        score += 2;
        scoreDrivers.push('strong profit compounding');
      } else if (cagr >= 8) {
        score += 1;
        scoreDrivers.push('healthy profit growth');
      } else if (cagr < 0) {
        score -= 3;
        scoreDrivers.push('declining profits');
      }
    }

    let downYears = 0;
    for (let i = 1; i < netProfit.points.length; i += 1) {
      if (netProfit.points[i].value < netProfit.points[i - 1].value) downYears += 1;
    }
    if (downYears >= 2) {
      score -= 1;
      scoreDrivers.push('profit trend has multiple down periods');
    } else if (downYears === 0 && netProfit.points.length >= 4) {
      score += 1;
      scoreDrivers.push('profit trend is consistent');
    }
  }

  if (usableMargin && usableMargin.points.length >= 2) {
    signalCount += 1;
    const first = usableMargin.points[0];
    const last = usableMargin.points[usableMargin.points.length - 1];
    const marginDelta = last.value - first.value;
    const base = `Profitability quality: ${usableMargin.label} moved from ${first.value.toFixed(1)}% (${first.year}) to ${last.value.toFixed(1)}% (${last.year}), a ${formatSigned(marginDelta, 1, ' ppt')} shift.`;
    bullets.push(withSimple(base, simpleMarginExplanation(marginDelta, last.value)));

    if (marginDelta >= 2) {
      score += 1;
      scoreDrivers.push('margin expansion');
    } else if (marginDelta <= -2) {
      score -= 1;
      scoreDrivers.push('margin compression');
    }
    if (last.value < 5) {
      score -= 1;
      scoreDrivers.push('low terminal margin profile');
    }
  } else if (operating && ebitda && revenue) {
    signalCount += 1;
    const latestYear = years[years.length - 1];
    const opLatest = operating.points.find((p) => p.year === latestYear)?.value;
    const ebitdaLatest = ebitda.points.find((p) => p.year === latestYear)?.value;
    const revLatest = revenue.points.find((p) => p.year === latestYear)?.value;
    if (typeof opLatest === 'number' && typeof ebitdaLatest === 'number' && typeof revLatest === 'number' && revLatest !== 0) {
      const base = `Operating structure: latest operating income is ${formatCompact(opLatest)} and EBITDA is ${formatCompact(ebitdaLatest)}, implying EBITDA margin near ${((ebitdaLatest / revLatest) * 100).toFixed(1)}%.`;
      bullets.push(
        withSimple(base, 'Simple view: better operating margin usually means stronger business efficiency and earnings quality.'),
      );
    }
  }

  if (interest && interest.points.length >= 1) {
    const latestInterest = interest.points[interest.points.length - 1];
    const latestPbt = pbt?.points.find((p) => p.year === latestInterest.year)?.value;
    const latestOperating = operating?.points.find((p) => p.year === latestInterest.year)?.value;
    if (typeof latestPbt === 'number' && latestPbt !== 0) {
      signalCount += 1;
      const interestShare = (Math.abs(latestInterest.value) / Math.abs(latestPbt)) * 100;
      const base = `Cost pressure: in ${latestInterest.year}, finance cost was ${formatCompact(latestInterest.value)}, about ${interestShare.toFixed(1)}% of pre-tax profit.`;
      bullets.push(withSimple(base, simpleInterestShareExplanation(interestShare)));
      if (interestShare > 45) {
        score -= 2;
        scoreDrivers.push('interest burden is heavy');
      } else if (interestShare > 25) {
        score -= 1;
        scoreDrivers.push('interest burden is elevated');
      } else if (interestShare < 15) {
        score += 1;
        scoreDrivers.push('interest burden is manageable');
      }
    } else if (typeof latestOperating === 'number' && latestOperating > 0) {
      signalCount += 1;
      const coverage = latestOperating / Math.max(1, Math.abs(latestInterest.value));
      const base = `Cost pressure: in ${latestInterest.year}, operating income covered finance cost by ~${coverage.toFixed(1)}x.`;
      bullets.push(withSimple(base, simpleCoverageExplanation(coverage)));
      if (coverage < 2) {
        score -= 2;
        scoreDrivers.push('thin interest coverage');
      } else if (coverage < 4) {
        score -= 1;
        scoreDrivers.push('moderate interest coverage');
      } else {
        score += 1;
        scoreDrivers.push('healthy interest coverage');
      }
    }
  }

  if (tax && tax.points.length >= 1 && pbt && pbt.points.length >= 1) {
    const latestTax = tax.points[tax.points.length - 1];
    const matchedPbt = pbt.points.find((p) => p.year === latestTax.year);
    if (matchedPbt && matchedPbt.value !== 0) {
      signalCount += 1;
      const effectiveTax = (Math.abs(latestTax.value) / Math.abs(matchedPbt.value)) * 100;
      const base = `Tax check: effective tax rate in ${latestTax.year} is ~${effectiveTax.toFixed(1)}% of pre-tax profit.`;
      bullets.push(withSimple(base, simpleTaxExplanation(effectiveTax)));
      if (effectiveTax > 40) {
        score -= 1;
        scoreDrivers.push('high effective tax drag');
      }
    }
  }

  if (revenue && netProfit && revenue.points.length >= 2 && netProfit.points.length >= 2) {
    const latestYear = years[years.length - 1];
    const prevYear = years[years.length - 2];
    const revLatest = revenue.points.find((p) => p.year === latestYear)?.value;
    const revPrev = revenue.points.find((p) => p.year === prevYear)?.value;
    const profitLatest = netProfit.points.find((p) => p.year === latestYear)?.value;
    const profitPrev = netProfit.points.find((p) => p.year === prevYear)?.value;

    if (typeof revLatest === 'number' && typeof revPrev === 'number' && typeof profitLatest === 'number' && typeof profitPrev === 'number') {
      signalCount += 1;
      const revMomentum = changePct(revPrev, revLatest);
      const profitMomentum = changePct(profitPrev, profitLatest);
      const base = `Latest momentum (${prevYear} to ${latestYear}): revenue ${formatSigned(revMomentum, 1, '%')}, net profit ${formatSigned(profitMomentum, 1, '%')}.`;
      bullets.push(withSimple(base, simpleMomentumExplanation(revMomentum, profitMomentum)));
      if (revMomentum > 0 && profitMomentum > 0) {
        score += 1;
        scoreDrivers.push('recent momentum is positive');
      } else if (revMomentum < 0 && profitMomentum < 0) {
        score -= 2;
        scoreDrivers.push('recent momentum is negative');
      } else if (revMomentum > 0 && profitMomentum < 0) {
        score -= 2;
        scoreDrivers.push('topline growth is not converting to profit');
      }
    }
  }

  if (!bullets.length) {
    return summarizeGenericStatement(table, years, rows);
  }

  let decision = 'Decision bias: mixed income-statement signals; treat this as a hold/watch setup until trend quality improves.';
  if (score >= 5) {
    decision = 'Decision bias: constructive. Growth and profitability signals are strong enough to support a positive investment view, subject to valuation discipline.';
  } else if (score >= 2) {
    decision = 'Decision bias: mildly positive. Core trends are supportive, but position sizing should account for remaining execution and cycle risk.';
  } else if (score <= -4) {
    decision =
      'Decision bias: cautious/defensive. Income-statement quality is weak right now, so fresh exposure is better deferred until profitability and momentum stabilize.';
  } else if (score < 0) {
    decision = 'Decision bias: cautious. Signals are below average, so require clearer earnings strength before taking aggressive exposure.';
  }

  const driverSuffix = scoreDrivers.length ? ` Key drivers: ${scoreDrivers.slice(0, 3).join(', ')}.` : '';
  bullets.push(withSimple(`${decision}${driverSuffix}`, simpleDecisionExplanation(score)));
  bullets.push(
    withSimple(
      'Cross-check this view with balance sheet leverage, cash-flow conversion, and current valuation before acting.',
      'Simple view: one statement alone is not enough; final decision should use all major statements together.',
    ),
  );

  return {
    title: `${table.title} summary`,
    bullets,
    confidence: signalCount >= 6 ? 'high' : signalCount >= 4 ? 'medium' : 'low',
  };
}

export function summarizeStatement(input: StatementSummaryInput): StatementSummaryOutput {
  const { table, currentView } = input;
  const selected = table.viewData?.[currentView];
  const yearList = selected?.years ?? table.years;
  const rows = selected?.rows ?? table.rows;
  if (!yearList.length || !rows.length) {
    return { title: `${table.title} summary`, bullets: ['No rows are currently available for this statement.'], confidence: 'low' };
  }
  if (table.kind === 'profitLoss' || /income statement|profit and loss/i.test(table.title)) {
    return summarizeIncomeStatement(table, yearList, rows);
  }
  return summarizeGenericStatement(table, yearList, rows);
}

export function suggestPeersHeuristic(input: AiContextInput): PeerSuggestionResult {
  const base = input.symbol.toUpperCase();
  if (/HDFC|ICICI|AXIS|KOTAK|IDBI/.test(base)) {
    return {
      peers: ['HDFCBANK.NS', 'ICICIBANK.NS', 'AXISBANK.NS', 'KOTAKBANK.NS', 'IDBI.NS'].filter((s) => s !== base),
      reason: 'Detected Indian private/public bank peer group from symbol/industry patterns.',
    };
  }
  if (/TCS|INFY/.test(base)) {
    return { peers: ['TCS.NS', 'INFY.NS'].filter((s) => s !== base), reason: 'Detected Indian IT services peer group.' };
  }
  if (/AAPL|MSFT|GOOGL/.test(base)) {
    return { peers: ['AAPL', 'MSFT', 'GOOGL'].filter((s) => s !== base), reason: 'Detected large-cap US tech peer cluster.' };
  }
  return { peers: [], reason: 'No peer mapping is currently available for this security.' };
}

export function parseScreenerQueryHeuristic(query: string): { filters: ParsedScreenFilter[]; explanation: string } {
  const q = query.toLowerCase();
  const filters: ParsedScreenFilter[] = [];

  if (q.includes('profitable') || q.includes('profit')) filters.push({ field: 'pat', op: '>', value: 0 });
  if (q.includes('low debt')) filters.push({ field: 'debtToEquity', op: '<', value: 1 });
  if (q.includes('rising sales') || q.includes('sales growth')) filters.push({ field: 'salesGrowth', op: '>', value: 10 });
  if (q.includes('high roe')) filters.push({ field: 'roe', op: '>', value: 15 });
  if (q.includes('cheap') || q.includes('low pe')) filters.push({ field: 'pe', op: '<', value: 20 });
  if (q.includes('dividend')) filters.push({ field: 'dividendYield', op: '>', value: 1 });
  if (q.includes('momentum')) filters.push({ field: 'return6m', op: '>', value: 10 });
  if (q.includes('large cap')) filters.push({ field: 'marketCap', op: '>', value: 100000 });

  return {
    filters,
    explanation: filters.length
      ? `Parsed ${filters.length} rule-based filter(s) from natural language.`
      : 'Could not parse specific filters. Try phrases like “low debt”, “high ROE”, or “rising sales”.',
  };
}

export function answerLearningQuestionHeuristic(question: string, docs: string[]) {
  const q = question.toLowerCase();
  const matched = docs
    .map((doc, idx) => ({ idx, score: scoreDoc(doc.toLowerCase(), q), body: doc }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .filter((x) => x.score > 0);

  if (!matched.length) {
    return {
      answer: 'I could not find a strong match in the local learning notes. Ask about P/E, ROE, debt, statements, diversification, or volatility.',
      sources: [],
    };
  }

  const snippets = matched.map((m) => m.body.split('\n').slice(0, 4).join(' '));
  return {
    answer: snippets.join(' '),
    sources: matched.map((m) => `Doc ${m.idx + 1}`),
  };
}

function scoreDoc(doc: string, q: string) {
  const terms = q.split(/\W+/).filter(Boolean);
  return terms.reduce((acc, t) => acc + (doc.includes(t) ? 1 : 0), 0);
}
