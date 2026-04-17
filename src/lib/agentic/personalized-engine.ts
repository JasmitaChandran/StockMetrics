import { heuristicAiProvider } from '@/lib/ai';
import { getEntityBySymbol, getUsdInrRate, searchEntities } from '@/lib/data/adapters';
import { fundamentalsAdapter } from '@/lib/data/adapters/fundamentals-adapter';
import { marketAdapter } from '@/lib/data/adapters/market-adapter';
import { newsAdapter } from '@/lib/data/adapters/news-adapter';
import { demoFundamentalsBySymbol, demoUniverse, generateDemoHistory, getDemoNews } from '@/lib/data/mock/demo-data';
import type { PortfolioTxn } from '@/lib/storage/idb';
import { formatCurrency, formatPercent } from '@/lib/utils/format';
import type { FinancialStatementTable, FundamentalsBundle, HistorySeries, MarketKind, NewsItem, Quote, SearchEntity } from '@/types';

export type AnalysisMode = 'suggest' | 'specific';
export type CountryCode = 'IN' | 'US';
export type AgentMarketScope = 'india' | 'us' | 'both';
export type MaritalStatus = 'single' | 'married' | 'divorced';
export type EmploymentType = 'salaried' | 'self_employed' | 'business_owner';
export type InvestmentHorizon = 'short' | 'medium' | 'long';
export type RiskPreference = 'conservative' | 'moderate' | 'aggressive';
export type LiquidityNeed = 'low' | 'medium' | 'high';
export type InvestmentGoal = 'wealth_creation' | 'retirement' | 'child_education' | 'house_purchase' | 'income';
export type DataFreshness = 'Live' | 'Delayed' | 'Demo fallback';

export interface MetricProvenance {
  source: string;
  freshness: DataFreshness;
  timestamp?: string;
  fallbackReason?: string;
}

export interface AgenticProgressTelemetry {
  phase:
    | 'profile'
    | 'cashflow'
    | 'universe'
    | 'focus'
    | 'analysis'
    | 'sentiment'
    | 'scoring'
    | 'finalizing'
    | 'completed';
  analyzed: number;
  total: number;
  message: string;
  screenedTotal?: number;
  deepAnalyzed?: number;
  deepTotal?: number;
}

export interface ScoringWeights {
  stockQuality: number;
  riskCompatibility: number;
  portfolioFit: number;
  lifeStageFit: number;
}

export interface AgentLearningMemory {
  runCount?: number;
  scoringWeights?: Partial<ScoringWeights>;
  lastOutcomeNote?: string;
}

export interface AgenticAnalysisOptions {
  onProgress?: (progress: AgenticProgressTelemetry) => void;
  signal?: AbortSignal;
  memory?: AgentLearningMemory;
}

export interface LoanInput {
  id: string;
  type: 'home' | 'car' | 'personal' | 'education' | 'other';
  outstandingAmount: number;
  monthlyEmi: number;
  interestRate: number;
}

export interface AssetBreakdownInput {
  equity: number;
  debt: number;
  gold: number;
  realEstate: number;
  cash: number;
  alternatives: number;
}

export interface RetirementBreakdownInput {
  epf: number;
  ppf: number;
  nps: number;
  other: number;
}

export interface AgenticFormInput {
  analysisMode: AnalysisMode;
  targetTicker?: string;
  age: number;
  maritalStatus: MaritalStatus;
  dependentsKids: number;
  dependentsParents: number;
  employmentType: EmploymentType;
  monthlyIncome: number;
  monthlyFixedExpenses: number;
  monthlyDiscretionaryExpenses: number;
  effectiveTaxRate: number;
  assets: AssetBreakdownInput;
  retirement: RetirementBreakdownInput;
  loans: LoanInput[];
  emergencyFundMonths: number;
  investmentGoal: InvestmentGoal;
  investmentHorizon: InvestmentHorizon;
  riskPreference: RiskPreference;
  expectedReturnTarget: number;
  liquidityNeed: LiquidityNeed;
  country: string;
  countryCode: CountryCode;
  marketScope: AgentMarketScope;
  compareWithAlternatives: boolean;
}

export interface AllocationWeights {
  equity: number;
  debt: number;
  gold: number;
  cash: number;
}

export interface AllocationGap {
  bucket: keyof AllocationWeights;
  currentPct: number;
  idealPct: number;
  gapPct: number;
  action: 'increase' | 'trim' | 'maintain';
}

export interface PersonalProfileSummary {
  lifeStage: string;
  dependents: number;
  employmentType: EmploymentType;
  baseCurrency: 'INR' | 'USD';
  marketScope: AgentMarketScope;
  monthlyIncome: number;
  monthlyCoreSpend: number;
  effectiveTaxRate: number;
  investmentGoal: InvestmentGoal;
  investmentHorizon: InvestmentHorizon;
  riskPreference: RiskPreference;
  liquidityNeed: LiquidityNeed;
}

export interface FinancialProfileAnalysis {
  investableSurplusMonthly: number;
  totalExpensesMonthly: number;
  totalEmisMonthly: number;
  emergencyFundCurrentValue: number;
  emergencyFundTargetMonths: number;
  emergencyFundTargetValue: number;
  emergencyFundShortfallValue: number;
  emergencyFundTopUpMonthly: number;
  debtBurdenRatioPct: number;
  debtBurdenFlag: 'Healthy' | 'Watch' | 'High';
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  riskProfileScore: number;
  riskProfileLabel: 'Conservative' | 'Moderate' | 'Aggressive';
  riskProfileNotes: string[];
  currentAllocation: AllocationWeights;
  idealAllocation: AllocationWeights;
  allocationGap: AllocationGap[];
  portfolioGapSummary: string;
  suggestedStockStyles: string[];
  localPortfolio: {
    trackedHoldingsCount: number;
    trackedEquityValue: number;
    sectorExposure: Array<{ sector: string; weightPct: number }>;
  };
}

export interface DcfAnalysis {
  baseFcf: number;
  fcfSeries: number[];
  growthRatePct: number;
  discountRatePct: number;
  terminalGrowthPct: number;
  sharesOutstanding?: number;
  intrinsicValuePerShare?: number;
  marginOfSafetyPct?: number;
  valuationLabel: 'Undervalued' | 'Fairly Valued' | 'Overvalued' | 'Insufficient Data';
}

export interface PersonalizedStockRecommendation {
  symbol: string;
  displaySymbol: string;
  name: string;
  market: 'india' | 'us' | 'mf';
  securityType: 'stock' | 'mutual_fund';
  sector: string;
  industry: string;
  currency: 'INR' | 'USD';
  marketPrice?: number;
  fundamentals: {
    pe?: number;
    eps?: number;
    revenueGrowthPct?: number;
    profitGrowthPct?: number;
    roePct?: number;
    freeCashFlow?: number;
    dividendYieldPct?: number;
  };
  technicals: {
    rsi14?: number;
    ma50?: number;
    ma200?: number;
    macd?: number;
    signal?: number;
    macdBias: 'Bullish' | 'Neutral' | 'Bearish';
    volumeTrend: 'Above average' | 'Normal' | 'Soft';
    trendBias: 'Bullish' | 'Neutral' | 'Bearish';
  };
  sentiment: {
    score: number;
    label: string;
    analystView: string;
    bias: string;
    confidence: 'low' | 'medium' | 'high';
    buyProbability: number;
    holdProbability: number;
    sellProbability: number;
    drivers: Array<{ tone: 'positive' | 'negative' | 'neutral'; detail: string }>;
    rationale: string[];
    headlines: string[];
    headlineItems: Array<{
      title: string;
      source: string;
      publishedAt?: string;
      url: string;
      relevanceScore?: number;
      sentimentScore?: number;
    }>;
  };
  risk: {
    beta?: number;
    volatilityPct?: number;
    maxDrawdownPct?: number;
    sharpeRatio?: number;
    level: 'Low' | 'Moderate' | 'High';
  };
  dcf: DcfAnalysis;
  dividendSuitability: {
    label: 'Income Fit' | 'Balanced' | 'Growth Fit';
    note: string;
  };
  taxImpact: {
    shortTermRatePct: number;
    longTermRatePct: number;
    preferredHoldingPeriod: string;
    note: string;
  };
  scores: {
    fundamentals: number;
    technical: number;
    sentiment: number;
    stockRisk: number;
    stockQuality: number;
    riskCompatibility: number;
    portfolioFit: number;
    lifeStageFit: number;
    personalizedFit: number;
    weightedContributions: {
      stockQuality: number;
      riskCompatibility: number;
      portfolioFit: number;
      lifeStageFit: number;
    };
  };
  confidence: {
    score: number;
    label: 'High' | 'Moderate' | 'Low';
    fitLow: number;
    fitHigh: number;
    uncertaintyPct: number;
    reasons: string[];
  };
  dataFreshness: {
    quote: DataFreshness;
    history: DataFreshness;
    fundamentals: DataFreshness;
    news: DataFreshness;
    dcf: DataFreshness;
  };
  provenance: {
    quote: MetricProvenance;
    history: MetricProvenance;
    fundamentals: MetricProvenance;
    news: MetricProvenance;
    dcf: MetricProvenance;
  };
  allocation: {
    baseCurrency: 'INR' | 'USD';
    baseAmountMonthly: number;
    securityCurrency: 'INR' | 'USD';
    securityAmountMonthly: number;
    usdInrRate: number;
  };
  recommendation: 'BUY' | 'HOLD' | 'AVOID';
  suggestedAllocationMonthly: number;
  expectedHoldingPeriod: string;
  keyReason: string;
  supportPoints: string[];
  cautionPoints: string[];
  personalityTags: string[];
}

export type AgenticEngineType =
  | 'Agentic Orchestrator (Rules + Heuristic AI)'
  | 'Rules + Heuristic AI';

export interface AgenticAnalysisReport {
  generatedAt: string;
  engineType: AgenticEngineType;
  baseCurrency: 'INR' | 'USD';
  fxContext: {
    usdInrRate: number;
    source: string;
    timestamp: string;
    stale: boolean;
  };
  userProfileSummary: PersonalProfileSummary;
  finance: FinancialProfileAnalysis;
  focusStock?: PersonalizedStockRecommendation;
  stockRecommendations: PersonalizedStockRecommendation[];
  topPools: {
    indiaStocks: PersonalizedStockRecommendation[];
    usStocks: PersonalizedStockRecommendation[];
    mutualFunds: PersonalizedStockRecommendation[];
  };
  recommendationUniverse: {
    totalStocksInDataset: number;
    totalMutualFundsInDataset: number;
    eligibleStocks: number;
    eligibleMutualFunds: number;
    analyzedSecurities: number;
    analyzedIndiaStocks: number;
    analyzedUsStocks: number;
    analyzedMutualFunds: number;
    displayedStocks: number;
    marketScope: AgentMarketScope;
    analysisMode: AnalysisMode;
    universeSource: 'live_index' | 'demo_fallback' | 'mixed_live_demo';
    universeTruncated: boolean;
  };
  scoringWeights: ScoringWeights;
  agentPipeline: Array<{
    agent: 'Planner' | 'Data Collector' | 'Scorer' | 'Risk Critic' | 'Action Writer';
    status: 'completed' | 'watch' | 'blocked';
    summary: string;
  }>;
  finalRecommendation: {
    headline: string;
    recommendation: string;
    subject: string;
    suggestedAllocationMonthly: number;
    holdingPeriod: string;
    taxNote: string;
    keyReason: string;
    portfolioGapCallout: string;
  };
  executionTrail: Array<{ phase: string; headline: string; detail: string }>;
  notes: string[];
  exportJson: Record<string, unknown>;
}

interface HoldingSnapshot {
  symbol: string;
  market: 'india' | 'us' | 'mf';
  currentValue: number;
  sector: string;
}

interface RiskSnapshot {
  volatilityPct?: number;
  maxDrawdownPct?: number;
  beta?: number;
  sharpeRatio?: number;
  level: 'Low' | 'Moderate' | 'High';
  score: number;
}

interface TechnicalSnapshot {
  rsi14?: number;
  ma50?: number;
  ma200?: number;
  macd?: number;
  signal?: number;
  macdBias: 'Bullish' | 'Neutral' | 'Bearish';
  volumeTrend: 'Above average' | 'Normal' | 'Soft';
  trendBias: 'Bullish' | 'Neutral' | 'Bearish';
  score: number;
}

interface LoadedRecommendationUniverse {
  entities: SearchEntity[];
  source: 'live_index' | 'demo_fallback' | 'mixed_live_demo';
  truncated: boolean;
  stockCount: number;
  mutualFundCount: number;
  marketSources: Partial<Record<MarketKind, 'live_index' | 'demo_fallback'>>;
}

const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  stockQuality: 0.4,
  riskCompatibility: 0.25,
  portfolioFit: 0.2,
  lifeStageFit: 0.15,
};

const GOAL_LABELS: Record<InvestmentGoal, string> = {
  wealth_creation: 'Wealth creation',
  retirement: 'Retirement',
  child_education: 'Child education',
  house_purchase: 'House purchase',
  income: 'Income generation',
};

const HORIZON_LABELS: Record<InvestmentHorizon, string> = {
  short: 'Short term (<3 years)',
  medium: 'Medium term (3-7 years)',
  long: 'Long term (7+ years)',
};

const RISK_LABELS: Record<RiskPreference, string> = {
  conservative: 'Conservative',
  moderate: 'Moderate',
  aggressive: 'Aggressive',
};

