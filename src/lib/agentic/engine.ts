import { heuristicAiProvider } from '@/lib/ai';
import { demoFundamentalsBySymbol, demoUniverse, generateDemoHistory, getDemoNews } from '@/lib/data/mock/demo-data';
import type { PortfolioTxn } from '@/lib/storage/idb';
import type { FinancialStatementTable, SearchEntity } from '@/types';

export type AgentIntent =
  | 'long_term_ideas'
  | 'short_term_swing'
  | 'valuation_analysis'
  | 'portfolio_review'
  | 'peer_comparison'
  | 'earnings_event_analysis'
  | 'technical_analysis'
  | 'sector_screening'
  | 'risk_diagnostics'
  | 'news_sentiment'
  | 'watchlist_alerts';

export type InvestmentHorizon = 'short_term' | 'medium_term' | 'long_term';
export type RiskAppetite = 'low' | 'moderate' | 'high';
export type MarketPreference = 'india' | 'us' | 'both';
export type StylePreference = 'value' | 'growth' | 'momentum' | 'quality' | 'dividend';
export type MaritalStatus = 'single' | 'married' | 'other';

export interface AgenticFormInput {
  goal: string;
  preferredShareMode: 'yes' | 'no';
  preferredShareSymbol?: string;
  investmentHorizon?: InvestmentHorizon;
  riskAppetite?: RiskAppetite;
  capitalAmount?: number;
  marketPreference?: MarketPreference;
  stylePreferences: StylePreference[];
  sectorPreferences: string[];
  constraints: string[];
  age?: number;
  maritalStatus?: MaritalStatus;
  kids?: number;
  country?: string;
  incomeBracket?: string;
  assetsOwned: string[];
  liabilitiesOwned: string[];
}

export interface IntentDetection {
  intent: AgentIntent;
  confidence: number;
  reason: string;
}

export interface DynamicInvestorProfile {
  investmentHorizon: InvestmentHorizon;
  riskAppetite: RiskAppetite;
  capitalAmount: number;
  marketPreference: MarketPreference;
  stylePreferences: StylePreference[];
  sectorPreferences: string[];
  constraints: string[];
  age?: number;
  maritalStatus?: MaritalStatus;
  kids?: number;
  country?: string;
  incomeBracket?: string;
  assetsOwned: string[];
  liabilitiesOwned: string[];
  inferredFields: string[];
  profileNarrative: string;
}

export interface PortfolioDiagnostics {
  hasPortfolio: boolean;
  holdingsCount: number;
  concentrationPct?: number;
  diversificationScore: number;
  totalInvested: number;
  totalCurrentValue: number;
  totalPnl: number;
  totalPnlPct: number;
  marketExposure: Array<{ market: 'india' | 'us' | 'mf'; weightPct: number }>;
  sectorExposure: Array<{ sector: string; weightPct: number }>;
  notes: string[];
}

export interface DcfBreakdown {
  baseCashFlow: number;
  growthRatePct: number;
  discountRatePct: number;
  terminalGrowthPct: number;
  intrinsicValue?: number;
  fairValuePerShare?: number;
  currentPrice?: number;
  upsidePct?: number;
  verdict: 'undervalued' | 'fair' | 'overvalued' | 'insufficient_data';
  confidence: 'low' | 'medium' | 'high';
}

export interface StockIntelligenceReport {
  symbol: string;
  displaySymbol: string;
  name: string;
  market: 'india' | 'us';
  sector: string;
  industry: string;
  suitabilityScore: number;
  recommendation: 'BUY' | 'HOLD' | 'SELL';
  buyPct: number;
  holdPct: number;
  sellPct: number;
  confidence: 'low' | 'medium' | 'high';
  confidenceScore: number;
  smartSummary: string;
  catalysts: string[];
  whyFitYou: string[];
  riskRadar: {
    overall: 'Low' | 'Moderate' | 'High';
    marketRisk: 'Low' | 'Medium' | 'High';
    sectorRisk: 'Low' | 'Medium' | 'High';
    valuationRisk: 'Low' | 'Medium' | 'High';
  };
  quantSnapshot: {
    growthScore: number;
    qualityScore: number;
    valueScore: number;
    momentumScore: number;
    styleScore: number;
    sentimentScore: number;
    riskPenalty: number;
    personalAdjustment: number;
    coverageCount: number;
  };
  trendCycleInsights: string[];
  ratioInsights: string[];
  statementInsights: string[];
  valuationInsights: string[];
  sentimentInsights: string[];
  forecastInsights: string[];
  forecastRows: Array<{
    period: string;
    sales?: number;
    profit?: number;
    salesGrowthPct?: number;
    profitGrowthPct?: number;
    confidence: 'low' | 'medium' | 'high';
    bestCaseSales?: number;
    worstCaseSales?: number;
    bestCaseProfit?: number;
    worstCaseProfit?: number;
  }>;
  decisionPlan: {
    recommendation: 'Buy' | 'Hold' | 'Reduce';
    explanation: string;
    buyBelow?: number;
    sellAbove?: number;
    stopLoss?: number;
    confidence: 'low' | 'medium' | 'high';
  };
  explainabilityInsights: string[];
  horizonInsights: string[];
  scenarioInsights: string[];
  entryExitInsights: string[];
  technicalInsights: string[];
  riskInsights: string[];
  eventInsights: string[];
  peerInsights: string[];
  alerts: string[];
  prosConsNetImpact: 'Positive' | 'Slightly Positive' | 'Neutral' | 'Negative';
  dcf: DcfBreakdown;
  detailedSummary: string;
}

export interface AgentExecutionLog {
  title: string;
  detail: string;
  status: 'done' | 'warning';
}

export interface DataQualitySummary {
  confidenceScore: number;
  confidenceLabel: 'low' | 'medium' | 'high';
  dataFreshness: string;
  missingData: string[];
}

export interface PortfolioFixSuggestion {
  issues: string[];
  suggestedFixes: string[];
  simulatedImpact: {
    diversificationBefore: number;
    diversificationAfter: number;
    expectedVolatilityChangePct: number;
    expectedReturnChangePct: number;
  };
}

export interface ActionPanelSummary {
  primaryAction: string;
  allocationPct: number;
  entryRange: { low?: number; high?: number };
  timeHorizonLabel: string;
  backupActions: string[];
  portfolioChanges: string[];
}

export interface AgenticAnalysisReport {
  generatedAt: string;
  intents: IntentDetection[];
  profile: DynamicInvestorProfile;
  portfolio: PortfolioDiagnostics;
  preferredStockReport?: StockIntelligenceReport;
  suggestedStocks: StockIntelligenceReport[];
  actionPanel: ActionPanelSummary;
  executionLog: AgentExecutionLog[];
  dataQuality: DataQualitySummary;
  portfolioFixes: PortfolioFixSuggestion;
  summary: string;
}

interface HoldingRow {
  symbol: string;
  market: 'us' | 'india' | 'mf';
  qty: number;
  invested: number;
  currentPrice: number;
  currentValue: number;
  sector: string;
}

const INTENT_RULES: Array<{ intent: AgentIntent; label: string; keywords: string[] }> = [
  {
    intent: 'long_term_ideas',
    label: 'Long-term investing ideas',
    keywords: ['long term', 'long-term', 'retirement', 'compound', 'wealth creation', '5 year', '10 year'],
  },
  {
    intent: 'short_term_swing',
    label: 'Short-term swing analysis',
    keywords: ['swing', 'short term', 'short-term', 'breakout', '1 week', '2 week', 'momentum trade'],
  },
  {
    intent: 'valuation_analysis',
    label: 'Valuation analysis',
    keywords: ['valuation', 'intrinsic', 'dcf', 'undervalued', 'overvalued', 'fair value', 'pe', 'pb'],
  },
  {
    intent: 'portfolio_review',
    label: 'Portfolio review',
    keywords: ['portfolio', 'allocation', 'rebalance', 'holdings', 'diversification'],
  },
  {
    intent: 'peer_comparison',
    label: 'Peer comparison',
    keywords: ['peer', 'compare', 'competitor', 'vs industry', 'sector average'],
  },
  {
    intent: 'earnings_event_analysis',
    label: 'Earnings/event analysis',
    keywords: ['earnings', 'results', 'quarterly', 'event', 'guidance'],
  },
  {
    intent: 'technical_analysis',
    label: 'Technical analysis',
    keywords: ['technical', 'rsi', 'dma', 'moving average', 'trend', 'support', 'resistance'],
  },
  {
    intent: 'sector_screening',
    label: 'Sector screening',
    keywords: ['sector', 'screen', 'industry', 'theme', 'basket'],
  },
  {
    intent: 'risk_diagnostics',
    label: 'Risk diagnostics',
    keywords: ['risk', 'volatility', 'drawdown', 'debt risk', 'downside'],
  },
  {
    intent: 'news_sentiment',
    label: 'News/sentiment monitoring',
    keywords: ['sentiment', 'news', 'headline', 'media', 'narrative'],
  },
  {
    intent: 'watchlist_alerts',
    label: 'Custom watchlist alerts',
    keywords: ['watchlist', 'alert', 'notify', 'trigger'],
  },
];

