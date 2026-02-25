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
  const salesGrowth = getMetric(input, 'salesGrowth') ?? 0;
  const profitGrowth = getMetric(input, 'profitGrowth') ?? 0;
  const debtToEquity = getMetric(input, 'debtToEquity');
  const pe = getMetric(input, 'pe');
  const industryPe = getMetric(input, 'industryPe');

  const simpleChecks = [
    {
      label: 'Is the company growing?',
      status: salesGrowth > 10 && profitGrowth > 10 ? 'good' : salesGrowth > 0 && profitGrowth > 0 ? 'watch' : 'bad',
      explanation:
        salesGrowth > 10 && profitGrowth > 10
          ? 'Sales and profits are growing at a healthy pace.'
          : salesGrowth > 0 && profitGrowth > 0
            ? 'Sales/profit are growing, but not very strongly.'
            : 'Growth looks weak or inconsistent from available data.',
    },
    {
      label: 'Is debt high?',
      status: (debtToEquity ?? 99) < 0.8 ? 'good' : (debtToEquity ?? 99) < 2 ? 'watch' : 'bad',
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

  const badCount = simpleChecks.filter((x) => x.status === 'bad').length;
  const goodCount = simpleChecks.filter((x) => x.status === 'good').length;
  const verdict = badCount >= 2 ? 'Red' : goodCount >= 2 ? 'Green' : 'Yellow';
  const reasons = simpleChecks.map((c) => `${c.label}: ${c.explanation}`);

  return {
    verdict,
    reasons,
    simpleChecks,
    disclaimer: 'Educational only. This is not financial advice. Always do your own research.',
  };
}

export function summarizeStatement(input: StatementSummaryInput): StatementSummaryOutput {
  const { table } = input;
  const yearList = table.years;
  const bullets: string[] = [];
  if (!yearList.length || !table.rows.length) {
    return { title: `${table.title} summary`, bullets: ['No rows are currently available for this statement.'], confidence: 'low' };
  }

  for (const row of table.rows.slice(0, 4)) {
    const values = yearList.map((y) => row.valuesByYear[y]).filter((v): v is number => typeof v === 'number');
    if (values.length < 2) continue;
    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / (Math.abs(first) || 1)) * 100;
    bullets.push(`${row.label}: ${change >= 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(1)}% across available periods.`);
  }

  bullets.push(`Years: ${yearList.join(', ')}`);
  return { title: `${table.title} summary`, bullets, confidence: bullets.length >= 3 ? 'medium' : 'low' };
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
