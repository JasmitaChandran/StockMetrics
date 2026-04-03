'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Bot,
  BrainCircuit,
  Briefcase,
  Download,
  HeartPulse,
  History,
  Landmark,
  LineChart,
  Loader2,
  PiggyBank,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Wallet,
} from 'lucide-react';
import { SectionCard } from '@/components/common/section-card';
import { demoUniverse } from '@/lib/data/mock/demo-data';
import {
  type AgentMarketScope,
  type AgenticAnalysisReport,
  type AgenticProgressTelemetry,
  type AgenticFormInput,
  type AssetBreakdownInput,
  type CountryCode,
  type EmploymentType,
  type InvestmentGoal,
  type InvestmentHorizon,
  type LiquidityNeed,
  type LoanInput,
  type MaritalStatus,
  type RetirementBreakdownInput,
  type RiskPreference,
  type ScoringWeights,
  generatePersonalizedAgenticAnalysis,
} from '@/lib/agentic/personalized-engine';
import { downloadPersonalizedReportPdf } from '@/lib/agentic/report-pdf';
import { getKv, listPortfolioTxns, setKv } from '@/lib/storage/repositories';
import type { PortfolioTxn } from '@/lib/storage/idb';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDateTime, formatNumber, formatPercent } from '@/lib/utils/format';

const PROFILE_STORAGE_KEY = 'agentic:financial-profile:v2';
const REPORT_STORAGE_KEY = 'agentic:last-report:v2';
const LEARNING_MEMORY_KEY = 'agentic:learning-memory:v1';
const MONITORING_SETTINGS_KEY = 'agentic:monitoring-settings:v1';
const AUTOSAVE_DEBOUNCE_MS = 450;

const MARITAL_OPTIONS: Array<{ value: MaritalStatus; label: string }> = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
];

const EMPLOYMENT_OPTIONS: Array<{ value: EmploymentType; label: string }> = [
  { value: 'salaried', label: 'Salaried' },
  { value: 'self_employed', label: 'Self-employed' },
  { value: 'business_owner', label: 'Business owner' },
];

const GOAL_OPTIONS: Array<{ value: InvestmentGoal; label: string }> = [
  { value: 'wealth_creation', label: 'Wealth creation' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'child_education', label: 'Child education' },
  { value: 'house_purchase', label: 'House purchase' },
  { value: 'income', label: 'Income generation' },
];

const HORIZON_OPTIONS: Array<{ value: InvestmentHorizon; label: string }> = [
  { value: 'short', label: 'Short (<3 years)' },
  { value: 'medium', label: 'Medium (3-7 years)' },
  { value: 'long', label: 'Long (7+ years)' },
];

const RISK_OPTIONS: Array<{ value: RiskPreference; label: string }> = [
  { value: 'conservative', label: 'Conservative' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'aggressive', label: 'Aggressive' },
];

const LIQUIDITY_OPTIONS: Array<{ value: LiquidityNeed; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const COUNTRY_OPTIONS: Array<{ value: CountryCode; label: string; country: string; currency: 'INR' | 'USD' }> = [
  { value: 'IN', label: 'India', country: 'India', currency: 'INR' },
  { value: 'US', label: 'United States', country: 'United States', currency: 'USD' },
];

const MARKET_SCOPE_OPTIONS: Array<{ value: AgentMarketScope; label: string }> = [
  { value: 'india', label: 'India + Mutual Funds' },
  { value: 'us', label: 'US only' },
  { value: 'both', label: 'India + US + Mutual Funds' },
];

const LOAN_TYPE_OPTIONS: Array<{ value: LoanInput['type']; label: string }> = [
  { value: 'home', label: 'Home loan' },
  { value: 'car', label: 'Car loan' },
  { value: 'education', label: 'Education loan' },
  { value: 'personal', label: 'Personal loan' },
  { value: 'other', label: 'Other' },
];

const PROFILE_STEPS = [
  { id: 1, title: 'Basics' },
  { id: 2, title: 'Assets & Loans' },
  { id: 3, title: 'Goals & Scope' },
  { id: 4, title: 'Review & Run' },
] as const;

const PROCESSING_STEPS = [
  {
    title: 'Building your financial profile',
    detail: 'Mapping age, dependents, income, expenses, and liabilities.',
  },
  {
    title: 'Stress-testing household cash flow',
    detail: 'Computing investable surplus, EMI burden, and emergency-fund gap.',
  },
  {
    title: 'Scanning stocks and funds against your profile',
    detail: 'Filtering ideas that do not match your market, risk, and life stage.',
  },
  {
    title: 'Running valuation and risk models',
    detail: 'Blending DCF, technicals, sentiment, and stock-level risk signals.',
  },
  {
    title: 'Preparing the final recommendation',
    detail: 'Translating fit score into allocation, holding period, and next action.',
  },
] as const;

function createBlankLoan(): LoanInput {
  return {
    id: crypto.randomUUID(),
    type: 'home',
    outstandingAmount: 0,
    monthlyEmi: 0,
    interestRate: 0,
  };
}

function createDefaultForm(): AgenticFormInput {
  return {
    analysisMode: 'suggest',
    targetTicker: '',
    age: 0,
    maritalStatus: 'single',
    dependentsKids: 0,
    dependentsParents: 0,
    employmentType: 'salaried',
    monthlyIncome: 0,
    monthlyFixedExpenses: 0,
    monthlyDiscretionaryExpenses: 0,
    effectiveTaxRate: 0,
    assets: {
      equity: 0,
      debt: 0,
      gold: 0,
      realEstate: 0,
      cash: 0,
      alternatives: 0,
    },
    retirement: {
      epf: 0,
      ppf: 0,
      nps: 0,
      other: 0,
    },
    loans: [],
    emergencyFundMonths: 0,
    investmentGoal: 'wealth_creation',
    investmentHorizon: 'medium',
    riskPreference: 'moderate',
    expectedReturnTarget: 0,
    liquidityNeed: 'medium',
    country: 'India',
    countryCode: 'IN',
    marketScope: 'both',
    compareWithAlternatives: true,
  };
}

const PROFILE_TEMPLATES: Array<{ id: string; label: string; description: string; values: Partial<AgenticFormInput> }> = [
  {
    id: 'blank',
    label: 'Blank',
    description: 'Start with neutral defaults and enter your own numbers.',
    values: createDefaultForm(),
  },
  {
    id: 'india_salaried',
    label: 'India Salaried',
    description: 'Example starting point for salaried profile in India.',
    values: {
      country: 'India',
      countryCode: 'IN',
      marketScope: 'india',
      employmentType: 'salaried',
      investmentHorizon: 'long',
      riskPreference: 'moderate',
      effectiveTaxRate: 20,
      expectedReturnTarget: 12,
    },
  },
  {
    id: 'us_global',
    label: 'US Global',
    description: 'Example starting point for US-based investor with global scope.',
    values: {
      country: 'United States',
      countryCode: 'US',
      marketScope: 'both',
      employmentType: 'salaried',
      investmentHorizon: 'long',
      riskPreference: 'moderate',
      effectiveTaxRate: 22,
      expectedReturnTarget: 10,
    },
  },
];

interface SavedProfileDraft {
  form: Partial<AgenticFormInput>;
  profileStep?: number;
  updatedAt?: string;
}

interface LearningMemoryState {
  runCount: number;
  scoringWeights: Partial<ScoringWeights>;
  lastOutcomeNote?: string;
  updatedAt?: string;
}

interface MonitoringSettings {
  enabled: boolean;
  autoRerun: boolean;
  priceMoveTriggerPct: number;
  checkIntervalSeconds: number;
  earningsNewsTrigger: boolean;
}

interface MonitoringAlertState {
  at: string;
  summary: string;
  symbols: string[];
  autoRerunTriggered: boolean;
}

interface ChangeAuditSummary {
  title: string;
  highlights: string[];
  causalFactors: string[];
}

const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  stockQuality: 0.4,
  riskCompatibility: 0.25,
  portfolioFit: 0.2,
  lifeStageFit: 0.15,
};

const DEFAULT_LEARNING_MEMORY: LearningMemoryState = {
  runCount: 0,
  scoringWeights: DEFAULT_SCORING_WEIGHTS,
  lastOutcomeNote: 'No prior run outcome available yet.',
};

const DEFAULT_MONITORING_SETTINGS: MonitoringSettings = {
  enabled: false,
  autoRerun: false,
  priceMoveTriggerPct: 8,
  checkIntervalSeconds: 300,
  earningsNewsTrigger: true,
};

function parseSavedDraft(value: unknown): SavedProfileDraft | undefined {
  if (!value || typeof value !== 'object') return undefined;
  if ('form' in value && typeof (value as { form?: unknown }).form === 'object') {
    const typed = value as SavedProfileDraft;
    return {
      form: typed.form ?? {},
      profileStep: typeof typed.profileStep === 'number' ? typed.profileStep : undefined,
      updatedAt: typeof typed.updatedAt === 'string' ? typed.updatedAt : undefined,
    };
  }
  return {
    form: value as Partial<AgenticFormInput>,
  };
}