const DEFAULT_CONSTRAINTS = ['No penny stocks'];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toPct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

function getMetric(symbol: string, key: string): number | undefined {
  return demoFundamentalsBySymbol[symbol]?.keyMetrics.find((metric) => metric.key === key)?.value;
}

function deriveHoldings(txns: PortfolioTxn[]): HoldingRow[] {
  const map = new Map<string, { qty: number; invested: number; market: 'us' | 'india' | 'mf' }>();
  for (const txn of txns) {
    const key = txn.symbol;
    const current = map.get(key) ?? { qty: 0, invested: 0, market: txn.market };
    if (txn.side === 'buy') {
      current.qty += txn.quantity;
      current.invested += txn.quantity * txn.price;
    } else {
      const avgCost = current.qty > 0 ? current.invested / current.qty : 0;
      current.qty -= txn.quantity;
      current.invested -= txn.quantity * avgCost;
      if (current.qty < 0) current.qty = 0;
      if (current.invested < 0) current.invested = 0;
    }
    map.set(key, current);
  }

  return Array.from(map.entries())
    .filter(([, value]) => value.qty > 0)
    .map(([symbol, value]) => {
      const entity = demoUniverse.find((candidate) => candidate.symbol === symbol);
      const currentPrice = getMetric(symbol, 'currentPrice') ?? 0;
      return {
        symbol,
        market: value.market,
        qty: value.qty,
        invested: value.invested,
        currentPrice,
        currentValue: value.qty * currentPrice,
        sector: entity?.sector ?? 'Unknown',
      };
    });
}

function detectIntent(goal: string, preferredShareGiven: boolean, horizon?: InvestmentHorizon): IntentDetection[] {
  const source = goal.toLowerCase();
  const detections = INTENT_RULES.map((rule) => {
    const matched = rule.keywords.filter((keyword) => source.includes(keyword));
    let score = matched.length * 0.18;
    if (rule.intent === 'valuation_analysis' && preferredShareGiven) score += 0.12;
    if (rule.intent === 'long_term_ideas' && horizon === 'long_term') score += 0.12;
    if (rule.intent === 'short_term_swing' && horizon === 'short_term') score += 0.12;
    if (rule.intent === 'portfolio_review') score += 0.06;
    return {
      intent: rule.intent,
      confidence: clamp(score + 0.24, 0, 0.95),
      reason: matched.length
        ? `Detected from keywords: ${matched.slice(0, 3).join(', ')}.`
        : `No strong explicit keywords for ${rule.label.toLowerCase()}; treated as secondary signal.`,
    };
  });

  const ranked = detections.filter((item) => item.confidence >= 0.3).sort((left, right) => right.confidence - left.confidence);
  if (!ranked.length) {
    return [
      {
        intent: preferredShareGiven ? 'valuation_analysis' : 'long_term_ideas',
        confidence: 0.45,
        reason: preferredShareGiven
          ? 'Preferred share provided, so valuation + company-specific analysis is prioritized.'
          : 'No strong intent keywords found. Defaulting to long-term idea generation.',
      },
    ];
  }
  return ranked.slice(0, 5);
}

function inferProfile(input: AgenticFormInput, intents: IntentDetection[], holdings: HoldingRow[]): DynamicInvestorProfile {
  const inferredFields: string[] = [];

  let horizon = input.investmentHorizon;
  if (!horizon) {
    if (intents.some((intent) => intent.intent === 'short_term_swing')) horizon = 'short_term';
    else if (intents.some((intent) => intent.intent === 'long_term_ideas')) horizon = 'long_term';
    else horizon = 'medium_term';
    inferredFields.push('investmentHorizon');
  }

  let risk = input.riskAppetite;
  if (!risk) {
    let score = 0;
    if ((input.age ?? 35) <= 32) score += 1;
    if (horizon === 'short_term') score += 1;
    if ((input.liabilitiesOwned?.length ?? 0) >= 2) score -= 1;
    if ((input.kids ?? 0) >= 2) score -= 1;
    risk = score >= 2 ? 'high' : score <= -1 ? 'low' : 'moderate';
    inferredFields.push('riskAppetite');
  }

  let capital = input.capitalAmount;
  if (!capital || Number.isNaN(capital)) {
    const invested = holdings.reduce((sum, holding) => sum + holding.invested, 0);
    capital = invested > 0 ? Math.round(invested * 1.4) : 500000;
    inferredFields.push('capitalAmount');
  }

  let marketPreference = input.marketPreference;
  if (!marketPreference) {
    if (input.constraints.some((constraint) => /india only/i.test(constraint))) marketPreference = 'india';
    else if (input.constraints.some((constraint) => /us only/i.test(constraint))) marketPreference = 'us';
    else if ((input.country ?? '').toLowerCase().includes('india')) marketPreference = 'india';
    else marketPreference = 'both';
    inferredFields.push('marketPreference');
  }

  let stylePreferences = input.stylePreferences;
  if (!stylePreferences.length) {
    const derived: StylePreference[] = [];
    if (intents.some((intent) => intent.intent === 'valuation_analysis')) derived.push('value');
    if (intents.some((intent) => intent.intent === 'short_term_swing' || intent.intent === 'technical_analysis')) derived.push('momentum');
    if (intents.some((intent) => intent.intent === 'long_term_ideas')) derived.push('quality', 'growth');
    if (!derived.length) derived.push('quality');
    stylePreferences = Array.from(new Set(derived));
    inferredFields.push('stylePreferences');
  }

  const sectorPreferences = input.sectorPreferences.length
    ? input.sectorPreferences
    : Array.from(new Set(holdings.map((holding) => holding.sector).filter((sector) => sector && sector !== 'Unknown'))).slice(0, 4);
  if (!input.sectorPreferences.length && sectorPreferences.length) inferredFields.push('sectorPreferences');

  const constraints = Array.from(new Set([...DEFAULT_CONSTRAINTS, ...input.constraints]));

  const horizonLabel =
    horizon === 'long_term'
      ? 'long-term wealth building'
      : horizon === 'short_term'
        ? 'short-term tactical opportunity'
        : 'balanced medium-term compounding';
  const riskLabel = risk === 'high' ? 'high-risk/high-volatility tolerance' : risk === 'low' ? 'conservative downside-first approach' : 'moderate risk with balanced drawdown tolerance';

  return {
    investmentHorizon: horizon,
    riskAppetite: risk,
    capitalAmount: capital,
    marketPreference,
    stylePreferences,
    sectorPreferences,
    constraints,
    age: input.age,
    maritalStatus: input.maritalStatus,
    kids: input.kids,
    country: input.country,
    incomeBracket: input.incomeBracket,
    assetsOwned: input.assetsOwned,
    liabilitiesOwned: input.liabilitiesOwned,
    inferredFields,
    profileNarrative: `Profile indicates ${horizonLabel} with ${riskLabel}. Capital base considered is approximately ${capital.toLocaleString('en-IN')} and market preference is ${marketPreference.toUpperCase()}.`,
  };
}

