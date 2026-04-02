'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Briefcase,
  Download,
  HeartPulse,
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
  type AgenticAnalysisReport,
  type AgenticFormInput,
  type AssetBreakdownInput,
  type EmploymentType,
  type InvestmentGoal,
  type InvestmentHorizon,
  type LiquidityNeed,
  type LoanInput,
  type MaritalStatus,
  type RetirementBreakdownInput,
  type RiskPreference,
  generatePersonalizedAgenticAnalysis,
} from '@/lib/agentic/personalized-engine';
import { downloadPersonalizedReportPdf } from '@/lib/agentic/report-pdf';
import { getKv, listPortfolioTxns, setKv } from '@/lib/storage/repositories';
import type { PortfolioTxn } from '@/lib/storage/idb';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDateTime, formatNumber, formatPercent } from '@/lib/utils/format';

const PROFILE_STORAGE_KEY = 'agentic:financial-profile:v2';
const REPORT_STORAGE_KEY = 'agentic:last-report:v2';

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

const LOAN_TYPE_OPTIONS: Array<{ value: LoanInput['type']; label: string }> = [
  { value: 'home', label: 'Home loan' },
  { value: 'car', label: 'Car loan' },
  { value: 'education', label: 'Education loan' },
  { value: 'personal', label: 'Personal loan' },
  { value: 'other', label: 'Other' },
];

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

const PROCESSING_MESSAGES = [
  'Reading household cash-flow patterns...',
  'Checking debt tolerance against your chosen risk preference...',
  'Running DCF assumptions and margin-of-safety checks...',
  'Comparing security risk with life-stage needs...',
  'Assembling the recommendation like a live analyst would...',
] as const;

const MIN_AGENT_RUNTIME_MS = 2800;

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
    age: 32,
    maritalStatus: 'married',
    dependentsKids: 1,
    dependentsParents: 0,
    employmentType: 'salaried',
    monthlyIncome: 180000,
    monthlyFixedExpenses: 65000,
    monthlyDiscretionaryExpenses: 18000,
    effectiveTaxRate: 30,
    assets: {
      equity: 1200000,
      debt: 450000,
      gold: 150000,
      realEstate: 0,
      cash: 220000,
      alternatives: 0,
    },
    retirement: {
      epf: 350000,
      ppf: 120000,
      nps: 80000,
      other: 0,
    },
    loans: [],
    emergencyFundMonths: 4,
    investmentGoal: 'wealth_creation',
    investmentHorizon: 'long',
    riskPreference: 'moderate',
    expectedReturnTarget: 14,
    liquidityNeed: 'medium',
    country: 'India',
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

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function getDisplayCurrency(country: string): 'INR' | 'USD' {
  return /india/i.test(country) ? 'INR' : 'USD';
}

