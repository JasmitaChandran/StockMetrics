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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function durationDays(start: string, end: string): number {
  const startTs = Date.parse(start);
  const endTs = Date.parse(end);
  if (!Number.isFinite(startTs) || !Number.isFinite(endTs)) return 0;
  const days = Math.round((endTs - startTs) / (24 * 60 * 60 * 1000));
  return Number.isFinite(days) ? Math.max(0, days) : 0;
}

function trendLabel(type: TrendPeriod['type'], returnPct: number): string {
  if (type === 'bull') {
    if (returnPct >= 25) return 'Strong Bull Phase';
    if (returnPct >= 18) return 'Healthy Bull Phase';
    return 'Early Bull Phase';
  }
  if (returnPct <= -25) return 'Sharp Correction';
  if (returnPct <= -18) return 'Bearish Breakdown';
  return 'Bearish Pullback';
}

function trendContext(type: TrendPeriod['type'], returnPct: number, days: number): string {
  if (type === 'bull') {
    if (days >= 250) return `${days} days, sustained momentum`;
    if (days >= 120) return `${days} days, stable uptrend`;
    return `${days} days, fast recovery move`;
  }
  if (Math.abs(returnPct) >= 25) return `${days} days, high-volatility selloff`;
  if (days >= 120) return `${days} days, prolonged weakness`;
  return `${days} days, corrective phase`;
}

function calcTrendPeriods(prices: number[], timestamps: string[]): TrendPeriod[] {
  if (prices.length < 20) return [];
  const out: TrendPeriod[] = [];
  let startIdx = 0;
  for (let i = 1; i < prices.length; i += 1) {
    const ret = ((prices[i] - prices[startIdx]) / prices[startIdx]) * 100;
    if (Math.abs(ret) >= 15) {
      const type = ret >= 0 ? 'bull' : 'bear';
      const days = durationDays(timestamps[startIdx], timestamps[i]);
      out.push({
        start: timestamps[startIdx],
        end: timestamps[i],
        returnPct: Number(ret.toFixed(2)),
        type,
        durationDays: days,
        phaseLabel: trendLabel(type, ret),
        context: trendContext(type, ret, days),
      });
      startIdx = i;
    }
  }
  return out.slice(-8);
}