function buildPortfolioDiagnostics(txns: PortfolioTxn[], holdings: HoldingRow[]): PortfolioDiagnostics {
  if (!txns.length || !holdings.length) {
    return {
      hasPortfolio: false,
      holdingsCount: 0,
      diversificationScore: 35,
      totalInvested: 0,
      totalCurrentValue: 0,
      totalPnl: 0,
      totalPnlPct: 0,
      marketExposure: [],
      sectorExposure: [],
      notes: ['No existing portfolio records found. Analysis uses investor profile and stock-level data only.'],
    };
  }

  const totalInvested = holdings.reduce((sum, holding) => sum + holding.invested, 0);
  const totalCurrentValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
  const totalPnl = totalCurrentValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  const marketMap = new Map<'india' | 'us' | 'mf', number>([
    ['india', 0],
    ['us', 0],
    ['mf', 0],
  ]);
  for (const holding of holdings) {
    marketMap.set(holding.market, (marketMap.get(holding.market) ?? 0) + holding.currentValue);
  }
  const marketExposure = Array.from(marketMap.entries())
    .map(([market, value]) => ({ market, weightPct: totalCurrentValue ? (value / totalCurrentValue) * 100 : 0 }))
    .filter((entry) => entry.weightPct > 0)
    .sort((left, right) => right.weightPct - left.weightPct);

  const sectorMap = new Map<string, number>();
  for (const holding of holdings) {
    sectorMap.set(holding.sector, (sectorMap.get(holding.sector) ?? 0) + holding.currentValue);
  }
  const sectorExposure = Array.from(sectorMap.entries())
    .map(([sector, value]) => ({ sector, weightPct: totalCurrentValue ? (value / totalCurrentValue) * 100 : 0 }))
    .sort((left, right) => right.weightPct - left.weightPct);

  const topWeight = sectorExposure.length ? sectorExposure[0].weightPct : 0;
  const concentrationPct = holdings.length
    ? Math.max(...holdings.map((holding) => (totalCurrentValue ? (holding.currentValue / totalCurrentValue) * 100 : 0)))
    : 0;
  const diversificationScore = clamp(Math.round(78 - concentrationPct * 0.35 - topWeight * 0.15 + holdings.length * 2), 20, 92);

  const notes: string[] = [];
  if (concentrationPct > 35) {
    notes.push(`Portfolio is concentrated: top holding is ${toPct(concentrationPct)} of portfolio value.`);
  } else {
    notes.push(`Concentration is moderate: top holding weight is ${toPct(concentrationPct)}.`);
  }
  if (sectorExposure.length && sectorExposure[0].weightPct > 40) {
    notes.push(`Sector concentration is elevated in ${sectorExposure[0].sector} (${toPct(sectorExposure[0].weightPct)}).`);
  } else {
    notes.push('Sector exposure looks reasonably spread for current holding count.');
  }
  notes.push(`Portfolio P&L is ${toPct(totalPnlPct)} based on current tracked prices.`);

  return {
    hasPortfolio: true,
    holdingsCount: holdings.length,
    concentrationPct,
    diversificationScore,
    totalInvested,
    totalCurrentValue,
    totalPnl,
    totalPnlPct,
    marketExposure,
    sectorExposure: sectorExposure.slice(0, 6),
    notes,
  };
}

function getSeriesFromStatement(table: FinancialStatementTable | undefined, rowRegex: RegExp): number[] {
  if (!table) return [];
  const preferred = table.viewData?.consolidated ?? table.viewData?.standalone;
  const rows = preferred?.rows ?? table.rows;
  const years = preferred?.years ?? table.years;
  const matched = rows.find((row) => rowRegex.test(row.label));
  if (!matched) return [];
  return years
    .map((year) => matched.valuesByYear[year])
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
}

function calcCagr(values: number[]): number | undefined {
  if (values.length < 2) return undefined;
  const first = values[0];
  const last = values[values.length - 1];
  if (first <= 0 || last <= 0) return undefined;
  const years = values.length - 1;
  return (Math.pow(last / first, 1 / years) - 1) * 100;
}

function percentileFromValue(value: number | undefined, low: number, high: number): number {
  if (typeof value !== 'number') return 50;
  if (high === low) return 50;
  return clamp(((value - low) / (high - low)) * 100, 0, 100);
}

function weightedScore(values: Array<{ value: number; weight: number }>): number {
  const weightTotal = values.reduce((sum, item) => sum + item.weight, 0);
  if (!weightTotal) return 50;
  const score = values.reduce((sum, item) => sum + item.value * item.weight, 0) / weightTotal;
  return clamp(score, 0, 100);
}

function getRiskDiscount(profile: DynamicInvestorProfile, debtToEquity?: number): number {
  let discount = profile.riskAppetite === 'low' ? 10.5 : profile.riskAppetite === 'high' ? 14 : 12;
  if (typeof debtToEquity === 'number' && debtToEquity > 2) discount += 1;
  if (profile.marketPreference === 'india') discount += 0.5;
  return clamp(discount, 9, 16);
}

function detectConstraintsPass(entity: SearchEntity, profile: DynamicInvestorProfile, marketCap?: number): boolean {
  const constraints = profile.constraints.map((constraint) => constraint.toLowerCase());
  if (profile.marketPreference === 'india' && entity.market !== 'india') return false;
  if (profile.marketPreference === 'us' && entity.market !== 'us') return false;
  if (constraints.some((constraint) => constraint.includes('india only')) && entity.market !== 'india') return false;
  if (constraints.some((constraint) => constraint.includes('us only')) && entity.market !== 'us') return false;
  if (constraints.some((constraint) => constraint.includes('no small cap') || constraint.includes('no smallcap'))) {
    if (typeof marketCap === 'number' && marketCap < 100000) return false;
  }
  return true;
}

function buildProbability(score: number, riskLevel: 'Low' | 'Medium' | 'High'): { buy: number; hold: number; sell: number; recommendation: 'BUY' | 'HOLD' | 'SELL' } {
  const riskPenalty = riskLevel === 'High' ? 8 : riskLevel === 'Medium' ? 4 : 0;
  let buy = clamp(Math.round(score * 0.78 - riskPenalty), 8, 85);
  let sell = clamp(Math.round((100 - score) * 0.7 + riskPenalty), 8, 82);
  let hold = 100 - buy - sell;

  if (hold < 12) {
    const shortfall = 12 - hold;
    if (buy > sell) buy -= shortfall;
    else sell -= shortfall;
    hold = 12;
  }
  if (hold > 62) {
    const excess = hold - 62;
    buy += Math.round(excess * 0.55);
    sell += excess - Math.round(excess * 0.55);
    hold = 62;
  }
  const total = buy + hold + sell;
  if (total !== 100) {
    const diff = 100 - total;
    hold += diff;
  }

  const recommendation: 'BUY' | 'HOLD' | 'SELL' = buy >= 55 ? 'BUY' : sell >= 45 ? 'SELL' : 'HOLD';
  return { buy, hold, sell, recommendation };
}

function confidenceFromCoverage(coverage: number): 'low' | 'medium' | 'high' {
  if (coverage >= 7) return 'high';
  if (coverage >= 4) return 'medium';
  return 'low';
}

function confidenceToScore(confidence: 'low' | 'medium' | 'high'): number {
  if (confidence === 'high') return 84;
  if (confidence === 'medium') return 68;
  return 46;
}

function formatFreshness(latestTs?: string): string {
  if (!latestTs) return 'Freshness unavailable';
  const date = new Date(latestTs);
  if (Number.isNaN(date.getTime())) return 'Freshness unavailable';
  const deltaMs = Date.now() - date.getTime();
  const hours = Math.max(0, Math.round(deltaMs / (1000 * 60 * 60)));
  if (hours < 1) return 'Updated within the last hour';
  if (hours < 24) return `Updated about ${hours} hour(s) ago`;
  const days = Math.round(hours / 24);
  return `Updated about ${days} day(s) ago`;
}