const LIQUIDITY_LABELS: Record<LiquidityNeed, string> = {
  low: 'Low liquidity need',
  medium: 'Moderate liquidity need',
  high: 'High liquidity need',
};

const BUCKET_LABELS: Record<keyof AllocationWeights, string> = {
  equity: 'Equity',
  debt: 'Debt / FD',
  gold: 'Gold',
  cash: 'Cash buffer',
};

const DEMO_SECURITIES_UNIVERSE = demoUniverse.filter(
  (entity): entity is SearchEntity => entity.type === 'stock' || entity.type === 'mutual_fund',
);

const UNIVERSE_PAGE_SIZE = 1000;
const MAX_UNIVERSE_PER_MARKET: Record<MarketKind, number> = {
  india: 25000,
  us: 25000,
  mf: 40000,
};
const TOP_PER_POOL = 10;
const DEEP_ANALYSIS_BUFFER_PER_POOL = 14;
const DEEP_ANALYSIS_TARGETS = {
  indiaStocks: TOP_PER_POOL + DEEP_ANALYSIS_BUFFER_PER_POOL,
  usStocks: TOP_PER_POOL + DEEP_ANALYSIS_BUFFER_PER_POOL,
  mutualFunds: TOP_PER_POOL + DEEP_ANALYSIS_BUFFER_PER_POOL,
} as const;
const MAX_DEEP_ANALYSIS_CANDIDATES =
  DEEP_ANALYSIS_TARGETS.indiaStocks +
  DEEP_ANALYSIS_TARGETS.usStocks +
  DEEP_ANALYSIS_TARGETS.mutualFunds;
const MAX_DISPLAYED_RECOMMENDATIONS = TOP_PER_POOL * 3;
const PROGRESS_PHASE_HOLD_MS = 380;

const MUTUAL_FUND_DEBT_REGEX =
  /liquid|overnight|money market|short duration|ultra short|gilt|debt|bond|banking\s*&\s*psu|corporate bond/i;
const MUTUAL_FUND_GOLD_REGEX = /gold|gold etf/i;
const MUTUAL_FUND_HYBRID_REGEX = /hybrid|balanced|asset allocation|equity savings|arbitrage/i;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function average(values: number[]) {
  if (!values.length) return 0;
  return sum(values) / values.length;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return 0;
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}