function average(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

function lookbackReturn(prices: number[], lookback: number): number {
  if (prices.length < 2) return 0;
  const end = prices[prices.length - 1];
  const start = prices[Math.max(0, prices.length - 1 - lookback)];
  if (!Number.isFinite(end) || !Number.isFinite(start) || start === 0) return 0;
  return ((end - start) / start) * 100;
}

function computeTrendSummary(prices: number[], trendPeriods: TrendPeriod[]): AiInsights['trendSummary'] {
  const bullDurations = trendPeriods.filter((p) => p.type === 'bull').map((p) => p.durationDays ?? 0).filter((d) => d > 0);
  const bearDurations = trendPeriods.filter((p) => p.type === 'bear').map((p) => p.durationDays ?? 0).filter((d) => d > 0);
  const oneMonthRet = lookbackReturn(prices, 21);
  const threeMonthRet = lookbackReturn(prices, 63);

  let currentPhaseLabel = 'Sideways / Transition';
  let currentPhaseProbability = 50;

  if (oneMonthRet >= 4 && threeMonthRet >= 8) {
    currentPhaseLabel = 'Early Bull Phase';
    currentPhaseProbability = clamp(Math.round(58 + oneMonthRet * 1.2 + threeMonthRet * 0.25), 55, 85);
  } else if (oneMonthRet <= -4 && threeMonthRet <= -8) {
    currentPhaseLabel = 'Early Bear Phase';
    currentPhaseProbability = clamp(Math.round(58 + Math.abs(oneMonthRet) * 1.2 + Math.abs(threeMonthRet) * 0.25), 55, 85);
  } else if (oneMonthRet > 0 && threeMonthRet > 0) {
    currentPhaseLabel = 'Mild Bullish Phase';
    currentPhaseProbability = clamp(Math.round(52 + oneMonthRet * 0.9), 50, 72);
  } else if (oneMonthRet < 0 && threeMonthRet < 0) {
    currentPhaseLabel = 'Mild Bearish Phase';
    currentPhaseProbability = clamp(Math.round(52 + Math.abs(oneMonthRet) * 0.9), 50, 72);
  }

  return {
    averageBullDurationDays: bullDurations.length ? Number((average(bullDurations) ?? 0).toFixed(0)) : undefined,
    averageBearDurationDays: bearDurations.length ? Number((average(bearDurations) ?? 0).toFixed(0)) : undefined,
    currentPhaseLabel,
    currentPhaseProbability,
  };
}

function computeRisk(input: AiContextInput): AiInsights['risk'] {
  const points = input.history?.points ?? [];
  if (points.length < 5) {
    return {
      riskLevel: 'Medium',
      confidence: 'low',
      notes: ['Not enough price history for risk analysis.'],
      marketComparison: 'Not enough history for reliable market-relative volatility comparison.',
      decisionGuide: [
        'Use smaller position size until more data is available.',
        'Wait for more price history before using volatility-heavy strategies.',
      ],
    };
  }
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
  const confidence: AiInsights['risk']['confidence'] = points.length >= 240 ? 'high' : points.length >= 120 ? 'medium' : 'low';
  const marketBaselineVol = 18;
  const relativeVolatility = volatility / marketBaselineVol;
  const notes = [
    `Annualized volatility is approximately ${volatility.toFixed(1)}%.`,
    `Maximum drawdown in available history is ${maxDd.toFixed(1)}%.`,
  ];
  const decisionGuide =
    riskLevel === 'High'
      ? [
          'Expect large price swings and deep pullbacks.',
          'Not ideal for short-term low-risk investors.',
          'Use tighter risk limits and smaller allocation size.',
        ]
      : riskLevel === 'Medium'
        ? [
            'Moderate swings are likely; avoid oversized positions.',
            'Best suited for staggered entry instead of single-entry buying.',
            'Track drawdown and earnings quality together.',
          ]
        : [
            'Price behavior is relatively stable versus many volatile names.',
            'Still monitor valuation and business quality before entry.',
            'Suitable for gradual accumulation if fundamentals remain strong.',
          ];
  return {
    volatility,
    maxDrawdown: maxDd,
    riskLevel,
    confidence,
    notes,
    marketComparison: `Volatility is ${relativeVolatility.toFixed(1)}x versus a broad-market baseline (${marketBaselineVol.toFixed(0)}%).`,
    decisionGuide,
  };
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
      riskScore: 8,
      title: 'High promoter pledge',
      detail: 'Promoter pledged shares are elevated. This can increase financial and governance risk.',
      suggestedAction: 'Track quarterly pledge trend and avoid aggressive entry until pledge levels normalize.',
    });
  }
  if ((salesGrowth ?? 0) > 12 && (profitGrowth ?? 0) < 0) {
    flags.push({
      id: 'growth-profit-mismatch',
      severity: 'medium',
      riskScore: 6,
      title: 'Sales up but profit not keeping pace',
      detail: 'Revenue growth without profit growth may indicate margin pressure or aggressive accounting assumptions.',
      suggestedAction: 'Verify margin trend and cash-flow conversion before assuming growth quality is strong.',
    });
  }
  if ((opm ?? 0) < 5 && (salesGrowth ?? 0) > 10) {
    flags.push({
      id: 'margin-collapse',
      severity: 'medium',
      riskScore: 6,
      title: 'Low operating margin',
      detail: 'Low or falling operating margin can be a sign of poor pricing power or rising costs.',
      suggestedAction: 'Monitor margin recovery over the next two results before increasing exposure.',
    });
  }
  if ((debtToEquity ?? 0) > 2.5) {
    flags.push({
      id: 'leverage-high',
      severity: 'medium',
      riskScore: 7,
      title: 'High leverage',
      detail: 'Debt-to-equity appears high. Verify business model and debt servicing ability before relying on growth assumptions.',
      suggestedAction: 'Track interest coverage and avoid aggressive averaging when leverage stays elevated.',
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
      confidence: 'low',
      buyBias: 'Balanced',
      suggestedAction: 'No clear news edge. Keep on watchlist and rely more on fundamentals and price trend.',
      drivers: [{ tone: 'neutral', detail: 'No recent relevant news was available for sentiment scoring.' }],
      rationale: ['No recent relevant news found. Sentiment score is neutral by default.'],
    };
  }
  let score = 0;
  let positiveHits = 0;
  let negativeHits = 0;
  let debtConcernMentions = 0;
  let positiveEarningsMentions = 0;
  let mixedOutlookMentions = 0;
  for (const item of articles) {
    const text = `${item.title} ${item.snippet ?? ''}`.toLowerCase();
    for (const p of POSITIVE_WORDS) {
      if (text.includes(p)) {
        score += 1;
        positiveHits += 1;
      }
    }
    for (const n of NEGATIVE_WORDS) {
      if (text.includes(n)) {
        score -= 1;
        negativeHits += 1;
      }
    }
    if (/\bdebt\b|\bleverage\b|\bborrowings?\b|\binterest\b/.test(text)) debtConcernMentions += 1;
    if (/\bearnings\b|\bresults\b|\bprofit\b|\brevenue\b/.test(text) && /beat|growth|strong|improve|record/.test(text)) {
      positiveEarningsMentions += 1;
    }
    if (/\boutlook\b|\bguidance\b|\bmixed\b|\buncertain\b|\bvolatile\b/.test(text)) mixedOutlookMentions += 1;
  }
  const label = score > 1 ? 'Bullish' : score < -1 ? 'Bearish' : 'Neutral';
  const boundedScore = clamp(score, -8, 8);
  const buyProbability = clamp(Math.round(35 + boundedScore * 6), 5, 85);
  const sellProbability = clamp(Math.round(35 - boundedScore * 6), 5, 85);
  const holdProbability = Math.max(5, 100 - buyProbability - sellProbability);
  const scoreGap = buyProbability - sellProbability;
  const buyBias: AiInsights['sentiment']['buyBias'] =
    scoreGap >= 20 ? 'Strong Bullish' : scoreGap >= 8 ? 'Mild Bullish' : scoreGap <= -20 ? 'Strong Bearish' : scoreGap <= -8 ? 'Mild Bearish' : 'Balanced';
  const confidence: AiInsights['sentiment']['confidence'] =
    articles.length >= 12 && Math.abs(score) >= 5 ? 'high' : articles.length >= 6 ? 'medium' : 'low';
  const drivers: AiInsights['sentiment']['drivers'] = [];
  if (positiveEarningsMentions > 0) {
    drivers.push({
      tone: 'positive',
      detail: `Positive earnings coverage appeared in ${positiveEarningsMentions} recent article${positiveEarningsMentions > 1 ? 's' : ''}.`,
    });
  }
  if (debtConcernMentions > 0) {
    drivers.push({
      tone: 'negative',
      detail: `Debt or leverage concerns were mentioned in ${debtConcernMentions} article${debtConcernMentions > 1 ? 's' : ''}.`,
    });
  }
  if (mixedOutlookMentions > 0) {
    drivers.push({
      tone: 'neutral',
      detail: `Management outlook looked mixed/uncertain in ${mixedOutlookMentions} item${mixedOutlookMentions > 1 ? 's' : ''}.`,
    });
  }
  if (!drivers.length) {
    drivers.push({
      tone: label === 'Bullish' ? 'positive' : label === 'Bearish' ? 'negative' : 'neutral',
      detail: `Headline tone was ${label.toLowerCase()} across ${articles.length} analyzed news item${articles.length > 1 ? 's' : ''}.`,
    });
  }
  const suggestedAction =
    buyBias === 'Strong Bullish'
      ? 'Positive sentiment tilt. Consider staggered buy entries near support levels.'
      : buyBias === 'Mild Bullish'
        ? 'Mildly positive. Hold or accumulate on dips instead of chasing sharp rallies.'
        : buyBias === 'Balanced'
          ? 'Neutral setup. Hold and wait for either stronger earnings confirmation or better valuation.'
          : buyBias === 'Mild Bearish'
            ? 'Cautious bias. Keep on watchlist and avoid oversized fresh positions.'
            : 'Defensive stance. Prefer capital protection until sentiment and fundamentals improve.';
  return {
    score,
    label,
    buyProbability,
    holdProbability,
    sellProbability,
    confidence,
    buyBias,
    suggestedAction,
    drivers,
    rationale: [
      `Lexicon-based sentiment over ${articles.length} news items (${positiveHits} positive hits vs ${negativeHits} negative hits).`,
      'Use alongside fundamentals and price action.',
    ],
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

  if ((salesGrowth ?? 0) > 10) {
    pros.push('Sales growth is healthy, which supports future scale and earnings potential if margins remain stable.');
  }
  if ((roe ?? 0) > 15) {
    pros.push('Strong ROE indicates efficient capital use, supporting long-term compounding when sustained.');
  }
  if ((debtToEquity ?? 9) < 0.8) {
    pros.push('Debt levels look manageable, which reduces downside pressure during weak business cycles.');
  }
  if ((dividendYield ?? 0) > 1) {
    pros.push('Meaningful dividend adds a cash-return cushion, which can improve total-return stability.');
  }

  if ((pe ?? 0) > (industryPe ?? Infinity) * 1.2) {
    cons.push('Valuation is richer than industry average, so downside risk increases if growth slows.');
  }
  if ((debtToEquity ?? 0) > 2) {
    cons.push('High debt can amplify drawdowns in weak cycles and reduce flexibility during slowdowns.');
  }
  if (riskLevel === 'High') {
    cons.push('Price volatility and drawdown profile are high, making timing and position sizing critical.');
  }
  if (!pros.length) {
    pros.push('No major high-confidence positives were detected from currently available metrics.');
  }
  if (!cons.length) {
    cons.push('No major risk flags were triggered by the current metric checks.');
  }
  const netScore = pros.length - cons.length + (riskLevel === 'Low' ? 1 : riskLevel === 'High' ? -1 : 0);
  const netImpact: AiInsights['prosCons']['netImpact'] =
    netScore >= 2 ? 'Positive' : netScore === 1 ? 'Slightly Positive' : netScore <= -1 ? 'Negative' : 'Neutral';
  return { pros, cons, netImpact };
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

function confidenceFromSeriesLength(length: number): AiInsights['confidence'] {
  if (length >= 6) return 'high';
  if (length >= 4) return 'medium';
  return 'low';
}

function lowerConfidence(base: AiInsights['confidence'], steps = 1): AiInsights['confidence'] {
  const order: AiInsights['confidence'][] = ['low', 'medium', 'high'];
  const idx = Math.max(0, order.indexOf(base) - steps);
  return order[idx];
}

function confidenceBand(confidence: AiInsights['confidence']): number {
  if (confidence === 'high') return 8;
  if (confidence === 'medium') return 13;
  return 20;
}

function buildExplainability(input: AiContextInput): AiInsights['explainability'] {
  const hasMetrics = (input.metrics?.length ?? 0) > 0;
  const hasNews = (input.news?.length ?? 0) > 0;
  const hasHistory = (input.history?.points?.length ?? 0) > 30;

  let financialWeight = hasMetrics ? 45 : 30;
  let sentimentWeight = hasNews ? 30 : 15;
  let technicalWeight = hasHistory ? 25 : 10;

  const total = financialWeight + sentimentWeight + technicalWeight;
  financialWeight = Math.round((financialWeight / total) * 100);
  sentimentWeight = Math.round((sentimentWeight / total) * 100);
  technicalWeight = 100 - financialWeight - sentimentWeight;

  return [
    {
      driver: 'Financials',
      weight: financialWeight,
      detail: 'Based on growth, profitability, leverage, and valuation metrics.',
    },
    {
      driver: 'Sentiment',
      weight: sentimentWeight,
      detail: 'Based on news tone, recurring themes, and positive/negative article drivers.',
    },
    {
      driver: 'Technical Trend',
      weight: technicalWeight,
      detail: 'Based on drawdown, volatility, and observed bull/bear cycle behavior.',
    },
  ];
}

function buildDecisionEngine(
  input: AiContextInput,
  risk: AiInsights['risk'],
  sentiment: AiInsights['sentiment'],
  trendSummary: AiInsights['trendSummary'],
): AiInsights['decisionEngine'] {
  const salesGrowth = getMetric(input, 'salesGrowth');
  const profitGrowth = getMetric(input, 'profitGrowth');
  const debtToEquity = getMetric(input, 'debtToEquity');
  const pe = getMetric(input, 'pe');
  const industryPe = getMetric(input, 'industryPe');
  const roe = getMetric(input, 'roe');
  const points = input.history?.points ?? [];
  const currentPrice = points.length ? points[points.length - 1].close : undefined;

  let score = 0;
  let signalCount = 0;
  const drivers: string[] = [];

  if (typeof salesGrowth === 'number') {
    signalCount += 1;
    if (salesGrowth >= 12) {
      score += 1;
      drivers.push('healthy sales growth');
    } else if (salesGrowth < 4) {
      score -= 1;
      drivers.push('slow sales growth');
    }
  }
  if (typeof profitGrowth === 'number') {
    signalCount += 1;
    if (profitGrowth >= 12) {
      score += 1;
      drivers.push('strong profit growth');
    } else if (profitGrowth < 2) {
      score -= 1;
      drivers.push('weak profit trend');
    }
  }
  if (typeof debtToEquity === 'number') {
    signalCount += 1;
    if (debtToEquity <= 0.8) {
      score += 1;
      drivers.push('manageable leverage');
    } else if (debtToEquity > 2) {
      score -= 2;
      drivers.push('high leverage');
    }
  }
  if (typeof roe === 'number') {
    signalCount += 1;
    if (roe >= 15) {
      score += 1;
      drivers.push('strong return on equity');
    } else if (roe < 10) {
      score -= 1;
      drivers.push('sub-optimal ROE');
    }
  }
  if (typeof pe === 'number' && typeof industryPe === 'number' && industryPe > 0) {
    signalCount += 1;
    if (pe <= industryPe) {
      score += 1;
      drivers.push('valuation not above industry average');
    } else if (pe > industryPe * 1.25) {
      score -= 1;
      drivers.push('valuation premium risk');
    }
  }

  signalCount += 1;
  if (risk.riskLevel === 'High') {
    score -= 2;
    drivers.push('high volatility and drawdown risk');
  } else if (risk.riskLevel === 'Low') {
    score += 1;
    drivers.push('stable risk profile');
  }

  signalCount += 1;
  if (sentiment.buyBias === 'Strong Bullish') {
    score += 2;
    drivers.push('strongly positive sentiment');
  } else if (sentiment.buyBias === 'Mild Bullish') {
    score += 1;
    drivers.push('mildly positive sentiment');
  } else if (sentiment.buyBias === 'Mild Bearish') {
    score -= 1;
    drivers.push('mildly negative sentiment');
  } else if (sentiment.buyBias === 'Strong Bearish') {
    score -= 2;
    drivers.push('strongly negative sentiment');
  }

  signalCount += 1;
  if (/bull/i.test(trendSummary.currentPhaseLabel)) {
    score += 1;
    drivers.push('price trend in bullish phase');
  } else if (/bear/i.test(trendSummary.currentPhaseLabel)) {
    score -= 1;
    drivers.push('price trend in bearish phase');
  }

  const recommendation: AiInsights['decisionEngine']['recommendation'] = score >= 3 ? 'Buy' : score <= -2 ? 'Reduce' : 'Hold';
  const confidence: AiInsights['decisionEngine']['confidence'] = signalCount >= 8 ? 'high' : signalCount >= 5 ? 'medium' : 'low';
  const explanation =
    recommendation === 'Buy'
      ? `Constructive setup with ${drivers.slice(0, 3).join(', ')}. Prefer staggered buying over chasing sharp rallies.`
      : recommendation === 'Reduce'
        ? `Defensive setup with ${drivers.slice(0, 3).join(', ')}. Capital protection is more important than aggressive entry now.`
        : `Mixed setup with ${drivers.slice(0, 3).join(', ')}. Hold and wait for stronger confirmation before large action.`;

  const riskBuffer = risk.riskLevel === 'High' ? 0.1 : risk.riskLevel === 'Medium' ? 0.08 : 0.06;
  const rewardBuffer = risk.riskLevel === 'High' ? 0.13 : 0.1;

  return {
    recommendation,
    explanation,
    confidence,
    buyBelow: typeof currentPrice === 'number' ? Number((currentPrice * (1 - riskBuffer)).toFixed(2)) : undefined,
    sellAbove: typeof currentPrice === 'number' ? Number((currentPrice * (1 + rewardBuffer)).toFixed(2)) : undefined,
    stopLoss: typeof currentPrice === 'number' ? Number((currentPrice * (1 - riskBuffer - 0.04)).toFixed(2)) : undefined,
  };
}

function buildHorizonInsights(
  input: AiContextInput,
  sentiment: AiInsights['sentiment'],
  risk: AiInsights['risk'],
  trendSummary: AiInsights['trendSummary'],
  forecast: AiInsights['forecast'],
): AiInsights['horizonInsights'] {
  const salesGrowth = getMetric(input, 'salesGrowth') ?? 0;
  const profitGrowth = getMetric(input, 'profitGrowth') ?? 0;
  const debtToEquity = getMetric(input, 'debtToEquity') ?? 1.2;

  const shortScore = (sentiment.buyProbability - sentiment.sellProbability) / 10 + (/bull/i.test(trendSummary.currentPhaseLabel) ? 1 : /bear/i.test(trendSummary.currentPhaseLabel) ? -1 : 0);
  const midGrowth = average(
    forecast
      .map((f) => f.salesGrowthPct)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v)),
  ) ?? 0;
  const midScore = midGrowth >= 10 ? 1 : midGrowth >= 4 ? 0 : -1;
  const longScore = (salesGrowth >= 10 ? 1 : salesGrowth < 4 ? -1 : 0) + (profitGrowth >= 10 ? 1 : profitGrowth < 4 ? -1 : 0) + (debtToEquity <= 1 ? 1 : debtToEquity > 2 ? -1 : 0);

  const toStance = (score: number): AiInsights['horizonInsights'][number]['stance'] => (score >= 1 ? 'Positive' : score <= -1 ? 'Cautious' : 'Neutral');

  return [
    {
      horizon: 'Short-term (0-3M)',
      stance: toStance(shortScore),
      detail:
        shortScore >= 1
          ? 'News and near-term trend are supportive, but use staged entries due to normal volatility.'
          : shortScore <= -1
            ? 'Near-term setup is fragile. Wait for momentum stabilization before fresh aggressive buying.'
            : 'Near-term signals are mixed; maintain watchlist discipline and focus on risk control.',
    },
    {
      horizon: 'Mid-term (3-12M)',
      stance: toStance(midScore),
      detail:
        midScore >= 1
          ? 'Baseline forecast suggests improving trajectory if execution remains steady.'
          : midScore <= -1
            ? 'Forecast visibility is weak. Prefer conservative expectations and tighter monitoring.'
            : 'Mid-term outlook is balanced; track quarterly trend consistency.',
    },
    {
      horizon: 'Long-term (1-3Y)',
      stance: toStance(longScore - (risk.riskLevel === 'High' ? 1 : 0)),
      detail:
        longScore >= 2
          ? 'Business fundamentals support long-term compounding if valuation and debt remain controlled.'
          : longScore <= 0
            ? 'Long-term case needs better growth quality or balance-sheet improvement before high conviction.'
            : 'Long-term setup is acceptable but needs periodic validation from cash flow and profitability quality.',
    },
  ];
}