async function analyzeSingleStock(
  entity: SearchEntity,
  profile: DynamicInvestorProfile,
  intents: IntentDetection[],
): Promise<StockIntelligenceReport> {
  const fundamentals = demoFundamentalsBySymbol[entity.symbol];
  const history = generateDemoHistory(entity);
  const news = getDemoNews(entity);

  const aiInsights = await heuristicAiProvider.generateInsights({
    companyName: entity.name,
    symbol: entity.displaySymbol,
    market: entity.market,
    history,
    metrics: fundamentals?.keyMetrics.map((metric) => ({ key: metric.key, label: metric.label, value: metric.value })) ?? [],
    statements: fundamentals?.statements ?? [],
    shareholding: fundamentals?.shareholding,
    news,
  });

  const marketCap = getMetric(entity.symbol, 'marketCap');
  const pe = getMetric(entity.symbol, 'pe');
  const pb = getMetric(entity.symbol, 'pb');
  const roe = getMetric(entity.symbol, 'roe');
  const roce = getMetric(entity.symbol, 'roce');
  const debtToEquity = getMetric(entity.symbol, 'debtToEquity');
  const opm = getMetric(entity.symbol, 'opm');
  const dividendYield = getMetric(entity.symbol, 'dividendYield');
  const salesGrowth = getMetric(entity.symbol, 'salesGrowth');
  const profitGrowth = getMetric(entity.symbol, 'profitGrowth');
  const industryPe = getMetric(entity.symbol, 'industryPe');
  const currentPrice = getMetric(entity.symbol, 'currentPrice');
  const pat = getMetric(entity.symbol, 'pat');
  const priceToFcf = getMetric(entity.symbol, 'priceToFcf');

  const statementProfitLoss = fundamentals?.statements.find((statement) => statement.kind === 'profitLoss');
  const revenueSeries = getSeriesFromStatement(statementProfitLoss, /revenue|sales/i);
  const netProfitSeries = getSeriesFromStatement(statementProfitLoss, /net profit|profit/i);
  const revenueCagr = calcCagr(revenueSeries);
  const profitCagr = calcCagr(netProfitSeries);

  const debtRisk = typeof debtToEquity === 'number' && debtToEquity > 2 ? 'elevated' : 'contained';
  const valuationSpread = typeof pe === 'number' && typeof industryPe === 'number' ? pe - industryPe : undefined;

  const growthScore = weightedScore([
    { value: percentileFromValue(salesGrowth, 0, 25), weight: 0.45 },
    { value: percentileFromValue(profitGrowth, 0, 25), weight: 0.55 },
  ]);
  const qualityScore = weightedScore([
    { value: percentileFromValue(roe, 5, 35), weight: 0.45 },
    { value: percentileFromValue(roce, 5, 30), weight: 0.35 },
    { value: 100 - percentileFromValue(debtToEquity, 0, 3), weight: 0.2 },
  ]);
  const valueScore = weightedScore([
    { value: 100 - percentileFromValue(pe, 8, 45), weight: 0.6 },
    { value: 100 - percentileFromValue(pb, 0.8, 8), weight: 0.4 },
  ]);
  const momentumScore = weightedScore([
    { value: percentileFromValue(getMetric(entity.symbol, 'return3m'), -20, 30), weight: 0.45 },
    { value: percentileFromValue(getMetric(entity.symbol, 'return6m'), -25, 40), weight: 0.55 },
  ]);
  const dividendScore = weightedScore([{ value: percentileFromValue(dividendYield, 0, 5), weight: 1 }]);

  const styleWeights: Record<StylePreference, number> = {
    value: profile.stylePreferences.includes('value') ? 1 : 0.4,
    growth: profile.stylePreferences.includes('growth') ? 1 : 0.35,
    momentum: profile.stylePreferences.includes('momentum') ? 1 : 0.35,
    quality: profile.stylePreferences.includes('quality') ? 1 : 0.45,
    dividend: profile.stylePreferences.includes('dividend') ? 1 : 0.25,
  };
  const styleScore = weightedScore([
    { value: valueScore, weight: styleWeights.value },
    { value: growthScore, weight: styleWeights.growth },
    { value: momentumScore, weight: styleWeights.momentum },
    { value: qualityScore, weight: styleWeights.quality },
    { value: dividendScore, weight: styleWeights.dividend },
  ]);

  const sentimentScore = clamp(50 + (aiInsights.sentiment.buyProbability - aiInsights.sentiment.sellProbability) * 0.6, 0, 100);
  const riskPenalty = aiInsights.risk.riskLevel === 'High' ? 16 : aiInsights.risk.riskLevel === 'Medium' ? 8 : 0;
  const intentBonus =
    intents.some((intent) => intent.intent === 'technical_analysis') && momentumScore >= 60
      ? 4
      : intents.some((intent) => intent.intent === 'valuation_analysis') && valueScore >= 58
        ? 4
        : 0;
  const sectorBonus = profile.sectorPreferences.length
    ? profile.sectorPreferences.some((sector) => sector.toLowerCase() === (entity.sector ?? '').toLowerCase())
      ? 3
      : -1
    : 0;
  const personalAdjustment = (() => {
    let adjustment = 0;
    if (profile.liabilitiesOwned.length >= 2 && aiInsights.risk.riskLevel === 'High') adjustment -= 5;
    if ((profile.age ?? 40) >= 55 && aiInsights.risk.riskLevel === 'High') adjustment -= 4;
    if (profile.riskAppetite === 'low' && aiInsights.risk.riskLevel === 'High') adjustment -= 5;
    if (profile.assetsOwned.some((asset) => /fixed income|mutual/i.test(asset)) && aiInsights.risk.riskLevel !== 'High') adjustment += 2;
    return adjustment;
  })();

  const suitabilityScore = clamp(
    Math.round(styleScore * 0.62 + sentimentScore * 0.2 + (100 - riskPenalty) * 0.18 + intentBonus + sectorBonus + personalAdjustment),
    5,
    95,
  );
  const allocation = buildProbability(suitabilityScore, aiInsights.risk.riskLevel);

  const dcfGrowth = clamp((profitGrowth ?? salesGrowth ?? 10) / 100, 0.03, 0.2);
  const discountRatePct = getRiskDiscount(profile, debtToEquity);
  const terminalGrowthPct = entity.market === 'india' ? 4 : 3;
  const baseCashFlow = pat ?? netProfitSeries[netProfitSeries.length - 1] ?? 0;
  let pv = 0;
  let lastCash = baseCashFlow;
  for (let year = 1; year <= 5; year += 1) {
    const projected = baseCashFlow * Math.pow(1 + dcfGrowth, year);
    pv += projected / Math.pow(1 + discountRatePct / 100, year);
    lastCash = projected;
  }
  const discount = discountRatePct / 100;
  const terminalGrowth = terminalGrowthPct / 100;
  const terminalValue = discount > terminalGrowth ? (lastCash * (1 + terminalGrowth)) / (discount - terminalGrowth) : 0;
  pv += terminalValue / Math.pow(1 + discount, 5);

  const fairValuePerShare =
    typeof marketCap === 'number' && typeof currentPrice === 'number' && currentPrice > 0
      ? pv / (marketCap / currentPrice)
      : undefined;
  const upsidePct = typeof fairValuePerShare === 'number' && typeof currentPrice === 'number' && currentPrice > 0 ? ((fairValuePerShare - currentPrice) / currentPrice) * 100 : undefined;
  const dcfVerdict: DcfBreakdown['verdict'] =
    typeof upsidePct !== 'number'
      ? 'insufficient_data'
      : upsidePct >= 15
        ? 'undervalued'
        : upsidePct <= -15
          ? 'overvalued'
          : 'fair';
  const dcfConfidence: DcfBreakdown['confidence'] = baseCashFlow > 0 && netProfitSeries.length >= 4 ? 'high' : baseCashFlow > 0 ? 'medium' : 'low';

  const ratioInsights = [
    `ROE is ${typeof roe === 'number' ? toPct(roe) : 'not available'} (${typeof roe === 'number' && roe >= 15 ? 'good capital efficiency, often supportive for long-term compounding' : 'watch if returns remain below strong-quality range for many periods'}).`,
    `ROCE is ${typeof roce === 'number' ? toPct(roce) : 'not available'}, while debt-to-equity is ${typeof debtToEquity === 'number' ? debtToEquity.toFixed(2) : 'not available'} (${debtRisk}; lower leverage generally reduces downside in weak cycles).`,
    `Operating margin (OPM) is ${typeof opm === 'number' ? toPct(opm) : 'not available'} and dividend yield is ${typeof dividendYield === 'number' ? toPct(dividendYield) : 'not available'} (higher sustainable margin and cash payout improve earnings quality and shareholder return stability).`,
  ];

  const statementInsights = [
    revenueSeries.length
      ? `Topline: Revenue moved from ${revenueSeries[0].toLocaleString('en-IN')} to ${revenueSeries[revenueSeries.length - 1].toLocaleString('en-IN')} with CAGR near ${typeof revenueCagr === 'number' ? toPct(revenueCagr) : 'N/A'} (consistent revenue growth usually signals better business demand and scale).`
      : 'Topline: Revenue series is limited in available statements (interpret growth trend with caution).',
    netProfitSeries.length
      ? `Bottom line: Net profit moved from ${netProfitSeries[0].toLocaleString('en-IN')} to ${netProfitSeries[netProfitSeries.length - 1].toLocaleString('en-IN')} with CAGR near ${typeof profitCagr === 'number' ? toPct(profitCagr) : 'N/A'} (profit growth is stronger when supported by core operations, not one-offs).`
      : 'Bottom line: Net profit series is limited in available statements (profit quality confidence is lower).',
    `Latest growth snapshot: sales growth ${typeof salesGrowth === 'number' ? toPct(salesGrowth) : 'N/A'} and profit growth ${typeof profitGrowth === 'number' ? toPct(profitGrowth) : 'N/A'} (if profit grows faster than sales, operating leverage may be improving).`,
  ];

  const valuationInsights = [
    `PE ratio is ${typeof pe === 'number' ? pe.toFixed(2) : 'N/A'}${typeof industryPe === 'number' ? ` vs industry PE ${industryPe.toFixed(2)}` : ''} (lower relative PE can improve margin-of-safety for entry).`,
    `Price-to-book is ${typeof pb === 'number' ? pb.toFixed(2) : 'N/A'} and Price-to-FCF is ${typeof priceToFcf === 'number' ? priceToFcf.toFixed(2) : 'N/A'} (cash-flow valuation helps validate reported earnings).`,
    typeof valuationSpread === 'number'
      ? valuationSpread <= 0
        ? 'Valuation is at or below industry multiple, which is generally favorable for disciplined entry.'
        : 'Valuation is above industry multiple, so expected return depends more on continued growth execution.'
      : 'Industry-relative valuation spread is not available.',
  ];

  const trendCycleInsights = [
    ...aiInsights.trendPeriods.slice(0, 4).map((period) => {
      const strength = Math.abs(period.returnPct) >= 20 ? 'strong' : Math.abs(period.returnPct) >= 10 ? 'moderate' : 'mild';
      const phase =
        period.phaseLabel ??
        (period.type === 'bull'
          ? `${strength[0].toUpperCase()}${strength.slice(1)} Bull Phase`
          : `${strength[0].toUpperCase()}${strength.slice(1)} Bear/Correction Phase`);
      const duration = typeof period.durationDays === 'number' ? `${Math.max(1, Math.round(period.durationDays / 30))} month(s)` : 'n/a duration';
      return `${phase}: ${period.returnPct >= 0 ? '+' : ''}${period.returnPct.toFixed(1)}% over ${duration}. ${period.context ?? 'Use this to understand trend persistence and reversal risk.'}`;
    }),
    `Average bull duration: ${
      typeof aiInsights.trendSummary.averageBullDurationDays === 'number'
        ? `${Math.max(1, Math.round(aiInsights.trendSummary.averageBullDurationDays / 30))} month(s)`
        : 'not available'
    }, average bear duration: ${
      typeof aiInsights.trendSummary.averageBearDurationDays === 'number'
        ? `${Math.max(1, Math.round(aiInsights.trendSummary.averageBearDurationDays / 30))} month(s)`
        : 'not available'
    }.`,
    `Current phase: ${aiInsights.trendSummary.currentPhaseLabel} (probability ${aiInsights.trendSummary.currentPhaseProbability}%).`,
  ];

  const sentimentInsights = [
    `Sentiment is ${aiInsights.sentiment.label} (${aiInsights.sentiment.confidence} confidence) with buy/hold/sell probabilities ${aiInsights.sentiment.buyProbability}% / ${aiInsights.sentiment.holdProbability}% / ${aiInsights.sentiment.sellProbability}%.`,
    `Buy bias: ${aiInsights.sentiment.buyBias}. Suggested action: ${aiInsights.sentiment.suggestedAction}`,
    ...aiInsights.sentiment.drivers.slice(0, 4).map((driver) => `${driver.tone.toUpperCase()} driver: ${driver.detail}`),
  ];

  const catalysts = [
    ...(typeof salesGrowth === 'number' && salesGrowth >= 10 ? [`Revenue growth at ${toPct(salesGrowth)} indicates demand momentum.`] : []),
    ...(typeof profitGrowth === 'number' && profitGrowth >= 10 ? [`Profit growth at ${toPct(profitGrowth)} suggests improving earnings power.`] : []),
    ...(typeof valuationSpread === 'number' && valuationSpread <= 0 ? ['Valuation is not above industry average, supporting better entry comfort.'] : []),
    ...(aiInsights.patternSignals.slice(0, 1) ?? []),
    ...(typeof debtToEquity === 'number' && debtToEquity > 2 ? ['Leverage remains elevated and can amplify downside in weak cycles.'] : []),
  ]
    .filter(Boolean)
    .slice(0, 4);

  const forecastRows = aiInsights.forecast.map((point) => ({ ...point }));
  const forecastInsights = [
    ...aiInsights.forecast.slice(0, 3).map((point) => {
      const salesText =
        typeof point.sales === 'number'
          ? `${point.sales.toLocaleString('en-IN')}${typeof point.salesGrowthPct === 'number' ? ` (${point.salesGrowthPct >= 0 ? '+' : ''}${point.salesGrowthPct.toFixed(1)}% YoY)` : ''}`
          : 'n/a';
      const profitText =
        typeof point.profit === 'number'
          ? `${point.profit.toLocaleString('en-IN')}${typeof point.profitGrowthPct === 'number' ? ` (${point.profitGrowthPct >= 0 ? '+' : ''}${point.profitGrowthPct.toFixed(1)}% YoY)` : ''}`
          : 'n/a';
      const rangeText =
        typeof point.bestCaseSales === 'number' && typeof point.worstCaseSales === 'number'
          ? ` Best/Worst sales: ${point.bestCaseSales.toLocaleString('en-IN')} / ${point.worstCaseSales.toLocaleString('en-IN')}.`
          : '';
      return `${point.period}: Sales ${salesText}; Profit ${profitText}; Confidence: ${point.confidence}.${rangeText}`;
    }),
    `Forecast key assumption: ${aiInsights.forecastAssumption}`,
  ];

  const technicalInsights = [
    `Trend context: ${aiInsights.trendSummary.currentPhaseLabel} (probability ${aiInsights.trendSummary.currentPhaseProbability}%).`,
    `Volatility ${typeof aiInsights.risk.volatility === 'number' ? toPct(aiInsights.risk.volatility) : 'N/A'} and max drawdown ${
      typeof aiInsights.risk.maxDrawdown === 'number' ? toPct(aiInsights.risk.maxDrawdown) : 'N/A'
    } (higher values mean wider price swings and stricter position sizing needed).`,
    ...aiInsights.patternSignals.slice(0, 3),
  ];

  const riskInsights = [
    `Risk level is ${aiInsights.risk.riskLevel} (${aiInsights.risk.confidence} confidence).`,
    ...(aiInsights.risk.marketComparison ? [aiInsights.risk.marketComparison] : []),
    ...aiInsights.risk.decisionGuide.slice(0, 3),
    ...aiInsights.fraudFlags
      .slice(0, 3)
      .map((flag) => `${flag.title} [${flag.severity.toUpperCase()} | ${flag.riskScore}/10]: ${flag.detail} Action: ${flag.suggestedAction}`),
  ];

  const valuationRisk: 'Low' | 'Medium' | 'High' =
    typeof pe !== 'number' || typeof industryPe !== 'number'
      ? 'Medium'
      : pe <= industryPe * 0.95
        ? 'Low'
        : pe <= industryPe * 1.25
          ? 'Medium'
          : 'High';
  const sectorRisk: 'Low' | 'Medium' | 'High' = aiInsights.risk.riskLevel === 'High' ? 'High' : aiInsights.risk.riskLevel === 'Medium' ? 'Medium' : 'Low';
  const marketRisk: 'Low' | 'Medium' | 'High' =
    typeof aiInsights.risk.volatility !== 'number'
      ? 'Medium'
      : aiInsights.risk.volatility <= 20
        ? 'Low'
        : aiInsights.risk.volatility <= 35
          ? 'Medium'
          : 'High';

  const eventInsights = [
    `Quarterly sales growth (YoY): ${typeof getMetric(entity.symbol, 'yoyQuarterlySalesGrowth') === 'number' ? toPct(getMetric(entity.symbol, 'yoyQuarterlySalesGrowth') as number) : 'N/A'}.`,
    `Quarterly profit growth (YoY): ${typeof getMetric(entity.symbol, 'yoyQuarterlyProfitGrowth') === 'number' ? toPct(getMetric(entity.symbol, 'yoyQuarterlyProfitGrowth') as number) : 'N/A'}.`,
    `Near-term event view: ${aiInsights.horizonInsights[0]?.detail ?? 'No short-term event insight available.'}`,
  ];

  const peerSymbols = fundamentals?.peerSymbols ?? [];
  const peerEntities = peerSymbols
    .map((symbol) => demoUniverse.find((candidate) => candidate.symbol === symbol))
    .filter((candidate): candidate is SearchEntity => Boolean(candidate));
  const peerRoeValues = peerEntities.map((peer) => getMetric(peer.symbol, 'roe')).filter((value): value is number => typeof value === 'number');
  const peerPeValues = peerEntities.map((peer) => getMetric(peer.symbol, 'pe')).filter((value): value is number => typeof value === 'number');
  const peerRoeAvg = peerRoeValues.length ? peerRoeValues.reduce((sum, value) => sum + value, 0) / peerRoeValues.length : undefined;
  const peerPeAvg = peerPeValues.length ? peerPeValues.reduce((sum, value) => sum + value, 0) / peerPeValues.length : undefined;
  const peerInsights = [
    peerSymbols.length ? `Peer set considered: ${peerSymbols.slice(0, 5).join(', ')}.` : 'No explicit peer symbols available; using broad universe context.',
    typeof peerRoeAvg === 'number' && typeof roe === 'number'
      ? roe >= peerRoeAvg
        ? `ROE is above peer average (${toPct(roe)} vs ${toPct(peerRoeAvg)}).`
        : `ROE is below peer average (${toPct(roe)} vs ${toPct(peerRoeAvg)}).`
      : 'Peer ROE comparison is limited by data.',
    typeof peerPeAvg === 'number' && typeof pe === 'number'
      ? pe <= peerPeAvg
        ? `PE is at or below peer average (${pe.toFixed(2)} vs ${peerPeAvg.toFixed(2)}).`
        : `PE is above peer average (${pe.toFixed(2)} vs ${peerPeAvg.toFixed(2)}).`
      : 'Peer PE comparison is limited by data.',
    ...aiInsights.peerSignals.slice(0, 3),
  ];

  const alerts = Array.from(new Set([...aiInsights.alertSuggestions, 'Alert if debt-to-equity rises above your accepted limit.', 'Alert if quarterly profit growth falls below 0%.'])).slice(0, 6);

  const decisionPlan = {
    recommendation: aiInsights.decisionEngine.recommendation,
    explanation: aiInsights.decisionEngine.explanation,
    buyBelow: aiInsights.decisionEngine.buyBelow,
    sellAbove: aiInsights.decisionEngine.sellAbove,
    stopLoss: aiInsights.decisionEngine.stopLoss,
    confidence: aiInsights.decisionEngine.confidence,
  };

  const explainabilityInsights = aiInsights.explainability.map(
    (item) => `${item.driver}: ${item.weight}% contribution. ${item.detail}`,
  );
  const horizonInsights = aiInsights.horizonInsights.map(
    (item) => `${item.horizon} -> ${item.stance}. ${item.detail}`,
  );
  const scenarioInsights = aiInsights.scenarioInsights.map(
    (item) => `${item.scenario}: ${item.expectedImpact} (Risk change: ${item.riskChange}).`,
  );
  const entryExitInsights = [
    `Ideal buy zone: ${
      typeof aiInsights.entryExit.buyZoneLow === 'number' && typeof aiInsights.entryExit.buyZoneHigh === 'number'
        ? `${aiInsights.entryExit.buyZoneLow.toLocaleString('en-IN')} to ${aiInsights.entryExit.buyZoneHigh.toLocaleString('en-IN')}`
        : 'not available'
    }.`,
    `Resistance: ${typeof aiInsights.entryExit.resistance === 'number' ? aiInsights.entryExit.resistance.toLocaleString('en-IN') : 'not available'}.`,
    `Breakout probability: ${aiInsights.entryExit.breakoutProbability}%. ${aiInsights.entryExit.note}`,
  ];

  const whyFitYou = [
    profile.stylePreferences.includes('quality')
      ? `Matches your quality preference with ROE ${typeof roe === 'number' ? toPct(roe) : 'N/A'} and ROCE ${typeof roce === 'number' ? toPct(roce) : 'N/A'}.`
      : `Style fit is driven by ${profile.stylePreferences.join(', ') || 'balanced'} preference.`,
    profile.investmentHorizon === 'long_term'
      ? `Fits long-term horizon through business quality and compounding potential.`
      : profile.investmentHorizon === 'short_term'
        ? `Use position sizing discipline because short-term horizon is more sensitive to volatility swings.`
        : `Medium-term fit depends on sustaining trend + earnings delivery.`,
    profile.riskAppetite === 'low'
      ? `For your lower risk profile, watch drawdown and avoid oversized entry.`
      : profile.riskAppetite === 'high'
        ? `Your high risk appetite can tolerate volatility, but valuation discipline is still required.`
        : `Moderate risk profile supports staggered entries with predefined stop-loss.`,
  ];

  const smartSummary = `${aiInsights.risk.riskLevel}-risk, ${
    growthScore >= 60 ? 'strong-growth' : growthScore >= 45 ? 'moderate-growth' : 'low-growth'
  } profile with ${qualityScore >= 60 ? 'solid' : 'mixed'} profitability and ${
    debtRisk === 'contained' ? 'controlled leverage' : 'elevated leverage risk'
  }. Suitable for ${profile.investmentHorizon.replace('_', '-')} allocation with risk controls.`;

  const coverageCount =
    [pe, pb, roe, debtToEquity, salesGrowth, profitGrowth, currentPrice, marketCap].filter((value) => typeof value === 'number').length +
    (news.length ? 1 : 0) +
    (statementProfitLoss ? 1 : 0);

  const detailedSummary =
    `${entity.name} was evaluated for your profile using fundamental ratios, statement trends, simplified DCF, sentiment, technical context, risk diagnostics, and peer positioning. ` +
    `Fundamental quality currently appears ${qualityScore >= 60 ? 'strong' : qualityScore >= 45 ? 'mixed' : 'weak'} with a quality score of ${qualityScore.toFixed(0)}/100. ` +
    `Growth quality appears ${growthScore >= 60 ? 'healthy' : growthScore >= 45 ? 'moderate' : 'soft'} based on sales and profit trajectories. ` +
    `Valuation context is ${valueScore >= 60 ? 'favorable' : valueScore >= 45 ? 'balanced' : 'expensive'} for the selected style. ` +
    `Risk profile is ${aiInsights.risk.riskLevel.toLowerCase()} and sentiment is ${aiInsights.sentiment.label.toLowerCase()}. ` +
    `The DCF module indicates ${dcfVerdict === 'undervalued' ? 'potential valuation upside' : dcfVerdict === 'overvalued' ? 'limited valuation comfort at current price' : dcfVerdict === 'fair' ? 'valuation near fair range' : 'insufficient valuation confidence'}. ` +
    `Personal profile adjustments (${personalAdjustment >= 0 ? '+' : ''}${personalAdjustment}) were applied based on age, liabilities, and existing asset mix to keep recommendations aligned to your risk context. ` +
    `AI net impact is ${aiInsights.prosCons.netImpact}, with key positives (${aiInsights.prosCons.pros.slice(0, 2).join('; ') || 'none'}) and key concerns (${aiInsights.prosCons.cons.slice(0, 2).join('; ') || 'none'}). ` +
    `Combining all signals, the model confidence is ${confidenceFromCoverage(
      coverageCount,
    )}, and action bias is ${allocation.recommendation} with Buy/Hold/Sell split ${allocation.buy}% / ${allocation.hold}% / ${allocation.sell}%.`;

  const confidence = confidenceFromCoverage(coverageCount);
  const confidenceScore = confidenceToScore(confidence);

  return {
    symbol: entity.symbol,
    displaySymbol: entity.displaySymbol,
    name: entity.name,
    market: entity.market as 'india' | 'us',
    sector: entity.sector ?? 'Unknown',
    industry: entity.industry ?? 'Unknown',
    suitabilityScore,
    recommendation: allocation.recommendation,
    buyPct: allocation.buy,
    holdPct: allocation.hold,
    sellPct: allocation.sell,
    confidence,
    confidenceScore,
    smartSummary,
    catalysts,
    whyFitYou,
    riskRadar: {
      overall: aiInsights.risk.riskLevel === 'High' ? 'High' : aiInsights.risk.riskLevel === 'Medium' ? 'Moderate' : 'Low',
      marketRisk,
      sectorRisk,
      valuationRisk,
    },
    quantSnapshot: {
      growthScore: Math.round(growthScore),
      qualityScore: Math.round(qualityScore),
      valueScore: Math.round(valueScore),
      momentumScore: Math.round(momentumScore),
      styleScore: Math.round(styleScore),
      sentimentScore: Math.round(sentimentScore),
      riskPenalty: Math.round(riskPenalty),
      personalAdjustment,
      coverageCount,
    },
    trendCycleInsights,
    ratioInsights,
    statementInsights,
    valuationInsights,
    sentimentInsights,
    forecastInsights,
    forecastRows,
    decisionPlan,
    explainabilityInsights,
    horizonInsights,
    scenarioInsights,
    entryExitInsights,
    technicalInsights,
    riskInsights,
    eventInsights,
    peerInsights,
    alerts,
    prosConsNetImpact: aiInsights.prosCons.netImpact,
    dcf: {
      baseCashFlow,
      growthRatePct: dcfGrowth * 100,
      discountRatePct,
      terminalGrowthPct,
      intrinsicValue: pv,
      fairValuePerShare,
      currentPrice,
      upsidePct,
      verdict: dcfVerdict,
      confidence: dcfConfidence,
    },
    detailedSummary,
  };
}