function recommendationType(item: { securityType?: 'stock' | 'mutual_fund'; market: 'india' | 'us' | 'mf' }) {
  if (item.securityType) return item.securityType;
  return item.market === 'mf' ? 'mutual_fund' : 'stock';
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
  const inferred = inferRecommendationUniverse(report);
  const existing = report.recommendationUniverse as Partial<AgenticAnalysisReport['recommendationUniverse']> | undefined;
  const topPools =
    report.topPools ??
    ({
      indiaStocks: report.stockRecommendations
        .filter((item) => recommendationType(item) === 'stock' && item.market === 'india')
        .slice(0, 10),
      usStocks: report.stockRecommendations
        .filter((item) => recommendationType(item) === 'stock' && item.market === 'us')
        .slice(0, 10),
      mutualFunds: report.stockRecommendations.filter((item) => recommendationType(item) === 'mutual_fund').slice(0, 10),
    } as AgenticAnalysisReport['topPools']);
  return {
    ...report,
    topPools,
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

function PhaseChip({ label }: { label: string }) {
  return (
    <div className="rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-300">
      {label}
    </div>
  );
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
}: {
  title: string;
  subtitle: string;
  items: AgenticAnalysisReport['stockRecommendations'];
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
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900 dark:text-white">{item.scores.personalizedFit}</td>
                    <td className="px-3 py-2 text-right">
                      <ScorePill value={item.scores.personalizedFit} recommendation={item.recommendation} />
                    </td>
                    <td className="px-3 py-2 text-right">{item.scores.stockQuality}</td>
                    <td className="px-3 py-2 text-right">{item.scores.riskCompatibility}</td>
                    <td className="px-3 py-2 text-right">{item.risk.level}</td>
                    <td className="px-3 py-2 text-right">{typeof item.fundamentals.pe === 'number' ? item.fundamentals.pe.toFixed(1) : 'N/A'}</td>
                    <td className="px-3 py-2 text-right">
                      {typeof item.dcf.marginOfSafetyPct === 'number' ? `${item.dcf.marginOfSafetyPct.toFixed(1)}%` : item.dcf.valuationLabel}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {item.suggestedAllocationMonthly > 0 ? formatCurrency(item.suggestedAllocationMonthly, item.currency) : formatCurrency(0, item.currency)}
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
  const [portfolioTxns, setPortfolioTxns] = useState<PortfolioTxn[]>([]);
  const [form, setForm] = useState<AgenticFormInput>(createDefaultForm());
  const [report, setReport] = useState<AgenticAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let disposed = false;

    async function load() {
      try {
        const [txns, savedForm, savedReport] = await Promise.all([
          listPortfolioTxns(),
          getKv<Partial<AgenticFormInput>>(PROFILE_STORAGE_KEY),
          getKv<AgenticAnalysisReport>(REPORT_STORAGE_KEY),
        ]);

        if (disposed) return;
        setPortfolioTxns(txns);
        setForm(hydrateForm(savedForm));
        if (savedReport) setReport(normalizeSavedReport(savedReport) ?? null);
      } catch {
        if (!disposed) {
          setPortfolioTxns([]);
          setForm(createDefaultForm());
        }
      }
    }

    load();

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      setLoadingStepIndex(0);
      setLoadingMessageIndex(0);
      return;
    }

    setLoadingStepIndex(0);
    setLoadingMessageIndex(0);

    const stepTimer = window.setInterval(() => {
      setLoadingStepIndex((current) => Math.min(current + 1, PROCESSING_STEPS.length - 1));
    }, 550);

    const messageTimer = window.setInterval(() => {
      setLoadingMessageIndex((current) => (current + 1) % PROCESSING_MESSAGES.length);
    }, 1200);

    return () => {
      window.clearInterval(stepTimer);
      window.clearInterval(messageTimer);
    };
  }, [loading]);

  const stockSuggestions = useMemo(
    () =>
      demoUniverse
        .filter((entity) => entity.type === 'stock' || entity.type === 'mutual_fund')
        .map((entity) => `${entity.displaySymbol} — ${entity.name}`),
    [],
  );

  const displayCurrency = getDisplayCurrency(form.country);
  const totalAssetsPreview = sum(Object.values(form.assets)) + sum(Object.values(form.retirement));
  const totalLiabilitiesPreview = sum(form.loans.map((loan) => loan.outstandingAmount));
  const totalEmiPreview = sum(form.loans.map((loan) => loan.monthlyEmi));
  const monthlyBurnPreview = form.monthlyFixedExpenses + form.monthlyDiscretionaryExpenses + totalEmiPreview;

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

  async function runAnalysis() {
    if (form.analysisMode === 'specific' && !form.targetTicker?.trim()) {
      setError('Enter a stock or mutual fund ticker/name when specific mode is selected.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const [analysisResult] = await Promise.allSettled([
        generatePersonalizedAgenticAnalysis(form, portfolioTxns),
        new Promise((resolve) => window.setTimeout(resolve, MIN_AGENT_RUNTIME_MS)),
      ]);
      if (analysisResult.status === 'rejected') throw analysisResult.reason;
      const nextReport = analysisResult.value;
      setReport(nextReport);
      await Promise.all([setKv(PROFILE_STORAGE_KEY, form), setKv(REPORT_STORAGE_KEY, nextReport)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate personalized analysis.');
    } finally {
      setLoading(false);
    }
  }

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
  const loadingProgress = Math.round(((loadingStepIndex + 1) / PROCESSING_STEPS.length) * 100);
  const activeProcessingStep = PROCESSING_STEPS[loadingStepIndex];
  const recommendationUniverse = report?.recommendationUniverse ?? (report ? inferRecommendationUniverse(report) : null);
  const totalStocksInDataset = recommendationUniverse?.totalStocksInDataset ?? 0;
  const totalMutualFundsInDataset = recommendationUniverse?.totalMutualFundsInDataset ?? 0;
  const eligibleStocks = recommendationUniverse?.eligibleStocks ?? report?.stockRecommendations.length ?? 0;
  const eligibleMutualFunds = recommendationUniverse?.eligibleMutualFunds ?? 0;
  const analyzedSecurities = recommendationUniverse?.analyzedSecurities ?? report?.stockRecommendations.length ?? 0;
  const analyzedIndiaStocks = recommendationUniverse?.analyzedIndiaStocks ?? topPools.indiaStocks.length;
  const analyzedUsStocks = recommendationUniverse?.analyzedUsStocks ?? topPools.usStocks.length;
  const analyzedMutualFunds = recommendationUniverse?.analyzedMutualFunds ?? topPools.mutualFunds.length;
  const universeSourceLabel =
    recommendationUniverse?.universeSource === 'live_index'
      ? 'live market index'
      : recommendationUniverse?.universeSource === 'demo_fallback'
        ? 'bundled demo fallback'
        : 'market index';

  return (
    <div className="space-y-6">
      <SectionCard
        title="Agentic Wealth Architect"
        subtitle="Profile-first market intelligence. The UI starts with your household finances and then moves into stock and fund selection."
        action={
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-sm font-medium text-cyan-700 dark:text-cyan-300">
            <Bot className="h-4 w-4" />
            Personalization Engine
          </div>
        }
      >
        <div className="relative overflow-hidden rounded-[30px] border border-cyan-200/60 bg-gradient-to-br from-cyan-500/10 via-emerald-500/10 to-amber-500/10 p-6 dark:border-cyan-900/40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_35%)]" />
          <div className="relative grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                <Sparkles className="h-3.5 w-3.5" />
                Five-phase agentic flow
              </div>
              <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 dark:text-white md:text-4xl">
                Personal profile first, market recommendations second.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 md:text-base">
                This view now computes investable surplus, debt burden, emergency-fund readiness, risk profile, and portfolio gaps
                before it scores any security. The same ticker or fund can now produce very different output for different people.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <PhaseChip label="Phase 1 • Financial profiling" />
                <PhaseChip label="Phase 2 • Household score" />
                <PhaseChip label="Phase 3 • Security engine + DCF" />
                <PhaseChip label="Phase 4 • Personalized fit" />
                <PhaseChip label="Phase 5 • Actionable report" />
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

      <SectionCard title="Phase 1 — Personal Financial Profiling" subtitle="Build a complete picture of the person before touching any market data.">
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
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
                <FieldShell label="Country">
                  <input
                    value={form.country}
                    onChange={(event) => updateField('country', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-950"
                  />
                </FieldShell>
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

            <div className="rounded-[28px] border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/70">
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
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/70">
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
              </div>
            </div>
          </div>

          <div className="space-y-5 xl:sticky xl:top-[84px] xl:self-start">
            <div className="rounded-[28px] border border-slate-200 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-950/70">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Bot className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                Agent Workflow
              </div>
              <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <li className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">1. Profile your life stage, cash flow, assets, debt, and goals.</li>
                <li className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">2. Compute investable surplus, debt burden, emergency gap, net worth, and risk score.</li>
                <li className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">3. Screen a broad stock and mutual-fund universe, then deep-analyze shortlisted names.</li>
                <li className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">4. Re-score each security through your portfolio gap and life-stage needs.</li>
                <li className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">5. Produce a recommendation, monthly allocation, and a client-friendly PDF report.</li>
              </ol>
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

              <button
                type="button"
                onClick={runAnalysis}
                disabled={loading}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? 'Agent Is Analyzing...' : 'Run Personalized Agent'}
              </button>
              <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                The engine will use your household data to cap or increase security risk, suggest a suitable allocation, and generate a downloadable report.
              </p>
            </div>

            {error ? (
              <div className="rounded-[24px] border border-rose-200 bg-rose-500/10 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:text-rose-300">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </SectionCard>

      {loading ? (
        <SectionCard
          title="Agent In Progress"
          subtitle="The analysis is intentionally staged so it feels like a real research agent, not an instant form submit."
        >
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[30px] border border-cyan-200 bg-gradient-to-br from-cyan-500/10 via-white to-emerald-500/10 p-6 dark:border-cyan-900/40 dark:from-cyan-950/30 dark:via-slate-950 dark:to-emerald-950/20">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">Live agent processing</div>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{activeProcessingStep.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{activeProcessingStep.detail}</p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-cyan-300/60 bg-white/80 text-sm font-semibold text-cyan-700 shadow-sm dark:border-cyan-800 dark:bg-slate-950/60 dark:text-cyan-300">
                  {loadingProgress}%
                </div>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>

              <div className="mt-5 rounded-3xl border border-dashed border-cyan-200 bg-white/70 p-4 dark:border-cyan-900/40 dark:bg-slate-950/60">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Live reasoning feed
                </div>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{PROCESSING_MESSAGES[loadingMessageIndex]}</p>
              </div>
            </div>

            <div className="grid gap-3">
              {PROCESSING_STEPS.map((step, index) => {
                const completed = index < loadingStepIndex;
                const active = index === loadingStepIndex;
                return (
                  <div
                    key={step.title}
                    className={cn(
                      'rounded-[24px] border p-4 transition-all',
                      completed
                        ? 'border-emerald-200 bg-emerald-500/10 dark:border-emerald-900/40'
                        : active
                          ? 'border-cyan-200 bg-cyan-500/10 dark:border-cyan-900/40'
                          : 'border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-950/60',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                          completed
                            ? 'bg-emerald-500 text-white'
                            : active
                              ? 'bg-cyan-500 text-slate-950'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                        )}
                      >
                        {completed ? '✓' : index + 1}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{step.title}</div>
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{step.detail}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>
      ) : null}

      {report ? (
        <>
          <SectionCard
            title="Phase 2 — Personal Financial Score"
            subtitle={`Generated ${formatDateTime(report.generatedAt)} • Portfolio gap and risk capacity were computed before stock selection.`}
            action={<ScorePill value={report.finance.riskProfileScore} recommendation={report.finance.riskProfileLabel} />}
          >
            <div className="grid gap-4 lg:grid-cols-5">
              <MetricCard
                label="Investable Surplus"
                value={`${formatCurrency(report.finance.investableSurplusMonthly, displayCurrency)}/mo`}
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
                value={formatCurrency(report.finance.netWorth, displayCurrency)}
                note="Total assets minus outstanding liabilities."
              />
              <MetricCard
                label="Emergency Gap"
                value={formatCurrency(report.finance.emergencyFundShortfallValue, displayCurrency)}
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

          {primaryStock ? (
            <SectionCard
              title="Phase 3 — Security Analysis Engine"
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
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-4">
                <MetricCard label="Fundamentals" value={`${primaryStock.scores.fundamentals}/100`} note="Growth, quality, leverage, and valuation." />
                <MetricCard label="Technical" value={`${primaryStock.scores.technical}/100`} note="RSI, moving averages, MACD, and volume." tone="slate" />
                <MetricCard label="Sentiment" value={`${primaryStock.scores.sentiment}/100`} note={`${primaryStock.sentiment.label} tone from news and heuristic signals.`} tone="amber" />
                <MetricCard label="Stock Risk" value={`${primaryStock.scores.stockRisk}/100`} note={`${primaryStock.risk.level} standalone risk at the stock level.`} tone="emerald" />
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

          <SectionCard title="Phase 4 — Personalized Fit Scoring" subtitle="Curated top pools: 10 India stocks, 10 US stocks, and 10 mutual funds from the full universe.">
            {primaryStock ? (
              <div className="grid gap-4 lg:grid-cols-4">
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
              </div>
            ) : null}

            {report ? (
              <div className="mt-5 rounded-[24px] border border-dashed border-cyan-200 bg-cyan-500/5 p-4 text-sm text-slate-700 dark:border-cyan-900/40 dark:text-slate-200">
                <div className="font-semibold">Why you are seeing these names</div>
                <p className="mt-2 leading-6">
                  You did not pick a specific security, so the agent screened the eligible global universe for your profile from the{' '}
                  <span className="font-semibold">{universeSourceLabel}</span>. It found{' '}
                  <span className="font-semibold">{totalStocksInDataset}</span> stocks and <span className="font-semibold">{totalMutualFundsInDataset}</span> mutual funds in scope.
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
              />
              <SecurityPoolTable
                title="Best 10 US Stocks"
                subtitle="Top US equities from the full screened universe."
                items={topPools.usStocks}
              />
              <SecurityPoolTable
                title="Best 10 Mutual Funds"
                subtitle="Top mutual funds matched to your profile."
                items={topPools.mutualFunds}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Phase 5 — Final Recommendation"
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
                      {formatCurrency(report.finalRecommendation.suggestedAllocationMonthly, primaryStock?.currency ?? displayCurrency)}/mo
                    </div>
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

                <div className="mt-5 rounded-3xl border border-dashed border-cyan-200 p-4 text-sm leading-6 text-slate-700 dark:border-cyan-900/40 dark:text-slate-200">
                  {report.finalRecommendation.portfolioGapCallout}
                </div>
              </div>

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