function buildEntryExitSignals(
  input: AiContextInput,
  risk: AiInsights['risk'],
  sentiment: AiInsights['sentiment'],
  trendSummary: AiInsights['trendSummary'],
): AiInsights['entryExit'] {
  const points = input.history?.points ?? [];
  if (!points.length) {
    return {
      breakoutProbability: 50,
      note: 'Not enough chart history to estimate buy zone, resistance, or breakout probability.',
    };
  }
  const currentPrice = points[points.length - 1].close;
  const recentSlice = points.slice(-120);
  const recentHigh = Math.max(...recentSlice.map((p) => p.close));
  const riskBuffer = risk.riskLevel === 'High' ? 0.1 : risk.riskLevel === 'Medium' ? 0.08 : 0.06;
  const buyZoneLow = Number((currentPrice * (1 - riskBuffer)).toFixed(2));
  const buyZoneHigh = Number((currentPrice * (1 - Math.max(0.03, riskBuffer - 0.03))).toFixed(2));
  const breakoutProbability = clamp(
    Math.round(
      45 +
        (sentiment.buyProbability - sentiment.sellProbability) * 0.4 +
        (/bull/i.test(trendSummary.currentPhaseLabel) ? 8 : /bear/i.test(trendSummary.currentPhaseLabel) ? -8 : 0) -
        (risk.riskLevel === 'High' ? 8 : 0),
    ),
    15,
    85,
  );

  return {
    buyZoneLow,
    buyZoneHigh,
    resistance: Number(recentHigh.toFixed(2)),
    breakoutProbability,
    note:
      breakoutProbability >= 60
        ? 'Breakout odds are constructive, but entry quality still matters.'
        : breakoutProbability <= 40
          ? 'Breakout odds are weak. Prefer patience and confirmation.'
          : 'Breakout odds are balanced; use alert-based entry instead of impulse buying.',
  };
}