function reportSummary(
  profile: DynamicInvestorProfile,
  intents: IntentDetection[],
  preferredReport: StockIntelligenceReport | undefined,
  suggestions: StockIntelligenceReport[],
): string {
  const topIntent = intents[0]?.intent ?? 'long_term_ideas';
  const intentText = INTENT_RULES.find((rule) => rule.intent === topIntent)?.label ?? 'Investment analysis';
  if (preferredReport) {
    return `Primary intent detected: ${intentText}. Preferred share ${preferredReport.displaySymbol} is rated ${preferredReport.recommendation} with Buy/Hold/Sell split ${preferredReport.buyPct}%/${preferredReport.holdPct}%/${preferredReport.sellPct}% for your ${profile.investmentHorizon.replace('_', '-')} profile. ${preferredReport.smartSummary}`;
  }
  if (suggestions.length) {
    const top = suggestions[0];
    return `Primary intent detected: ${intentText}. Top screened idea for your profile is ${top.displaySymbol} (${top.recommendation}) with Buy/Hold/Sell split ${top.buyPct}%/${top.holdPct}%/${top.sellPct}%. ${top.smartSummary}`;
  }
  return `Primary intent detected: ${intentText}. No stocks satisfied all active constraints; consider relaxing constraints and rerunning analysis.`;
}