function safePct(part: number, total: number) {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

function normalizeText(value?: string) {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function stableHash(text: string) {
  let hash = 0;
  for (const char of text) {
    hash = (hash * 31 + char.charCodeAt(0)) % 1000003;
  }
  return hash;
}

function weightedScore(rows: Array<{ value: number; weight: number }>) {
  const totalWeight = rows.reduce((acc, row) => acc + row.weight, 0);
  if (!totalWeight) return 50;
  return clamp(rows.reduce((acc, row) => acc + row.value * row.weight, 0) / totalWeight, 0, 100);
}

function scaleValue(value: number | undefined, min: number, max: number, inverse = false) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 50;
  const scaled = clamp(((value - min) / (max - min)) * 100, 0, 100);
  return inverse ? 100 - scaled : scaled;
}

function getMetric(symbol: string, key: string): number | undefined {
  return demoFundamentalsBySymbol[symbol]?.keyMetrics.find((metric) => metric.key === key)?.value;
}

function getMetricFromBundle(bundle: FundamentalsBundle | undefined, key: string): number | undefined {
  return bundle?.keyMetrics.find((metric) => metric.key === key)?.value;
}

function inferCountryCode(country?: string): CountryCode {
  if (/india|indian/i.test(country ?? '')) return 'IN';
  if (/united states|\busa\b|\bus\b|nri|non[- ]resident/i.test(country ?? '')) return 'US';
  return 'IN';
}

function getDisplayCurrency(input: { countryCode?: CountryCode; country?: string }): 'INR' | 'USD' {
  const countryCode = input.countryCode ?? inferCountryCode(input.country);
  return countryCode === 'US' ? 'USD' : 'INR';
}

function getScopedMarkets(preferredMarket: AgentMarketScope): MarketKind[] {
  if (preferredMarket === 'india') return ['india', 'mf'];
  if (preferredMarket === 'us') return ['us'];
  return ['india', 'us', 'mf'];
}

function isSecurityInScope(entity: SearchEntity, preferredMarket: AgentMarketScope) {
  if (preferredMarket === 'india') return entity.market === 'india' || entity.market === 'mf';
  if (preferredMarket === 'us') return entity.market === 'us';
  return entity.market === 'india' || entity.market === 'us' || entity.market === 'mf';
}

function resolveMarketScope(input: Pick<AgenticFormInput, 'marketScope' | 'countryCode' | 'country'>): AgentMarketScope {
  if (input.marketScope) return input.marketScope;
  const countryCode = input.countryCode ?? inferCountryCode(input.country);
  return countryCode === 'US' ? 'us' : 'india';
}

function normalizeInput(input: AgenticFormInput): AgenticFormInput {
  const countryCode = input.countryCode ?? inferCountryCode(input.country);
  const marketScope = resolveMarketScope({ marketScope: input.marketScope, countryCode, country: input.country });
  const country = input.country?.trim() || (countryCode === 'US' ? 'NRI' : 'Indian');
  return {
    ...input,
    country,
    countryCode,
    marketScope,
    compareWithAlternatives: input.compareWithAlternatives ?? true,
  };
}

function normalizeScoringWeights(weights?: Partial<ScoringWeights>): ScoringWeights {
  const merged = {
    ...DEFAULT_SCORING_WEIGHTS,
    ...(weights ?? {}),
  };
  const clamped = {
    stockQuality: clamp(merged.stockQuality, 0.1, 0.7),
    riskCompatibility: clamp(merged.riskCompatibility, 0.1, 0.6),
    portfolioFit: clamp(merged.portfolioFit, 0.05, 0.5),
    lifeStageFit: clamp(merged.lifeStageFit, 0.05, 0.4),
  };
  const total = clamped.stockQuality + clamped.riskCompatibility + clamped.portfolioFit + clamped.lifeStageFit;
  if (total <= 0) return DEFAULT_SCORING_WEIGHTS;
  return {
    stockQuality: clamped.stockQuality / total,
    riskCompatibility: clamped.riskCompatibility / total,
    portfolioFit: clamped.portfolioFit / total,
    lifeStageFit: clamped.lifeStageFit / total,
  };
}

function convertCurrency(amount: number, from: 'INR' | 'USD', to: 'INR' | 'USD', usdInrRate: number) {
  if (from === to) return amount;
  if (!Number.isFinite(usdInrRate) || usdInrRate <= 0) return amount;
  if (from === 'USD') return amount * usdInrRate;
  return amount / usdInrRate;
}

function classifyFreshness(source?: string, delayed?: boolean): DataFreshness {
  const sourceText = (source ?? '').toLowerCase();
  if (sourceText.includes('reference') || sourceText.includes('demo') || sourceText.includes('fallback')) {
    return 'Demo fallback';
  }
  if (delayed) return 'Delayed';
  return 'Live';
}

function classifyNewsFreshness(news: NewsItem[]): DataFreshness {
  if (!news.length) return 'Demo fallback';
  const demoCount = news.filter((item) => {
    const source = item.source.toLowerCase();
    const url = item.url.toLowerCase();
    return source.includes('market news') || url.includes('example.com');
  }).length;
  if (demoCount === news.length) return 'Demo fallback';
  return 'Delayed';
}

function validateAgenticInput(input: AgenticFormInput) {
  const nonNegativeFields: Array<{ label: string; value: number }> = [
    { label: 'Monthly income', value: input.monthlyIncome },
    { label: 'Monthly fixed expenses', value: input.monthlyFixedExpenses },
    { label: 'Monthly discretionary expenses', value: input.monthlyDiscretionaryExpenses },
    { label: 'Equity assets', value: input.assets.equity },
    { label: 'Debt assets', value: input.assets.debt },
    { label: 'Gold assets', value: input.assets.gold },
    { label: 'Real-estate assets', value: input.assets.realEstate },
    { label: 'Cash assets', value: input.assets.cash },
    { label: 'Alternative assets', value: input.assets.alternatives },
    { label: 'EPF corpus', value: input.retirement.epf },
    { label: 'PPF corpus', value: input.retirement.ppf },
    { label: 'NPS corpus', value: input.retirement.nps },
    { label: 'Other retirement corpus', value: input.retirement.other },
  ];

  for (const field of nonNegativeFields) {
    if (!Number.isFinite(field.value) || field.value < 0) {
      throw new Error(`${field.label} must be a non-negative number.`);
    }
  }

  for (const loan of input.loans) {
    if (loan.outstandingAmount < 0 || loan.monthlyEmi < 0 || loan.interestRate < 0) {
      throw new Error('Loan values (outstanding, EMI, interest rate) must be non-negative.');
    }
  }

  if (input.monthlyIncome <= 0) {
    throw new Error('Monthly income must be greater than 0.');
  }

  if (!Number.isFinite(input.effectiveTaxRate) || input.effectiveTaxRate < 0 || input.effectiveTaxRate > 60) {
    throw new Error('Effective tax rate must be between 0% and 60%.');
  }
  if (!Number.isFinite(input.expectedReturnTarget) || input.expectedReturnTarget < 0 || input.expectedReturnTarget > 40) {
    throw new Error('Expected return target must be between 0% and 40%.');
  }
  if (!Number.isFinite(input.dependentsKids) || input.dependentsKids < 0 || input.dependentsKids > 10) {
    throw new Error('Dependents (kids) must be between 0 and 10.');
  }
  if (!Number.isFinite(input.dependentsParents) || input.dependentsParents < 0 || input.dependentsParents > 10) {
    throw new Error('Dependents (parents) must be between 0 and 10.');
  }
  if (!Number.isFinite(input.emergencyFundMonths) || input.emergencyFundMonths < 0 || input.emergencyFundMonths > 36) {
    throw new Error('Emergency fund coverage must be between 0 and 36 months.');
  }
  if (!Number.isFinite(input.age) || input.age < 18 || input.age > 100) {
    throw new Error('Age must be between 18 and 100.');
  }
}

function throwIfAborted(signal?: AbortSignal) {
  if (!signal?.aborted) return;
  throw new DOMException('Analysis cancelled by user.', 'AbortError');
}

function emitProgress(
  options: AgenticAnalysisOptions | undefined,
  next: AgenticProgressTelemetry,
) {
  options?.onProgress?.(next);
}

async function holdProgressPhase(
  options: AgenticAnalysisOptions | undefined,
  ms = PROGRESS_PHASE_HOLD_MS,
) {
  if (ms <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const cleanup = () => {
      clearTimeout(timer);
      if (options?.signal) options.signal.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };

    if (options?.signal) {
      if (options.signal.aborted) {
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      options.signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

async function fetchUniversePage(market: MarketKind, limit: number, offset: number): Promise<SearchEntity[]> {
  const params = new URLSearchParams({
    market,
    limit: String(limit),
    offset: String(offset),
  });
  const response = await fetch(`/api/search/universal?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to load ${market} universe (${response.status})`);
  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) return [];

  return payload.filter((entity): entity is SearchEntity => {
    if (!entity || typeof entity !== 'object') return false;
    const candidate = entity as Partial<SearchEntity>;
    return (
      typeof candidate.symbol === 'string' &&
      typeof candidate.displaySymbol === 'string' &&
      typeof candidate.name === 'string' &&
      typeof candidate.market === 'string' &&
      (candidate.type === 'stock' || candidate.type === 'mutual_fund')
    );
  });
}

async function loadUniverseForMarket(market: MarketKind): Promise<{ entities: SearchEntity[]; truncated: boolean }> {
  const maxCount = MAX_UNIVERSE_PER_MARKET[market];
  const entities: SearchEntity[] = [];
  let offset = 0;
  let truncated = false;

  while (offset < maxCount) {
    const pageLimit = Math.min(UNIVERSE_PAGE_SIZE, maxCount - offset);
    const page = await fetchUniversePage(market, pageLimit, offset);
    if (!page.length) break;
    entities.push(...page);
    offset += page.length;
    if (page.length < pageLimit) break;
  }

  if (offset >= maxCount) truncated = true;
  return { entities, truncated };
}

async function loadRecommendationUniverse(preferredMarket: AgentMarketScope): Promise<LoadedRecommendationUniverse> {
  const markets = getScopedMarkets(preferredMarket);
  const settled = await Promise.allSettled(markets.map((market) => loadUniverseForMarket(market)));

  const merged = new Map<string, SearchEntity>();
  let liveMarkets = 0;
  let demoFallbackMarkets = 0;
  let truncated = false;
  const marketSources: Partial<Record<MarketKind, 'live_index' | 'demo_fallback'>> = {};

  for (let index = 0; index < settled.length; index += 1) {
    const outcome = settled[index];
    const market = markets[index];
    const sourceEntities =
      outcome.status === 'fulfilled'
        ? outcome.value.entities
        : DEMO_SECURITIES_UNIVERSE.filter((entity) => entity.market === market);

    if (outcome.status === 'fulfilled') {
      liveMarkets += 1;
      marketSources[market] = 'live_index';
      truncated = truncated || outcome.value.truncated;
    } else {
      demoFallbackMarkets += 1;
      marketSources[market] = 'demo_fallback';
    }

    for (const entity of sourceEntities) {
      if (entity.type !== 'stock' && entity.type !== 'mutual_fund') continue;
      const dedupeKey = `${entity.market}:${entity.symbol}`;
      if (!merged.has(dedupeKey)) merged.set(dedupeKey, entity);
    }
  }
  const entities = Array.from(merged.values());

  return {
    entities,
    source:
      liveMarkets === 0
        ? 'demo_fallback'
        : demoFallbackMarkets === 0
          ? 'live_index'
          : 'mixed_live_demo',
    truncated,
    stockCount: entities.filter((entity) => entity.type === 'stock').length,
    mutualFundCount: entities.filter((entity) => entity.type === 'mutual_fund').length,
    marketSources,
  };
}

function getSeriesFromStatement(table: FinancialStatementTable | undefined, rowRegex: RegExp): number[] {
  if (!table) return [];
  const preferred = table.viewData?.consolidated ?? table.viewData?.standalone;
  const rows = preferred?.rows ?? table.rows;
  const years = preferred?.years ?? table.years;
  const row = rows.find((candidate) => rowRegex.test(candidate.label));
  if (!row) return [];
  return years
    .map((year) => row.valuesByYear[year])
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
}

function calcCagr(values: number[]) {
  if (values.length < 2) return undefined;
  const first = values[0];
  const last = values[values.length - 1];
  if (first <= 0 || last <= 0) return undefined;
  return (Math.pow(last / first, 1 / (values.length - 1)) - 1) * 100;
}

function inferMutualFundBucket(entity: SearchEntity): keyof AllocationWeights {
  const searchable = `${entity.name} ${entity.displaySymbol} ${(entity.aliases ?? []).join(' ')}`;
  if (MUTUAL_FUND_GOLD_REGEX.test(searchable)) return 'gold';
  if (MUTUAL_FUND_DEBT_REGEX.test(searchable)) return 'debt';
  if (MUTUAL_FUND_HYBRID_REGEX.test(searchable)) return 'debt';
  return 'equity';
}

function inferSecurityBucket(entity: SearchEntity): keyof AllocationWeights {
  if (entity.type === 'mutual_fund') return inferMutualFundBucket(entity);
  return 'equity';
}

function scorePreScreenCandidate(
  entity: SearchEntity,
  input: AgenticFormInput,
  finance: FinancialProfileAnalysis,
  preferredMarket: AgentMarketScope,
) {
  let score = 50;
  const primaryGap = finance.allocationGap.find((gap) => gap.action === 'increase');
  const bucket = inferSecurityBucket(entity);
  const topSector = finance.localPortfolio.sectorExposure[0];
  const profileSeed = stableHash(
    [
      input.riskPreference,
      input.investmentGoal,
      input.investmentHorizon,
      input.liquidityNeed,
      Math.floor(input.age / 5).toString(),
      (input.dependentsKids + input.dependentsParents).toString(),
      finance.riskProfileLabel,
    ].join('|'),
  );

  if (isSecurityInScope(entity, preferredMarket)) score += 8;
  if (entity.type === 'mutual_fund') {
    score += 4;
    if (input.riskPreference === 'conservative') score += 18;
    if (input.riskPreference === 'aggressive' && bucket === 'debt') score -= 10;
    if (input.investmentGoal === 'income' || input.liquidityNeed === 'high') score += 10;
  } else if (input.riskPreference === 'aggressive') {
    score += 10;
  } else if (input.riskPreference === 'conservative') {
    score -= 8;
  }

  if (primaryGap && primaryGap.bucket === bucket) score += 22;
  if (primaryGap && primaryGap.bucket !== bucket) score -= 4;

  if (entity.type === 'stock' && topSector?.sector === entity.sector && topSector.weightPct > 35) score -= 12;
  if (entity.type === 'stock' && entity.sector && !finance.localPortfolio.sectorExposure.some((entry) => entry.sector === entity.sector)) {
    score += 8;
  }

  if (input.investmentGoal === 'income' && bucket === 'debt') score += 10;
  if (input.investmentGoal === 'wealth_creation' && bucket === 'equity') score += 8;
  if (input.investmentHorizon === 'short' && bucket === 'debt') score += 8;
  if (input.investmentHorizon === 'long' && bucket === 'equity') score += 8;
  if (entity.market === 'us' && input.investmentHorizon === 'long') score += 4;
  if (entity.market === 'india' && input.liquidityNeed === 'high') score += 3;
  if (entity.type === 'stock' && demoFundamentalsBySymbol[entity.symbol]) score += 12;

  score += ((stableHash(`${entity.symbol}:${profileSeed}`) % 21) - 10) * 0.6;
  return score;
}

function selectCandidatesForDeepAnalysis(
  universe: SearchEntity[],
  input: AgenticFormInput,
  finance: FinancialProfileAnalysis,
  preferredMarket: AgentMarketScope,
) {
  const scored = universe
    .map((entity) => ({
      entity,
      score: scorePreScreenCandidate(entity, input, finance, preferredMarket),
    }))
    .sort((left, right) => right.score - left.score);

  const selected: SearchEntity[] = [];
  const selectedSymbols = new Set<string>();

  const pickFromBucket = (bucket: Array<{ entity: SearchEntity; score: number }>, target: number) => {
    for (const entry of bucket) {
      if (selected.length >= MAX_DEEP_ANALYSIS_CANDIDATES) break;
      if (target <= 0) break;
      const key = `${entry.entity.market}:${entry.entity.symbol}`;
      if (selectedSymbols.has(key)) continue;
      selected.push(entry.entity);
      selectedSymbols.add(key);
      target -= 1;
    }
  };

  const indiaStockBucket = scored.filter((entry) => entry.entity.type === 'stock' && entry.entity.market === 'india');
  const usStockBucket = scored.filter((entry) => entry.entity.type === 'stock' && entry.entity.market === 'us');
  const mutualFundBucket = scored.filter((entry) => entry.entity.type === 'mutual_fund');

  pickFromBucket(indiaStockBucket, DEEP_ANALYSIS_TARGETS.indiaStocks);
  pickFromBucket(usStockBucket, DEEP_ANALYSIS_TARGETS.usStocks);
  pickFromBucket(mutualFundBucket, DEEP_ANALYSIS_TARGETS.mutualFunds);

  for (const entry of scored) {
    if (selected.length >= MAX_DEEP_ANALYSIS_CANDIDATES) break;
    const key = `${entry.entity.market}:${entry.entity.symbol}`;
    if (selectedSymbols.has(key)) continue;
    selected.push(entry.entity);
    selectedSymbols.add(key);
  }

  return selected;
}

async function findEntityByTicker(query?: string) {
  const normalized = normalizeText(query);
  if (!normalized) return undefined;

  try {
    const direct = await getEntityBySymbol(query!.trim());
    if (direct) {
      const normalizedQuery = query!.trim().toUpperCase();
      const looksLikeFallbackStub =
        direct.market === 'us' &&
        direct.exchange === 'UNKNOWN' &&
        direct.symbol.toUpperCase() === normalizedQuery &&
        (direct.name.toUpperCase() === normalizedQuery ||
          /unverified/i.test(direct.name) ||
          /unverified/i.test(direct.summary ?? '') ||
          (direct.aliases ?? []).some((alias) => /unverified/i.test(alias)));
      if (!looksLikeFallbackStub) return direct;
    }
  } catch {
    // Fall through to search-based lookup.
  }

  try {
    const remoteMatches = await searchEntities(query!.trim());
    const exact = remoteMatches.find((entity) => {
      const options = [entity.symbol, entity.displaySymbol, entity.name, ...(entity.aliases ?? [])].map((value) =>
        normalizeText(value),
      );
      return options.some((candidate) => candidate === normalized);
    });
    if (exact) return exact;
    if (remoteMatches[0]) return remoteMatches[0];
  } catch {
    // Fall through to bundled demo lookup.
  }

  return DEMO_SECURITIES_UNIVERSE.find((entity) => {
    const options = [
      entity.symbol,
      entity.displaySymbol,
      entity.name,
      ...(entity.aliases ?? []),
    ].map((value) => normalizeText(value));
    return options.some((candidate) => candidate === normalized || candidate.includes(normalized));
  });
}

async function deriveHoldings(txns: PortfolioTxn[]): Promise<HoldingSnapshot[]> {
  const map = new Map<string, { qty: number; invested: number; market: 'india' | 'us' | 'mf' }>();

  for (const txn of txns) {
    const current = map.get(txn.symbol) ?? { qty: 0, invested: 0, market: txn.market };
    if (txn.side === 'buy') {
      current.qty += txn.quantity;
      current.invested += txn.quantity * txn.price;
    } else if (current.qty > 0) {
      const avgCost = current.invested / current.qty;
      current.qty = Math.max(0, current.qty - txn.quantity);
      current.invested = Math.max(0, current.invested - txn.quantity * avgCost);
    }
    map.set(txn.symbol, current);
  }

  const openPositions = Array.from(map.entries()).filter(([, value]) => value.qty > 0);
  const resolved = await Promise.all(
    openPositions.map(async ([symbol, value]) => {
      const entity =
        (await getEntityBySymbol(symbol).catch(() => null)) ??
        demoUniverse.find((candidate) => candidate.symbol === symbol) ??
        null;
      const priceFromQuote =
        entity
          ? await marketAdapter
              .getQuote(entity)
              .then((quote) => (typeof quote.price === 'number' ? quote.price : undefined))
              .catch(() => undefined)
          : undefined;
      const fallbackPrice = getMetric(symbol, 'currentPrice') ?? (value.qty > 0 ? value.invested / value.qty : 0);
      const currentPrice = priceFromQuote ?? fallbackPrice;
      return {
        symbol,
        market: entity?.market ?? value.market,
        currentValue: currentPrice * value.qty,
        sector: entity?.sector ?? 'Unknown',
      } satisfies HoldingSnapshot;
    }),
  );
  return resolved;
}

function getSectorExposure(holdings: HoldingSnapshot[]) {
  const totalValue = sum(holdings.map((holding) => holding.currentValue));
  const bySector = new Map<string, number>();

  for (const holding of holdings) {
    bySector.set(holding.sector, (bySector.get(holding.sector) ?? 0) + holding.currentValue);
  }

  return Array.from(bySector.entries())
    .map(([sector, value]) => ({ sector, weightPct: safePct(value, totalValue) }))
    .sort((left, right) => right.weightPct - left.weightPct);
}

function computeRsi(prices: number[], period = 14) {
  if (prices.length <= period) return undefined;

  let gains = 0;
  let losses = 0;
  for (let index = 1; index <= period; index += 1) {
    const change = prices[index] - prices[index - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (let index = period + 1; index < prices.length; index += 1) {
    const change = prices[index] - prices[index - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
  }

  if (averageLoss === 0) return 100;
  const rs = averageGain / averageLoss;
  return 100 - 100 / (1 + rs);
}

function computeSma(values: number[], period: number) {
  if (values.length < period) return undefined;
  return average(values.slice(values.length - period));
}

function computeEmaSeries(values: number[], period: number) {
  if (values.length < period) return [];
  const multiplier = 2 / (period + 1);
  const start = average(values.slice(0, period));
  const result = [start];
  for (let index = period; index < values.length; index += 1) {
    result.push(values[index] * multiplier + result[result.length - 1] * (1 - multiplier));
  }
  return result;
}

function computeRiskSnapshot(history: HistorySeries): RiskSnapshot {
  const prices = history.points.map((point) => point.close);
  if (prices.length < 60) {
    return {
      volatilityPct: undefined,
      maxDrawdownPct: undefined,
      beta: undefined,
      sharpeRatio: undefined,
      level: 'Moderate' as const,
      score: 50,
    };
  }

  const returns = prices.slice(1).map((price, index) => price / prices[index] - 1);
  const dailyMean = average(returns);
  const dailyStdDev = standardDeviation(returns);
  const annualizedVolatility = dailyStdDev * Math.sqrt(252) * 100;
  const annualizedReturn = dailyMean * 252 * 100;

  let peak = prices[0];
  let maxDrawdown = 0;
  for (const price of prices) {
    peak = Math.max(peak, price);
    const drawdown = peak > 0 ? ((price - peak) / peak) * 100 : 0;
    maxDrawdown = Math.min(maxDrawdown, drawdown);
  }

  const beta = clamp(annualizedVolatility / 22, 0.55, 1.85);
  const sharpeRatio = annualizedVolatility > 0 ? (annualizedReturn - 5) / annualizedVolatility : undefined;
  const level =
    annualizedVolatility > 40 || maxDrawdown < -35
      ? 'High'
      : annualizedVolatility > 25 || maxDrawdown < -20
        ? 'Moderate'
        : 'Low';
  const score = weightedScore([
    { value: scaleValue(annualizedVolatility, 15, 50, true), weight: 0.45 },
    { value: scaleValue(beta, 0.7, 1.8, true), weight: 0.25 },
    { value: scaleValue(Math.abs(maxDrawdown), 10, 45, true), weight: 0.3 },
  ]);

  return {
    volatilityPct: round(annualizedVolatility),
    maxDrawdownPct: round(maxDrawdown),
    beta: round(beta, 2),
    sharpeRatio: typeof sharpeRatio === 'number' ? round(sharpeRatio, 2) : undefined,
    level,
    score: round(score, 0),
  };
}

function computeTechnicalSnapshot(history: HistorySeries): TechnicalSnapshot {
  const prices = history.points.map((point) => point.close);
  const volumes = history.points.map((point) => point.volume ?? 0).filter((value) => value > 0);
  const currentPrice = prices[prices.length - 1];
  const ma50 = computeSma(prices, 50);
  const ma200 = computeSma(prices, 200);
  const rsi14 = computeRsi(prices, 14);
  const ema12 = computeEmaSeries(prices, 12);
  const ema26 = computeEmaSeries(prices, 26);
  const alignOffset = Math.max(0, ema12.length - ema26.length);
  const macdSeries = ema26.map((value, index) => ema12[index + alignOffset] - value);
  const signalSeries = computeEmaSeries(macdSeries, 9);
  const macd = macdSeries[macdSeries.length - 1];
  const signal = signalSeries[signalSeries.length - 1];
  const latest20Volume = average(volumes.slice(-20));
  const prior20Volume = average(volumes.slice(-40, -20));

  const volumeTrend: TechnicalSnapshot['volumeTrend'] =
    latest20Volume > 0 && prior20Volume > 0
      ? latest20Volume >= prior20Volume * 1.12
        ? 'Above average'
        : latest20Volume <= prior20Volume * 0.88
          ? 'Soft'
          : 'Normal'
      : 'Normal';

  const trendBias: TechnicalSnapshot['trendBias'] =
    typeof currentPrice === 'number' &&
    typeof ma50 === 'number' &&
    typeof ma200 === 'number' &&
    typeof macd === 'number' &&
    typeof signal === 'number'
      ? currentPrice > ma50 && ma50 > ma200 && macd >= signal
        ? 'Bullish'
        : currentPrice < ma50 && ma50 < ma200 && macd < signal
          ? 'Bearish'
          : 'Neutral'
      : 'Neutral';

  const macdBias: TechnicalSnapshot['macdBias'] =
    typeof macd === 'number' && typeof signal === 'number'
      ? macd > signal
        ? 'Bullish'
        : macd < signal
          ? 'Bearish'
          : 'Neutral'
      : 'Neutral';

  const score = weightedScore([
    {
      value:
        typeof currentPrice === 'number' && typeof ma50 === 'number'
          ? currentPrice >= ma50
            ? 80
            : 35
          : 50,
      weight: 0.24,
    },
    {
      value:
        typeof ma50 === 'number' && typeof ma200 === 'number'
          ? ma50 >= ma200
            ? 82
            : 28
          : 50,
      weight: 0.28,
    },
    {
      value:
        typeof rsi14 === 'number'
          ? rsi14 >= 45 && rsi14 <= 65
            ? 82
            : rsi14 >= 35 && rsi14 <= 75
              ? 65
              : 35
          : 50,
      weight: 0.24,
    },
    { value: macdBias === 'Bullish' ? 78 : macdBias === 'Neutral' ? 55 : 30, weight: 0.16 },
    { value: volumeTrend === 'Above average' ? 72 : volumeTrend === 'Normal' ? 56 : 42, weight: 0.08 },
  ]);

  return {
    rsi14: typeof rsi14 === 'number' ? round(rsi14) : undefined,
    ma50: typeof ma50 === 'number' ? round(ma50, 2) : undefined,
    ma200: typeof ma200 === 'number' ? round(ma200, 2) : undefined,
    macd: typeof macd === 'number' ? round(macd, 2) : undefined,
    signal: typeof signal === 'number' ? round(signal, 2) : undefined,
    macdBias,
    volumeTrend,
    trendBias,
    score: round(score, 0),
  };
}

function computeFundamentalsScore(metrics: {
  pe?: number;
  pb?: number;
  roe?: number;
  opm?: number;
  salesGrowth?: number;
  profitGrowth?: number;
  debtToEquity?: number;
}) {
  const { pe, pb, roe, opm, salesGrowth, profitGrowth, debtToEquity } = metrics;

  const growth = weightedScore([
    { value: scaleValue(salesGrowth, 0, 25), weight: 0.45 },
    { value: scaleValue(profitGrowth, 0, 25), weight: 0.55 },
  ]);
  const quality = weightedScore([
    { value: scaleValue(roe, 5, 25), weight: 0.4 },
    { value: scaleValue(opm, 8, 40), weight: 0.25 },
    { value: scaleValue(debtToEquity, 0, 3, true), weight: 0.35 },
  ]);
  const valuation = weightedScore([
    { value: scaleValue(pe, 8, 45, true), weight: 0.6 },
    { value: scaleValue(pb, 0.8, 8, true), weight: 0.4 },
  ]);

  return {
    score: round(weightedScore([{ value: growth, weight: 0.36 }, { value: quality, weight: 0.4 }, { value: valuation, weight: 0.24 }]), 0),
    growthScore: round(growth, 0),
    qualityScore: round(quality, 0),
    valuationScore: round(valuation, 0),
  };
}

function computeDcf(
  entity: SearchEntity,
  finance: FinancialProfileAnalysis,
  fundamentalsBundle: FundamentalsBundle | undefined,
  metrics: {
    salesGrowth?: number;
    profitGrowth?: number;
    debtToEquity?: number;
    marketCap?: number;
    eps?: number;
    netProfit?: number;
  },
  marketPrice?: number,
): DcfAnalysis & { score: number } {
  if (entity.type === 'mutual_fund') {
    return {
      baseFcf: 0,
      fcfSeries: [],
      growthRatePct: 0,
      discountRatePct: 0,
      terminalGrowthPct: 0,
      sharesOutstanding: undefined,
      intrinsicValuePerShare: undefined,
      marginOfSafetyPct: undefined,
      valuationLabel: 'Insufficient Data',
      score: 50,
    };
  }

  const fundamentals = fundamentalsBundle ?? demoFundamentalsBySymbol[entity.symbol];
  const cashFlow = fundamentals?.statements.find((table) => table.kind === 'cashFlow');
  const fcfSeries = getSeriesFromStatement(cashFlow, /free cash flow/i);
  const baseFcf = fcfSeries[fcfSeries.length - 1] ?? 0;
  const historicalGrowth = calcCagr(fcfSeries);
  const blendedGrowth =
    historicalGrowth ??
    average(
      [metrics.salesGrowth, metrics.profitGrowth].filter(
        (value): value is number => typeof value === 'number',
      ),
    );
  const growthRatePct = clamp(blendedGrowth || 8, 4, 18);
  const debtToEquity = metrics.debtToEquity ?? 1;
  const discountRatePct = clamp(
    (finance.riskProfileLabel === 'Conservative' ? 11 : finance.riskProfileLabel === 'Moderate' ? 12.5 : 14) +
      (debtToEquity > 2 ? 1 : 0),
    10,
    15,
  );
  const terminalGrowthPct = entity.market === 'india' ? 4 : 3;
  const currentPrice = marketPrice;
  const marketCap = metrics.marketCap;
  const netProfit = metrics.netProfit;
  const eps = metrics.eps;
  const sharesOutstanding =
    typeof currentPrice === 'number' && typeof marketCap === 'number' && currentPrice > 0
      ? marketCap / currentPrice
      : typeof netProfit === 'number' && typeof eps === 'number' && eps > 0
        ? netProfit / eps
      : undefined;

  if (!baseFcf || !sharesOutstanding) {
    return {
      baseFcf,
      fcfSeries,
      growthRatePct: round(growthRatePct),
      discountRatePct: round(discountRatePct),
      terminalGrowthPct,
      sharesOutstanding,
      intrinsicValuePerShare: undefined,
      marginOfSafetyPct: undefined,
      valuationLabel: 'Insufficient Data',
      score: 45,
    };
  }

  let presentValue = 0;
  let lastProjectedFcf = baseFcf;
  const growthRate = growthRatePct / 100;
  const discountRate = discountRatePct / 100;
  const terminalGrowth = terminalGrowthPct / 100;

  for (let year = 1; year <= 5; year += 1) {
    const projectedFcf = baseFcf * Math.pow(1 + growthRate, year);
    presentValue += projectedFcf / Math.pow(1 + discountRate, year);
    lastProjectedFcf = projectedFcf;
  }

  const terminalValue =
    discountRate > terminalGrowth ? (lastProjectedFcf * (1 + terminalGrowth)) / (discountRate - terminalGrowth) : 0;
  presentValue += terminalValue / Math.pow(1 + discountRate, 5);

  const intrinsicValuePerShare = presentValue / sharesOutstanding;
  const marginOfSafetyPct =
    typeof currentPrice === 'number' && intrinsicValuePerShare > 0
      ? ((intrinsicValuePerShare - currentPrice) / intrinsicValuePerShare) * 100
      : undefined;
  const valuationLabel =
    typeof marginOfSafetyPct !== 'number'
      ? 'Insufficient Data'
      : marginOfSafetyPct > 20
        ? 'Undervalued'
        : marginOfSafetyPct >= 0
          ? 'Fairly Valued'
          : 'Overvalued';
  const score =
    typeof marginOfSafetyPct !== 'number'
      ? 45
      : valuationLabel === 'Undervalued'
        ? clamp(70 + marginOfSafetyPct * 0.9, 0, 98)
        : valuationLabel === 'Fairly Valued'
          ? clamp(62 + marginOfSafetyPct * 0.4, 0, 82)
          : clamp(50 + marginOfSafetyPct * 0.6, 10, 58);

  return {
    baseFcf,
    fcfSeries,
    growthRatePct: round(growthRatePct),
    discountRatePct: round(discountRatePct),
    terminalGrowthPct,
    sharesOutstanding: round(sharesOutstanding, 2),
    intrinsicValuePerShare: round(intrinsicValuePerShare, 2),
    marginOfSafetyPct: typeof marginOfSafetyPct === 'number' ? round(marginOfSafetyPct) : undefined,
    valuationLabel,
    score: round(score, 0),
  };
}

function buildDividendSuitability(
  input: AgenticFormInput,
  finance: FinancialProfileAnalysis,
  dividendYieldPct: number | undefined,
  growthScore: number,
) {
  const needsIncome =
    input.investmentGoal === 'income' ||
    input.age >= 55 ||
    finance.investableSurplusMonthly < input.monthlyIncome * 0.15 ||
    input.liquidityNeed === 'high';

  if (needsIncome) {
    return {
      label: dividendYieldPct && dividendYieldPct >= 1.2 ? 'Income Fit' : 'Balanced',
      note:
        dividendYieldPct && dividendYieldPct >= 1.2
          ? 'Your profile points to cash-flow-friendly ideas, and this name offers a usable dividend layer.'
          : 'Your profile benefits from income support, but this stock is better treated as a total-return idea than a pure income pick.',
    } as const;
  }

  if (input.investmentGoal === 'wealth_creation' && input.investmentHorizon === 'long' && growthScore >= 65) {
    return {
      label: 'Growth Fit',
      note: 'Your profile favors compounding over current income, so stronger reinvestment and growth matter more than yield.',
    } as const;
  }

  return {
    label: 'Balanced',
    note: 'This stock fits better as part of a diversified allocation than as a dedicated yield or hyper-growth slot.',
  } as const;
}

function buildTaxImpact(input: AgenticFormInput) {
  const shortTermRatePct = clamp(input.effectiveTaxRate, 5, 40);
  const longTermRatePct = clamp(input.effectiveTaxRate * 0.45, 5, shortTermRatePct);
  const preferredHoldingPeriod =
    input.investmentHorizon === 'short'
      ? 'Prefer 12+ months if you can avoid frequent churn'
      : input.investmentHorizon === 'medium'
        ? '12-36 months'
        : '3+ years';
  const note =
    input.investmentHorizon === 'short' || input.liquidityNeed === 'high'
      ? 'Frequent exits can create meaningfully higher modeled tax drag. Use only capital you can leave invested for at least a year when possible.'
      : 'Longer holding periods are modeled with meaningfully lower tax drag than frequent trading. Verify actual local capital-gains rules before acting.';

  return {
    shortTermRatePct: round(shortTermRatePct),
    longTermRatePct: round(longTermRatePct),
    preferredHoldingPeriod,
    note,
  };
}

function getRiskLabelFromScore(score: number): FinancialProfileAnalysis['riskProfileLabel'] {
  if (score >= 72) return 'Aggressive';
  if (score >= 48) return 'Moderate';
  return 'Conservative';
}

function normalizeAllocation(weights: AllocationWeights): AllocationWeights {
  const total = weights.equity + weights.debt + weights.gold + weights.cash;
  if (total <= 0) return { equity: 0, debt: 0, gold: 0, cash: 0 };
  return {
    equity: round((weights.equity / total) * 100),
    debt: round((weights.debt / total) * 100),
    gold: round((weights.gold / total) * 100),
    cash: round((weights.cash / total) * 100),
  };
}

function buildFinancialProfile(input: AgenticFormInput, holdings: HoldingSnapshot[]): FinancialProfileAnalysis {
  const totalDependents = input.dependentsKids + input.dependentsParents;
  const totalEmisMonthly = sum(input.loans.map((loan) => loan.monthlyEmi));
  const totalExpensesMonthly = input.monthlyFixedExpenses + input.monthlyDiscretionaryExpenses;
  const monthlyCoreSpend = totalExpensesMonthly + totalEmisMonthly;

  let emergencyFundTargetMonths =
    input.riskPreference === 'conservative' ? 9 : input.riskPreference === 'moderate' ? 6 : 4;
  if (totalDependents > 0) emergencyFundTargetMonths += 1;
  if (input.employmentType !== 'salaried') emergencyFundTargetMonths += 1;
  if (input.investmentGoal === 'house_purchase' && input.investmentHorizon !== 'long') emergencyFundTargetMonths += 1;
  emergencyFundTargetMonths = clamp(emergencyFundTargetMonths, 4, 12);

  const emergencyFundCurrentValue = input.emergencyFundMonths * monthlyCoreSpend;
  const emergencyFundTargetValue = emergencyFundTargetMonths * monthlyCoreSpend;
  const emergencyFundShortfallValue = Math.max(0, emergencyFundTargetValue - emergencyFundCurrentValue);
  const emergencyFundTopUpMonthly = emergencyFundShortfallValue / 12;
  const investableSurplusMonthly = Math.max(0, input.monthlyIncome - monthlyCoreSpend - emergencyFundTopUpMonthly);
  const debtBurdenRatioPct = safePct(totalEmisMonthly, input.monthlyIncome);
  const debtBurdenFlag =
    debtBurdenRatioPct > 40 ? 'High' : debtBurdenRatioPct > 25 ? 'Watch' : 'Healthy';

  const totalRetirementCorpus = sum(Object.values(input.retirement));
  const totalAssets = sum(Object.values(input.assets)) + totalRetirementCorpus;
  const totalLiabilities = sum(input.loans.map((loan) => loan.outstandingAmount));
  const netWorth = totalAssets - totalLiabilities;

  let riskProfileScore = 50;
  riskProfileScore += input.age <= 30 ? 16 : input.age <= 40 ? 10 : input.age <= 55 ? 2 : -14;
  riskProfileScore += totalDependents === 0 ? 12 : totalDependents === 1 ? 6 : totalDependents === 2 ? 0 : -8;
  riskProfileScore += debtBurdenRatioPct < 10 ? 12 : debtBurdenRatioPct < 25 ? 6 : debtBurdenRatioPct < 40 ? 0 : debtBurdenRatioPct < 55 ? -12 : -22;
  riskProfileScore += input.emergencyFundMonths >= 12 ? 12 : input.emergencyFundMonths >= 6 ? 8 : input.emergencyFundMonths >= 3 ? 0 : -15;
  riskProfileScore += input.investmentHorizon === 'long' ? 16 : input.investmentHorizon === 'medium' ? 6 : -14;
  riskProfileScore += input.riskPreference === 'aggressive' ? 12 : input.riskPreference === 'moderate' ? 4 : -6;
  riskProfileScore += input.expectedReturnTarget >= 15 ? 4 : input.expectedReturnTarget <= 8 ? -4 : 0;
  riskProfileScore += input.liquidityNeed === 'high' ? -8 : input.liquidityNeed === 'low' ? 2 : 0;
  riskProfileScore += input.employmentType === 'salaried' ? 2 : -4;
  riskProfileScore = clamp(riskProfileScore, 0, 100);

  let riskProfileLabel = getRiskLabelFromScore(riskProfileScore);
  if (debtBurdenFlag === 'High') riskProfileLabel = 'Conservative';
  else if (input.emergencyFundMonths < 3 && riskProfileLabel === 'Aggressive') riskProfileLabel = 'Moderate';

  const currentAllocation = normalizeAllocation({
    equity: input.assets.equity + input.assets.alternatives * 0.4,
    debt: input.assets.debt + totalRetirementCorpus + input.assets.alternatives * 0.15,
    gold: input.assets.gold,
    cash: input.assets.cash + input.assets.alternatives * 0.45,
  });

  let idealAllocation: AllocationWeights =
    riskProfileLabel === 'Aggressive'
      ? { equity: 75, debt: 15, gold: 5, cash: 5 }
      : riskProfileLabel === 'Moderate'
        ? { equity: 60, debt: 25, gold: 10, cash: 5 }
        : { equity: 40, debt: 35, gold: 15, cash: 10 };

  if (input.investmentHorizon === 'short') {
    idealAllocation = {
      equity: idealAllocation.equity - 15,
      debt: idealAllocation.debt + 10,
      gold: idealAllocation.gold,
      cash: idealAllocation.cash + 5,
    };
  }

  if (input.investmentHorizon === 'long') {
    idealAllocation = {
      equity: idealAllocation.equity + 5,
      debt: idealAllocation.debt - 5,
      gold: idealAllocation.gold,
      cash: idealAllocation.cash,
    };
  }

  if (input.liquidityNeed === 'high') {
    idealAllocation = {
      equity: idealAllocation.equity - 5,
      debt: idealAllocation.debt - 5,
      gold: idealAllocation.gold,
      cash: idealAllocation.cash + 10,
    };
  }

  if (debtBurdenFlag === 'High') {
    idealAllocation = {
      equity: Math.min(idealAllocation.equity, 45),
      debt: Math.max(idealAllocation.debt, 35),
      gold: Math.max(idealAllocation.gold, 10),
      cash: Math.max(idealAllocation.cash, 10),
    };
  }

  idealAllocation = normalizeAllocation(idealAllocation);

  const allocationGap: AllocationGap[] = (Object.keys(idealAllocation) as Array<keyof AllocationWeights>)
    .map((bucket) => {
      const gapPct = round(idealAllocation[bucket] - currentAllocation[bucket]);
      const action: AllocationGap['action'] = Math.abs(gapPct) < 3 ? 'maintain' : gapPct > 0 ? 'increase' : 'trim';
      return {
        bucket,
        currentPct: currentAllocation[bucket],
        idealPct: idealAllocation[bucket],
        gapPct,
        action,
      };
    })
    .sort((left, right) => Math.abs(right.gapPct) - Math.abs(left.gapPct));

  const biggestIncrease = allocationGap.find((gap) => gap.action === 'increase') ?? allocationGap[0];
  const suggestedStockStyles = [
    riskProfileLabel === 'Conservative' || debtBurdenFlag === 'High' ? 'large-cap quality' : 'growth at reasonable price',
    input.investmentGoal === 'income' || input.age >= 55 ? 'dividend support' : 'compounding runway',
    input.liquidityNeed === 'high' ? 'staggered entries only' : 'SIP-style deployment',
  ];

  const sectorExposure = getSectorExposure(holdings);
  const portfolioGapSummary =
    biggestIncrease.action === 'increase'
      ? `Needs ${round(Math.abs(biggestIncrease.gapPct), 0)}% more ${BUCKET_LABELS[biggestIncrease.bucket].toLowerCase()} exposure, preferably through ${suggestedStockStyles.join(', ')}.`
      : `Current allocation is near target; focus on higher-quality names rather than increasing risk.`;

  const riskProfileNotes = [
    input.age <= 35 ? 'You still have time on your side for compounding.' : 'Life-stage responsibilities reduce the room for deep drawdowns.',
    totalDependents > 0 ? `Dependents (${totalDependents}) increase the need for downside control.` : 'No dependents improves flexibility for long-duration investing.',
    debtBurdenFlag === 'High' ? 'Debt burden is elevated, so risky stock picks should be capped.' : 'Debt load is manageable relative to income.',
    input.emergencyFundMonths >= emergencyFundTargetMonths
      ? 'Emergency cover already meets the target range.'
      : `Emergency cover is below target by ${round((emergencyFundTargetValue - emergencyFundCurrentValue) / Math.max(1, monthlyCoreSpend), 1)} month(s).`,
  ];

  return {
    investableSurplusMonthly: round(investableSurplusMonthly, 2),
    totalExpensesMonthly: round(totalExpensesMonthly, 2),
    totalEmisMonthly: round(totalEmisMonthly, 2),
    emergencyFundCurrentValue: round(emergencyFundCurrentValue, 2),
    emergencyFundTargetMonths,
    emergencyFundTargetValue: round(emergencyFundTargetValue, 2),
    emergencyFundShortfallValue: round(emergencyFundShortfallValue, 2),
    emergencyFundTopUpMonthly: round(emergencyFundTopUpMonthly, 2),
    debtBurdenRatioPct: round(debtBurdenRatioPct),
    debtBurdenFlag,
    netWorth: round(netWorth, 2),
    totalAssets: round(totalAssets, 2),
    totalLiabilities: round(totalLiabilities, 2),
    riskProfileScore: round(riskProfileScore, 0),
    riskProfileLabel,
    riskProfileNotes,
    currentAllocation,
    idealAllocation,
    allocationGap,
    portfolioGapSummary,
    suggestedStockStyles,
    localPortfolio: {
      trackedHoldingsCount: holdings.length,
      trackedEquityValue: round(sum(holdings.map((holding) => holding.currentValue)), 2),
      sectorExposure: sectorExposure.slice(0, 4).map((entry) => ({ sector: entry.sector, weightPct: round(entry.weightPct) })),
    },
  };
}

function buildPersonalityTags(
  fundamentalsScore: number,
  technicalScore: number,
  dividendYieldPct: number | undefined,
  riskLevel: PersonalizedStockRecommendation['risk']['level'],
  growthScore: number,
) {
  const tags: string[] = [];
  if (growthScore >= 65) tags.push('Growth');
  if (fundamentalsScore >= 70) tags.push('Quality');
  if ((dividendYieldPct ?? 0) >= 1.2) tags.push('Dividend');
  if (riskLevel === 'Low') tags.push('Defensive');
  if (technicalScore >= 68) tags.push('Trend support');
  return tags.length ? tags : ['Balanced'];
}

function userRiskTarget(label: FinancialProfileAnalysis['riskProfileLabel']) {
  return label === 'Aggressive' ? 84 : label === 'Moderate' ? 60 : 32;
}

function stockRiskTarget(level: PersonalizedStockRecommendation['risk']['level'], beta?: number) {
  const base = level === 'High' ? 84 : level === 'Moderate' ? 58 : 30;
  if (typeof beta !== 'number') return base;
  return clamp(base + (beta - 1) * 18, 15, 92);
}

function holdingPeriodFromHorizon(horizon: InvestmentHorizon) {
  if (horizon === 'short') return '12-18 months';
  if (horizon === 'medium') return '3-5 years';
  return '5-10 years';
}

function recommendFromScore(score: number): PersonalizedStockRecommendation['recommendation'] {
  if (score >= 58) return 'BUY';
  if (score >= 42) return 'HOLD';
  return 'AVOID';
}

async function analyzeStock(
  entity: SearchEntity,
  input: AgenticFormInput,
  finance: FinancialProfileAnalysis,
  context: { baseCurrency: 'INR' | 'USD'; usdInrRate: number; scoringWeights: ScoringWeights },
): Promise<PersonalizedStockRecommendation> {
  const [liveFundamentals, liveQuote] = await Promise.all([
    fundamentalsAdapter.getFundamentals(entity).catch(() => undefined),
    marketAdapter.getQuote(entity).catch(() => undefined),
  ]);
  const liveFundamentalsUsable =
    !!liveFundamentals &&
    (liveFundamentals.keyMetrics.length > 0 || liveFundamentals.statements.length > 0) &&
    !/reference fundamentals dataset/i.test((liveFundamentals.source ?? '').toLowerCase());
  const fundamentalsBundle = liveFundamentalsUsable ? liveFundamentals : demoFundamentalsBySymbol[entity.symbol];
  const fundamentalsFreshness: DataFreshness = liveFundamentalsUsable ? 'Live' : 'Demo fallback';
  const quoteFreshness = liveQuote ? classifyFreshness(liveQuote.source, liveQuote.delayed) : ('Demo fallback' as const);
  const metric = (key: string) => getMetricFromBundle(fundamentalsBundle, key) ?? getMetric(entity.symbol, key);

  const [history, news] = await Promise.all([
    marketAdapter.getHistory(entity, 'max').catch(() => generateDemoHistory(entity)),
    newsAdapter.getNews(entity).catch(() => getDemoNews(entity)),
  ]);
  const historyFreshness = classifyFreshness(history.source, history.delayed);
  const newsFreshness = classifyNewsFreshness(news);
  const latestHistoryTs = history.points[history.points.length - 1]?.ts;
  const latestNewsTs = news
    .map((item) => item.publishedAt)
    .filter((value): value is string => typeof value === 'string')
    .sort()
    .at(-1);
  const aiMarket: 'india' | 'us' = entity.market === 'us' ? 'us' : 'india';
  const aiInsights = await heuristicAiProvider.generateInsights({
    companyName: entity.name,
    symbol: entity.displaySymbol,
    market: aiMarket,
    history,
    metrics: fundamentalsBundle?.keyMetrics.map((metric) => ({ key: metric.key, label: metric.label, value: metric.value })) ?? [],
    statements: fundamentalsBundle?.statements ?? [],
    shareholding: fundamentalsBundle?.shareholding,
    news,
  });

  const marketPrice =
    typeof liveQuote?.price === 'number' && Number.isFinite(liveQuote.price)
      ? liveQuote.price
      : metric('currentPrice');
  const eps = metric('eps');
  const pe =
    metric('pe') ??
    (typeof marketPrice === 'number' && typeof eps === 'number' && eps !== 0 ? marketPrice / eps : undefined);
  const pb = metric('pb');
  const revenueGrowthPct = metric('salesGrowth');
  const profitGrowthPct = metric('profitGrowth');
  const roePct = metric('roe');
  const opm = metric('opm');
  const dividendYieldPct = metric('dividendYield');
  const debtToEquity = metric('debtToEquity');
  const marketCap = metric('marketCap');
  const netProfit = metric('pat');

  const fundamentalsScore = computeFundamentalsScore({
    pe,
    pb,
    roe: roePct,
    opm,
    salesGrowth: revenueGrowthPct,
    profitGrowth: profitGrowthPct,
    debtToEquity,
  });
  const technicalSnapshot = computeTechnicalSnapshot(history);
  const riskSnapshot = computeRiskSnapshot(history);
  const dcf = computeDcf(
    entity,
    finance,
    fundamentalsBundle,
    {
      salesGrowth: revenueGrowthPct,
      profitGrowth: profitGrowthPct,
      debtToEquity,
      marketCap,
      eps,
      netProfit,
    },
    marketPrice,
  );
  const sentimentScore = clamp(
    Math.round(50 + (aiInsights.sentiment.buyProbability - aiInsights.sentiment.sellProbability) * 0.6),
    0,
    100,
  );
  const stockQuality = round(
    weightedScore([
      { value: fundamentalsScore.score, weight: 0.42 },
      { value: technicalSnapshot.score, weight: 0.18 },
      { value: dcf.score, weight: 0.25 },
      { value: sentimentScore, weight: 0.15 },
    ]),
    0,
  );

  const riskCompatibility = round(
    clamp(
      100 - Math.abs(userRiskTarget(finance.riskProfileLabel) - stockRiskTarget(riskSnapshot.level, riskSnapshot.beta)) * 1.35,
      10,
      95,
    ),
    0,
  );

  let portfolioFit = 55;
  const primaryGap = finance.allocationGap.find((gap) => gap.action === 'increase');
  const securityBucket = inferSecurityBucket(entity);
  if (primaryGap?.bucket === securityBucket) portfolioFit += 18;
  if (primaryGap?.bucket && primaryGap.bucket !== securityBucket) portfolioFit -= 10;

  const topSector = finance.localPortfolio.sectorExposure[0];
  if (entity.type === 'stock') {
    if (topSector?.sector === entity.sector && topSector.weightPct > 35) portfolioFit -= 14;
    if (!finance.localPortfolio.sectorExposure.some((entry) => entry.sector === entity.sector)) portfolioFit += 10;
  }
  if (entity.type === 'mutual_fund' && securityBucket === 'debt' && (input.investmentGoal === 'income' || input.liquidityNeed === 'high')) {
    portfolioFit += 8;
  }

  if (input.investmentGoal === 'income' && (dividendYieldPct ?? 0) >= 1.2) portfolioFit += 8;
  if (input.investmentGoal === 'wealth_creation' && (revenueGrowthPct ?? 0) >= 12 && (profitGrowthPct ?? 0) >= 12) portfolioFit += 6;
  if (finance.debtBurdenFlag === 'High' && riskSnapshot.level === 'High') portfolioFit -= 24;
  if (isSecurityInScope(entity, resolveMarketScope(input))) portfolioFit += 4;
  portfolioFit = clamp(portfolioFit, 0, 100);

  let lifeStageFit = 50;
  const dependents = input.dependentsKids + input.dependentsParents;
  if (input.age < 35 && input.investmentHorizon === 'long' && fundamentalsScore.growthScore >= 65) lifeStageFit += 18;
  if (input.age >= 55 && riskSnapshot.level === 'Low') lifeStageFit += 15;
  if (input.age >= 55 && riskSnapshot.level === 'High') lifeStageFit -= 20;
  if (input.investmentGoal === 'income' && (dividendYieldPct ?? 0) >= 1.2) lifeStageFit += 18;
  if (input.investmentGoal === 'income' && (dividendYieldPct ?? 0) < 1.2) lifeStageFit -= 10;
  if ((input.investmentGoal === 'child_education' || input.investmentGoal === 'house_purchase') && riskSnapshot.level === 'High') lifeStageFit -= 18;
  if (dependents >= 2 && riskSnapshot.level === 'High') lifeStageFit -= 14;
  if (input.liquidityNeed === 'high' && riskSnapshot.level === 'High') lifeStageFit -= 16;
  if (finance.emergencyFundShortfallValue > 0 && riskSnapshot.level === 'High') lifeStageFit -= 12;
  lifeStageFit = clamp(lifeStageFit, 0, 100);

  let personalizedFit = round(
    stockQuality * context.scoringWeights.stockQuality +
      riskCompatibility * context.scoringWeights.riskCompatibility +
      portfolioFit * context.scoringWeights.portfolioFit +
      lifeStageFit * context.scoringWeights.lifeStageFit,
    0,
  );
  if (finance.debtBurdenFlag === 'High' && riskSnapshot.level === 'High') personalizedFit = Math.min(personalizedFit, 54);

  const recommendation = recommendFromScore(personalizedFit);
  const allocationRatio =
    finance.investableSurplusMonthly <= 0
      ? 0
      : recommendation === 'BUY'
        ? personalizedFit >= 86
          ? 0.35
          : 0.25
        : recommendation === 'HOLD'
          ? 0.12
          : 0;
  const suggestedAllocationMonthly = round(
    finance.investableSurplusMonthly * allocationRatio * (input.liquidityNeed === 'high' ? 0.8 : 1),
    2,
  );
  const securityCurrency = entity.currency ?? 'INR';
  const suggestedAllocationSecurityMonthly = round(
    convertCurrency(suggestedAllocationMonthly, context.baseCurrency, securityCurrency, context.usdInrRate),
    2,
  );
  const weightedContributions = {
    stockQuality: round(stockQuality * context.scoringWeights.stockQuality, 1),
    riskCompatibility: round(riskCompatibility * context.scoringWeights.riskCompatibility, 1),
    portfolioFit: round(portfolioFit * context.scoringWeights.portfolioFit, 1),
    lifeStageFit: round(lifeStageFit * context.scoringWeights.lifeStageFit, 1),
  };
  const dcfFreshness: DataFreshness =
    dcf.valuationLabel === 'Insufficient Data'
      ? fundamentalsFreshness === 'Demo fallback'
        ? 'Demo fallback'
        : 'Delayed'
      : fundamentalsFreshness === 'Live'
        ? 'Live'
        : 'Delayed';
  const missingMetricCount = [pe, eps, revenueGrowthPct, profitGrowthPct, roePct].filter(
    (value) => typeof value !== 'number',
  ).length;
  const demoSignalCount = [quoteFreshness, historyFreshness, fundamentalsFreshness, newsFreshness].filter(
    (freshness) => freshness === 'Demo fallback',
  ).length;
  const delayedSignalCount = [quoteFreshness, historyFreshness, fundamentalsFreshness, newsFreshness].filter(
    (freshness) => freshness === 'Delayed',
  ).length;
  const uncertaintyPct = clamp(demoSignalCount * 14 + delayedSignalCount * 6 + missingMetricCount * 5, 6, 45);
  const confidenceScore = round(100 - uncertaintyPct * 1.6, 0);
  const confidenceLabel: PersonalizedStockRecommendation['confidence']['label'] =
    confidenceScore >= 75 ? 'High' : confidenceScore >= 52 ? 'Moderate' : 'Low';
  const confidenceReasons = [
    demoSignalCount > 0 ? `${demoSignalCount} metric channel(s) relied on demo fallback data.` : 'Core channels used live/delayed market data.',
    missingMetricCount > 0 ? `${missingMetricCount} fundamental metric(s) were unavailable.` : 'Required valuation and growth metrics were available.',
    dcf.valuationLabel === 'Insufficient Data'
      ? 'DCF confidence is limited due to insufficient cash-flow inputs.'
      : 'DCF was computed from available cash-flow and valuation inputs.',
  ];
  const confidence = {
    score: confidenceScore,
    label: confidenceLabel,
    fitLow: clamp(round(personalizedFit - uncertaintyPct * 0.55, 0), 0, 100),
    fitHigh: clamp(round(personalizedFit + uncertaintyPct * 0.4, 0), 0, 100),
    uncertaintyPct: round(uncertaintyPct, 1),
    reasons: confidenceReasons,
  };
  const quoteProvenance: MetricProvenance = {
    source: liveQuote?.source ?? 'Unavailable',
    freshness: quoteFreshness,
    timestamp: liveQuote?.timestamp ?? latestHistoryTs,
    fallbackReason:
      quoteFreshness === 'Demo fallback'
        ? 'Live quote could not be fetched for this symbol; a reference quote was used.'
        : undefined,
  };
  const historyProvenance: MetricProvenance = {
    source: history.source,
    freshness: historyFreshness,
    timestamp: latestHistoryTs,
    fallbackReason:
      historyFreshness === 'Demo fallback'
        ? 'Live historical candles were unavailable; generated reference history was used.'
        : undefined,
  };
  const fundamentalsProvenance: MetricProvenance = {
    source: fundamentalsBundle?.source ?? 'Fundamentals unavailable',
    freshness: fundamentalsFreshness,
    fallbackReason:
      fundamentalsFreshness === 'Demo fallback'
        ? 'Live fundamentals were unavailable or incomplete; fallback fundamentals were used.'
        : undefined,
  };
  const newsProvenance: MetricProvenance = {
    source: news[0]?.source ?? 'News unavailable',
    freshness: newsFreshness,
    timestamp: latestNewsTs,
    fallbackReason:
      newsFreshness === 'Demo fallback'
        ? 'Relevant live news was unavailable; reference headlines were used.'
        : undefined,
  };
  const dcfProvenance: MetricProvenance = {
    source: fundamentalsProvenance.source,
    freshness: dcfFreshness,
    timestamp: fundamentalsProvenance.timestamp,
    fallbackReason:
      dcf.valuationLabel === 'Insufficient Data'
        ? 'Insufficient FCF/share-count inputs prevented reliable DCF output.'
        : undefined,
  };

  const dividendSuitability = buildDividendSuitability(
    input,
    finance,
    dividendYieldPct,
    fundamentalsScore.growthScore,
  );
  const taxImpact = buildTaxImpact(input);
  const personalityTags = buildPersonalityTags(
    fundamentalsScore.score,
    technicalSnapshot.score,
    dividendYieldPct,
    riskSnapshot.level,
    fundamentalsScore.growthScore,
  );

  const supportPoints = [
    fundamentalsScore.score >= 70
      ? `Fundamentals are strong for this universe, with a ${fundamentalsScore.score}/100 score.`
      : `Fundamentals are serviceable but not elite, at ${fundamentalsScore.score}/100.`,
    typeof dcf.marginOfSafetyPct === 'number'
      ? `DCF suggests ${dcf.valuationLabel.toLowerCase()} pricing with margin of safety near ${formatPercent(dcf.marginOfSafetyPct)}.`
      : 'DCF confidence is limited, so valuation comfort depends more on operating execution.',
    technicalSnapshot.trendBias === 'Bullish'
      ? 'Trend structure is constructive with price support above key moving averages.'
      : technicalSnapshot.trendBias === 'Neutral'
        ? 'Trend is balanced, so staggered entries make more sense than chasing strength.'
        : 'Trend is weak, so position sizing needs extra discipline.',
    aiInsights.sentiment.label === 'Bullish'
      ? 'Headline and sentiment signals are supportive rather than hostile.'
      : 'Sentiment is mixed, so rely more on valuation and sizing discipline than headlines.',
  ];

  const cautionPoints = [
    finance.debtBurdenFlag === 'High' && riskSnapshot.level === 'High'
      ? 'Your current debt load makes this stock too volatile for full-sized allocations.'
      : 'Position size should still respect your broader household cash-flow priorities.',
    typeof debtToEquity === 'number' && debtToEquity > 2
      ? 'Leverage is elevated, which can amplify downside in weak periods.'
      : 'Balance-sheet leverage is not the main risk driver here.',
    dcf.valuationLabel === 'Overvalued'
      ? 'Valuation is ahead of intrinsic value estimates, reducing margin of safety.'
      : 'Valuation is not the biggest red flag at current reference pricing.',
  ];

  const keyReason =
    recommendation === 'BUY'
      ? `Matches your ${finance.riskProfileLabel.toLowerCase()} profile, supports the ${primaryGap?.bucket ?? 'equity'} gap, and clears the stock-quality threshold.`
      : recommendation === 'HOLD'
        ? `Quality is acceptable, but either valuation comfort or life-stage compatibility is not strong enough for an aggressive entry.`
        : `This stock is misaligned with your current household risk capacity or does not solve the portfolio gap cleanly enough.`;

  return {
    symbol: entity.symbol,
    displaySymbol: entity.displaySymbol,
    name: entity.name,
    market: entity.market,
    securityType: entity.type,
    sector: entity.sector ?? 'Unknown',
    industry: entity.industry ?? 'Unknown',
    currency: entity.currency ?? 'INR',
    marketPrice,
    fundamentals: {
      pe,
      eps,
      revenueGrowthPct,
      profitGrowthPct,
      roePct,
      freeCashFlow: dcf.baseFcf || undefined,
      dividendYieldPct,
    },
    technicals: {
      rsi14: technicalSnapshot.rsi14,
      ma50: technicalSnapshot.ma50,
      ma200: technicalSnapshot.ma200,
      macd: technicalSnapshot.macd,
      signal: technicalSnapshot.signal,
      macdBias: technicalSnapshot.macdBias,
      volumeTrend: technicalSnapshot.volumeTrend,
      trendBias: technicalSnapshot.trendBias,
    },
    sentiment: {
      score: sentimentScore,
      label: aiInsights.sentiment.label,
      analystView: aiInsights.sentiment.suggestedAction,
      bias: aiInsights.sentiment.buyBias,
      confidence: aiInsights.sentiment.confidence,
      buyProbability: aiInsights.sentiment.buyProbability,
      holdProbability: aiInsights.sentiment.holdProbability,
      sellProbability: aiInsights.sentiment.sellProbability,
      drivers: aiInsights.sentiment.drivers,
      rationale: aiInsights.sentiment.rationale,
      headlines: news.map((item) => item.title).slice(0, 3),
      headlineItems: news.slice(0, 5).map((item) => ({
        title: item.title,
        source: item.source,
        publishedAt: item.publishedAt,
        url: item.url,
        relevanceScore: item.relevanceScore,
        sentimentScore: item.sentimentScore,
      })),
    },
    risk: {
      beta: riskSnapshot.beta,
      volatilityPct: riskSnapshot.volatilityPct,
      maxDrawdownPct: riskSnapshot.maxDrawdownPct,
      sharpeRatio: riskSnapshot.sharpeRatio,
      level: riskSnapshot.level,
    },
    dcf: {
      baseFcf: round(dcf.baseFcf, 2),
      fcfSeries: dcf.fcfSeries,
      growthRatePct: dcf.growthRatePct,
      discountRatePct: dcf.discountRatePct,
      terminalGrowthPct: dcf.terminalGrowthPct,
      sharesOutstanding: dcf.sharesOutstanding,
      intrinsicValuePerShare: dcf.intrinsicValuePerShare,
      marginOfSafetyPct: dcf.marginOfSafetyPct,
      valuationLabel: dcf.valuationLabel,
    },
    dividendSuitability,
    taxImpact,
    scores: {
      fundamentals: fundamentalsScore.score,
      technical: technicalSnapshot.score,
      sentiment: sentimentScore,
      stockRisk: riskSnapshot.score,
      stockQuality,
      riskCompatibility,
      portfolioFit: round(portfolioFit, 0),
      lifeStageFit: round(lifeStageFit, 0),
      personalizedFit,
      weightedContributions,
    },
    confidence,
    dataFreshness: {
      quote: quoteFreshness,
      history: historyFreshness,
      fundamentals: fundamentalsFreshness,
      news: newsFreshness,
      dcf: dcfFreshness,
    },
    provenance: {
      quote: quoteProvenance,
      history: historyProvenance,
      fundamentals: fundamentalsProvenance,
      news: newsProvenance,
      dcf: dcfProvenance,
    },
    allocation: {
      baseCurrency: context.baseCurrency,
      baseAmountMonthly: suggestedAllocationMonthly,
      securityCurrency,
      securityAmountMonthly: suggestedAllocationSecurityMonthly,
      usdInrRate: context.usdInrRate,
    },
    recommendation,
    suggestedAllocationMonthly,
    expectedHoldingPeriod: holdingPeriodFromHorizon(input.investmentHorizon),
    keyReason,
    supportPoints: supportPoints.slice(0, 4),
    cautionPoints: cautionPoints.slice(0, 3),
    personalityTags,
  };
}

function buildUserProfileSummary(input: AgenticFormInput, baseCurrency: 'INR' | 'USD'): PersonalProfileSummary {
  const dependents = input.dependentsKids + input.dependentsParents;
  return {
    lifeStage: `${RISK_LABELS[input.riskPreference]} ${input.maritalStatus} investor, age ${input.age}, ${dependents} dependent${dependents === 1 ? '' : 's'}`,
    dependents,
    employmentType: input.employmentType,
    baseCurrency,
    marketScope: resolveMarketScope(input),
    monthlyIncome: input.monthlyIncome,
    monthlyCoreSpend: input.monthlyFixedExpenses + input.monthlyDiscretionaryExpenses,
    effectiveTaxRate: input.effectiveTaxRate,
    investmentGoal: input.investmentGoal,
    investmentHorizon: input.investmentHorizon,
    riskPreference: input.riskPreference,
    liquidityNeed: input.liquidityNeed,
  };
}

function buildFinalRecommendation(
  input: AgenticFormInput,
  finance: FinancialProfileAnalysis,
  focusStock: PersonalizedStockRecommendation | undefined,
  stockRecommendations: PersonalizedStockRecommendation[],
) {
  if (finance.investableSurplusMonthly <= 0) {
    return {
      headline: 'Build liquidity before adding fresh market risk',
      recommendation: 'BUILD BUFFER FIRST',
      subject: 'Household balance sheet',
      suggestedAllocationMonthly: 0,
      holdingPeriod: 'Pause new equity deployment',
      taxNote: 'Tax planning matters less than restoring cash flow resilience right now.',
      keyReason: `Monthly investable surplus is exhausted after expenses, EMIs, and emergency-fund top-up.`,
      portfolioGapCallout: finance.portfolioGapSummary,
    };
  }

  const primary = focusStock ?? stockRecommendations[0];
  if (!primary) {
    return {
      headline: 'No eligible security passed the current fit rules',
      recommendation: 'HOLD CASH',
      subject: 'No security selected',
      suggestedAllocationMonthly: 0,
      holdingPeriod: holdingPeriodFromHorizon(input.investmentHorizon),
      taxNote: 'Keep dry powder until a better fit appears.',
      keyReason: 'The current universe does not produce a strong enough fit after personal risk and portfolio-gap filters.',
      portfolioGapCallout: finance.portfolioGapSummary,
    };
  }

  const freshnessGuardrailTriggered =
    primary.confidence.score < 45 ||
    primary.dataFreshness.quote === 'Demo fallback' ||
    primary.dataFreshness.history === 'Demo fallback';
  if (freshnessGuardrailTriggered) {
    return {
      headline: 'Hold deployment until data confidence improves',
      recommendation: 'HOLD CASH',
      subject: primary.displaySymbol,
      suggestedAllocationMonthly: 0,
      holdingPeriod: holdingPeriodFromHorizon(input.investmentHorizon),
      taxNote: 'Delay fresh entries when data confidence is low or fallback-heavy.',
      keyReason:
        'Policy guardrail blocked an allocation because market/fundamental freshness is insufficient for a reliable recommendation.',
      portfolioGapCallout: finance.portfolioGapSummary,
    };
  }

  const investNowCandidate = stockRecommendations.find((candidate) => candidate.recommendation === 'BUY');
  const betterPrimary = focusStock ? focusStock : investNowCandidate ?? primary;
  const betterAlternative =
    focusStock && stockRecommendations[0] && stockRecommendations[0].symbol !== focusStock.symbol
      ? stockRecommendations[0]
      : undefined;

  return {
    headline:
      focusStock && betterAlternative && focusStock.recommendation === 'AVOID'
        ? `Avoid ${focusStock.displaySymbol} for now; ${betterAlternative.displaySymbol} fits your profile better`
        : `${betterPrimary.recommendation} ${betterPrimary.displaySymbol}`,
    recommendation: betterPrimary.recommendation,
    subject: betterPrimary.displaySymbol,
    suggestedAllocationMonthly: betterPrimary.suggestedAllocationMonthly,
    holdingPeriod: betterPrimary.expectedHoldingPeriod,
    taxNote: betterPrimary.taxImpact.note,
    keyReason: betterPrimary.keyReason,
    portfolioGapCallout: finance.portfolioGapSummary,
  };
}

function buildExportJson(
  input: AgenticFormInput,
  finance: FinancialProfileAnalysis,
  primary: PersonalizedStockRecommendation | undefined,
  finalRecommendation: AgenticAnalysisReport['finalRecommendation'],
  baseCurrency: 'INR' | 'USD',
) {
  const displayCurrency = baseCurrency;
  const lifeStage = `${input.maritalStatus}, ${input.dependentsKids + input.dependentsParents} dependents, ${HORIZON_LABELS[input.investmentHorizon]}`;

  return {
    user_profile_summary: {
      investable_surplus: `${formatCurrency(finance.investableSurplusMonthly, displayCurrency, false)}/month`,
      risk_profile: `${finance.riskProfileLabel} (${finance.riskProfileScore}/100)`,
      portfolio_gap: finance.portfolioGapSummary,
      tax_bracket: `${round(input.effectiveTaxRate, 0)}%`,
      life_stage: lifeStage,
    },
    stock_analysis: primary
      ? {
          ticker: primary.displaySymbol,
          market_price: primary.marketPrice ?? null,
          dcf_intrinsic_value: primary.dcf.intrinsicValuePerShare ?? null,
          margin_of_safety:
            typeof primary.dcf.marginOfSafetyPct === 'number'
              ? `${formatPercent(primary.dcf.marginOfSafetyPct)} - ${primary.dcf.valuationLabel}`
              : primary.dcf.valuationLabel,
          fundamentals_score: primary.scores.fundamentals,
          technical_score: primary.scores.technical,
          sentiment_score: primary.scores.sentiment,
          risk_score: primary.scores.stockRisk,
        }
      : null,
    personalized_output: primary
      ? {
          fit_score: primary.scores.personalizedFit,
          recommendation: finalRecommendation.recommendation,
          suggested_allocation: `${formatCurrency(primary.allocation.baseAmountMonthly, displayCurrency, false)}/month`,
          suggested_allocation_security_currency:
            primary.allocation.baseCurrency === primary.allocation.securityCurrency
              ? null
              : `${formatCurrency(primary.allocation.securityAmountMonthly, primary.allocation.securityCurrency, false)}/month`,
          expected_holding_period: primary.expectedHoldingPeriod,
          tax_note: primary.taxImpact.note,
          key_reason: finalRecommendation.keyReason,
        }
      : {
          fit_score: null,
          recommendation: finalRecommendation.recommendation,
          suggested_allocation: `${formatCurrency(finalRecommendation.suggestedAllocationMonthly, displayCurrency, false)}/month`,
          expected_holding_period: finalRecommendation.holdingPeriod,
          tax_note: finalRecommendation.taxNote,
          key_reason: finalRecommendation.keyReason,
        },
  };
}

export async function generatePersonalizedAgenticAnalysis(
  input: AgenticFormInput,
  txns: PortfolioTxn[],
  options?: AgenticAnalysisOptions,
): Promise<AgenticAnalysisReport> {
  emitProgress(options, {
    phase: 'profile',
    analyzed: 0,
    total: 0,
    message: 'Validating profile input and computing household context.',
  });
  throwIfAborted(options?.signal);

  const normalizedInput = normalizeInput(input);
  validateAgenticInput(normalizedInput);

  const [holdings, fxSnapshot] = await Promise.all([
    deriveHoldings(txns),
    getUsdInrRate().catch(() => ({
      rate: Number.NaN,
      source: 'FX unavailable',
      timestamp: new Date().toISOString(),
      stale: true,
    })),
  ]);
  throwIfAborted(options?.signal);
  const usdInrRate =
    Number.isFinite(fxSnapshot.rate) && fxSnapshot.rate > 0 ? fxSnapshot.rate : Number.NaN;
  const baseCurrency = getDisplayCurrency(normalizedInput);
  const scoringWeights = normalizeScoringWeights(options?.memory?.scoringWeights);

  const finance = buildFinancialProfile(normalizedInput, holdings);
  const userProfileSummary = buildUserProfileSummary(normalizedInput, baseCurrency);

  emitProgress(options, {
    phase: 'cashflow',
    analyzed: 0,
    total: 0,
    message: `Cash-flow stress test complete: surplus ${formatCurrency(finance.investableSurplusMonthly, baseCurrency, false)}/month, debt burden ${formatPercent(finance.debtBurdenRatioPct)}.`,
  });
  throwIfAborted(options?.signal);

  const preferredMarket = resolveMarketScope(normalizedInput);
  emitProgress(options, {
    phase: 'universe',
    analyzed: 0,
    total: 0,
    message: `Loading universe for ${preferredMarket.toUpperCase()} scope.`,
  });
  throwIfAborted(options?.signal);
  const focusEntity =
    normalizedInput.analysisMode === 'specific' ? await findEntityByTicker(normalizedInput.targetTicker) : undefined;

  if (normalizedInput.analysisMode === 'specific' && !focusEntity) {
    throw new Error('Please enter a valid stock or mutual fund ticker/name (for India, US, or AMFI scheme code).');
  }

  const loadedUniverse = await loadRecommendationUniverse(preferredMarket);
  throwIfAborted(options?.signal);
  const candidateUniverse = loadedUniverse.entities.filter((entity) => {
    if (focusEntity && entity.symbol === focusEntity.symbol && entity.market === focusEntity.market) return false;
    return isSecurityInScope(entity, preferredMarket);
  });
  let deepAnalysisUniverse = selectCandidatesForDeepAnalysis(candidateUniverse, normalizedInput, finance, preferredMarket);
  if (normalizedInput.analysisMode === 'specific') {
    if (!normalizedInput.compareWithAlternatives) deepAnalysisUniverse = [];
    else deepAnalysisUniverse = deepAnalysisUniverse.slice(0, TOP_PER_POOL * 2);
  }

  const analysisContext = { baseCurrency, usdInrRate, scoringWeights };
  const totalAnalysisCount = deepAnalysisUniverse.length + (focusEntity ? 1 : 0);
  let analyzedCount = 0;
  emitProgress(options, {
    phase: focusEntity ? 'focus' : 'analysis',
    analyzed: analyzedCount,
    total: Math.max(totalAnalysisCount, 1),
    screenedTotal: candidateUniverse.length,
    deepAnalyzed: analyzedCount,
    deepTotal: Math.max(totalAnalysisCount, 1),
    message: focusEntity
      ? `Screened ${candidateUniverse.length} eligible securities. Analysing stocks and mutual funds deeply...`
      : `Screened ${candidateUniverse.length} eligible securities. Analysing stocks and mutual funds deeply...`,
  });
  throwIfAborted(options?.signal);

  const focusStock = focusEntity
    ? await analyzeStock(focusEntity, normalizedInput, finance, analysisContext)
    : undefined;
  if (focusStock) {
    analyzedCount += 1;
    emitProgress(options, {
      phase: 'analysis',
      analyzed: analyzedCount,
      total: Math.max(totalAnalysisCount, 1),
      screenedTotal: candidateUniverse.length,
      deepAnalyzed: analyzedCount,
      deepTotal: Math.max(totalAnalysisCount, 1),
      message: `Completed selected security ${focusStock.displaySymbol}.`,
    });
  }

  const analyzedCandidates: PersonalizedStockRecommendation[] = [];
  for (const entity of deepAnalysisUniverse) {
    throwIfAborted(options?.signal);
    const analyzed = await analyzeStock(entity, normalizedInput, finance, analysisContext);
    analyzedCandidates.push(analyzed);
    analyzedCount += 1;
    emitProgress(options, {
      phase: 'analysis',
      analyzed: analyzedCount,
      total: Math.max(totalAnalysisCount, 1),
      screenedTotal: candidateUniverse.length,
      deepAnalyzed: analyzedCount,
      deepTotal: Math.max(totalAnalysisCount, 1),
      message: `Screened ${candidateUniverse.length} total. Analysing stocks and mutual funds deeply...`,
    });
  }

  emitProgress(options, {
    phase: 'sentiment',
    analyzed: analyzedCount,
    total: Math.max(totalAnalysisCount, 1),
    screenedTotal: candidateUniverse.length,
    deepAnalyzed: analyzedCount,
    deepTotal: Math.max(totalAnalysisCount, 1),
    message: 'Synthesizing news sentiment, headline polarity, and narrative drivers.',
  });
  await holdProgressPhase(options);
  throwIfAborted(options?.signal);

  emitProgress(options, {
    phase: 'scoring',
    analyzed: analyzedCount,
    total: Math.max(totalAnalysisCount, 1),
    screenedTotal: candidateUniverse.length,
    deepAnalyzed: analyzedCount,
    deepTotal: Math.max(totalAnalysisCount, 1),
    message: 'Ranking candidates and applying risk policy guardrails.',
  });
  await holdProgressPhase(options);
  throwIfAborted(options?.signal);

  const rankedAllCandidates = analyzedCandidates
    .slice()
    .sort((left, right) => right.scores.personalizedFit - left.scores.personalizedFit);
  const topPools = {
    indiaStocks: rankedAllCandidates
      .filter((candidate) => candidate.securityType === 'stock' && candidate.market === 'india')
      .slice(0, TOP_PER_POOL),
    usStocks: rankedAllCandidates
      .filter((candidate) => candidate.securityType === 'stock' && candidate.market === 'us')
      .slice(0, TOP_PER_POOL),
    mutualFunds: rankedAllCandidates
      .filter((candidate) => candidate.securityType === 'mutual_fund')
      .slice(0, TOP_PER_POOL),
  };
  let stockRecommendations = [
    ...topPools.indiaStocks,
    ...topPools.usStocks,
    ...topPools.mutualFunds,
  ]
    .sort((left, right) => right.scores.personalizedFit - left.scores.personalizedFit)
    .slice(0, MAX_DISPLAYED_RECOMMENDATIONS);
  if (focusStock) {
    const hasFocusInRecommendations = stockRecommendations.some(
      (candidate) => candidate.symbol === focusStock.symbol && candidate.market === focusStock.market,
    );
    if (!hasFocusInRecommendations) {
      stockRecommendations = [focusStock, ...stockRecommendations]
        .sort((left, right) => right.scores.personalizedFit - left.scores.personalizedFit)
        .slice(0, MAX_DISPLAYED_RECOMMENDATIONS);
    }
  }
  if (!stockRecommendations.length && focusStock) stockRecommendations = [focusStock];

  const finalRecommendation = buildFinalRecommendation(
    normalizedInput,
    finance,
    normalizedInput.analysisMode === 'specific' ? focusStock : undefined,
    stockRecommendations,
  );
  const primary = focusStock ?? stockRecommendations[0];

  const executionTrail = [
    {
      phase: 'Phase 1',
      headline: 'Personal profile captured',
      detail: `Mapped demographics, cash flow, liabilities, emergency cover, goals, and risk preference before evaluating any security.`,
    },
    {
      phase: 'Phase 2',
      headline: 'Cash-flow and debt stress tested',
      detail: `Investable surplus is ${formatCurrency(finance.investableSurplusMonthly, baseCurrency, false)}/month with debt burden at ${formatPercent(finance.debtBurdenRatioPct)} and risk profile ${finance.riskProfileLabel}.`,
    },
    {
      phase: 'Phase 3',
      headline: 'Market universe screened',
      detail:
        normalizedInput.analysisMode === 'specific'
          ? normalizedInput.compareWithAlternatives
            ? `Screened ${candidateUniverse.length} eligible securities and built a curated comparison set around the selected ticker.`
            : `Screened ${candidateUniverse.length} eligible securities and focused only on the selected ticker.`
          : `Screened ${candidateUniverse.length} eligible securities and built a curated shortlist for deep modeling.`,
    },
    {
      phase: 'Phase 4',
      headline: 'Deep security analysis completed',
      detail:
        normalizedInput.analysisMode === 'specific'
          ? `Analyzed the selected security first${normalizedInput.compareWithAlternatives ? ', then compared it against the curated shortlist' : ''} on fundamentals, technicals, risk, and valuation.`
          : `Each shortlisted name was analyzed on fundamentals, technicals, risk, and DCF where available.`,
    },
    {
      phase: 'Phase 5',
      headline: 'News sentiment synthesized',
      detail: `Headline polarity, analyst tone, and narrative drivers were blended into BUY/HOLD/SELL sentiment probabilities per security.`,
    },
    {
      phase: 'Phase 6',
      headline: 'Personalized fit scoring applied',
      detail: `Risk compatibility, portfolio gap, and life-stage fit were layered on top of security quality to create a person-specific score.`,
    },
    {
      phase: 'Phase 7',
      headline: 'Recommendation drafted',
      detail: `Final recommendation, allocation band, expected holding period, and caution points were generated from the top-ranked candidate set.`,
    },
    {
      phase: 'Phase 8',
      headline: 'Actionable output generated',
      detail: `Produced top 10 India stocks, top 10 US stocks, and top 10 mutual funds with allocation guidance, holding period, and tax-aware notes.`,
    },
  ];

  const notes = [
    `Universe screening reviewed ${candidateUniverse.length} eligible securities. Deep modeling then focused on a curated shortlist to balance breadth and runtime.`,
    loadedUniverse.source === 'live_index'
      ? 'This run used the live searchable market index (all stocks + mutual funds), then applied a shortlist before deep scoring.'
      : loadedUniverse.source === 'mixed_live_demo'
        ? `Universe used mixed sources: ${Object.entries(loadedUniverse.marketSources)
            .map(([market, source]) => `${market.toUpperCase()}: ${source === 'live_index' ? 'live' : 'demo fallback'}`)
            .join(', ')}.`
      : 'Live market index was unavailable for this run, so the engine fell back to the bundled demo universe.',
    'Sentiment and narrative fields are generated through a deterministic heuristic model by default unless an external LLM provider is explicitly configured.',
    Number.isFinite(usdInrRate)
      ? `Base currency for planning is ${baseCurrency}; cross-market allocations are converted using USD/INR ${round(usdInrRate, 4)}.`
      : `Base currency for planning is ${baseCurrency}; live FX was unavailable, so cross-currency amounts are shown without conversion.`,
    'Tax rates shown here are illustrative planning estimates tied to the user-entered effective tax rate. Actual capital-gains taxation depends on jurisdiction, holding period, and prevailing law.',
    finance.debtBurdenFlag === 'High'
      ? 'High debt burden is active, so aggressive high-volatility names are intentionally capped in the fit scoring.'
      : 'Debt burden is not currently the main constraint in the fit scoring.',
    loadedUniverse.truncated
      ? 'Universe fetch hit the configured scan cap for at least one market, so this run is broad but not exhaustive.'
      : 'Universe fetch completed within configured scan limits for this run.',
  ];

  emitProgress(options, {
    phase: 'finalizing',
    analyzed: analyzedCount,
    total: Math.max(totalAnalysisCount, 1),
    screenedTotal: candidateUniverse.length,
    deepAnalyzed: analyzedCount,
    deepTotal: Math.max(totalAnalysisCount, 1),
    message: 'Assembling final recommendation and export payload.',
  });
  await holdProgressPhase(options);
  throwIfAborted(options?.signal);

  const report: AgenticAnalysisReport = {
    generatedAt: new Date().toISOString(),
    engineType: 'Agentic Orchestrator (Rules + Heuristic AI)',
    baseCurrency,
    fxContext: {
      usdInrRate: Number.isFinite(usdInrRate) ? round(usdInrRate, 6) : 0,
      source: fxSnapshot.source ?? 'Reference FX rate',
      timestamp: fxSnapshot.timestamp ?? new Date().toISOString(),
      stale: !!fxSnapshot.stale,
    },
    userProfileSummary,
    finance,
    focusStock,
    stockRecommendations,
    topPools,
    recommendationUniverse: {
      totalStocksInDataset: loadedUniverse.stockCount,
      totalMutualFundsInDataset: loadedUniverse.mutualFundCount,
      eligibleStocks: candidateUniverse.filter((entity) => entity.type === 'stock').length,
      eligibleMutualFunds: candidateUniverse.filter((entity) => entity.type === 'mutual_fund').length,
      analyzedSecurities: analyzedCandidates.length + (focusStock ? 1 : 0),
      analyzedIndiaStocks:
        analyzedCandidates.filter((entity) => entity.securityType === 'stock' && entity.market === 'india').length +
        (focusStock?.securityType === 'stock' && focusStock.market === 'india' ? 1 : 0),
      analyzedUsStocks:
        analyzedCandidates.filter((entity) => entity.securityType === 'stock' && entity.market === 'us').length +
        (focusStock?.securityType === 'stock' && focusStock.market === 'us' ? 1 : 0),
      analyzedMutualFunds:
        analyzedCandidates.filter((entity) => entity.securityType === 'mutual_fund').length +
        (focusStock?.securityType === 'mutual_fund' ? 1 : 0),
      displayedStocks: stockRecommendations.length,
      marketScope: preferredMarket,
      analysisMode: normalizedInput.analysisMode,
      universeSource: loadedUniverse.source,
      universeTruncated: loadedUniverse.truncated,
    },
    scoringWeights,
    agentPipeline: [
      {
        agent: 'Planner',
        status: 'completed',
        summary: `Profile mapped for ${normalizedInput.investmentGoal.replace(/_/g, ' ')} with ${finance.riskProfileLabel.toLowerCase()} risk stance.`,
      },
      {
        agent: 'Data Collector',
        status: loadedUniverse.source === 'demo_fallback' ? 'watch' : 'completed',
        summary:
          loadedUniverse.source === 'mixed_live_demo'
            ? 'Universe loaded with mixed live/demo sources; freshness guardrails active.'
            : loadedUniverse.source === 'demo_fallback'
              ? 'Live universe unavailable, running demo-fallback inputs.'
              : 'Universe and market channels loaded from live index feeds.',
      },
      {
        agent: 'Scorer',
        status: 'completed',
        summary: `Weighted fit using Quality ${round(scoringWeights.stockQuality * 100, 0)}%, Risk ${round(scoringWeights.riskCompatibility * 100, 0)}%, Portfolio ${round(scoringWeights.portfolioFit * 100, 0)}%, Life-stage ${round(scoringWeights.lifeStageFit * 100, 0)}%.`,
      },
      {
        agent: 'Risk Critic',
        status: finalRecommendation.recommendation === 'HOLD CASH' ? 'blocked' : 'completed',
        summary:
          finalRecommendation.recommendation === 'HOLD CASH'
            ? 'Guardrail blocked deployment due to low confidence/freshness.'
            : 'Risk policy accepted recommendation within household constraints.',
      },
      {
        agent: 'Action Writer',
        status: 'completed',
        summary: `Action plan generated for ${finalRecommendation.subject} with ${formatCurrency(finalRecommendation.suggestedAllocationMonthly, baseCurrency, false)}/month guidance.`,
      },
    ],
    finalRecommendation,
    executionTrail,
    notes,
    exportJson: buildExportJson(normalizedInput, finance, primary, finalRecommendation, baseCurrency),
  };

  emitProgress(options, {
    phase: 'completed',
    analyzed: Math.max(totalAnalysisCount, analyzedCount),
    total: Math.max(totalAnalysisCount, 1),
    screenedTotal: candidateUniverse.length,
    deepAnalyzed: Math.max(totalAnalysisCount, analyzedCount),
    deepTotal: Math.max(totalAnalysisCount, 1),
    message: 'Analysis completed.',
  });
  await holdProgressPhase(options, 320);

  return report;
}

export const personalizedEngineTestables = {
  normalizeInput,
  resolveMarketScope,
  validateAgenticInput,
  buildFinancialProfile,
  convertCurrency,
  classifyFreshness,
};