function buildPeerSignals(input: AiContextInput): string[] {
  const salesGrowth = getMetric(input, 'salesGrowth');
  const profitGrowth = getMetric(input, 'profitGrowth');
  const debtToEquity = getMetric(input, 'debtToEquity');
  const pe = getMetric(input, 'pe');
  const industryPe = getMetric(input, 'industryPe');

  const signals: string[] = [];
  if (typeof salesGrowth === 'number') {
    signals.push(
      salesGrowth >= 12
        ? 'Revenue growth appears stronger than many mature peers.'
        : salesGrowth >= 6
          ? 'Revenue growth is near peer-average pace.'
          : 'Revenue growth appears weaker than many growth-oriented peers.',
    );
  }
  if (typeof debtToEquity === 'number') {
    signals.push(
      debtToEquity <= 0.8
        ? 'Leverage profile is healthier than many debt-heavy peers.'
        : debtToEquity > 2
          ? 'Leverage is weaker than conservative peers and needs monitoring.'
          : 'Leverage is moderate versus peers.',
    );
  }
  if (typeof pe === 'number' && typeof industryPe === 'number' && industryPe > 0) {
    signals.push(
      pe <= industryPe
        ? 'Valuation is not above industry average, which supports better entry comfort.'
        : 'Valuation trades above industry average, so margin of safety is lower.',
    );
  }
  if (typeof profitGrowth === 'number' && signals.length < 4) {
    signals.push(
      profitGrowth >= 10
        ? 'Profit growth quality is competitive versus many peer groups.'
        : 'Profit growth is modest and may lag stronger peer performers.',
    );
  }
  if (!signals.length) {
    signals.push('Peer-relative signals are limited because key benchmark metrics are incomplete.');
  }
  return signals.slice(0, 4);
}