function buildPortfolioFixes(
  profile: DynamicInvestorProfile,
  portfolio: PortfolioDiagnostics,
  suggestions: StockIntelligenceReport[],
): PortfolioFixSuggestion {
  if (!portfolio.hasPortfolio) {
    const starter = suggestions.slice(0, 3);
    return {
      issues: ['No existing portfolio found, so diversification and concentration risks cannot be directly measured.'],
      suggestedFixes: starter.length
        ? [
            `Start with staggered allocation across ${starter.map((stock) => stock.displaySymbol).join(', ')} instead of a single concentrated bet.`,
            `Keep 10-15% cash buffer for volatility and better entry windows.`,
          ]
        : ['Relax constraints slightly to identify starter allocations.'],
      simulatedImpact: {
        diversificationBefore: 35,
        diversificationAfter: starter.length ? 64 : 50,
        expectedVolatilityChangePct: starter.length ? -12 : -4,
        expectedReturnChangePct: starter.length ? 9 : 4,
      },
    };
  }

  const topSector = portfolio.sectorExposure[0];
  const issues: string[] = [];
  if (typeof portfolio.concentrationPct === 'number' && portfolio.concentrationPct > 35) {
    issues.push(`Single-stock concentration is high at ${toPct(portfolio.concentrationPct)}.`);
  }
  if (topSector?.weightPct && topSector.weightPct > 40) {
    issues.push(`Sector concentration is high in ${topSector.sector} at ${toPct(topSector.weightPct)}.`);
  }
  if (portfolio.diversificationScore < 55) {
    issues.push(`Diversification score ${portfolio.diversificationScore}/100 is below preferred range.`);
  }
  if (portfolio.totalPnlPct < -8) {
    issues.push(`Portfolio drawdown is elevated (${toPct(portfolio.totalPnlPct)}).`);
  }

  const targetTopSector = Math.min(40, topSector?.weightPct ?? 40);
  const suggestionSectors = Array.from(new Set(suggestions.slice(0, 5).map((stock) => stock.sector))).slice(0, 3);
  const suggestedFixes = [
    topSector?.weightPct && topSector.weightPct > targetTopSector
      ? `Reduce ${topSector.sector} exposure from ${toPct(topSector.weightPct)} toward ~${toPct(targetTopSector)} over phased rebalancing.`
      : `Maintain current sector allocation discipline and avoid increasing top-sector concentration.`,
    suggestionSectors.length
      ? `Add exposure to ${suggestionSectors.join(', ')} for more balanced sector participation.`
      : `Add at least one non-core sector to improve diversification.`,
    profile.riskAppetite === 'low'
      ? 'Shift 10-15% toward lower-volatility, cash-generative businesses.'
      : 'Use staggered entries and cap any new single position below 20-25%.',
  ];

  const diversificationAfter = clamp(
    Math.round(
      portfolio.diversificationScore +
        (topSector?.weightPct && topSector.weightPct > 40 ? 14 : 8) +
        (issues.length >= 3 ? 8 : 4),
    ),
    30,
    90,
  );
  const expectedVolatilityChangePct = -clamp(Math.round((issues.length + 1) * 4), 6, 22);
  const expectedReturnChangePct = clamp(Math.round((diversificationAfter - portfolio.diversificationScore) * 0.45), 4, 16);

  return {
    issues: issues.length ? issues : ['No major concentration or diversification issue detected.'],
    suggestedFixes,
    simulatedImpact: {
      diversificationBefore: portfolio.diversificationScore,
      diversificationAfter,
      expectedVolatilityChangePct,
      expectedReturnChangePct,
    },
  };
}