function hydrateForm(value: Partial<AgenticFormInput> | undefined): AgenticFormInput {
  const defaults = createDefaultForm();
  if (!value) return defaults;
  return {
    ...defaults,
    ...value,
    assets: {
      ...defaults.assets,
      ...(value.assets ?? {}),
    },
    retirement: {
      ...defaults.retirement,
      ...(value.retirement ?? {}),
    },
    loans: Array.isArray(value.loans)
      ? value.loans.map((loan) => ({
          ...createBlankLoan(),
          ...loan,
        }))
      : defaults.loans,
  };
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

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

function getDisplayCurrency(input: Pick<AgenticFormInput, 'countryCode' | 'country'>): 'INR' | 'USD' {
  if (input.countryCode === 'US') return 'USD';
  if (input.countryCode === 'IN') return 'INR';
  return /india/i.test(input.country) ? 'INR' : 'USD';
}

function validateFormInput(form: AgenticFormInput): string | null {
  if (form.monthlyIncome <= 0) return 'Monthly income must be greater than 0.';
  if (form.monthlyFixedExpenses < 0 || form.monthlyDiscretionaryExpenses < 0) {
    return 'Expenses cannot be negative.';
  }
  const nonNegativePool = [
    ...Object.values(form.assets),
    ...Object.values(form.retirement),
    ...form.loans.flatMap((loan) => [loan.outstandingAmount, loan.monthlyEmi, loan.interestRate]),
  ];
  if (nonNegativePool.some((value) => value < 0)) {
    return 'Assets, retirement, and loan values must be non-negative.';
  }
  if (form.effectiveTaxRate < 0 || form.effectiveTaxRate > 60) return 'Effective tax rate must be between 0% and 60%.';
  if (form.expectedReturnTarget < 0 || form.expectedReturnTarget > 40) return 'Expected return target must be between 0% and 40%.';
  if (form.dependentsKids < 0 || form.dependentsKids > 10 || form.dependentsParents < 0 || form.dependentsParents > 10) {
    return 'Dependents must be between 0 and 10 for kids and parents.';
  }
  if (form.emergencyFundMonths < 0 || form.emergencyFundMonths > 36) return 'Emergency fund coverage must be between 0 and 36 months.';
  return null;
}

function recommendationType(item: { securityType?: 'stock' | 'mutual_fund'; market: 'india' | 'us' | 'mf' }) {
  if (item.securityType) return item.securityType;
  return item.market === 'mf' ? 'mutual_fund' : 'stock';
}

function phaseIndex(progress: AgenticProgressTelemetry | null) {
  switch (progress?.phase) {
    case 'profile':
      return 0;
    case 'universe':
      return 1;
    case 'focus':
    case 'analysis':
      return 2;
    case 'scoring':
      return 3;
    case 'finalizing':
    case 'completed':
      return 4;
    default:
      return 0;
  }
}

function progressPercent(progress: AgenticProgressTelemetry | null) {
  if (!progress) return 0;
  if (progress.total > 0) {
    return Math.max(5, Math.min(100, Math.round((progress.analyzed / progress.total) * 100)));
  }
  return Math.round(((phaseIndex(progress) + 1) / PROCESSING_STEPS.length) * 100);
}

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatEta(progress: AgenticProgressTelemetry | null, elapsedMs: number) {
  if (!progress || progress.total <= 0 || progress.analyzed <= 0 || progress.analyzed >= progress.total) return null;
  const secondsPerItem = elapsedMs / 1000 / progress.analyzed;
  const remainingSeconds = Math.round(secondsPerItem * (progress.total - progress.analyzed));
  if (!Number.isFinite(remainingSeconds) || remainingSeconds <= 0) return null;
  const etaMs = remainingSeconds * 1000;
  return formatElapsed(etaMs);
}

function freshnessBadgeClass(freshness: string) {
  if (freshness === 'Live') return 'border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300';
  if (freshness === 'Delayed') return 'border-amber-300 bg-amber-500/10 text-amber-700 dark:border-amber-800 dark:text-amber-300';
  return 'border-rose-300 bg-rose-500/10 text-rose-700 dark:border-rose-900/50 dark:text-rose-300';
}

function metricTitle(
  label: string,
  freshness: string,
  provenance?: {
    source?: string;
    timestamp?: string;
    fallbackReason?: string;
  },
) {
  const bits = [
    `${label}: ${freshness}`,
    provenance?.source ? `Source: ${provenance.source}` : null,
    provenance?.timestamp ? `Updated: ${formatDateTime(provenance.timestamp)}` : null,
    provenance?.fallbackReason ? `Fallback: ${provenance.fallbackReason}` : null,
  ].filter(Boolean);
  return bits.join('\n');
}

function normalizeScoringWeights(weights?: Partial<ScoringWeights>): ScoringWeights {
  const merged = { ...DEFAULT_SCORING_WEIGHTS, ...(weights ?? {}) };
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

function collectClarificationPrompts(form: AgenticFormInput) {
  const prompts: string[] = [];
  const totalEmi = sum(form.loans.map((loan) => loan.monthlyEmi));
  const debtBurdenPct = form.monthlyIncome > 0 ? (totalEmi / form.monthlyIncome) * 100 : 0;
  if (form.riskPreference === 'aggressive' && (debtBurdenPct > 35 || form.emergencyFundMonths < 3)) {
    prompts.push('Risk preference is aggressive, but debt/emergency profile suggests tighter risk capacity. Continue as aggressive?');
  }
  if (form.investmentHorizon === 'short' && form.expectedReturnTarget > 14) {
    prompts.push('Short horizon with high return target can cause unstable outcomes. Reduce target or extend horizon?');
  }
  if (form.investmentGoal === 'income' && form.riskPreference === 'aggressive') {
    prompts.push('Income goal is selected with aggressive risk. Should we shift to moderate income-first scoring?');
  }
  if (form.age >= 55 && form.riskPreference === 'aggressive') {
    prompts.push('Age profile indicates lower drawdown tolerance. Confirm that aggressive risk is intentional.');
  }
  return prompts;
}

function updateLearningMemoryFromOutcome(
  current: LearningMemoryState,
  previousReport: AgenticAnalysisReport | null,
  nextReport: AgenticAnalysisReport,
): LearningMemoryState {
  const prevPrimary = previousReport?.focusStock ?? previousReport?.stockRecommendations?.[0];
  const nextPrimary = nextReport.focusStock ?? nextReport.stockRecommendations[0];
  const base = normalizeScoringWeights(current.scoringWeights);
  let working = { ...base };
  let note = 'No reliable prior outcome signal; retained current scoring blend.';

  if (
    prevPrimary &&
    nextPrimary &&
    prevPrimary.symbol === nextPrimary.symbol &&
    prevPrimary.market === nextPrimary.market &&
    typeof prevPrimary.marketPrice === 'number' &&
    prevPrimary.marketPrice > 0 &&
    typeof nextPrimary.marketPrice === 'number'
  ) {
    const deltaPct = ((nextPrimary.marketPrice - prevPrimary.marketPrice) / prevPrimary.marketPrice) * 100;
    const prevReco = previousReport?.finalRecommendation.recommendation ?? prevPrimary.recommendation;

    if (/BUY/i.test(prevReco) && deltaPct < -4) {
      working.riskCompatibility += 0.04;
      working.stockQuality -= 0.03;
      working.lifeStageFit += 0.01;
      note = `Prior BUY on ${prevPrimary.displaySymbol} moved ${deltaPct.toFixed(1)}%; increased risk weight defensively.`;
    } else if (/BUY/i.test(prevReco) && deltaPct > 4) {
      working.stockQuality += 0.04;
      working.riskCompatibility -= 0.02;
      working.portfolioFit -= 0.02;
      note = `Prior BUY on ${prevPrimary.displaySymbol} moved ${deltaPct.toFixed(1)}%; increased quality weight.`;
    } else if (/AVOID|HOLD CASH/i.test(prevReco) && deltaPct > 6) {
      working.stockQuality += 0.03;
      working.riskCompatibility -= 0.02;
      working.portfolioFit -= 0.01;
      note = `Prior ${prevReco} missed a ${deltaPct.toFixed(1)}% move; nudged toward quality signals.`;
    } else if (/AVOID|HOLD CASH/i.test(prevReco) && deltaPct < -6) {
      working.riskCompatibility += 0.03;
      working.lifeStageFit += 0.01;
      working.stockQuality -= 0.04;
      note = `Prior ${prevReco} avoided a ${Math.abs(deltaPct).toFixed(1)}% drop; reinforced risk/life-stage emphasis.`;
    }
  }

  const normalized = normalizeScoringWeights(working);
  return {
    runCount: (current.runCount ?? 0) + 1,
    scoringWeights: normalized,
    lastOutcomeNote: note,
    updatedAt: new Date().toISOString(),
  };
}

function buildChangeAudit(previousReport: AgenticAnalysisReport | null, currentReport: AgenticAnalysisReport | null): ChangeAuditSummary | null {
  if (!previousReport || !currentReport) return null;
  const prevPrimary = previousReport.focusStock ?? previousReport.stockRecommendations[0];
  const nextPrimary = currentReport.focusStock ?? currentReport.stockRecommendations[0];
  if (!prevPrimary || !nextPrimary) return null;

  const highlights: string[] = [];
  if (prevPrimary.symbol !== nextPrimary.symbol || prevPrimary.market !== nextPrimary.market) {
    highlights.push(`Primary changed from ${prevPrimary.displaySymbol} to ${nextPrimary.displaySymbol}.`);
  }
  highlights.push(`Recommendation: ${previousReport.finalRecommendation.recommendation} → ${currentReport.finalRecommendation.recommendation}.`);
  highlights.push(`Fit score: ${prevPrimary.scores.personalizedFit} → ${nextPrimary.scores.personalizedFit}.`);
  highlights.push(
    `Allocation: ${formatCurrency(previousReport.finalRecommendation.suggestedAllocationMonthly, currentReport.baseCurrency)} → ${formatCurrency(currentReport.finalRecommendation.suggestedAllocationMonthly, currentReport.baseCurrency)} / month.`,
  );

  const causalFactors: string[] = [];
  if (previousReport.userProfileSummary.riskPreference !== currentReport.userProfileSummary.riskPreference) {
    causalFactors.push(`Risk preference changed (${previousReport.userProfileSummary.riskPreference} → ${currentReport.userProfileSummary.riskPreference}).`);
  }
  if (previousReport.finance.debtBurdenFlag !== currentReport.finance.debtBurdenFlag) {
    causalFactors.push(`Debt burden flag changed (${previousReport.finance.debtBurdenFlag} → ${currentReport.finance.debtBurdenFlag}).`);
  }
  if (previousReport.recommendationUniverse.universeSource !== currentReport.recommendationUniverse.universeSource) {
    causalFactors.push(`Data source changed (${previousReport.recommendationUniverse.universeSource} → ${currentReport.recommendationUniverse.universeSource}).`);
  }
  if (prevPrimary.dataFreshness.quote !== nextPrimary.dataFreshness.quote || prevPrimary.dataFreshness.fundamentals !== nextPrimary.dataFreshness.fundamentals) {
    causalFactors.push('Data freshness profile changed for quote/fundamentals between runs.');
  }
  if (!causalFactors.length) causalFactors.push('Primary drivers were score shifts from refreshed market and sentiment inputs.');

  return {
    title: 'Why this changed from last run',
    highlights,
    causalFactors,
  };
}

function inferRecommendationUniverse(report: Pick<AgenticAnalysisReport, 'stockRecommendations' | 'focusStock'>) {
  const stockUniverse = demoUniverse.filter((entity) => entity.type === 'stock');
  const mutualFundUniverse = demoUniverse.filter((entity) => entity.type === 'mutual_fund');
  const markets = new Set(
    [
      ...(report.focusStock ? [report.focusStock.market] : []),
      ...report.stockRecommendations.map((stock) => stock.market),
    ].filter(Boolean),
  );

  const marketScope: 'india' | 'us' | 'both' =
    markets.size > 1 ? 'both' : markets.has('us') ? 'us' : 'india';
  const eligibleStocks =
    marketScope === 'both'
      ? stockUniverse.length
      : stockUniverse.filter((entity) => entity.market === marketScope).length;
  const eligibleMutualFunds = marketScope === 'us' ? 0 : mutualFundUniverse.length;

  return {
    totalStocksInDataset: stockUniverse.length,
    totalMutualFundsInDataset: mutualFundUniverse.length,
    eligibleStocks,
    eligibleMutualFunds,
    analyzedSecurities: report.stockRecommendations.length,
    analyzedIndiaStocks: report.stockRecommendations.filter((item) => recommendationType(item) === 'stock' && item.market === 'india').length,
    analyzedUsStocks: report.stockRecommendations.filter((item) => recommendationType(item) === 'stock' && item.market === 'us').length,
    analyzedMutualFunds: report.stockRecommendations.filter((item) => recommendationType(item) === 'mutual_fund').length,
    displayedStocks: report.stockRecommendations.length,
    marketScope,
    analysisMode: 'suggest' as const,
    universeSource: 'demo_fallback' as const,
    universeTruncated: false,
  };
}

function normalizeSavedReport(report: AgenticAnalysisReport | undefined): AgenticAnalysisReport | undefined {
  if (!report) return undefined;
  const reportBaseCurrency =
    report.baseCurrency ??
    report.userProfileSummary.baseCurrency ??
    report.focusStock?.currency ??
    report.stockRecommendations[0]?.currency ??
    'INR';
  const normalizedWeights = normalizeScoringWeights(report.scoringWeights);
  const normalizeRecommendation = (
    item: AgenticAnalysisReport['stockRecommendations'][number],
  ): AgenticAnalysisReport['stockRecommendations'][number] => ({
    ...item,
    scores: {
      ...item.scores,
      weightedContributions:
        item.scores.weightedContributions ??
        {
          stockQuality: Number((item.scores.stockQuality * normalizedWeights.stockQuality).toFixed(1)),
          riskCompatibility: Number((item.scores.riskCompatibility * normalizedWeights.riskCompatibility).toFixed(1)),
          portfolioFit: Number((item.scores.portfolioFit * normalizedWeights.portfolioFit).toFixed(1)),
          lifeStageFit: Number((item.scores.lifeStageFit * normalizedWeights.lifeStageFit).toFixed(1)),
        },
    },
    dataFreshness:
      item.dataFreshness ??
      ({
        quote: 'Demo fallback',
        history: 'Demo fallback',
        fundamentals: 'Demo fallback',
        news: 'Demo fallback',
        dcf: item.dcf.valuationLabel === 'Insufficient Data' ? 'Demo fallback' : 'Delayed',
      } as const),
    confidence:
      item.confidence ??
      {
        score: 45,
        label: 'Low',
        fitLow: Math.max(0, item.scores.personalizedFit - 12),
        fitHigh: Math.min(100, item.scores.personalizedFit + 8),
        uncertaintyPct: 24,
        reasons: ['Confidence metadata is unavailable for this saved run.'],
      },
    provenance:
      item.provenance ??
      {
        quote: { source: 'Unknown', freshness: item.dataFreshness?.quote ?? 'Demo fallback' },
        history: { source: 'Unknown', freshness: item.dataFreshness?.history ?? 'Demo fallback' },
        fundamentals: { source: 'Unknown', freshness: item.dataFreshness?.fundamentals ?? 'Demo fallback' },
        news: { source: 'Unknown', freshness: item.dataFreshness?.news ?? 'Demo fallback' },
        dcf: { source: 'Unknown', freshness: item.dataFreshness?.dcf ?? 'Demo fallback' },
      },
    allocation:
      item.allocation ??
      {
        baseCurrency: reportBaseCurrency,
        baseAmountMonthly: item.suggestedAllocationMonthly,
        securityCurrency: item.currency,
        securityAmountMonthly: item.suggestedAllocationMonthly,
        usdInrRate: 83,
      },
  });

  const inferred = inferRecommendationUniverse(report);
  const existing = report.recommendationUniverse as Partial<AgenticAnalysisReport['recommendationUniverse']> | undefined;
  const normalizedRecommendations = report.stockRecommendations.map(normalizeRecommendation);
  const normalizedFocus = report.focusStock ? normalizeRecommendation(report.focusStock) : undefined;
  const topPools =
    (report.topPools
      ? {
          indiaStocks: report.topPools.indiaStocks.map(normalizeRecommendation),
          usStocks: report.topPools.usStocks.map(normalizeRecommendation),
          mutualFunds: report.topPools.mutualFunds.map(normalizeRecommendation),
        }
      : undefined) ??
    ({
      indiaStocks: normalizedRecommendations
        .filter((item) => recommendationType(item) === 'stock' && item.market === 'india')
        .slice(0, 10),
      usStocks: normalizedRecommendations
        .filter((item) => recommendationType(item) === 'stock' && item.market === 'us')
        .slice(0, 10),
      mutualFunds: normalizedRecommendations.filter((item) => recommendationType(item) === 'mutual_fund').slice(0, 10),
    } as AgenticAnalysisReport['topPools']);
  return {
    ...report,
    engineType: report.engineType ?? 'Agentic Orchestrator (Rules + Heuristic AI)',
    baseCurrency: report.baseCurrency ?? reportBaseCurrency,
    fxContext: report.fxContext ?? {
      usdInrRate: 83,
      source: 'Reference FX rate',
      timestamp: report.generatedAt,
      stale: true,
    },
    focusStock: normalizedFocus,
    stockRecommendations: normalizedRecommendations,
    topPools,
    scoringWeights: normalizedWeights,
    agentPipeline:
      report.agentPipeline ??
      [
        { agent: 'Planner', status: 'completed', summary: 'Profile context prepared.' },
        { agent: 'Data Collector', status: 'watch', summary: 'Data channels loaded with mixed freshness.' },
        { agent: 'Scorer', status: 'completed', summary: 'Fit scores computed with weighted blend.' },
        { agent: 'Risk Critic', status: 'completed', summary: 'Risk and freshness guardrails evaluated.' },
        { agent: 'Action Writer', status: 'completed', summary: 'Action plan generated from current run.' },
      ],
    recommendationUniverse: {
      ...inferred,
      ...(existing ?? {}),
      totalMutualFundsInDataset: existing?.totalMutualFundsInDataset ?? inferred.totalMutualFundsInDataset,
      eligibleMutualFunds: existing?.eligibleMutualFunds ?? inferred.eligibleMutualFunds,
      analyzedSecurities: existing?.analyzedSecurities ?? inferred.analyzedSecurities,
      analyzedIndiaStocks: existing?.analyzedIndiaStocks ?? inferred.analyzedIndiaStocks,
      analyzedUsStocks: existing?.analyzedUsStocks ?? inferred.analyzedUsStocks,
      analyzedMutualFunds: existing?.analyzedMutualFunds ?? inferred.analyzedMutualFunds,
      universeSource: existing?.universeSource ?? inferred.universeSource,
      universeTruncated: existing?.universeTruncated ?? inferred.universeTruncated,
    },
  };
}

type AgentMissionStatus = 'ready' | 'watch' | 'blocked';

interface AgentMissionTask {
  id: string;
  title: string;
  status: AgentMissionStatus;
  action: string;
  reason: string;
  successSignal: string;
  cadence: string;
}

function missionStatusMeta(status: AgentMissionStatus) {
  if (status === 'ready') {
    return {
      label: 'Ready',
      className: 'border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300',
    };
  }
  if (status === 'watch') {
    return {
      label: 'Watch',
      className: 'border-amber-300 bg-amber-500/10 text-amber-700 dark:border-amber-800 dark:text-amber-300',
    };
  }
  return {
    label: 'Blocked',
    className: 'border-rose-300 bg-rose-500/10 text-rose-700 dark:border-rose-900/50 dark:text-rose-300',
  };
}

function buildAgentMissionPlan(
  report: AgenticAnalysisReport,
  primary: AgenticAnalysisReport['stockRecommendations'][number] | null,
  baseCurrency: 'INR' | 'USD',
): AgentMissionTask[] {
  const emergencyGap = Math.max(0, report.finance.emergencyFundShortfallValue);
  const investableSurplus = Math.max(0, report.finance.investableSurplusMonthly);
  const emergencyTopUp =
    emergencyGap > 0 ? Math.min(emergencyGap, Math.max(0, Math.round(investableSurplus * 0.35))) : 0;
  const suggestedAllocation = Math.max(0, report.finalRecommendation.suggestedAllocationMonthly);
  const deployableAllocation =
    emergencyGap > 0 && emergencyTopUp > 0 ? Math.max(0, suggestedAllocation - emergencyTopUp) : suggestedAllocation;
  const highDebt = report.finance.debtBurdenFlag === 'High';
  const riskMismatch = !!primary && report.finance.riskProfileLabel !== 'Aggressive' && primary.risk.level === 'High';
  const positionCapPct =
    report.finance.riskProfileLabel === 'Conservative' ? 8 : report.finance.riskProfileLabel === 'Moderate' ? 12 : 16;
  const goalLabel = report.userProfileSummary.investmentGoal.replace(/_/g, ' ');
  const primaryLabel = primary?.displaySymbol ?? report.finalRecommendation.subject;

  const emergencyStatus: AgentMissionStatus =
    emergencyGap <= 0 ? 'ready' : investableSurplus <= 0 ? 'blocked' : 'watch';

  const allocationStatus: AgentMissionStatus =
    suggestedAllocation <= 0 ? 'blocked' : highDebt && emergencyGap > 0 ? 'watch' : 'ready';

  const guardrailStatus: AgentMissionStatus = riskMismatch || highDebt ? 'watch' : 'ready';

  return [
    {
      id: 'emergency',
      title: 'Fund safety buffer first',
      status: emergencyStatus,
      action:
        emergencyStatus === 'ready'
          ? `Emergency target already met. Maintain at least ${report.finance.emergencyFundTargetMonths} months of core expenses in liquid assets.`
          : emergencyStatus === 'blocked'
            ? 'Investable surplus is constrained. Pause fresh risk allocation until monthly cash flow is positive again.'
            : `Route ${formatCurrency(emergencyTopUp, baseCurrency)} per month into an emergency reserve until the shortfall closes.`,
      reason: `Current emergency-fund gap is ${formatCurrency(emergencyGap, baseCurrency)} against your ${report.finance.emergencyFundTargetMonths}-month target.`,
      successSignal: `Emergency gap reaches zero while debt burden remains ${report.finance.debtBurdenFlag.toLowerCase()}.`,
      cadence: 'Weekly cash-flow review',
    },
    {
      id: 'deploy',
      title: 'Deploy investable capital',
      status: allocationStatus,
      action:
        allocationStatus === 'blocked'
          ? 'No deployable monthly amount was suggested. Update profile inputs and rerun before adding positions.'
          : `Deploy up to ${formatCurrency(
              deployableAllocation > 0 ? deployableAllocation : suggestedAllocation,
              baseCurrency,
            )}/month into ${primaryLabel} in staggered entries.`,
      reason: `Agent recommendation is ${report.finalRecommendation.recommendation} with allocation guidance ${formatCurrency(suggestedAllocation, baseCurrency)}/month.`,
      successSignal: `Track this allocation for 3 straight months without breaching your risk cap.`,
      cadence: 'Monthly investment window',
    },
    {
      id: 'guardrails',
      title: 'Enforce risk guardrails',
      status: guardrailStatus,
      action: `Cap single-security exposure near ${positionCapPct}% of equity bucket. Avoid new adds if compatibility drops below 60/100.`,
      reason: `Household risk profile is ${report.finance.riskProfileLabel}${primary ? ` and current primary security risk is ${primary.risk.level}` : ''}.`,
      successSignal: 'Debt burden stays under control and risk profile score remains stable or improves.',
      cadence: 'At every rebalance',
    },
    {
      id: 'monitor',
      title: 'Monitor and rerun agent loop',
      status: 'ready',
      action: 'Rerun every 14 days, and immediately after earnings, major news, or a +/-8% move in tracked names.',
      reason: `Your goal is ${goalLabel}, so allocations should stay aligned with fresh market context.`,
      successSignal: 'Execution trail updates continue to support the same portfolio-gap objective.',
      cadence: 'Bi-weekly plus event triggers',
    },
  ];
}

function FieldShell({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span> : null}
    </label>
  );
}

function StepPanel({
  stepId,
  activeStep,
  className,
  children,
}: {
  stepId: number;
  activeStep: number;
  className?: string;
  children: React.ReactNode;
}) {
  if (activeStep !== stepId) return null;
  return (
    <div id={`profile-panel-${stepId}`} role="tabpanel" aria-labelledby={`profile-tab-${stepId}`} className={className}>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  hint,
  suffix,
  min = 0,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  hint?: string;
  suffix?: string;
  min?: number;
  step?: number;
}) {
  return (
    <FieldShell label={label} hint={hint}>
      <div className="relative">
        <input
          type="number"
          min={min}
          step={step}
          value={value === 0 ? '' : value}
          onChange={(event) => onChange(parseNumber(event.target.value))}
          className={cn(
            'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none',
            'focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-950',
            suffix ? 'pr-12' : '',
          )}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-400">
            {suffix}
          </span>
        ) : null}
      </div>
    </FieldShell>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (next: T) => void;
  hint?: string;
}) {
  return (
    <FieldShell label={label} hint={hint}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-950"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

function MetricCard({
  label,
  value,
  note,
  tone = 'cyan',
}: {
  label: string;
  value: string;
  note: string;
  tone?: 'cyan' | 'emerald' | 'amber' | 'slate';
}) {
  const toneStyles =
    tone === 'emerald'
      ? 'border-emerald-200 bg-emerald-500/5'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-500/5'
        : tone === 'slate'
          ? 'border-slate-200 bg-slate-500/5'
          : 'border-cyan-200 bg-cyan-500/5';

  return (
    <div className={cn('rounded-3xl border p-4', toneStyles, 'dark:border-slate-700 dark:bg-slate-900/70')}>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{value}</div>
      <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{note}</div>
    </div>
  );
}

function AllocationRow({
  label,
  current,
  ideal,
}: {
  label: string;
  current: number;
  ideal: number;
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-950/60">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
        <span className="text-slate-500 dark:text-slate-400">
          {current.toFixed(0)}% now / {ideal.toFixed(0)}% ideal
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.min(current, 100)}%` }} />
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(ideal, 100)}%` }} />
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Current</span>
        <span>Ideal</span>
      </div>
    </div>
  );
}