function buildPatternSignals(trendPeriods: TrendPeriod[]): string[] {
  if (!trendPeriods.length) {
    return ['Not enough trend segments yet for recurring pattern detection.'];
  }
  let reboundCount = 0;
  for (let i = 0; i < trendPeriods.length - 1; i += 1) {
    const current = trendPeriods[i];
    const next = trendPeriods[i + 1];
    if (current.type === 'bear' && current.returnPct <= -15 && next.type === 'bull' && next.returnPct >= 10) {
      reboundCount += 1;
    }
  }
  const bullStreak = trendPeriods.filter((p) => p.type === 'bull').length;
  const bearStreak = trendPeriods.filter((p) => p.type === 'bear').length;
  const patterns: string[] = [];
  if (reboundCount > 0) {
    patterns.push(`After sharp corrections, the stock showed rebound behavior ${reboundCount} time${reboundCount > 1 ? 's' : ''} in the available history.`);
  }
  patterns.push(
    bullStreak >= bearStreak
      ? 'Bull phases outnumber or match bear phases in the recent segmented trend sample.'
      : 'Bear phases dominate the recent segmented trend sample, so timing discipline is important.',
  );
  return patterns.slice(0, 3);
}

function buildAlertSuggestions(
  sentiment: AiInsights['sentiment'],
  entryExit: AiInsights['entryExit'],
  risk: AiInsights['risk'],
): string[] {
  const alerts: string[] = [];
  if (sentiment.label !== 'Bullish') {
    alerts.push('Alert if sentiment turns bullish or buy probability rises above 55%.');
  }
  if (typeof entryExit.buyZoneHigh === 'number') {
    alerts.push(`Alert if price enters buy zone near ${entryExit.buyZoneHigh.toFixed(2)} or lower.`);
  }
  if (typeof entryExit.resistance === 'number') {
    alerts.push(`Alert on breakout above resistance around ${entryExit.resistance.toFixed(2)} with strong volume.`);
  }
  if (risk.riskLevel === 'High') {
    alerts.push('Alert if daily drawdown exceeds 5% to control downside risk quickly.');
  }
  return alerts.slice(0, 4);
}