function buildActionPanel(
  profile: DynamicInvestorProfile,
  preferredReport: StockIntelligenceReport | undefined,
  suggestions: StockIntelligenceReport[],
  portfolio: PortfolioDiagnostics,
): ActionPanelSummary {
  const primary = preferredReport ?? suggestions[0];
  if (!primary) {
    return {
      primaryAction: 'HOLD CASH',
      allocationPct: 0,
      entryRange: {},
      timeHorizonLabel: profile.investmentHorizon.replace('_', '-'),
      backupActions: ['No qualified stock found under current constraints.'],
      portfolioChanges: ['Relax constraints and rerun analysis.'],
    };
  }

  const baseAllocation = primary.recommendation === 'BUY' ? 24 : primary.recommendation === 'HOLD' ? 14 : 6;
  const riskAdjust = profile.riskAppetite === 'high' ? 5 : profile.riskAppetite === 'low' ? -5 : 0;
  const allocationPct = clamp(baseAllocation + riskAdjust, 4, 35);
  const entryLow = primary.decisionPlan.buyBelow ?? primary.dcf.currentPrice;
  const entryHigh = typeof entryLow === 'number' ? entryLow * 1.04 : undefined;

  const backups = suggestions
    .filter((stock) => stock.symbol !== primary.symbol)
    .slice(0, 3)
    .map((stock) => `${stock.recommendation} ${stock.displaySymbol}`);
  const avoid = suggestions.find((stock) => stock.recommendation === 'SELL');
  if (avoid) backups.push(`AVOID ${avoid.displaySymbol} (risk/valuation mismatch)`);

  const portfolioChanges: string[] = [];
  const topSector = portfolio.sectorExposure[0];
  if (topSector?.weightPct && topSector.weightPct > 40) {
    portfolioChanges.push(`Reduce ${topSector.sector} exposure from ${toPct(topSector.weightPct)} toward ~40%.`);
  }
  if (typeof portfolio.concentrationPct === 'number' && portfolio.concentrationPct > 35) {
    portfolioChanges.push(`Trim largest holding from ${toPct(portfolio.concentrationPct)} to below 30%.`);
  }
  if (!portfolioChanges.length) {
    portfolioChanges.push('Current portfolio concentration is acceptable; continue staggered allocation discipline.');
  }

  return {
    primaryAction: `${primary.recommendation} ${primary.displaySymbol}`,
    allocationPct,
    entryRange: { low: entryLow, high: entryHigh },
    timeHorizonLabel:
      profile.investmentHorizon === 'long_term'
        ? '2-3 years'
        : profile.investmentHorizon === 'short_term'
          ? '2-12 weeks'
          : '6-18 months',
    backupActions: backups.length ? backups : ['No backup candidates available under current constraints.'],
    portfolioChanges,
  };
}