function ScorePill({
  value,
  recommendation,
}: {
  value: number;
  recommendation?: string;
}) {
  const tone =
    value >= 75 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : value >= 60 ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300';
  return (
    <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', tone)}>
      {value}/100{recommendation ? ` • ${recommendation}` : ''}
    </span>
  );
}

function SecurityPoolTable({
  title,
  subtitle,
  items,
  baseCurrency,
}: {
  title: string;
  subtitle: string;
  items: AgenticAnalysisReport['stockRecommendations'];
  baseCurrency: 'INR' | 'USD';
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
          Top {items.length}
        </span>
      </div>

      {items.length ? (
        <>
          <div className="mt-4 overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">Security</th>
                  <th className="px-3 py-2 text-right">Fit</th>
                  <th className="px-3 py-2 text-right">Reco</th>
                  <th className="px-3 py-2 text-right">Confidence</th>
                  <th className="px-3 py-2 text-right">Quality</th>
                  <th className="px-3 py-2 text-right">Risk Fit</th>
                  <th className="px-3 py-2 text-right">Risk Level</th>
                  <th className="px-3 py-2 text-right">P/E</th>
                  <th className="px-3 py-2 text-right">DCF</th>
                  <th className="px-3 py-2 text-right">Allocation</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={`${item.market}:${item.symbol}`} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-3 py-2">
                      <div className="font-semibold text-slate-900 dark:text-white">{item.displaySymbol}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {recommendationType(item) === 'mutual_fund' ? 'Mutual Fund' : item.sector} • {item.market.toUpperCase()}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {[
                          { label: 'Q', freshness: item.dataFreshness.quote, provenance: item.provenance?.quote },
                          { label: 'F', freshness: item.dataFreshness.fundamentals, provenance: item.provenance?.fundamentals },
                          { label: 'H', freshness: item.dataFreshness.history, provenance: item.provenance?.history },
                          { label: 'N', freshness: item.dataFreshness.news, provenance: item.provenance?.news },
                        ].map((chip) => (
                          <span
                            key={`${item.symbol}-${chip.label}`}
                            className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', freshnessBadgeClass(chip.freshness))}
                            title={metricTitle(chip.label, chip.freshness, chip.provenance)}
                          >
                            {chip.label}: {chip.freshness}
                          </span>
                        ))}
                      </div>
                      <div className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {item.provenance?.quote?.source ?? 'Unknown source'} • {item.provenance?.fundamentals?.source ?? 'Unknown fundamentals'}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-white">{item.scores.personalizedFit}</td>
                    <td className="px-3 py-2 text-right">
                      <ScorePill value={item.scores.personalizedFit} recommendation={item.recommendation} />
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {item.confidence.label} ({item.confidence.score})
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        {item.confidence.fitLow}-{item.confidence.fitHigh}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">{item.scores.stockQuality}</td>
                    <td className="px-3 py-2 text-right">{item.scores.riskCompatibility}</td>
                    <td className="px-3 py-2 text-right">{item.risk.level}</td>
                    <td className="px-3 py-2 text-right">{typeof item.fundamentals.pe === 'number' ? item.fundamentals.pe.toFixed(1) : 'N/A'}</td>
                    <td className="px-3 py-2 text-right">
                      {typeof item.dcf.marginOfSafetyPct === 'number' ? `${item.dcf.marginOfSafetyPct.toFixed(1)}%` : item.dcf.valuationLabel}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      <div>{formatCurrency(item.allocation.baseAmountMonthly, baseCurrency)}</div>
                      {item.allocation.baseCurrency !== item.allocation.securityCurrency ? (
                        <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                          {formatCurrency(item.allocation.securityAmountMonthly, item.allocation.securityCurrency)}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            `Risk Fit` is compatibility with your selected profile (higher means better aligned, not riskier).
          </p>
        </>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No names qualified for this pool in the current run.
        </div>
      )}
    </div>
  );
}

export function AgenticAiWorkbench() {
  const draftHydratedRef = useRef(false);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analysisAbortRef = useRef<AbortController | null>(null);
  const runAnalysisRef = useRef<(force?: boolean) => Promise<void>>(async () => {});
  const monitorBaselineRef = useRef<Map<string, { symbol: string; market: 'india' | 'us' | 'mf'; price: number; name: string }>>(new Map());
  const monitorCooldownUntilRef = useRef(0);
  const [portfolioTxns, setPortfolioTxns] = useState<PortfolioTxn[]>([]);
  const [form, setForm] = useState<AgenticFormInput>(createDefaultForm());
  const [report, setReport] = useState<AgenticAnalysisReport | null>(null);
  const [changeAudit, setChangeAudit] = useState<ChangeAuditSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [profileStep, setProfileStep] = useState(1);
  const [stockSuggestions, setStockSuggestions] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<AgenticProgressTelemetry | null>(null);
  const [analysisStartedAt, setAnalysisStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null);
  const [whatIfIncomeDelta, setWhatIfIncomeDelta] = useState(0);
  const [whatIfEmiDelta, setWhatIfEmiDelta] = useState(0);
  const [whatIfRiskPreference, setWhatIfRiskPreference] = useState<RiskPreference>('moderate');
  const [clarificationPrompts, setClarificationPrompts] = useState<string[]>([]);
  const [learningMemory, setLearningMemory] = useState<LearningMemoryState>(DEFAULT_LEARNING_MEMORY);
  const [monitoringSettings, setMonitoringSettings] = useState<MonitoringSettings>(DEFAULT_MONITORING_SETTINGS);
  const [monitoringAlert, setMonitoringAlert] = useState<MonitoringAlertState | null>(null);

  useEffect(() => {
    let disposed = false;

    async function load() {
      try {
        const [txns, rawDraft, savedReport, savedLearningMemory, savedMonitoring] = await Promise.all([
          listPortfolioTxns(),
          getKv<SavedProfileDraft | Partial<AgenticFormInput>>(PROFILE_STORAGE_KEY),
          getKv<AgenticAnalysisReport>(REPORT_STORAGE_KEY),
          getKv<LearningMemoryState>(LEARNING_MEMORY_KEY),
          getKv<MonitoringSettings>(MONITORING_SETTINGS_KEY),
        ]);
        const savedDraft = parseSavedDraft(rawDraft);
        const hydrated = hydrateForm(savedDraft?.form);

        if (disposed) return;
        setPortfolioTxns(txns);
        setForm(hydrated);
        setProfileStep(clamp(savedDraft?.profileStep ?? 1, 1, PROFILE_STEPS.length));
        setLastDraftSavedAt(savedDraft?.updatedAt ?? null);
        if (savedReport) {
          const normalized = normalizeSavedReport(savedReport) ?? null;
          setReport(normalized);
          setWhatIfRiskPreference(hydrated.riskPreference);
        }
        setLearningMemory({
          ...DEFAULT_LEARNING_MEMORY,
          ...(savedLearningMemory ?? {}),
          scoringWeights: normalizeScoringWeights(savedLearningMemory?.scoringWeights),
        });
        setMonitoringSettings({
          ...DEFAULT_MONITORING_SETTINGS,
          ...(savedMonitoring ?? {}),
        });
      } catch {
        if (!disposed) {
          setPortfolioTxns([]);
          setForm(createDefaultForm());
          setProfileStep(1);
        }
      } finally {
        if (!disposed) draftHydratedRef.current = true;
      }
    }

    load();

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!draftHydratedRef.current) return;
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    autosaveTimeoutRef.current = setTimeout(() => {
      const updatedAt = new Date().toISOString();
      void setKv(PROFILE_STORAGE_KEY, {
        form,
        profileStep,
        updatedAt,
      } satisfies SavedProfileDraft)
        .then(() => setLastDraftSavedAt(updatedAt))
        .catch(() => {
          // Best-effort autosave.
        });
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
  }, [form, profileStep]);

  useEffect(() => {
    if (!draftHydratedRef.current) return;
    void setKv(MONITORING_SETTINGS_KEY, monitoringSettings).catch(() => {
      // Best-effort preference save.
    });
  }, [monitoringSettings]);

  useEffect(() => {
    if (!loading || !analysisStartedAt) return;
    setElapsedMs(Date.now() - analysisStartedAt);
    const timer = setInterval(() => {
      setElapsedMs(Date.now() - analysisStartedAt);
    }, 1000);
    return () => clearInterval(timer);
  }, [analysisStartedAt, loading]);

  useEffect(() => {
    return () => {
      analysisAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!report) return;
    const next = new Map<string, { symbol: string; market: 'india' | 'us' | 'mf'; price: number; name: string }>();
    const candidates = [report.focusStock, ...report.stockRecommendations.slice(0, 6)].filter(Boolean) as AgenticAnalysisReport['stockRecommendations'];
    for (const item of candidates) {
      if (typeof item.marketPrice !== 'number' || item.marketPrice <= 0) continue;
      const key = `${item.market}:${item.symbol}`;
      if (next.has(key)) continue;
      next.set(key, {
        symbol: item.symbol,
        market: item.market,
        price: item.marketPrice,
        name: item.name,
      });
    }
    monitorBaselineRef.current = next;
  }, [report]);

  useEffect(() => {
    let cancelled = false;

    async function loadTickerSuggestions() {
      const scopedMarkets =
        form.marketScope === 'both' ? ['india', 'us', 'mf'] : form.marketScope === 'india' ? ['india', 'mf'] : ['us'];

      try {
        const responses = await Promise.all(
          scopedMarkets.map((market) =>
            fetch(`/api/search/universal?market=${market}&limit=120`, { cache: 'no-store' }).then((res) =>
              res.ok ? res.json() : [],
            ),
          ),
        );

        if (cancelled) return;
        const merged = new Map<string, string>();
        for (const row of responses) {
          if (!Array.isArray(row)) continue;
          for (const entity of row as Array<{ displaySymbol?: string; symbol?: string }>) {
            const ticker = (entity.displaySymbol ?? entity.symbol ?? '').trim();
            if (!ticker || merged.has(ticker.toUpperCase())) continue;
            merged.set(ticker.toUpperCase(), ticker);
          }
        }
        setStockSuggestions(Array.from(merged.values()).slice(0, 120));
      } catch {
        if (cancelled) return;
        const fallback = demoUniverse
          .filter((entity) => {
            if (form.marketScope === 'india') return entity.market === 'india' || entity.market === 'mf';
            if (form.marketScope === 'us') return entity.market === 'us';
            return true;
          })
          .map((entity) => entity.displaySymbol);
        setStockSuggestions(fallback.slice(0, 120));
      }
    }

    loadTickerSuggestions();

    return () => {
      cancelled = true;
    };
  }, [form.marketScope]);

  useEffect(() => {
    if (!monitoringSettings.enabled || !report) return;
    const activeReport = report;
    let cancelled = false;

    async function checkTriggers() {
      if (loading || cancelled) return;
      const baselineEntries = Array.from(monitorBaselineRef.current.values()).slice(0, 6);
      if (!baselineEntries.length) return;

      const priceTriggers: Array<{ symbol: string; changePct: number }> = [];
      await Promise.all(
        baselineEntries.map(async (item) => {
          try {
            const response = await fetch(
              `/api/market/quote?symbol=${encodeURIComponent(item.symbol)}&market=${item.market}`,
              { cache: 'no-store' },
            );
            if (!response.ok) return;
            const payload = (await response.json()) as { price?: number | null };
            if (typeof payload.price !== 'number' || payload.price <= 0) return;
            const changePct = ((payload.price - item.price) / item.price) * 100;
            if (Math.abs(changePct) >= monitoringSettings.priceMoveTriggerPct) {
              priceTriggers.push({ symbol: item.symbol, changePct });
            }
          } catch {
            // Ignore per-symbol failures.
          }
        }),
      );

      const newsTriggers: string[] = [];
      if (monitoringSettings.earningsNewsTrigger && activeReport.focusStock) {
        try {
          const params = new URLSearchParams({
            symbol: activeReport.focusStock.displaySymbol,
            name: activeReport.focusStock.name,
            market: activeReport.focusStock.market,
          });
          const response = await fetch(`/api/news?${params.toString()}`, { cache: 'no-store' });
          if (response.ok) {
            const payload = (await response.json()) as Array<{ title?: string; publishedAt?: string }>;
            const since = new Date(activeReport.generatedAt).getTime();
            const matches = payload.filter((item) => {
              const published = item.publishedAt ? new Date(item.publishedAt).getTime() : 0;
              const title = (item.title ?? '').toLowerCase();
              return published > since && /(earnings|results|guidance|quarter|revenue|profit)/.test(title);
            });
            if (matches.length) newsTriggers.push(`${matches.length} earnings/news event(s)`);
          }
        } catch {
          // Ignore news trigger failures.
        }
      }

      if (!priceTriggers.length && !newsTriggers.length) return;
      const summaryParts = [
        priceTriggers.length
          ? `${priceTriggers.length} symbol(s) moved beyond ${monitoringSettings.priceMoveTriggerPct}%`
          : null,
        ...newsTriggers,
      ].filter(Boolean);
      const shouldAutoRerun =
        monitoringSettings.autoRerun &&
        Date.now() >= monitorCooldownUntilRef.current &&
        !loading;
      if (shouldAutoRerun) {
        monitorCooldownUntilRef.current = Date.now() + 20 * 60_000;
        void runAnalysisRef.current(true);
      }
      setMonitoringAlert({
        at: new Date().toISOString(),
        summary: summaryParts.join(' • '),
        symbols: priceTriggers.map((entry) => `${entry.symbol} (${entry.changePct.toFixed(1)}%)`),
        autoRerunTriggered: shouldAutoRerun,
      });
    }

    void checkTriggers();
    const interval = setInterval(() => {
      void checkTriggers();
    }, Math.max(60, monitoringSettings.checkIntervalSeconds) * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [monitoringSettings, report, loading]);

  const displayCurrency = getDisplayCurrency(form);
  const totalAssetsPreview = sum(Object.values(form.assets)) + sum(Object.values(form.retirement));
  const totalLiabilitiesPreview = sum(form.loans.map((loan) => loan.outstandingAmount));
  const totalEmiPreview = sum(form.loans.map((loan) => loan.monthlyEmi));
  const monthlyBurnPreview = form.monthlyFixedExpenses + form.monthlyDiscretionaryExpenses + totalEmiPreview;
  const instantSurplusPreview = Math.max(0, form.monthlyIncome - monthlyBurnPreview);
  const instantDebtRatioPreview = form.monthlyIncome > 0 ? (totalEmiPreview / form.monthlyIncome) * 100 : 0;
  const instantEmergencyTargetMonths =
    form.riskPreference === 'conservative' ? 9 : form.riskPreference === 'aggressive' ? 4 : 6;
  const instantEmergencyGapMonths = Math.max(0, instantEmergencyTargetMonths - form.emergencyFundMonths);
  const progressPct = progressPercent(progress);
  const eta = formatEta(progress, elapsedMs);
  const activePhaseIndex = phaseIndex(progress);

  function updateField<K extends keyof AgenticFormInput>(key: K, value: AgenticFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateAssets<K extends keyof AssetBreakdownInput>(key: K, value: AssetBreakdownInput[K]) {
    setForm((prev) => ({ ...prev, assets: { ...prev.assets, [key]: value } }));
  }

  function updateRetirement<K extends keyof RetirementBreakdownInput>(key: K, value: RetirementBreakdownInput[K]) {
    setForm((prev) => ({ ...prev, retirement: { ...prev.retirement, [key]: value } }));
  }

  function updateLoan<K extends keyof LoanInput>(id: string, key: K, value: LoanInput[K]) {
    setForm((prev) => ({
      ...prev,
      loans: prev.loans.map((loan) => (loan.id === id ? { ...loan, [key]: value } : loan)),
    }));
  }

  function addLoan() {
    setForm((prev) => ({ ...prev, loans: [...prev.loans, createBlankLoan()] }));
  }

  function removeLoan(id: string) {
    setForm((prev) => ({ ...prev, loans: prev.loans.filter((loan) => loan.id !== id) }));
  }

  function applyProfileTemplate(templateId: string) {
    const template = PROFILE_TEMPLATES.find((candidate) => candidate.id === templateId);
    if (!template) return;
    setForm(
      hydrateForm(
        templateId === 'blank'
          ? createDefaultForm()
          : {
              ...createDefaultForm(),
              ...template.values,
            },
      ),
    );
    setProfileStep(1);
    setError('');
  }

  function cancelAnalysis() {
    analysisAbortRef.current?.abort();
  }

  async function runAnalysis(force = false) {
    if (loading) return;
    if (form.analysisMode === 'specific' && !form.targetTicker?.trim()) {
      setError('Enter a stock or mutual fund ticker/name when specific mode is selected.');
      return;
    }
    const validationError = validateFormInput(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    const prompts = collectClarificationPrompts(form);
    if (prompts.length && !force) {
      setClarificationPrompts(prompts);
      setError('');
      return;
    }
    setClarificationPrompts([]);

    setError('');
    setLoading(true);
    const controller = new AbortController();
    analysisAbortRef.current = controller;
    const startedAt = Date.now();
    setAnalysisStartedAt(startedAt);
    setElapsedMs(0);
    setProgress({
      phase: 'profile',
      analyzed: 0,
      total: 0,
      message: 'Initializing analysis.',
    });

    try {
      const previousSnapshot = report;
      const nextReport = await generatePersonalizedAgenticAnalysis(form, portfolioTxns, {
        signal: controller.signal,
        onProgress: (next) => setProgress(next),
        memory: {
          runCount: learningMemory.runCount,
          scoringWeights: normalizeScoringWeights(learningMemory.scoringWeights),
          lastOutcomeNote: learningMemory.lastOutcomeNote,
        },
      });
      const updatedMemory = updateLearningMemoryFromOutcome(learningMemory, previousSnapshot, nextReport);
      const audit = buildChangeAudit(previousSnapshot, nextReport);
      setReport(nextReport);
      setChangeAudit(audit);
      setLearningMemory(updatedMemory);
      setWhatIfIncomeDelta(0);
      setWhatIfEmiDelta(0);
      setWhatIfRiskPreference(form.riskPreference);
      const updatedAt = new Date().toISOString();
      await Promise.all([
        setKv(
          PROFILE_STORAGE_KEY,
          {
            form,
            profileStep,
            updatedAt,
          } satisfies SavedProfileDraft,
        ),
        setKv(REPORT_STORAGE_KEY, nextReport),
        setKv(LEARNING_MEMORY_KEY, updatedMemory),
      ]);
      setLastDraftSavedAt(updatedAt);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Analysis was cancelled. You can adjust inputs and retry.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate personalized analysis.');
      }
    } finally {
      analysisAbortRef.current = null;
      setLoading(false);
      setAnalysisStartedAt(null);
    }
  }

  useEffect(() => {
    runAnalysisRef.current = runAnalysis;
  });

  async function downloadPdf() {
    if (!report) return;
    setError('');
    setExportingPdf(true);
    try {
      await downloadPersonalizedReportPdf(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate the PDF report.');
    } finally {
      setExportingPdf(false);
    }
  }

  const rankedRecommendations =
    report?.stockRecommendations.slice().sort((left, right) => right.scores.personalizedFit - left.scores.personalizedFit) ?? [];
  const topPools =
    report?.topPools ?? {
      indiaStocks: rankedRecommendations
        .filter((candidate) => recommendationType(candidate) === 'stock' && candidate.market === 'india')
        .slice(0, 10),
      usStocks: rankedRecommendations
        .filter((candidate) => recommendationType(candidate) === 'stock' && candidate.market === 'us')
        .slice(0, 10),
      mutualFunds: rankedRecommendations.filter((candidate) => recommendationType(candidate) === 'mutual_fund').slice(0, 10),
    };
  const primaryStock = report?.focusStock ?? rankedRecommendations.find((candidate) => candidate.recommendation === 'BUY') ?? rankedRecommendations[0] ?? null;
  const alternativeStocks =
    rankedRecommendations
      .filter((stock) => !(stock.symbol === primaryStock?.symbol && stock.market === primaryStock?.market))
      .slice(0, 3) ?? [];
  const recommendationUniverse = report?.recommendationUniverse ?? (report ? inferRecommendationUniverse(report) : null);
  const totalStocksInDataset = recommendationUniverse?.totalStocksInDataset ?? 0;
  const totalMutualFundsInDataset = recommendationUniverse?.totalMutualFundsInDataset ?? 0;
  const eligibleStocks = recommendationUniverse?.eligibleStocks ?? report?.stockRecommendations.length ?? 0;
  const eligibleMutualFunds = recommendationUniverse?.eligibleMutualFunds ?? 0;
  const analyzedSecurities = recommendationUniverse?.analyzedSecurities ?? report?.stockRecommendations.length ?? 0;
  const analyzedIndiaStocks = recommendationUniverse?.analyzedIndiaStocks ?? topPools.indiaStocks.length;
  const analyzedUsStocks = recommendationUniverse?.analyzedUsStocks ?? topPools.usStocks.length;
  const analyzedMutualFunds = recommendationUniverse?.analyzedMutualFunds ?? topPools.mutualFunds.length;
  const reportCurrency = report?.baseCurrency ?? displayCurrency;
  const missionPlan = report ? buildAgentMissionPlan(report, primaryStock, reportCurrency) : [];
  const missionAlerts = missionPlan.filter((task) => task.status !== 'ready').length;
  const universeSourceLabel =
    recommendationUniverse?.universeSource === 'live_index'
      ? 'live market index'
      : recommendationUniverse?.universeSource === 'mixed_live_demo'
        ? 'mixed live + demo index'
      : recommendationUniverse?.universeSource === 'demo_fallback'
        ? 'bundled demo fallback'
        : 'market index';
  const baselineSurplus = report?.finance.investableSurplusMonthly ?? 0;
  const whatIfSurplus = Math.max(0, baselineSurplus + whatIfIncomeDelta - whatIfEmiDelta);
  const riskTarget = whatIfRiskPreference === 'aggressive' ? 84 : whatIfRiskPreference === 'moderate' ? 60 : 32;
  const stockRiskTarget = primaryStock?.risk.level === 'High' ? 84 : primaryStock?.risk.level === 'Moderate' ? 58 : 30;
  const whatIfRiskCompatibility = primaryStock
    ? clamp(100 - Math.abs(riskTarget - stockRiskTarget) * 1.35, 10, 95)
    : 50;
  const activeWeights = normalizeScoringWeights(report?.scoringWeights ?? learningMemory.scoringWeights);
  const whatIfFit = primaryStock
    ? clamp(
        Math.round(
          primaryStock.scores.stockQuality * activeWeights.stockQuality +
            whatIfRiskCompatibility * activeWeights.riskCompatibility +
            primaryStock.scores.portfolioFit * activeWeights.portfolioFit +
            primaryStock.scores.lifeStageFit * activeWeights.lifeStageFit,
        ),
        0,
        100,
      )
    : 0;
  const whatIfRecommendation = whatIfFit >= 58 ? 'BUY' : whatIfFit >= 42 ? 'HOLD' : 'AVOID';
  const whatIfAllocationRatio = whatIfRecommendation === 'BUY' ? (whatIfFit >= 86 ? 0.35 : 0.25) : whatIfRecommendation === 'HOLD' ? 0.12 : 0;
  const whatIfAllocation = round(whatIfSurplus * whatIfAllocationRatio, 2);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Personalized Investment Workbench"
        subtitle="Profile-first scoring with live/delayed data, explicit guardrails, and monitoring."
        action={
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-sm font-medium text-cyan-700 dark:text-cyan-300">
            <Bot className="h-4 w-4" />
            {report?.engineType ?? 'Agentic Orchestrator (Rules + Heuristic AI)'}
          </div>
        }
      >
        <div className="relative overflow-hidden rounded-[30px] border border-cyan-200/60 bg-gradient-to-br from-cyan-500/10 via-emerald-500/10 to-amber-500/10 p-6 dark:border-cyan-900/40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_35%)]" />
          <div className="relative grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                <Sparkles className="h-3.5 w-3.5" />
                Practical workflow
              </div>
              <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 dark:text-white md:text-4xl">
                Personal profile first, market recommendations second.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 md:text-base">
                We compute surplus, debt burden, emergency readiness, and risk first, then rank securities and produce an action plan.
              </p>
              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
                Start with a template or fill only the essentials first. You can run once and refine with what-if changes.
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard
                label="Monthly Burn"
                value={formatCurrency(monthlyBurnPreview, displayCurrency)}
                note="Fixed expenses, lifestyle spend, and EMIs combined."
              />
              <MetricCard
                label="Known Assets"
                value={formatCurrency(totalAssetsPreview, displayCurrency)}
                note="Direct assets plus retirement corpus."
                tone="emerald"
              />
              <MetricCard
                label="Liabilities"
                value={formatCurrency(totalLiabilitiesPreview, displayCurrency)}
                note="Outstanding loan balances entered below."
                tone="amber"
              />
              <MetricCard
                label="Tracked Txns"
                value={formatNumber(portfolioTxns.length, 0)}
                note="Existing app portfolio activity used for sector context."
                tone="slate"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Personal Financial Profiling" subtitle="Start with essentials, then expand details as needed.">
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div className="rounded-[28px] border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Profile wizard</div>
              <div className="mb-3 grid gap-2 md:grid-cols-3">
                {PROFILE_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyProfileTemplate(template.id)}
                    className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-left text-xs text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    <div className="font-semibold text-slate-900 dark:text-white">{template.label}</div>
                    <div className="mt-1 leading-5">{template.description}</div>
                  </button>
                ))}
              </div>
              <div className="grid gap-2 md:grid-cols-4" role="tablist" aria-label="Profile form steps">
                {PROFILE_STEPS.map((step) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setProfileStep(step.id)}
                    role="tab"
                    id={`profile-tab-${step.id}`}
                    aria-controls={`profile-panel-${step.id}`}
                    aria-selected={profileStep === step.id}
                    className={cn(
                      'rounded-2xl border px-3 py-2 text-left text-sm font-medium transition',
                      profileStep === step.id
                        ? 'border-cyan-300 bg-cyan-500/10 text-cyan-800 dark:border-cyan-700 dark:text-cyan-200'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900',
                    )}
                  >
                    <div className="text-xs opacity-70">Step {step.id}</div>
                    <div>{step.title}</div>
                  </button>
                ))}
              </div>
            </div>
            <StepPanel stepId={1} activeStep={profileStep} className="space-y-5">
              <div className="rounded-[28px] border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <Briefcase className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                  Demographics & Life Stage
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <NumberField label="Age" value={form.age} onChange={(value) => updateField('age', value)} />
                  <SelectField label="Marital Status" value={form.maritalStatus} options={MARITAL_OPTIONS} onChange={(value) => updateField('maritalStatus', value)} />
                  <NumberField label="Dependents (Kids)" value={form.dependentsKids} onChange={(value) => updateField('dependentsKids', value)} />
                  <NumberField label="Dependents (Parents)" value={form.dependentsParents} onChange={(value) => updateField('dependentsParents', value)} />
                  <SelectField
                    label="Employment Type"
                    value={form.employmentType}
                    options={EMPLOYMENT_OPTIONS}
                    onChange={(value) => updateField('employmentType', value)}
                  />
                  <SelectField
                    label="Country"
                    hint="Country changes base currency defaults only. Market scope remains what you selected."
                    value={form.countryCode}
                    options={COUNTRY_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                    onChange={(value) => {
                      const selected = COUNTRY_OPTIONS.find((option) => option.value === value);
                      updateField('countryCode', value);
                      updateField('country', selected?.country ?? value);
                    }}
                  />
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                  Income & Expenses
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <NumberField label="Monthly Income" value={form.monthlyIncome} onChange={(value) => updateField('monthlyIncome', value)} />
                  <NumberField label="Fixed Expenses" value={form.monthlyFixedExpenses} onChange={(value) => updateField('monthlyFixedExpenses', value)} />
                  <NumberField
                    label="Discretionary Expenses"
                    value={form.monthlyDiscretionaryExpenses}
                    onChange={(value) => updateField('monthlyDiscretionaryExpenses', value)}
                  />
                  <NumberField
                    label="Effective Tax Rate"
                    value={form.effectiveTaxRate}
                    onChange={(value) => updateField('effectiveTaxRate', value)}
                    suffix="%"
                    step={0.5}
                  />
                </div>
              </div>
            </StepPanel>

            <StepPanel
              stepId={2}
              activeStep={profileStep}
              className="rounded-[28px] border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/70"
            >
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Landmark className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                Assets, Retirement Corpus & Liabilities
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <NumberField label="Equity (stocks + MF)" value={form.assets.equity} onChange={(value) => updateAssets('equity', value)} />
                <NumberField label="Debt / FD" value={form.assets.debt} onChange={(value) => updateAssets('debt', value)} />
                <NumberField label="Gold" value={form.assets.gold} onChange={(value) => updateAssets('gold', value)} />
                <NumberField label="Real Estate" value={form.assets.realEstate} onChange={(value) => updateAssets('realEstate', value)} />
                <NumberField label="Cash / Savings" value={form.assets.cash} onChange={(value) => updateAssets('cash', value)} />
                <NumberField label="Alternatives" value={form.assets.alternatives} onChange={(value) => updateAssets('alternatives', value)} />
              </div>

              <div className="mt-5 rounded-3xl border border-dashed border-slate-200 p-4 dark:border-slate-700">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <PiggyBank className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                  Retirement Corpus
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <NumberField label="EPF" value={form.retirement.epf} onChange={(value) => updateRetirement('epf', value)} />
                  <NumberField label="PPF" value={form.retirement.ppf} onChange={(value) => updateRetirement('ppf', value)} />
                  <NumberField label="NPS" value={form.retirement.nps} onChange={(value) => updateRetirement('nps', value)} />
                  <NumberField label="Other Retirement" value={form.retirement.other} onChange={(value) => updateRetirement('other', value)} />
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-dashed border-slate-200 p-4 dark:border-slate-700">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <HeartPulse className="h-4 w-4 text-rose-600 dark:text-rose-300" />
                    Loans Outstanding
                  </div>
                  <button
                    type="button"
                    onClick={addLoan}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add loan
                  </button>
                </div>

                {form.loans.length ? (
                  <div className="space-y-3">
                    {form.loans.map((loan) => (
                      <div key={loan.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                        <div className="grid gap-4 md:grid-cols-[1.1fr_1fr_1fr_1fr_auto]">
                          <SelectField
                            label="Loan Type"
                            value={loan.type}
                            options={LOAN_TYPE_OPTIONS}
                            onChange={(value) => updateLoan(loan.id, 'type', value)}
                          />
                          <NumberField
                            label="Outstanding"
                            value={loan.outstandingAmount}
                            onChange={(value) => updateLoan(loan.id, 'outstandingAmount', value)}
                          />
                          <NumberField
                            label="Monthly EMI"
                            value={loan.monthlyEmi}
                            onChange={(value) => updateLoan(loan.id, 'monthlyEmi', value)}
                          />
                          <NumberField
                            label="Interest Rate"
                            value={loan.interestRate}
                            onChange={(value) => updateLoan(loan.id, 'interestRate', value)}
                            suffix="%"
                            step={0.1}
                          />
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => removeLoan(loan.id)}
                              className="inline-flex h-11 items-center justify-center rounded-2xl border border-rose-200 px-3 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No loans added yet. If you have EMIs, add them so the investable surplus and risk cap are realistic.
                  </div>
                )}
              </div>
            </StepPanel>

            <StepPanel
              stepId={3}
              activeStep={profileStep}
              className="rounded-[28px] border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/70"
            >
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Target className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                Goals, Risk & Security Focus
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <SelectField
                  label="Goal"
                  value={form.investmentGoal}
                  options={GOAL_OPTIONS}
                  onChange={(value) => updateField('investmentGoal', value)}
                />
                <SelectField
                  label="Horizon"
                  value={form.investmentHorizon}
                  options={HORIZON_OPTIONS}
                  onChange={(value) => updateField('investmentHorizon', value)}
                />
                <SelectField
                  label="Risk Preference"
                  value={form.riskPreference}
                  options={RISK_OPTIONS}
                  onChange={(value) => updateField('riskPreference', value)}
                />
                <SelectField
                  label="Liquidity Need"
                  value={form.liquidityNeed}
                  options={LIQUIDITY_OPTIONS}
                  onChange={(value) => updateField('liquidityNeed', value)}
                />
                <NumberField
                  label="Expected Return Target"
                  value={form.expectedReturnTarget}
                  onChange={(value) => updateField('expectedReturnTarget', value)}
                  suffix="%"
                  step={0.5}
                />
                <NumberField
                  label="Emergency Fund Coverage"
                  value={form.emergencyFundMonths}
                  onChange={(value) => updateField('emergencyFundMonths', value)}
                  suffix="months"
                  step={0.5}
                />
                <FieldShell label="Analysis Mode">
                  <select
                    value={form.analysisMode}
                    onChange={(event) => updateField('analysisMode', event.target.value as AgenticFormInput['analysisMode'])}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-950"
                  >
                    <option value="suggest">Let the agent suggest stocks + funds</option>
                    <option value="specific">Analyze a specific stock or fund</option>
                  </select>
                </FieldShell>
                <SelectField
                  label="Market Scope"
                  value={form.marketScope}
                  options={MARKET_SCOPE_OPTIONS}
                  onChange={(value) => updateField('marketScope', value)}
                  hint="Explicitly choose India, US, or both for suggest mode and specific-mode alternatives."
                />
                <FieldShell
                  label="Ticker / Fund / Company"
                  hint="Examples: INFY, HDFCBANK, AAPL, AMFI:119551, Parag Parikh Flexi Cap"
                >
                  <input
                    value={form.targetTicker ?? ''}
                    onChange={(event) => updateField('targetTicker', event.target.value)}
                    list="agentic-tickers"
                    disabled={form.analysisMode !== 'specific'}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-950"
                  />
                  <datalist id="agentic-tickers">
                    {stockSuggestions.map((stock) => (
                      <option key={stock} value={stock} />
                    ))}
                  </datalist>
                </FieldShell>
                {form.analysisMode === 'specific' ? (
                  <FieldShell
                    label="Compare With Alternatives"
                    hint="Analyze selected security first, then compare against top profile-fit names."
                  >
                    <div className="flex h-11 items-center">
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={form.compareWithAlternatives}
                          onChange={(event) => updateField('compareWithAlternatives', event.target.checked)}
                        />
                        Enable comparison
                      </label>
                    </div>
                  </FieldShell>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Base currency for allocation planning: {displayCurrency}.
                  </div>
                )}
              </div>
            </StepPanel>

            <StepPanel
              stepId={4}
              activeStep={profileStep}
              className="rounded-[28px] border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/70"
            >
              <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Review before run</div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-3 text-sm dark:border-slate-700">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Household</div>
                  <div className="mt-2 text-slate-700 dark:text-slate-200">
                    Age {form.age > 0 ? form.age : 'not set'}, {form.maritalStatus}, dependents {form.dependentsKids + form.dependentsParents}
                  </div>
                  <div className="mt-1 text-slate-700 dark:text-slate-200">
                    Income {formatCurrency(form.monthlyIncome, displayCurrency)} / month
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-3 text-sm dark:border-slate-700">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Analysis</div>
                  <div className="mt-2 text-slate-700 dark:text-slate-200">
                    Mode {form.analysisMode === 'specific' ? 'Specific security' : 'Suggest best options'}
                  </div>
                  <div className="mt-1 text-slate-700 dark:text-slate-200">Scope {form.marketScope.toUpperCase()}</div>
                  <div className="mt-1 text-slate-700 dark:text-slate-200">Base currency {displayCurrency}</div>
                </div>
              </div>
            </StepPanel>

            <div className="flex items-center justify-between rounded-[24px] border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
              <button
                type="button"
                onClick={() => setProfileStep((step) => Math.max(1, step - 1))}
                disabled={profileStep === 1}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
              >
                Previous
              </button>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Step {profileStep} of {PROFILE_STEPS.length}
              </div>
              <button
                type="button"
                onClick={() => setProfileStep((step) => Math.min(PROFILE_STEPS.length, step + 1))}
                disabled={profileStep === PROFILE_STEPS.length}
                className="rounded-xl border border-cyan-200 bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-700 disabled:opacity-40 dark:border-cyan-800 dark:text-cyan-300"
              >
                Continue
              </button>
            </div>
          </div>

          <div className="space-y-5 xl:sticky xl:top-[84px] xl:self-start">
            <div className="rounded-[28px] border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/70">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                Draft Status
              </div>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                  Profile autosaves while you type. You can refresh and continue from where you left off.
                </div>
                <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                  {lastDraftSavedAt ? `Last saved ${formatDateTime(lastDraftSavedAt)}.` : 'No draft saved yet in this session.'}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/70">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                Live Profile Preview
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">Monthly burn</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(monthlyBurnPreview, displayCurrency)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">Known assets</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(totalAssetsPreview, displayCurrency)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">Loan balance</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(totalLiabilitiesPreview, displayCurrency)}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">Tracked transactions</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{portfolioTxns.length}</span>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-500/5 p-3 text-xs dark:border-cyan-900/40">
                <div className="font-semibold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">First Insight</div>
                <div className="mt-2 grid gap-2 text-slate-700 dark:text-slate-200">
                  <div className="flex items-center justify-between">
                    <span>Estimated investable surplus</span>
                    <span className="font-semibold">{formatCurrency(instantSurplusPreview, displayCurrency)}/mo</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Debt burden</span>
                    <span className="font-semibold">{formatPercent(instantDebtRatioPreview)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Emergency gap</span>
                    <span className="font-semibold">{instantEmergencyGapMonths.toFixed(1)} month(s)</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProfileStep(4)}
                  className="mt-3 inline-flex items-center gap-1 rounded-xl border border-cyan-300 px-2.5 py-1.5 font-semibold text-cyan-700 hover:bg-cyan-50 dark:border-cyan-800 dark:text-cyan-300 dark:hover:bg-cyan-950/30"
                >
                  Review and run
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  void runAnalysis();
                }}
                disabled={loading}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? 'Analyzing profile + markets...' : 'Run Personalized Agent'}
              </button>
              <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Decision layers are deterministic and auditable. Narrative insights are heuristic by default unless an external LLM provider is configured.
              </p>

              {clarificationPrompts.length ? (
                <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-500/10 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:text-amber-300">
                  <div className="mb-2 inline-flex items-center gap-1 font-semibold uppercase tracking-[0.14em]">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Clarification Needed
                  </div>
                  <ul className="space-y-1">
                    {clarificationPrompts.map((prompt) => (
                      <li key={prompt}>{prompt}</li>
                    ))}
                  </ul>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          riskPreference: prev.riskPreference === 'aggressive' ? 'moderate' : prev.riskPreference,
                          expectedReturnTarget:
                            prev.investmentHorizon === 'short' && prev.expectedReturnTarget > 14
                              ? 12
                              : prev.expectedReturnTarget,
                        }));
                        setClarificationPrompts([]);
                      }}
                      className="rounded-lg border border-amber-400 px-2.5 py-1 font-semibold hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-950/30"
                    >
                      Use safer defaults
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void runAnalysis(true);
                      }}
                      className="rounded-lg border border-amber-400 px-2.5 py-1 font-semibold hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-950/30"
                    >
                      Continue anyway
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {error ? (
              <div className="rounded-[24px] border border-rose-200 bg-rose-500/10 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:text-rose-300">
                <div>{error}</div>
                {!loading ? (
                  <button
                    type="button"
                    onClick={() => {
                      void runAnalysis();
                    }}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/30"
                  >
                    Retry analysis
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </SectionCard>

      {loading ? (
        <SectionCard
          title="Agent In Progress"
          subtitle="Real-time telemetry from the running analysis. You can cancel and rerun at any point."
        >
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[30px] border border-cyan-200 bg-gradient-to-br from-cyan-500/10 via-white to-emerald-500/10 p-6 dark:border-cyan-900/40 dark:from-cyan-950/30 dark:via-slate-950 dark:to-emerald-950/20">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-cyan-600 dark:text-cyan-300" />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">In progress</div>
                  <h3 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">Running personalized scoring engine</h3>
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-dashed border-cyan-200 bg-white/70 p-4 text-sm text-slate-700 dark:border-cyan-900/40 dark:bg-slate-950/60 dark:text-slate-200">
                <div className="font-semibold">{progress?.message ?? 'Starting analysis...'}</div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-cyan-500 transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                  <div>Progress: {progress?.analyzed ?? 0}/{progress?.total ?? 0} analyzed</div>
                  <div>Elapsed: {formatElapsed(elapsedMs)}</div>
                  <div>Phase: {(progress?.phase ?? 'profile').toUpperCase()}</div>
                  <div>ETA: {eta ?? 'Estimating...'}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={cancelAnalysis}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/30"
                >
                  Cancel run
                </button>
              </div>
            </div>

            <div className="grid gap-3">
              {PROCESSING_STEPS.map((step, index) => (
                <div
                  key={step.title}
                  className={cn(
                    'rounded-[24px] border bg-white/70 p-4 dark:bg-slate-950/60',
                    index < activePhaseIndex
                      ? 'border-emerald-300 dark:border-emerald-900/40'
                      : index === activePhaseIndex
                        ? 'border-cyan-300 dark:border-cyan-900/40'
                        : 'border-slate-200 dark:border-slate-800',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                        index < activePhaseIndex
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : index === activePhaseIndex
                            ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                      )}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">{step.title}</div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{step.detail}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      ) : null}

      {report ? (
        <>
          <SectionCard
            title="Personal Financial Score"
            subtitle={`Generated ${formatDateTime(report.generatedAt)} • Portfolio gap and risk capacity were computed before stock selection.`}
            action={<ScorePill value={report.finance.riskProfileScore} recommendation={report.finance.riskProfileLabel} />}
          >
            <div className="grid gap-4 lg:grid-cols-5">
              <MetricCard
                label="Investable Surplus"
                value={`${formatCurrency(report.finance.investableSurplusMonthly, reportCurrency)}/mo`}
                note="Income minus expenses, EMIs, and emergency-fund top-up."
                tone="emerald"
              />
              <MetricCard
                label="Debt Burden"
                value={formatPercent(report.finance.debtBurdenRatioPct)}
                note={`${report.finance.debtBurdenFlag} debt load based on current EMIs.`}
                tone={report.finance.debtBurdenFlag === 'High' ? 'amber' : 'slate'}
              />
              <MetricCard
                label="Net Worth"
                value={formatCurrency(report.finance.netWorth, reportCurrency)}
                note="Total assets minus outstanding liabilities."
              />
              <MetricCard
                label="Emergency Gap"
                value={formatCurrency(report.finance.emergencyFundShortfallValue, reportCurrency)}
                note={`Target ${report.finance.emergencyFundTargetMonths} months of cover.`}
                tone="amber"
              />
              <MetricCard
                label="Risk Profile"
                value={report.finance.riskProfileLabel}
                note={`${report.finance.riskProfileScore}/100 after age, debt, dependents, horizon, and preference weighting.`}
                tone="slate"
              />
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[28px] border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Why the risk score landed here</div>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  {report.finance.riskProfileNotes.map((note) => (
                    <li key={note} className="rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                      {note}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 rounded-3xl border border-cyan-200 bg-cyan-500/5 p-4 dark:border-cyan-900/40">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Portfolio gap</div>
                  <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{report.finance.portfolioGapSummary}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {report.finance.suggestedStockStyles.map((style) => (
                      <span
                        key={style}
                        className="rounded-full border border-cyan-500/20 bg-white/80 px-3 py-1 text-xs font-medium text-cyan-700 dark:bg-slate-950/70 dark:text-cyan-300"
                      >
                        {style}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Current vs ideal allocation</div>
                <div className="space-y-3">
                  {report.finance.allocationGap.map((gap) => (
                    <AllocationRow
                      key={gap.bucket}
                      label={gap.bucket === 'debt' ? 'Debt / FD' : gap.bucket === 'cash' ? 'Cash buffer' : gap.bucket[0].toUpperCase() + gap.bucket.slice(1)}
                      current={gap.currentPct}
                      ideal={gap.idealPct}
                    />
                  ))}
                </div>
                {report.finance.localPortfolio.sectorExposure.length ? (
                  <div className="mt-4 rounded-3xl border border-dashed border-slate-200 p-4 dark:border-slate-700">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Tracked sector exposure</div>
                    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                      {report.finance.localPortfolio.sectorExposure.map((entry) => (
                        <div key={entry.sector} className="flex items-center justify-between">
                          <span>{entry.sector}</span>
                          <span className="font-semibold">{entry.weightPct.toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Adaptive Agent Control" subtitle="Planner, scorer, risk critic, and monitoring agents with memory across runs.">
            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-[24px] border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <Bot className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                  Multi-agent pipeline
                </div>
                <div className="space-y-2 text-sm">
                  {report.agentPipeline.map((stage) => (
                    <div key={stage.agent} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-slate-900 dark:text-white">{stage.agent}</div>
                        <span
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]',
                            stage.status === 'completed'
                              ? 'border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-300'
                              : stage.status === 'watch'
                                ? 'border-amber-300 bg-amber-500/10 text-amber-700 dark:border-amber-900/50 dark:text-amber-300'
                                : 'border-rose-300 bg-rose-500/10 text-rose-700 dark:border-rose-900/50 dark:text-rose-300',
                          )}
                        >
                          {stage.status}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{stage.summary}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <BrainCircuit className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                    Outcome-learning memory
                  </div>
                  <div className="grid gap-2 text-xs text-slate-600 dark:text-slate-300 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                      Quality weight: {round(activeWeights.stockQuality * 100, 1)}%
                    </div>
                    <div className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                      Risk weight: {round(activeWeights.riskCompatibility * 100, 1)}%
                    </div>
                    <div className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                      Portfolio weight: {round(activeWeights.portfolioFit * 100, 1)}%
                    </div>
                    <div className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                      Life-stage weight: {round(activeWeights.lifeStageFit * 100, 1)}%
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Run count: {learningMemory.runCount}. {learningMemory.lastOutcomeNote}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <BellRing className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                    Monitoring agent
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={monitoringSettings.enabled}
                        onChange={(event) =>
                          setMonitoringSettings((prev) => ({ ...prev, enabled: event.target.checked }))
                        }
                      />
                      Enable monitoring
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={monitoringSettings.autoRerun}
                        onChange={(event) =>
                          setMonitoringSettings((prev) => ({ ...prev, autoRerun: event.target.checked }))
                        }
                      />
                      Auto-replan on trigger
                    </label>
                    <FieldShell label="Price move trigger (%)">
                      <input
                        type="number"
                        min={2}
                        max={25}
                        value={monitoringSettings.priceMoveTriggerPct}
                        onChange={(event) =>
                          setMonitoringSettings((prev) => ({
                            ...prev,
                            priceMoveTriggerPct: clamp(parseNumber(event.target.value), 2, 25),
                          }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </FieldShell>
                    <FieldShell label="Check interval (sec)">
                      <input
                        type="number"
                        min={60}
                        max={3600}
                        value={monitoringSettings.checkIntervalSeconds}
                        onChange={(event) =>
                          setMonitoringSettings((prev) => ({
                            ...prev,
                            checkIntervalSeconds: clamp(parseNumber(event.target.value), 60, 3600),
                          }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                    </FieldShell>
                  </div>
                  <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={monitoringSettings.earningsNewsTrigger}
                      onChange={(event) =>
                        setMonitoringSettings((prev) => ({ ...prev, earningsNewsTrigger: event.target.checked }))
                      }
                    />
                    Trigger on earnings/news events for focus name
                  </label>
                  {monitoringAlert ? (
                    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-500/10 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:text-amber-300">
                      <div className="font-semibold">Last trigger: {formatDateTime(monitoringAlert.at)}</div>
                      <div className="mt-1">{monitoringAlert.summary}</div>
                      {monitoringAlert.symbols.length ? <div className="mt-1">Symbols: {monitoringAlert.symbols.join(', ')}</div> : null}
                      <div className="mt-1">{monitoringAlert.autoRerunTriggered ? 'Auto-rerun triggered.' : 'Manual rerun available.'}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </SectionCard>

          {changeAudit ? (
            <SectionCard title={changeAudit.title} subtitle="Audit agent explains what changed vs the prior run.">
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-[24px] border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <History className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                    What changed
                  </div>
                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    {changeAudit.highlights.map((entry) => (
                      <li key={entry} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                        {entry}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                    Causal factors
                  </div>
                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    {changeAudit.causalFactors.map((entry) => (
                      <li key={entry} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                        {entry}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </SectionCard>
          ) : null}

          {primaryStock ? (
            <SectionCard
              title="What-if Simulator"
              subtitle="Adjust income, EMI, and risk preference to compare deltas before rerunning full analysis."
            >
              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="grid gap-4 md:grid-cols-3">
                  <FieldShell label="Income delta / month" hint="Positive increases investable surplus">
                    <input
                      type="number"
                      value={whatIfIncomeDelta}
                      step={1000}
                      onChange={(event) => setWhatIfIncomeDelta(parseNumber(event.target.value))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-950"
                    />
                  </FieldShell>
                  <FieldShell label="EMI delta / month" hint="Positive means higher obligations">
                    <input
                      type="number"
                      value={whatIfEmiDelta}
                      step={1000}
                      onChange={(event) => setWhatIfEmiDelta(parseNumber(event.target.value))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-950"
                    />
                  </FieldShell>
                  <SelectField
                    label="Risk preference override"
                    value={whatIfRiskPreference}
                    options={RISK_OPTIONS}
                    onChange={(value) => setWhatIfRiskPreference(value)}
                  />
                </div>
                <div className="rounded-[24px] border border-cyan-200 bg-cyan-500/5 p-4 dark:border-cyan-900/40">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">Estimated Delta</div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 text-sm dark:border-slate-700 dark:bg-slate-950/60">
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Investable surplus</div>
                      <div className="mt-1 font-semibold text-slate-900 dark:text-white">{formatCurrency(whatIfSurplus, reportCurrency)}/mo</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Delta {formatCurrency(whatIfSurplus - baselineSurplus, reportCurrency)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 text-sm dark:border-slate-700 dark:bg-slate-950/60">
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Estimated fit band</div>
                      <div className="mt-1 font-semibold text-slate-900 dark:text-white">
                        {whatIfFit}/100 • {whatIfRecommendation}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Risk compatibility {Math.round(whatIfRiskCompatibility)}/100
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 text-sm dark:border-slate-700 dark:bg-slate-950/60">
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Estimated allocation</div>
                      <div className="mt-1 font-semibold text-slate-900 dark:text-white">{formatCurrency(whatIfAllocation, reportCurrency)}/mo</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Delta {formatCurrency(whatIfAllocation - primaryStock.allocation.baseAmountMonthly, reportCurrency)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 text-sm dark:border-slate-700 dark:bg-slate-950/60">
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Estimated confidence</div>
                      <div className="mt-1 font-semibold text-slate-900 dark:text-white">
                        {primaryStock.confidence.fitLow}-{primaryStock.confidence.fitHigh}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Confidence remains from latest run until you rerun.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
          ) : null}

          {primaryStock ? (
            <SectionCard
              title="Security Analysis Engine"
              subtitle="Fundamentals, technicals, sentiment, risk, DCF valuation (where available), dividend suitability, and tax impact."
              action={<ScorePill value={primaryStock.scores.personalizedFit} recommendation={primaryStock.recommendation} />}
            >
              <div className="rounded-[30px] border border-cyan-200 bg-gradient-to-r from-cyan-500/10 via-emerald-500/10 to-transparent p-5 dark:border-cyan-900/40">
                <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
                      {primaryStock.market.toUpperCase()} • {primaryStock.sector}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">{primaryStock.displaySymbol}</h3>
                      <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200">
                        {primaryStock.name}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">{primaryStock.keyReason}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {primaryStock.personalityTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        { label: 'Quote', freshness: primaryStock.dataFreshness.quote, provenance: primaryStock.provenance?.quote },
                        { label: 'History', freshness: primaryStock.dataFreshness.history, provenance: primaryStock.provenance?.history },
                        { label: 'Fundamentals', freshness: primaryStock.dataFreshness.fundamentals, provenance: primaryStock.provenance?.fundamentals },
                        { label: 'News', freshness: primaryStock.dataFreshness.news, provenance: primaryStock.provenance?.news },
                        { label: 'DCF', freshness: primaryStock.dataFreshness.dcf, provenance: primaryStock.provenance?.dcf },
                      ].map((chip) => (
                        <span
                          key={chip.label}
                          className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', freshnessBadgeClass(chip.freshness))}
                          title={metricTitle(chip.label, chip.freshness, chip.provenance)}
                        >
                          {chip.label}: {chip.freshness}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <MetricCard label="Market Price" value={formatCurrency(primaryStock.marketPrice ?? 0, primaryStock.currency)} note="Reference market price used in this run." />
                    <MetricCard
                      label="DCF View"
                      value={primaryStock.dcf.valuationLabel}
                      note={
                        typeof primaryStock.dcf.marginOfSafetyPct === 'number'
                          ? `Margin of safety ${formatPercent(primaryStock.dcf.marginOfSafetyPct)}`
                          : 'Intrinsic value confidence is limited.'
                      }
                      tone="emerald"
                    />
                    <MetricCard label="Dividend Fit" value={primaryStock.dividendSuitability.label} note={primaryStock.dividendSuitability.note} tone="slate" />
                    <MetricCard label="Holding Window" value={primaryStock.expectedHoldingPeriod} note={primaryStock.taxImpact.preferredHoldingPeriod} tone="amber" />
                    <MetricCard
                      label="Confidence Band"
                      value={`${primaryStock.confidence.fitLow}-${primaryStock.confidence.fitHigh}`}
                      note={`${primaryStock.confidence.label} confidence (${primaryStock.confidence.score}/100).`}
                      tone="slate"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-4">
                <MetricCard label="Fundamentals" value={`${primaryStock.scores.fundamentals}/100`} note="Growth, quality, leverage, and valuation." />
                <MetricCard label="Technical" value={`${primaryStock.scores.technical}/100`} note="RSI, moving averages, MACD, and volume." tone="slate" />
                <MetricCard label="Sentiment" value={`${primaryStock.scores.sentiment}/100`} note={`${primaryStock.sentiment.label} tone from news and heuristic signals.`} tone="amber" />
                <MetricCard label="Stock Risk" value={`${primaryStock.scores.stockRisk}/100`} note={`${primaryStock.risk.level} standalone risk at the stock level.`} tone="emerald" />
              </div>

              <div className="mt-5 rounded-[28px] border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Per-metric provenance</div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {[
                    { label: 'Quote', provenance: primaryStock.provenance.quote },
                    { label: 'History', provenance: primaryStock.provenance.history },
                    { label: 'Fundamentals', provenance: primaryStock.provenance.fundamentals },
                    { label: 'News', provenance: primaryStock.provenance.news },
                    { label: 'DCF', provenance: primaryStock.provenance.dcf },
                  ].map((entry) => (
                    <div key={entry.label} className="rounded-2xl border border-slate-200 p-3 text-xs dark:border-slate-700">
                      <div className="font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{entry.label}</div>
                      <div className="mt-1 text-slate-900 dark:text-white">{entry.provenance.source}</div>
                      <div className="mt-1 text-slate-500 dark:text-slate-400">
                        {entry.provenance.freshness}
                        {entry.provenance.timestamp ? ` • ${formatDateTime(entry.provenance.timestamp)}` : ''}
                      </div>
                      {entry.provenance.fallbackReason ? <div className="mt-1 text-rose-600 dark:text-rose-300">{entry.provenance.fallbackReason}</div> : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                <div className="rounded-[28px] border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <LineChart className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                    Fundamentals Snapshot
                  </div>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between"><span>P/E</span><span className="font-semibold">{primaryStock.fundamentals.pe ?? 'N/A'}</span></div>
                    <div className="flex items-center justify-between"><span>EPS</span><span className="font-semibold">{primaryStock.fundamentals.eps ?? 'N/A'}</span></div>
                    <div className="flex items-center justify-between"><span>Revenue growth</span><span className="font-semibold">{typeof primaryStock.fundamentals.revenueGrowthPct === 'number' ? formatPercent(primaryStock.fundamentals.revenueGrowthPct) : 'N/A'}</span></div>
                    <div className="flex items-center justify-between"><span>Profit growth</span><span className="font-semibold">{typeof primaryStock.fundamentals.profitGrowthPct === 'number' ? formatPercent(primaryStock.fundamentals.profitGrowthPct) : 'N/A'}</span></div>
                    <div className="flex items-center justify-between"><span>ROE</span><span className="font-semibold">{typeof primaryStock.fundamentals.roePct === 'number' ? formatPercent(primaryStock.fundamentals.roePct) : 'N/A'}</span></div>
                    <div className="flex items-center justify-between"><span>Free cash flow</span><span className="font-semibold">{primaryStock.fundamentals.freeCashFlow ? formatCurrency(primaryStock.fundamentals.freeCashFlow, primaryStock.currency) : 'N/A'}</span></div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <ArrowRight className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                    Technical Context
                  </div>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between"><span>RSI (14)</span><span className="font-semibold">{primaryStock.technicals.rsi14 ?? 'N/A'}</span></div>
                    <div className="flex items-center justify-between"><span>50 DMA</span><span className="font-semibold">{primaryStock.technicals.ma50 ?? 'N/A'}</span></div>
                    <div className="flex items-center justify-between"><span>200 DMA</span><span className="font-semibold">{primaryStock.technicals.ma200 ?? 'N/A'}</span></div>
                    <div className="flex items-center justify-between"><span>MACD bias</span><span className="font-semibold">{primaryStock.technicals.macdBias}</span></div>
                    <div className="flex items-center justify-between"><span>Volume trend</span><span className="font-semibold">{primaryStock.technicals.volumeTrend}</span></div>
                    <div className="flex items-center justify-between"><span>Trend bias</span><span className="font-semibold">{primaryStock.technicals.trendBias}</span></div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                    Risk, DCF & Tax
                  </div>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between"><span>Volatility</span><span className="font-semibold">{typeof primaryStock.risk.volatilityPct === 'number' ? formatPercent(primaryStock.risk.volatilityPct) : 'N/A'}</span></div>
                    <div className="flex items-center justify-between"><span>Beta</span><span className="font-semibold">{primaryStock.risk.beta ?? 'N/A'}</span></div>
                    <div className="flex items-center justify-between"><span>Sharpe</span><span className="font-semibold">{primaryStock.risk.sharpeRatio ?? 'N/A'}</span></div>
                    <div className="flex items-center justify-between"><span>Intrinsic value</span><span className="font-semibold">{primaryStock.dcf.intrinsicValuePerShare ? formatCurrency(primaryStock.dcf.intrinsicValuePerShare, primaryStock.currency) : 'N/A'}</span></div>
                    <div className="flex items-center justify-between"><span>Short-term tax drag</span><span className="font-semibold">{formatPercent(primaryStock.taxImpact.shortTermRatePct)}</span></div>
                    <div className="flex items-center justify-between"><span>Long-term tax drag</span><span className="font-semibold">{formatPercent(primaryStock.taxImpact.longTermRatePct)}</span></div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <div className="rounded-[28px] border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Why this name works for the profile</div>
                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    {primaryStock.supportPoints.map((point) => (
                      <li key={point} className="rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[28px] border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">What still needs caution</div>
                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    {primaryStock.cautionPoints.map((point) => (
                      <li key={point} className="rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                        {point}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 rounded-3xl border border-dashed border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    {primaryStock.taxImpact.note}
                  </div>
                </div>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard title="Personalized Fit Scoring" subtitle="Curated top pools: 10 India stocks, 10 US stocks, and 10 mutual funds from the full universe.">
            {primaryStock ? (
              <div className="grid gap-4 lg:grid-cols-5">
                <MetricCard
                  label="Stock Quality (40%)"
                  value={`${primaryStock.scores.stockQuality}/100`}
                  note="Fundamentals, technicals, DCF, and sentiment blended."
                />
                <MetricCard
                  label="Risk Compatibility (25%)"
                  value={`${primaryStock.scores.riskCompatibility}/100`}
                  note="How well stock risk matches your household risk capacity."
                  tone="slate"
                />
                <MetricCard
                  label="Portfolio Fit (20%)"
                  value={`${primaryStock.scores.portfolioFit}/100`}
                  note="How well this stock fills the current portfolio gap."
                  tone="emerald"
                />
                <MetricCard
                  label="Life Stage Fit (15%)"
                  value={`${primaryStock.scores.lifeStageFit}/100`}
                  note="Dividend vs growth need, horizon, dependents, and liquidity."
                  tone="amber"
                />
                <MetricCard
                  label="Confidence / Band"
                  value={`${primaryStock.confidence.label} (${primaryStock.confidence.score})`}
                  note={`Expected fit range ${primaryStock.confidence.fitLow}-${primaryStock.confidence.fitHigh}.`}
                  tone="slate"
                />
              </div>
            ) : null}

            {primaryStock ? (
              <div className="mt-4 rounded-[24px] border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Why this score</div>
                <div className="mt-3 space-y-3">
                  {[
                    ['Stock quality', primaryStock.scores.weightedContributions.stockQuality, '40% weight'],
                    ['Risk compatibility', primaryStock.scores.weightedContributions.riskCompatibility, '25% weight'],
                    ['Portfolio fit', primaryStock.scores.weightedContributions.portfolioFit, '20% weight'],
                    ['Life-stage fit', primaryStock.scores.weightedContributions.lifeStageFit, '15% weight'],
                  ].map(([label, contribution, weight]) => (
                    <div key={String(label)}>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>{label}</span>
                        <span>
                          {contribution} / {weight}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-cyan-500"
                          style={{
                            width: `${Math.max(
                              6,
                              Math.min(100, (Number(contribution) / Math.max(1, primaryStock.scores.personalizedFit)) * 100),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {report ? (
              <div className="mt-5 rounded-[24px] border border-dashed border-cyan-200 bg-cyan-500/5 p-4 text-sm text-slate-700 dark:border-cyan-900/40 dark:text-slate-200">
                <div className="font-semibold">Why you are seeing these names</div>
                <p className="mt-2 leading-6">
                  {recommendationUniverse?.analysisMode === 'specific'
                    ? `You selected ${report.focusStock?.displaySymbol ?? 'a specific security'}, so the engine analyzed that security first and then ranked alternatives in your chosen scope (${recommendationUniverse?.marketScope?.toUpperCase() ?? 'BOTH'}).`
                    : `You did not pick a specific security, so the agent screened your chosen scope (${recommendationUniverse?.marketScope?.toUpperCase() ?? 'BOTH'}) from the ${universeSourceLabel}.`}
                  {' '}It found <span className="font-semibold">{totalStocksInDataset}</span> stocks and <span className="font-semibold">{totalMutualFundsInDataset}</span> mutual funds in scope.
                  From that, <span className="font-semibold">{eligibleStocks}</span> stocks + <span className="font-semibold">{eligibleMutualFunds}</span> funds were eligible,{' '}
                  <span className="font-semibold">{analyzedSecurities}</span> were deeply analyzed ({analyzedIndiaStocks} India stocks, {analyzedUsStocks} US stocks, {analyzedMutualFunds} funds), and top pools are shown below.
                  {recommendationUniverse?.universeTruncated ? ' The scan hit the configured cap for at least one market in this run.' : ''}
                </p>
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              <SecurityPoolTable
                title="Best 10 India Stocks"
                subtitle="Top India equities from the full screened universe."
                items={topPools.indiaStocks}
                baseCurrency={reportCurrency}
              />
              <SecurityPoolTable
                title="Best 10 US Stocks"
                subtitle="Top US equities from the full screened universe."
                items={topPools.usStocks}
                baseCurrency={reportCurrency}
              />
              <SecurityPoolTable
                title="Best 10 Mutual Funds"
                subtitle="Top mutual funds matched to your profile."
                items={topPools.mutualFunds}
                baseCurrency={reportCurrency}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Final Recommendation"
            subtitle="A client-friendly action plan with a real downloadable PDF report."
            action={
              <button
                type="button"
                onClick={downloadPdf}
                disabled={exportingPdf}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                {exportingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {exportingPdf ? 'Preparing PDF...' : 'Download PDF Report'}
              </button>
            }
          >
            <div className="space-y-5">
              <div className="rounded-[32px] border border-cyan-200 bg-gradient-to-br from-cyan-500/10 via-white to-emerald-500/10 p-6 dark:border-cyan-900/40 dark:from-cyan-950/30 dark:via-slate-950 dark:to-emerald-950/20">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Final recommendation</div>
                    <h3 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{report.finalRecommendation.headline}</h3>
                    <p className="mt-3 text-base leading-7 text-slate-700 dark:text-slate-200">{report.finalRecommendation.keyReason}</p>
                  </div>
                  <ScorePill value={primaryStock?.scores.personalizedFit ?? report.finance.riskProfileScore} recommendation={report.finalRecommendation.recommendation} />
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-white/70 bg-white/85 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Suggested Allocation</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(report.finalRecommendation.suggestedAllocationMonthly, reportCurrency)}/mo
                    </div>
                    {primaryStock && primaryStock.allocation.baseCurrency !== primaryStock.allocation.securityCurrency ? (
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {formatCurrency(primaryStock.allocation.securityAmountMonthly, primaryStock.allocation.securityCurrency)}/mo in security currency
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/85 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Holding Period</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{report.finalRecommendation.holdingPeriod}</div>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/85 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Best Use</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{report.finalRecommendation.subject}</div>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/85 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Tax Posture</div>
                    <div className="mt-1 text-sm font-medium leading-6 text-slate-900 dark:text-white">{report.finalRecommendation.taxNote}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Planning base currency: {reportCurrency}. FX context USD/INR{' '}
                  {Number.isFinite(report.fxContext.usdInrRate) && report.fxContext.usdInrRate > 0 ? report.fxContext.usdInrRate.toFixed(4) : 'Unavailable'} ({report.fxContext.stale ? 'cached' : 'fresh'} • {report.fxContext.source}).
                </div>

                <div className="mt-5 rounded-3xl border border-dashed border-cyan-200 p-4 text-sm leading-6 text-slate-700 dark:border-cyan-900/40 dark:text-slate-200">
                  {report.finalRecommendation.portfolioGapCallout}
                </div>
              </div>

              {missionPlan.length ? (
                <div className="rounded-[30px] border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Agent Mission Control
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        A concrete runbook generated from your profile and latest market run. Use it to execute, monitor, and
                        rerun with clear guardrails.
                      </p>
                    </div>
                    <span
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-semibold',
                        missionAlerts
                          ? 'border-amber-300 bg-amber-500/10 text-amber-700 dark:border-amber-800 dark:text-amber-300'
                          : 'border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300',
                      )}
                    >
                      {missionAlerts ? `${missionAlerts} item${missionAlerts === 1 ? '' : 's'} need attention` : 'All mission items clear'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {missionPlan.map((task, index) => {
                      const status = missionStatusMeta(task.status);
                      return (
                        <div key={task.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                Step {index + 1}
                              </div>
                              <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{task.title}</div>
                            </div>
                            <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', status.className)}>
                              {status.label}
                            </span>
                          </div>

                          <div className="mt-3 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Action</div>
                              <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">{task.action}</p>
                              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{task.reason}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-950/50">
                              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                Success Check
                              </div>
                              <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">{task.successSignal}</p>
                              <div className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">Cadence: {task.cadence}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[28px] border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Why the agent landed here</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {report.executionTrail.map((step) => (
                      <div key={step.phase} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{step.phase}</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{step.headline}</div>
                        <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{step.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[28px] border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                    <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Best alternatives right now</div>
                    {alternativeStocks.length ? (
                      <div className="space-y-3">
                        {alternativeStocks.map((stock) => (
                          <div key={`${stock.market}:${stock.symbol}`} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-slate-900 dark:text-white">{stock.displaySymbol}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{stock.sector} • {stock.market.toUpperCase()}</div>
                              </div>
                              <ScorePill value={stock.scores.personalizedFit} recommendation={stock.recommendation} />
                            </div>
                            <div className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{stock.keyReason}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        No better alternatives were ranked for this run.
                      </div>
                    )}
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                    <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Important Notes</div>
                    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                      {report.notes.map((note) => (
                        <li key={note} className="rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}