function buildScenarioInsights(forecast: AiInsights['forecast'], risk: AiInsights['risk']): AiInsights['scenarioInsights'] {
  const baselineSalesGrowth =
    average(
      forecast
        .map((f) => f.salesGrowthPct)
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v)),
    ) ?? 0;
  const optimisticGrowth = baselineSalesGrowth + 4;
  const stressedGrowth = baselineSalesGrowth - 6;
  return [
    {
      scenario: 'If revenue grows 10% faster than baseline',
      expectedImpact: `Earnings trajectory can improve meaningfully; indicative upside bias increases (growth near ${optimisticGrowth.toFixed(1)}%).`,
      riskChange: risk.riskLevel === 'High' ? 'Risk remains elevated despite higher growth because volatility is already high.' : 'Risk profile may improve slightly if profit conversion remains healthy.',
    },
    {
      scenario: 'If interest rates stay higher for longer',
      expectedImpact: `Net profit can face pressure, especially for debt-heavy balance sheets (stress growth near ${stressedGrowth.toFixed(1)}%).`,
      riskChange: 'Downside risk increases if finance costs rise faster than operating profit.',
    },
  ];
}

function buildOverview(
  risk: AiInsights['risk'],
  sentiment: AiInsights['sentiment'],
  prosCons: AiInsights['prosCons'],
  trendSummary: AiInsights['trendSummary'],
): string {
  const riskText = risk.riskLevel === 'High' ? 'high-risk' : risk.riskLevel === 'Medium' ? 'moderate-risk' : 'lower-risk';
  const growthText =
    prosCons.netImpact === 'Positive' || prosCons.netImpact === 'Slightly Positive'
      ? 'moderate-growth'
      : prosCons.netImpact === 'Negative'
        ? 'fragile-growth'
        : 'mixed-growth';
  const sentimentText = sentiment.buyBias.toLowerCase();
  return `${riskText}, ${growthText} setup with ${sentimentText} sentiment; current phase is ${trendSummary.currentPhaseLabel.toLowerCase()}. Suitable for disciplined investors who follow risk controls.`;
}

function computeInsightsConfidence(input: AiContextInput, trendPeriods: TrendPeriod[], forecast: AiInsights['forecast']): AiInsights['confidence'] {
  let coverage = 0;
  if ((input.history?.points?.length ?? 0) >= 120) coverage += 1;
  if ((input.metrics?.length ?? 0) >= 8) coverage += 1;
  if ((input.news?.length ?? 0) >= 6) coverage += 1;
  if ((input.statements?.length ?? 0) >= 2) coverage += 1;
  if (trendPeriods.length >= 4) coverage += 1;
  if (forecast.some((f) => f.confidence === 'high')) coverage += 1;
  if (coverage >= 5) return 'high';
  if (coverage >= 3) return 'medium';
  return 'low';
}