function buildExecutionLog(
  intents: IntentDetection[],
  profile: DynamicInvestorProfile,
  portfolio: PortfolioDiagnostics,
  filteredCount: number,
  shortlistedCount: number,
): AgentExecutionLog[] {
  return [
    {
      title: 'Detected intent',
      detail: `${intents[0]?.intent.replace(/_/g, ' ') ?? 'long term ideas'} with ${Math.round((intents[0]?.confidence ?? 0.45) * 100)}% confidence.`,
      status: 'done',
    },
    {
      title: 'Built investor profile',
      detail: `Horizon ${profile.investmentHorizon.replace('_', ' ')}, risk ${profile.riskAppetite}, ${profile.inferredFields.length} field(s) inferred.`,
      status: profile.inferredFields.length > 3 ? 'warning' : 'done',
    },
    {
      title: 'Analyzed portfolio diagnostics',
      detail: portfolio.hasPortfolio
        ? `Diversification ${portfolio.diversificationScore}/100 with ${portfolio.holdingsCount} holdings.`
        : 'No holdings found, so diagnostics run in profile-only mode.',
      status: portfolio.hasPortfolio ? 'done' : 'warning',
    },
    {
      title: 'Screened stock universe',
      detail: `Screened ${filteredCount} candidates and shortlisted ${shortlistedCount}.`,
      status: filteredCount ? 'done' : 'warning',
    },
    {
      title: 'Generated strategy output',
      detail: 'Computed valuation, quality, sentiment, technical, risk, and action plan with Buy/Hold/Sell split.',
      status: 'done',
    },
  ];
}

function buildDataQualitySummary(
  preferredReport: StockIntelligenceReport | undefined,
  suggestions: StockIntelligenceReport[],
  intents: IntentDetection[],
): DataQualitySummary {
  const anchor = preferredReport ?? suggestions[0];
  const label = anchor?.confidence ?? 'medium';
  const confidenceScore = clamp(
    Math.round((anchor?.confidenceScore ?? confidenceToScore(label)) * 0.7 + (Math.round((intents[0]?.confidence ?? 0.45) * 100) * 0.3)),
    35,
    94,
  );
  const freshness = (() => {
    if (!anchor) return 'Freshness unavailable';
    const history = generateDemoHistory(demoUniverse.find((entity) => entity.symbol === anchor.symbol) ?? demoUniverse[0]).points;
    const latest = history.length ? history[history.length - 1].ts : undefined;
    return formatFreshness(latest);
  })();
  const missingData: string[] = [];
  if (anchor) {
    const fundamentals = demoFundamentalsBySymbol[anchor.symbol];
    if (!(fundamentals?.statements ?? []).find((statement) => statement.kind === 'profitLoss')) {
      missingData.push('Income statement coverage is limited.');
    }
    if (!getDemoNews(demoUniverse.find((entity) => entity.symbol === anchor.symbol) ?? demoUniverse[0]).length) {
      missingData.push('No recent news items for sentiment weighting.');
    }
    if (!(fundamentals?.peerSymbols ?? []).length) {
      missingData.push('Peer set is limited for comparison scoring.');
    }
  }
  if (!missingData.length) missingData.push('No critical data gaps detected in current run.');

  return {
    confidenceScore,
    confidenceLabel: confidenceScore >= 75 ? 'high' : confidenceScore >= 55 ? 'medium' : 'low',
    dataFreshness: freshness,
    missingData,
  };
}

export async function generateAgenticAnalysis(input: AgenticFormInput, txns: PortfolioTxn[]): Promise<AgenticAnalysisReport> {
  const holdings = deriveHoldings(txns);
  const intents = detectIntent(input.goal, input.preferredShareMode === 'yes' && Boolean(input.preferredShareSymbol), input.investmentHorizon);
  const profile = inferProfile(input, intents, holdings);
  const portfolio = buildPortfolioDiagnostics(txns, holdings);

  const stockUniverse = demoUniverse.filter((entity): entity is SearchEntity => entity.type === 'stock' && (entity.market === 'india' || entity.market === 'us'));
  const filtered = stockUniverse.filter((entity) => detectConstraintsPass(entity, profile, getMetric(entity.symbol, 'marketCap')));

  const preferredSymbolRaw = input.preferredShareSymbol?.trim().toUpperCase() ?? '';
  const preferredQuery = preferredSymbolRaw.replace(/\s+/g, ' ').trim();
  const matchesPreferred = (entity: SearchEntity): boolean => {
    const symbol = entity.symbol.toUpperCase();
    const display = entity.displaySymbol.toUpperCase();
    const name = entity.name.toUpperCase();
    return (
      symbol === preferredQuery ||
      display === preferredQuery ||
      name === preferredQuery ||
      symbol.includes(preferredQuery) ||
      display.includes(preferredQuery) ||
      name.includes(preferredQuery)
    );
  };
  const preferredEntity =
    input.preferredShareMode === 'yes' && preferredSymbolRaw
      ? filtered.find(matchesPreferred) ?? stockUniverse.find(matchesPreferred)
      : undefined;

  let preferredStockReport: StockIntelligenceReport | undefined;
  if (preferredEntity) {
    preferredStockReport = await analyzeSingleStock(preferredEntity, profile, intents);
  }

  const candidateUniverse = preferredEntity ? filtered.filter((entity) => entity.symbol !== preferredEntity.symbol) : filtered;
  const scored = await Promise.all(candidateUniverse.map((entity) => analyzeSingleStock(entity, profile, intents)));
  const suggestedStocks = scored.sort((left, right) => right.suitabilityScore - left.suitabilityScore);
  const actionPanel = buildActionPanel(profile, preferredStockReport, suggestedStocks, portfolio);
  const executionLog = buildExecutionLog(intents, profile, portfolio, filtered.length, suggestedStocks.length);
  const dataQuality = buildDataQualitySummary(preferredStockReport, suggestedStocks, intents);
  const portfolioFixes = buildPortfolioFixes(profile, portfolio, suggestedStocks);

  return {
    generatedAt: new Date().toISOString(),
    intents,
    profile,
    portfolio,
    preferredStockReport,
    suggestedStocks,
    actionPanel,
    executionLog,
    dataQuality,
    portfolioFixes,
    summary: reportSummary(profile, intents, preferredStockReport, suggestedStocks),
  };
}