export function generateAiInsights(input: AiContextInput): AiInsights {
  const points = input.history?.points ?? [];
  const prices = points.map((p) => p.close);
  const ts = points.map((p) => p.ts);
  const trendPeriods = calcTrendPeriods(prices, ts);
  const trendSummary = computeTrendSummary(prices, trendPeriods);
  const risk = computeRisk(input);
  const fraudFlags = computeFraudFlags(input);
  const sentiment = computeSentiment(input);

  const salesSeries = latestFromStatement(input, /revenue|sales/i);
  const profitSeries = latestFromStatement(input, /net profit|profit/i);
  const salesForecast = linearForecast(salesSeries.values, salesSeries.labels);
  const profitForecast = linearForecast(profitSeries.values, profitSeries.labels);

  const baselineForecastConfidence = confidenceFromSeriesLength(Math.max(salesSeries.values.length, profitSeries.values.length));
  const forecast: AiInsights['forecast'] = [0, 1].map((i) => {
    const sales = salesForecast[i]?.value;
    const profit = profitForecast[i]?.value;
    const prevSales = i === 0 ? salesSeries.values[salesSeries.values.length - 1] : salesForecast[i - 1]?.value;
    const prevProfit = i === 0 ? profitSeries.values[profitSeries.values.length - 1] : profitForecast[i - 1]?.value;
    const salesGrowthPct = typeof sales === 'number' && typeof prevSales === 'number' && prevSales !== 0 ? Number(changePct(prevSales, sales).toFixed(1)) : undefined;
    const profitGrowthPct =
      typeof profit === 'number' && typeof prevProfit === 'number' && prevProfit !== 0 ? Number(changePct(prevProfit, profit).toFixed(1)) : undefined;
    const confidence = lowerConfidence(baselineForecastConfidence, i === 0 ? 0 : 1);
    const band = confidenceBand(confidence);
    return {
      period: salesForecast[i]?.period ?? profitForecast[i]?.period ?? `F+${i + 1}`,
      sales,
      profit,
      salesGrowthPct,
      profitGrowthPct,
      confidence,
      bestCaseSales: typeof sales === 'number' ? Number((sales * (1 + band / 100)).toFixed(2)) : undefined,
      worstCaseSales: typeof sales === 'number' ? Number((sales * (1 - band / 100)).toFixed(2)) : undefined,
      bestCaseProfit: typeof profit === 'number' ? Number((profit * (1 + band / 100)).toFixed(2)) : undefined,
      worstCaseProfit: typeof profit === 'number' ? Number((profit * (1 - band / 100)).toFixed(2)) : undefined,
    };
  });

  const prosCons = buildProsCons(input, risk.riskLevel);
  const decisionEngine = buildDecisionEngine(input, risk, sentiment, trendSummary);
  const explainability = buildExplainability(input);
  const horizonInsights = buildHorizonInsights(input, sentiment, risk, trendSummary, forecast);
  const entryExit = buildEntryExitSignals(input, risk, sentiment, trendSummary);
  const peerSignals = buildPeerSignals(input);
  const patternSignals = buildPatternSignals(trendPeriods);
  const alertSuggestions = buildAlertSuggestions(sentiment, entryExit, risk);
  const scenarioInsights = buildScenarioInsights(forecast, risk);
  const confidence = computeInsightsConfidence(input, trendPeriods, forecast);
  const overview = buildOverview(risk, sentiment, prosCons, trendSummary);
  const forecastAssumption =
    risk.riskLevel === 'High'
      ? 'Key assumption: demand remains stable and financing conditions do not worsen sharply.'
      : 'Key assumption: demand growth remains in a normal cycle range and margins stay broadly stable.';

  return {
    confidence,
    overview,
    trendPeriods,
    trendSummary,
    risk,
    fraudFlags,
    sentiment,
    forecast,
    forecastAssumption,
    scenarioInsights,
    decisionEngine,
    explainability,
    horizonInsights,
    entryExit,
    prosCons,
    peerSignals,
    patternSignals,
    alertSuggestions,
  };
}

export function buildBeginnerAssessment(input: AiContextInput): BeginnerAssessment {
  const salesGrowth = getMetric(input, 'salesGrowth');
  const profitGrowth = getMetric(input, 'profitGrowth');
  const debtToEquity = getMetric(input, 'debtToEquity');
  const pe = getMetric(input, 'pe');
  const industryPe = getMetric(input, 'industryPe');
  const roe = getMetric(input, 'roe');
  const currentRatio = getMetric(input, 'currentRatio');
  const interestCoverage = getMetric(input, 'interestCoverage');
  const dividendYield = getMetric(input, 'dividendYield');
  const return6m = getMetric(input, 'return6m');

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
    {
      label: 'Are profits keeping up with sales?',
      status:
        salesGrowth === undefined || profitGrowth === undefined
          ? 'watch'
          : profitGrowth >= salesGrowth - 1
            ? 'good'
            : profitGrowth >= salesGrowth - 5
              ? 'watch'
              : 'bad',
      explanation:
        salesGrowth === undefined || profitGrowth === undefined
          ? 'Not enough data to compare sales growth and profit growth.'
          : profitGrowth >= salesGrowth - 1
            ? 'Profit growth is broadly keeping pace with sales growth.'
            : profitGrowth >= salesGrowth - 5
              ? 'Sales are growing faster than profits. Watch margin quality.'
              : 'Sales growth is not converting well into profits, which is a caution sign.',
    },
    {
      label: 'Is profitability quality healthy?',
      status: roe === undefined ? 'watch' : roe >= 15 ? 'good' : roe >= 10 ? 'watch' : 'bad',
      explanation:
        roe === undefined
          ? 'Profitability quality data (ROE) is not available.'
          : roe >= 15
            ? 'ROE is strong, suggesting efficient use of shareholder capital.'
            : roe >= 10
              ? 'ROE is moderate. Prefer a stronger and stable profitability track.'
              : 'ROE is weak, which may indicate low capital efficiency.',
    },
    {
      label: 'Can the company handle near-term obligations?',
      status: currentRatio === undefined ? 'watch' : currentRatio >= 1.5 ? 'good' : currentRatio >= 1 ? 'watch' : 'bad',
      explanation:
        currentRatio === undefined
          ? 'Liquidity data is not available for this stock.'
          : currentRatio >= 1.5
            ? 'Near-term liquidity looks comfortable.'
            : currentRatio >= 1
              ? 'Liquidity is adequate but not very strong.'
              : 'Liquidity is tight, so near-term balance sheet risk is higher.',
    },
    {
      label: 'Can operating profit cover interest costs?',
      status: interestCoverage === undefined ? 'watch' : interestCoverage >= 4 ? 'good' : interestCoverage >= 2 ? 'watch' : 'bad',
      explanation:
        interestCoverage === undefined
          ? 'Interest coverage data is not available.'
          : interestCoverage >= 4
            ? 'Interest coverage is healthy, reducing debt-servicing risk.'
            : interestCoverage >= 2
              ? 'Interest coverage is moderate. Monitor if profits remain stable.'
              : 'Interest coverage is weak, which can raise financial risk.',
    },
    {
      label: 'Is recent market momentum supportive?',
      status: return6m === undefined ? 'watch' : return6m >= 8 ? 'good' : return6m >= 0 ? 'watch' : 'bad',
      explanation:
        return6m === undefined
          ? 'Recent momentum data is unavailable.'
          : return6m >= 8
            ? 'Recent 6-month return is positive, showing supportive momentum.'
            : return6m >= 0
              ? 'Momentum is slightly positive but not very strong.'
              : 'Recent momentum is negative, so entry timing needs extra caution.',
    },
    {
      label: 'Does it provide cash return to shareholders?',
      status: dividendYield === undefined ? 'watch' : dividendYield >= 1 ? 'good' : dividendYield > 0 ? 'watch' : 'watch',
      explanation:
        dividendYield === undefined
          ? 'Dividend yield data is unavailable.'
          : dividendYield >= 1
            ? 'Dividend yield is meaningful and provides some cash return.'
            : dividendYield > 0
              ? 'Dividend exists but is modest. Total return depends more on growth.'
              : 'No dividend currently. Returns rely mainly on price appreciation.',
    },
  ] as BeginnerAssessment['simpleChecks'];

  const score = simpleChecks.reduce((acc, check) => {
    if (check.status === 'good') return acc + 1;
    if (check.status === 'bad') return acc - 1;
    return acc;
  }, 0);
  const totalChecks = simpleChecks.length;
  const normalized = totalChecks ? score / totalChecks : 0;
  const recommendation: BeginnerAssessment['recommendation'] =
    normalized >= 0.25 ? 'Yes' : normalized <= -0.25 ? 'No' : 'Neutral';
  const scaledBuy = Math.max(1, Math.min(5, Math.round(((normalized + 1) / 2) * 4 + 1)));
  const buyScore = scaledBuy as BeginnerAssessment['buyScore'];
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
  const push = (field: string, op: ParsedScreenFilter['op'], value: string | number) => {
    filters.push({ field, op, value });
  };

  if (q.includes('profitable') || q.includes('profit')) push('pat', '>', 0);
  if (q.includes('low debt')) push('debtToEquity', '<', 1);
  if (q.includes('debt free')) push('debtToEquity', '<', 0.2);
  if (q.includes('rising sales') || q.includes('sales growth')) push('salesGrowth', '>', 10);
  if (q.includes('high roe')) push('roe', '>', 15);
  if (q.includes('high roce')) push('roce', '>', 15);
  if (q.includes('cheap') || q.includes('low pe')) push('pe', '<', 20);
  if (q.includes('low pb')) push('pb', '<', 3);
  if (q.includes('dividend')) push('dividendYield', '>', 1);
  if (q.includes('momentum')) push('return6m', '>', 10);
  if (q.includes('large cap')) push('marketCapBucket', '=', 'Largecap');
  if (q.includes('mid cap')) push('marketCapBucket', '=', 'Midcap');
  if (q.includes('small cap')) push('marketCapBucket', '=', 'Smallcap');
  if (q.includes('india stock') || q.includes('indian stock')) push('stockUniverse', '=', 'India Stocks');
  if (q.includes('us stock') || q.includes('american stock')) push('stockUniverse', '=', 'US Stocks');
  if (q.includes('high volume')) push('volumeVsAvg1m', '>', 1.2);
  if (q.includes('low volatility')) push('volatility30d', '<', 25);
  if (q.includes('above 50 dma') || q.includes('above 50 sma')) push('priceVsSma50', '>', 0);
  if (q.includes('above 200 dma') || q.includes('above 200 sma')) push('priceVsSma200', '>', 0);

  const numericPatterns: Array<{ re: RegExp; field: string }> = [
    { re: /\bpe\s*(<=|>=|<|>|=)\s*(\d+(?:\.\d+)?)/g, field: 'pe' },
    { re: /\bpb\s*(<=|>=|<|>|=)\s*(\d+(?:\.\d+)?)/g, field: 'pb' },
    { re: /\broe\s*(<=|>=|<|>|=)\s*(\d+(?:\.\d+)?)/g, field: 'roe' },
    { re: /\broce\s*(<=|>=|<|>|=)\s*(\d+(?:\.\d+)?)/g, field: 'roce' },
    { re: /\bdividend(?:\s+yield)?\s*(<=|>=|<|>|=)\s*(\d+(?:\.\d+)?)/g, field: 'dividendYield' },
    { re: /\bmarket\s*cap\s*(<=|>=|<|>|=)\s*(\d+(?:\.\d+)?)/g, field: 'marketCap' },
    { re: /\bdebt\s*to\s*equity\s*(<=|>=|<|>|=)\s*(\d+(?:\.\d+)?)/g, field: 'debtToEquity' },
    { re: /\bsales\s*growth\s*(<=|>=|<|>|=)\s*(\d+(?:\.\d+)?)/g, field: 'salesGrowth' },
    { re: /\bprofit\s*growth\s*(<=|>=|<|>|=)\s*(\d+(?:\.\d+)?)/g, field: 'profitGrowth' },
  ];

  for (const pattern of numericPatterns) {
    for (const match of q.matchAll(pattern.re)) {
      const op = match[1] as ParsedScreenFilter['op'];
      const value = Number(match[2]);
      if (Number.isFinite(value)) push(pattern.field, op, value);
    }
  }

  const dedup = new Set<string>();
  const uniqueFilters = filters.filter((filter) => {
    const key = `${filter.field}:${filter.op}:${String(filter.value).toLowerCase()}`;
    if (dedup.has(key)) return false;
    dedup.add(key);
    return true;
  });

  return {
    filters: uniqueFilters,
    explanation: uniqueFilters.length
      ? `Parsed ${uniqueFilters.length} rule-based filter(s) from natural language.`
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
