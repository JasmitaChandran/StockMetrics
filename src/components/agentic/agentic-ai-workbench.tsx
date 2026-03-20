'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bot, Brain, Briefcase, LineChart, Loader2, Sparkles } from 'lucide-react';
import { SectionCard } from '@/components/common/section-card';
import { PillToggle } from '@/components/common/pill-toggle';
import { demoUniverse } from '@/lib/data/mock/demo-data';
import { getKv, listPortfolioTxns, listWatchlists, setKv, upsertWatchlist } from '@/lib/storage/repositories';
import type { PortfolioTxn, WatchlistRecord } from '@/lib/storage/idb';
import {
  type AgenticAnalysisReport,
  type AgentIntent,
  type AgenticFormInput,
  type MaritalStatus,
  type MarketPreference,
  type RiskAppetite,
  type StylePreference,
  type InvestmentHorizon,
  generateAgenticAnalysis,
} from '@/lib/agentic/engine';
import { formatCurrency, formatDateTime, formatPercent } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

const STYLE_OPTIONS: Array<{ value: StylePreference; label: string; note: string }> = [
  { value: 'value', label: 'Value', note: 'Prefer lower valuation and margin of safety.' },
  { value: 'growth', label: 'Growth', note: 'Prefer strong revenue/profit expansion.' },
  { value: 'momentum', label: 'Momentum', note: 'Prefer trend strength and technical confirmation.' },
  { value: 'quality', label: 'Quality', note: 'Prefer high ROE/ROCE and stable execution.' },
  { value: 'dividend', label: 'Dividend', note: 'Prefer cash payout and yield support.' },
];

const CONSTRAINT_OPTIONS = [
  'ESG preference',
  'No small caps',
  'India only',
  'US only',
  'Avoid high debt businesses',
  'Exclude cyclical sectors',
];

const ASSET_OPTIONS = ['Real estate', 'High-risk stocks', 'Mutual funds', 'Fixed income', 'Gold/commodities', 'Private/alt assets'];
const LIABILITY_OPTIONS = ['Home loan', 'Car loan', 'Education loan', 'Personal loan', 'Credit card debt'];

const HORIZON_OPTIONS: Array<{ value: InvestmentHorizon; label: string }> = [
  { value: 'short_term', label: 'Short term (0-6 months)' },
  { value: 'medium_term', label: 'Medium term (6-24 months)' },
  { value: 'long_term', label: 'Long term (2+ years)' },
];

const RISK_OPTIONS: Array<{ value: RiskAppetite; label: string }> = [
  { value: 'low', label: 'Low risk' },
  { value: 'moderate', label: 'Moderate risk' },
  { value: 'high', label: 'High risk' },
];

const MARKET_OPTIONS: Array<{ value: MarketPreference; label: string }> = [
  { value: 'india', label: 'India' },
  { value: 'us', label: 'US' },
  { value: 'both', label: 'Both India + US' },
];

const MARITAL_OPTIONS: Array<{ value: MaritalStatus; label: string }> = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'other', label: 'Other' },
];

const INCOME_OPTIONS = [
  'Below ₹5L / $6k',
  '₹5L-₹12L / $6k-$15k',
  '₹12L-₹25L / $15k-$30k',
  '₹25L-₹50L / $30k-$60k',
  'Above ₹50L / $60k+',
];

const INTENT_LABELS: Record<AgentIntent, string> = {
  long_term_ideas: 'Long-term investing ideas',
  short_term_swing: 'Short-term swing analysis',
  valuation_analysis: 'Valuation analysis',
  portfolio_review: 'Portfolio review',
  peer_comparison: 'Peer comparison',
  earnings_event_analysis: 'Earnings/event analysis',
  technical_analysis: 'Technical analysis',
  sector_screening: 'Sector screening',
  risk_diagnostics: 'Risk diagnostics',
  news_sentiment: 'News/sentiment monitoring',
  watchlist_alerts: 'Custom watchlist alerts',
};

function toggleArrayValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function confidenceTone(confidence: 'low' | 'medium' | 'high') {
  if (confidence === 'high') return 'text-emerald-500';
  if (confidence === 'medium') return 'text-amber-500';
  return 'text-rose-500';
}

function recommendationTone(recommendation: 'BUY' | 'HOLD' | 'SELL') {
  if (recommendation === 'BUY') return 'text-emerald-500';
  if (recommendation === 'HOLD') return 'text-amber-500';
  return 'text-rose-500';
}

type ReportTab = 'summary' | 'portfolio' | 'recommendations' | 'deep';
type ThinkingMode = 'beginner' | 'pro' | 'quant';

interface AgenticSnapshot {
  generatedAt: string;
  topSymbol?: string;
  topRecommendation?: 'BUY' | 'HOLD' | 'SELL';
  topScore?: number;
  diversificationScore?: number;
}

function getPrimaryStock(report: AgenticAnalysisReport) {
  return report.preferredStockReport ?? report.suggestedStocks[0] ?? null;
}

export function AgenticAiWorkbench() {
  const [portfolioTxns, setPortfolioTxns] = useState<PortfolioTxn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<AgenticAnalysisReport | null>(null);
  const [activeTab, setActiveTab] = useState<ReportTab>('summary');
  const [thinkingMode, setThinkingMode] = useState<ThinkingMode>('pro');
  const [changeLog, setChangeLog] = useState<string[]>([]);
  const [watchlistStatus, setWatchlistStatus] = useState('');
  const [form, setForm] = useState<AgenticFormInput>({
    goal: 'I want detailed long-term investing ideas with valuation and risk analysis.',
    preferredShareMode: 'no',
    preferredShareSymbol: '',
    stylePreferences: ['quality', 'growth'],
    sectorPreferences: [],
    constraints: [],
    assetsOwned: ['Mutual funds'],
    liabilitiesOwned: [],
    country: 'India',
  });

  useEffect(() => {
    listPortfolioTxns().then((records) => setPortfolioTxns(records));
  }, []);

  const stockSuggestions = useMemo(
    () =>
      demoUniverse
        .filter((entity) => entity.type === 'stock')
        .map((entity) => ({ symbol: entity.symbol, display: entity.displaySymbol, name: entity.name })),
    [],
  );
  const sectorSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          demoUniverse
            .filter((entity) => entity.type === 'stock')
            .map((entity) => entity.sector)
            .filter((sector): sector is string => Boolean(sector)),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [],
  );

  async function runAgenticAnalysis(goalOverride?: string) {
    const effectiveGoal = typeof goalOverride === 'string' ? goalOverride : form.goal;
    if (!effectiveGoal.trim()) {
      setError('Please provide your goal so the agent can detect intent correctly.');
      return;
    }
    if (form.preferredShareMode === 'yes' && !form.preferredShareSymbol?.trim()) {
      setError('You selected preferred share mode. Please provide a stock symbol/name.');
      return;
    }
    setError('');
    setWatchlistStatus('');
    setLoading(true);
    try {
      const input = { ...form, goal: effectiveGoal };
      const generated = await generateAgenticAnalysis(input, portfolioTxns);
      const primary = getPrimaryStock(generated);
      const prev = await getKv<AgenticSnapshot>('agentic:last-run');
      const nextSnapshot: AgenticSnapshot = {
        generatedAt: generated.generatedAt,
        topSymbol: primary?.displaySymbol,
        topRecommendation: primary?.recommendation,
        topScore: primary?.suitabilityScore,
        diversificationScore: generated.portfolio.diversificationScore,
      };
      const changes: string[] = [];
      if (prev) {
        if (prev.topSymbol && nextSnapshot.topSymbol && prev.topSymbol !== nextSnapshot.topSymbol) {
          changes.push(`Top idea changed: ${prev.topSymbol} → ${nextSnapshot.topSymbol}.`);
        }
        if (
          typeof prev.topScore === 'number' &&
          typeof nextSnapshot.topScore === 'number' &&
          Math.abs(nextSnapshot.topScore - prev.topScore) >= 3 &&
          nextSnapshot.topSymbol === prev.topSymbol
        ) {
          const delta = nextSnapshot.topScore - prev.topScore;
          changes.push(`${nextSnapshot.topSymbol} suitability score moved ${delta >= 0 ? '+' : ''}${delta.toFixed(0)} points.`);
        }
        if (
          typeof prev.diversificationScore === 'number' &&
          typeof nextSnapshot.diversificationScore === 'number' &&
          prev.diversificationScore !== nextSnapshot.diversificationScore
        ) {
          const diff = nextSnapshot.diversificationScore - prev.diversificationScore;
          changes.push(`Portfolio diversification score changed ${diff >= 0 ? '+' : ''}${diff} (${prev.diversificationScore} → ${nextSnapshot.diversificationScore}).`);
        }
      } else {
        changes.push('This is your first saved Agentic run in local history.');
      }
      setChangeLog(changes);
      await setKv('agentic:last-run', nextSnapshot);
      if (goalOverride) {
        setForm((prev) => ({ ...prev, goal: goalOverride }));
      }
      setReport(generated);
      setActiveTab('summary');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate agentic report.');
    } finally {
      setLoading(false);
    }
  }

  async function saveAutoWatchlist() {
    if (!report) return;
    const symbols = Array.from(
      new Set(
        [
          report.preferredStockReport?.symbol,
          ...report.suggestedStocks.slice(0, 7).map((stock) => stock.symbol),
        ].filter((symbol): symbol is string => Boolean(symbol)),
      ),
    ).slice(0, 8);
    if (!symbols.length) {
      setWatchlistStatus('No symbols available to save.');
      return;
    }
    const rows = await listWatchlists();
    const existing = rows.find((row) => row.name.toLowerCase() === 'agentic ai picks');
    const record: WatchlistRecord = existing
      ? { ...existing, symbols, updatedAt: new Date().toISOString() }
      : {
          id: crypto.randomUUID(),
          name: 'Agentic AI Picks',
          symbols,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
    await upsertWatchlist(record);
    setWatchlistStatus(`Saved ${symbols.length} symbols to "${record.name}".`);
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Agentic AI Mode"
        subtitle="Full investor-context intelligence engine: intent detection, profile inference, portfolio diagnostics, valuation, sentiment, technicals, risk, and actionable Buy/Hold/Sell output."
        action={
          <div className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
            <Bot className="h-4 w-4 text-accent" /> Agentic Intelligence
          </div>
        }
      >
        <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          <div className="space-y-4 rounded-2xl border border-border bg-card/40 p-4">
            <div>
              <div className="mb-2 text-sm font-semibold">1) Intent Input</div>
              <textarea
                value={form.goal}
                onChange={(event) => setForm((prev) => ({ ...prev, goal: event.target.value }))}
                rows={4}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                placeholder="Tell the agent what you want: long-term ideas, valuation analysis, portfolio review, swing setup, risk diagnostics, etc."
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-slate-500">Preferred Share Mode</span>
                <select
                  value={form.preferredShareMode}
                  onChange={(event) => setForm((prev) => ({ ...prev, preferredShareMode: event.target.value as 'yes' | 'no' }))}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2"
                >
                  <option value="no">No (suggest stocks for me)</option>
                  <option value="yes">Yes (analyze one preferred share)</option>
                </select>
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-slate-500">Preferred Share Symbol / Name</span>
                <input
                  value={form.preferredShareSymbol ?? ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, preferredShareSymbol: event.target.value }))}
                  list="agentic-stock-options"
                  disabled={form.preferredShareMode !== 'yes'}
                  placeholder="e.g., RELIANCE.NS, HDFCBANK, AAPL"
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 disabled:opacity-60"
                />
                <datalist id="agentic-stock-options">
                  {stockSuggestions.map((stock) => (
                    <option key={stock.symbol} value={stock.symbol}>{`${stock.display} — ${stock.name}`}</option>
                  ))}
                </datalist>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm">
                <span className="mb-1 block text-slate-500">Investment Horizon</span>
                <select
                  value={form.investmentHorizon ?? ''}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      investmentHorizon: (event.target.value || undefined) as InvestmentHorizon | undefined,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-card px-3 py-2"
                >
                  <option value="">Auto infer</option>
                  {HORIZON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-500">Risk Appetite</span>
                <select
                  value={form.riskAppetite ?? ''}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      riskAppetite: (event.target.value || undefined) as RiskAppetite | undefined,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-card px-3 py-2"
                >
                  <option value="">Auto infer</option>
                  {RISK_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-500">Market Preference</span>
                <select
                  value={form.marketPreference ?? ''}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      marketPreference: (event.target.value || undefined) as MarketPreference | undefined,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-card px-3 py-2"
                >
                  <option value="">Auto infer</option>
                  {MARKET_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <label className="text-sm">
                <span className="mb-1 block text-slate-500">Capital Amount</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={typeof form.capitalAmount === 'number' ? form.capitalAmount : ''}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    setForm((prev) => ({
                      ...prev,
                      capitalAmount: Number.isFinite(parsed) && event.target.value !== '' ? parsed : undefined,
                    }));
                  }}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2"
                  placeholder="e.g., 1000000"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-500">Age</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={typeof form.age === 'number' ? form.age : ''}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    setForm((prev) => ({ ...prev, age: Number.isFinite(parsed) && event.target.value !== '' ? parsed : undefined }));
                  }}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-500">Marital Status</span>
                <select
                  value={form.maritalStatus ?? ''}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      maritalStatus: (event.target.value || undefined) as MaritalStatus | undefined,
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-card px-3 py-2"
                >
                  <option value="">Not specified</option>
                  {MARITAL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-500">Kids</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={typeof form.kids === 'number' ? form.kids : ''}
                  onChange={(event) => {
                    const parsed = Number(event.target.value);
                    setForm((prev) => ({ ...prev, kids: Number.isFinite(parsed) && event.target.value !== '' ? parsed : undefined }));
                  }}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-slate-500">Country</span>
                <input
                  value={form.country ?? ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-500">Income Bracket</span>
                <select
                  value={form.incomeBracket ?? ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, incomeBracket: event.target.value || undefined }))}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2"
                >
                  <option value="">Not specified</option>
                  {INCOME_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 text-sm text-slate-500">Style Preferences</div>
                <div className="flex flex-wrap gap-2">
                  {STYLE_OPTIONS.map((option) => {
                    const active = form.stylePreferences.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            stylePreferences: toggleArrayValue(prev.stylePreferences, option.value),
                          }))
                        }
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs',
                          active ? 'border-accent/45 bg-accent/10 text-accent' : 'border-border hover:bg-muted',
                        )}
                        title={option.note}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-1 text-sm text-slate-500">Sector Preferences</div>
                <div className="flex max-h-24 flex-wrap gap-2 overflow-auto pr-1">
                  {sectorSuggestions.map((sector) => {
                    const active = form.sectorPreferences.includes(sector);
                    return (
                      <button
                        key={sector}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            sectorPreferences: toggleArrayValue(prev.sectorPreferences, sector),
                          }))
                        }
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs',
                          active ? 'border-accent/45 bg-accent/10 text-accent' : 'border-border hover:bg-muted',
                        )}
                      >
                        {sector}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 text-sm text-slate-500">Constraints</div>
                <div className="flex flex-wrap gap-2">
                  {CONSTRAINT_OPTIONS.map((option) => {
                    const active = form.constraints.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            constraints: toggleArrayValue(prev.constraints, option),
                          }))
                        }
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs',
                          active ? 'border-accent/45 bg-accent/10 text-accent' : 'border-border hover:bg-muted',
                        )}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-sm text-slate-500">Assets Owned</div>
                  <div className="flex flex-wrap gap-2">
                    {ASSET_OPTIONS.map((asset) => {
                      const active = form.assetsOwned.includes(asset);
                      return (
                        <button
                          key={asset}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              assetsOwned: toggleArrayValue(prev.assetsOwned, asset),
                            }))
                          }
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-xs',
                            active ? 'border-accent/45 bg-accent/10 text-accent' : 'border-border hover:bg-muted',
                          )}
                        >
                          {asset}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-sm text-slate-500">Liabilities</div>
                  <div className="flex flex-wrap gap-2">
                    {LIABILITY_OPTIONS.map((liability) => {
                      const active = form.liabilitiesOwned.includes(liability);
                      return (
                        <button
                          key={liability}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              liabilitiesOwned: toggleArrayValue(prev.liabilitiesOwned, liability),
                            }))
                          }
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-xs',
                            active ? 'border-accent/45 bg-accent/10 text-accent' : 'border-border hover:bg-muted',
                          )}
                        >
                          {liability}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => runAgenticAnalysis()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Run Agentic Intelligence
              </button>
              <div className="text-xs text-slate-500">
                Portfolio transactions loaded: <span className="font-semibold text-slate-300">{portfolioTxns.length}</span>
              </div>
            </div>
            {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</div> : null}
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-card/35 p-4">
            <div className="rounded-xl border border-border bg-card/55 p-3">
              <div className="mb-1 inline-flex items-center gap-2 text-sm font-semibold">
                <Brain className="h-4 w-4 text-accent" />
                Agentic Workflow
              </div>
              <ol className="space-y-1.5 text-sm text-slate-300">
                <li>1. Detect your intent from natural language + profile.</li>
                <li>2. Build investor profile (infer missing fields).</li>
                <li>3. Analyze your existing portfolio allocation/risk.</li>
                <li>4. Run multi-factor stock intelligence engine.</li>
                <li>5. Produce detailed report with Buy/Hold/Sell split.</li>
              </ol>
            </div>

            <div className="rounded-xl border border-border bg-card/55 p-3">
              <div className="mb-1 inline-flex items-center gap-2 text-sm font-semibold">
                <Briefcase className="h-4 w-4 text-accent" />
                What Is Included
              </div>
              <ul className="space-y-1 text-sm text-slate-300">
                <li>• Ratios: PE, PB, ROE, ROCE, debt metrics, margins.</li>
                <li>• Statements: revenue/profit trends and growth quality.</li>
                <li>• DCF valuation with fair-value and upside/downside.</li>
                <li>• Sentiment: news-driven directional context.</li>
                <li>• Technical context: trend phase, volatility, drawdown.</li>
                <li>• Peer comparison and watchlist alert triggers.</li>
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-card/55 p-3">
              <div className="mb-1 inline-flex items-center gap-2 text-sm font-semibold">
                <LineChart className="h-4 w-4 text-accent" />
                Output Mode
              </div>
              <div className="text-sm text-slate-300">
                If you provide a preferred share, analysis is focused on that stock. If not, the agent screens and recommends profile-fit stocks.
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {report
        ? (() => {
            const primary = getPrimaryStock(report);
            const isBeginner = thinkingMode === 'beginner';
            const isQuant = thinkingMode === 'quant';
            return (
              <div className="space-y-6">
                <SectionCard
                  title="Recommended Action"
                  subtitle={`Generated at ${formatDateTime(report.generatedAt)} • Confidence ${report.dataQuality.confidenceScore}%`}
                >
                  <div className="sticky top-[86px] z-20 rounded-2xl border border-accent/40 bg-gradient-to-r from-accent/15 via-accent/10 to-transparent p-4 shadow-violet">
                    <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-accent">Primary</div>
                        <div className="mt-1 text-2xl font-semibold text-slate-100">{report.actionPanel.primaryAction}</div>
                        <div className="mt-2 text-sm text-slate-200">
                          Allocation: <span className="font-semibold">{report.actionPanel.allocationPct}%</span> of capital
                        </div>
                        <div className="text-sm text-slate-200">
                          Entry Range:{' '}
                          <span className="font-semibold">
                            {typeof report.actionPanel.entryRange.low === 'number'
                              ? `${report.actionPanel.entryRange.low.toLocaleString('en-IN')} - ${
                                  typeof report.actionPanel.entryRange.high === 'number' ? report.actionPanel.entryRange.high.toLocaleString('en-IN') : report.actionPanel.entryRange.low.toLocaleString('en-IN')
                                }`
                              : 'Use staggered entry'}
                          </span>
                        </div>
                        <div className="text-sm text-slate-200">
                          Time Horizon: <span className="font-semibold">{report.actionPanel.timeHorizonLabel}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">Backup Actions</div>
                        <ul className="mt-2 space-y-1 text-sm text-slate-200">
                          {report.actionPanel.backupActions.map((line) => (
                            <li key={line}>• {line}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">Portfolio Change</div>
                        <ul className="mt-2 space-y-1 text-sm text-slate-200">
                          {report.actionPanel.portfolioChanges.map((line) => (
                            <li key={line}>• {line}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {([
                        ['summary', 'Summary'],
                        ['portfolio', 'Portfolio'],
                        ['recommendations', 'Recommendations'],
                        ['deep', 'Deep Analysis'],
                      ] as Array<[ReportTab, string]>).map(([tab, label]) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setActiveTab(tab)}
                          className={cn(
                            'rounded-xl border px-3 py-1.5 text-sm',
                            activeTab === tab ? 'border-accent/40 bg-accent/15 text-accent' : 'border-border text-slate-300 hover:bg-muted/50',
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <PillToggle<ThinkingMode>
                      options={[
                        { value: 'beginner', label: 'Beginner' },
                        { value: 'pro', label: 'Pro' },
                        { value: 'quant', label: 'Quant' },
                      ]}
                      value={thinkingMode}
                      onChange={setThinkingMode}
                    />
                  </div>
                </SectionCard>

                {activeTab === 'summary' ? (
                  <SectionCard title="Agent Execution" subtitle="What the agent did for you and why you can trust this run.">
                    <p className="text-sm leading-relaxed text-slate-200">{report.summary}</p>
                    <div className="mt-4 grid gap-3 xl:grid-cols-3">
                      <div className="rounded-xl border border-border bg-card/55 p-3">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Execution Log</div>
                        <ul className="space-y-2">
                          {report.executionLog.map((item) => (
                            <li key={item.title} className="rounded-lg border border-border bg-card/50 p-2 text-sm">
                              <div className="flex items-center justify-between font-medium">
                                <span>{item.title}</span>
                                <span className={item.status === 'done' ? 'text-emerald-400' : 'text-amber-400'}>{item.status === 'done' ? 'Done' : 'Watch'}</span>
                              </div>
                              <div className="mt-1 text-xs text-slate-400">{item.detail}</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-xl border border-border bg-card/55 p-3">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Confidence + Data Quality</div>
                        <div className="space-y-1 text-sm text-slate-300">
                          <div>
                            Confidence Score:{' '}
                            <span className={cn('font-semibold', confidenceTone(report.dataQuality.confidenceLabel))}>{report.dataQuality.confidenceScore}%</span>
                          </div>
                          <div>Data Freshness: <span className="font-semibold">{report.dataQuality.dataFreshness}</span></div>
                          <div className="pt-1 text-xs uppercase tracking-wide text-slate-500">Missing Data</div>
                          <ul className="space-y-1 text-xs text-slate-400">
                            {report.dataQuality.missingData.map((line) => (
                              <li key={line}>• {line}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="rounded-xl border border-border bg-card/55 p-3">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">What Changed Since Last Time</div>
                        <ul className="space-y-1 text-sm text-slate-300">
                          {changeLog.length ? (
                            changeLog.map((line) => <li key={line}>• {line}</li>)
                          ) : (
                            <li>• No significant change from previous saved run.</li>
                          )}
                        </ul>
                        <div className="mt-3 text-xs uppercase tracking-wide text-slate-500">Follow-up</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {['Why not AAPL?', 'Show DCF assumptions', 'Reduce risk further'].map((q) => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => runAgenticAnalysis(q)}
                              disabled={loading}
                              className="rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-muted/50 disabled:opacity-60"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-border bg-card/45 p-3">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Detected Intents</div>
                        <div className="space-y-2">
                          {report.intents.map((intent) => (
                            <div key={intent.intent} className="rounded-lg border border-border bg-card/55 p-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-semibold">{INTENT_LABELS[intent.intent]}</span>
                                <span className="text-slate-400">{Math.round(intent.confidence * 100)}%</span>
                              </div>
                              <div className="mt-1 text-xs text-slate-400">{intent.reason}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-border bg-card/45 p-3">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Dynamic Investor Profile</div>
                        <div className="space-y-1.5 text-sm text-slate-300">
                          <div>Horizon: <span className="font-semibold text-slate-100">{report.profile.investmentHorizon.replace('_', ' ')}</span></div>
                          <div>Risk: <span className="font-semibold text-slate-100">{report.profile.riskAppetite}</span></div>
                          <div>Capital: <span className="font-semibold text-slate-100">{report.profile.capitalAmount.toLocaleString('en-IN')}</span></div>
                          <div>Market: <span className="font-semibold text-slate-100">{report.profile.marketPreference.toUpperCase()}</span></div>
                          <div>Style: <span className="font-semibold text-slate-100">{report.profile.stylePreferences.join(', ')}</span></div>
                          <div>Constraints: <span className="font-semibold text-slate-100">{report.profile.constraints.join(', ')}</span></div>
                          <div>Inferred fields: <span className="font-semibold text-slate-100">{report.profile.inferredFields.length ? report.profile.inferredFields.join(', ') : 'None'}</span></div>
                        </div>
                        <div className="mt-2 rounded-lg border border-border bg-card/60 p-2 text-xs text-slate-400">{report.profile.profileNarrative}</div>
                      </div>
                    </div>
                  </SectionCard>
                ) : null}

                {activeTab === 'portfolio' ? (
                  <SectionCard title="Portfolio Diagnostics + Fix Suggestions" subtitle="Actionable diagnostics, not just exposure reporting.">
                    {report.portfolio.hasPortfolio ? (
                      <div className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-4">
                          <div className="rounded-xl border border-border bg-card/50 p-3 text-sm">
                            <div className="text-slate-500">Holdings</div>
                            <div className="mt-1 text-lg font-semibold">{report.portfolio.holdingsCount}</div>
                          </div>
                          <div className="rounded-xl border border-border bg-card/50 p-3 text-sm">
                            <div className="text-slate-500">Diversification</div>
                            <div className="mt-1 text-lg font-semibold">{report.portfolio.diversificationScore}/100</div>
                          </div>
                          <div className="rounded-xl border border-border bg-card/50 p-3 text-sm">
                            <div className="text-slate-500">Invested</div>
                            <div className="mt-1 text-lg font-semibold">{formatCurrency(report.portfolio.totalInvested, 'INR')}</div>
                          </div>
                          <div className="rounded-xl border border-border bg-card/50 p-3 text-sm">
                            <div className="text-slate-500">P&L</div>
                            <div className={cn('mt-1 text-lg font-semibold', report.portfolio.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                              {formatCurrency(report.portfolio.totalPnl, 'INR')} ({formatPercent(report.portfolio.totalPnlPct)})
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-3 xl:grid-cols-2">
                          <div className="rounded-xl border border-border bg-card/50 p-3">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Market Exposure</div>
                            <div className="space-y-1 text-sm text-slate-300">
                              {report.portfolio.marketExposure.map((entry) => (
                                <div key={entry.market} className="flex justify-between">
                                  <span>{entry.market.toUpperCase()}</span>
                                  <span className="font-semibold">{entry.weightPct.toFixed(1)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-xl border border-border bg-card/50 p-3">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Sector Exposure</div>
                            <div className="space-y-1 text-sm text-slate-300">
                              {report.portfolio.sectorExposure.map((entry) => (
                                <div key={entry.sector} className="flex justify-between">
                                  <span>{entry.sector}</span>
                                  <span className="font-semibold">{entry.weightPct.toFixed(1)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-xl border border-border bg-card/50 p-3">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Issues Detected</div>
                            <ul className="space-y-1 text-sm text-slate-300">
                              {report.portfolioFixes.issues.map((line) => (
                                <li key={line}>• {line}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-xl border border-border bg-card/50 p-3">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Suggested Fix</div>
                            <ul className="space-y-1 text-sm text-slate-300">
                              {report.portfolioFixes.suggestedFixes.map((line) => (
                                <li key={line}>• {line}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div className="rounded-xl border border-accent/40 bg-accent/10 p-3">
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">Scenario Simulation (If You Follow Suggestions)</div>
                          <div className="grid gap-3 md:grid-cols-4 text-sm">
                            <div>Diversification: <span className="font-semibold">{report.portfolioFixes.simulatedImpact.diversificationBefore} → {report.portfolioFixes.simulatedImpact.diversificationAfter}</span></div>
                            <div>Expected Volatility: <span className="font-semibold">{report.portfolioFixes.simulatedImpact.expectedVolatilityChangePct >= 0 ? '+' : ''}{report.portfolioFixes.simulatedImpact.expectedVolatilityChangePct}%</span></div>
                            <div>Expected Return: <span className="font-semibold">+{report.portfolioFixes.simulatedImpact.expectedReturnChangePct}%</span></div>
                            <div>Top-sector cap target: <span className="font-semibold">~40%</span></div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-dashed border-border p-3 text-sm text-slate-400">
                          No portfolio records found yet. Suggestions below are profile-first.
                        </div>
                        <ul className="space-y-1 text-sm text-slate-300">
                          {report.portfolioFixes.suggestedFixes.map((line) => (
                            <li key={line}>• {line}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </SectionCard>
                ) : null}

                {activeTab === 'recommendations' ? (
                  <SectionCard
                    title={report.preferredStockReport ? 'Alternative Screened Opportunities' : 'Screened Stock Recommendations'}
                    subtitle="Clear ranking with catalyst, fit, and action probabilities."
                  >
                    {primary ? (
                      <div className="mb-4 grid gap-3 xl:grid-cols-3">
                        <div className="rounded-xl border border-accent/30 bg-accent/10 p-3 xl:col-span-2">
                          <div className="text-xs uppercase tracking-wide text-accent">Top Pick Summary</div>
                          <div className="mt-1 text-lg font-semibold">{primary.displaySymbol} • {primary.recommendation}</div>
                          <div className="mt-1 text-sm text-slate-200">{primary.smartSummary}</div>
                          <div className="mt-2 text-xs text-slate-300">Buy/Hold/Sell: {primary.buyPct}% / {primary.holdPct}% / {primary.sellPct}% • Confidence: {primary.confidenceScore}%</div>
                        </div>
                        <div className="rounded-xl border border-border bg-card/50 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">Why this fits YOU</div>
                          <ul className="mt-2 space-y-1 text-sm text-slate-300">
                            {(isBeginner ? primary.whyFitYou.slice(0, 2) : primary.whyFitYou).map((line) => (
                              <li key={line}>• {line}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : null}

                    <div className="overflow-auto rounded-xl border border-border">
                      <table className="min-w-full text-sm">
                        <thead className="bg-muted/35 text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-3 py-2 text-left">Stock</th>
                            <th className="px-3 py-2 text-right">Score</th>
                            <th className="px-3 py-2 text-right">Recommendation</th>
                            <th className="px-3 py-2 text-right">Buy%</th>
                            <th className="px-3 py-2 text-right">Hold%</th>
                            <th className="px-3 py-2 text-right">Sell%</th>
                            <th className="px-3 py-2 text-right">Conf.</th>
                            <th className="px-3 py-2 text-left">Catalyst / Trigger</th>
                            <th className="px-3 py-2 text-left">Why this fits you</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.suggestedStocks.length ? (
                            report.suggestedStocks.slice(0, 15).map((stock) => (
                              <tr key={stock.symbol} className="border-t border-border">
                                <td className="px-3 py-2">
                                  <div className="font-semibold">{stock.displaySymbol}</div>
                                  <div className="text-xs text-slate-500">{stock.name}</div>
                                </td>
                                <td className="px-3 py-2 text-right font-semibold">{stock.suitabilityScore}</td>
                                <td className={cn('px-3 py-2 text-right font-semibold', recommendationTone(stock.recommendation))}>{stock.recommendation}</td>
                                <td className="px-3 py-2 text-right">{stock.buyPct}%</td>
                                <td className="px-3 py-2 text-right">{stock.holdPct}%</td>
                                <td className="px-3 py-2 text-right">{stock.sellPct}%</td>
                                <td className="px-3 py-2 text-right">{stock.confidenceScore}%</td>
                                <td className="px-3 py-2 text-xs text-slate-300">{stock.catalysts[0] ?? stock.smartSummary}</td>
                                <td className="px-3 py-2 text-xs text-slate-400">{stock.whyFitYou[0] ?? stock.smartSummary}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={9} className="px-3 py-4 text-center text-slate-500">
                                No stock matched all active constraints. Relax constraints and rerun.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={saveAutoWatchlist}
                        className="rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent hover:bg-accent/20"
                      >
                        Build Auto Watchlist
                      </button>
                      {watchlistStatus ? <div className="text-sm text-slate-300">{watchlistStatus}</div> : null}
                    </div>
                  </SectionCard>
                ) : null}

                {activeTab === 'deep' ? (
                  primary ? (
                    <SectionCard
                      title={`Deep Analysis: ${primary.displaySymbol}`}
                      subtitle={`${primary.name} • ${primary.sector} • ${primary.industry} • Mode: ${thinkingMode.toUpperCase()}`}
                    >
                      <div className="space-y-3">
                        <details className="rounded-xl border border-border bg-card/45 p-3">
                          <summary className="cursor-pointer text-sm font-semibold">Business Fit + Decision</summary>
                          <div className="mt-3 space-y-2 text-sm text-slate-300">
                            <div className="rounded-lg border border-border bg-card/60 p-2">{primary.smartSummary}</div>
                            <div>Recommendation: <span className={cn('font-semibold', recommendationTone(primary.recommendation))}>{primary.recommendation}</span></div>
                            <div>Decision engine: {primary.decisionPlan.explanation}</div>
                            <div>Buy/Hold/Sell: {primary.buyPct}% / {primary.holdPct}% / {primary.sellPct}%</div>
                            <ul className="space-y-1">{(isBeginner ? primary.whyFitYou.slice(0, 2) : primary.whyFitYou).map((line) => <li key={line}>• {line}</li>)}</ul>
                          </div>
                        </details>

                        <details className="rounded-xl border border-border bg-card/45 p-3">
                          <summary className="cursor-pointer text-sm font-semibold">Risk Radar</summary>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div className="rounded-lg border border-border bg-card/60 p-2 text-sm">
                              Overall Risk: <span className="font-semibold">{primary.riskRadar.overall}</span>
                            </div>
                            <div className="rounded-lg border border-border bg-card/60 p-2 text-sm">
                              Market / Sector / Valuation: <span className="font-semibold">{primary.riskRadar.marketRisk} / {primary.riskRadar.sectorRisk} / {primary.riskRadar.valuationRisk}</span>
                            </div>
                            <div className="rounded-lg border border-border bg-card/60 p-2 text-sm sm:col-span-2">
                              {primary.riskInsights[0]}
                            </div>
                          </div>
                        </details>

                        <details className="rounded-xl border border-border bg-card/45 p-3">
                          <summary className="cursor-pointer text-sm font-semibold">Fundamentals + Valuation</summary>
                          <div className="mt-3 grid gap-3 xl:grid-cols-2 text-sm text-slate-300">
                            <ul className="space-y-1">{(isBeginner ? primary.ratioInsights.slice(0, 2) : primary.ratioInsights).map((line) => <li key={line}>• {line}</li>)}</ul>
                            <ul className="space-y-1">{(isBeginner ? primary.statementInsights.slice(0, 2) : primary.statementInsights).map((line) => <li key={line}>• {line}</li>)}</ul>
                            <ul className="space-y-1 xl:col-span-2">{(isBeginner ? primary.valuationInsights.slice(0, 2) : primary.valuationInsights).map((line) => <li key={line}>• {line}</li>)}</ul>
                            <div className="rounded-lg border border-border bg-card/60 p-2 text-xs xl:col-span-2">
                              DCF verdict: <span className="font-semibold uppercase">{primary.dcf.verdict}</span> ({primary.dcf.confidence}) •
                              Fair value/share:{' '}
                              {typeof primary.dcf.fairValuePerShare === 'number' ? primary.dcf.fairValuePerShare.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : 'N/A'} • Upside:{' '}
                              {typeof primary.dcf.upsidePct === 'number' ? `${primary.dcf.upsidePct.toFixed(1)}%` : 'N/A'}
                            </div>
                          </div>
                        </details>

                        <details className="rounded-xl border border-border bg-card/45 p-3">
                          <summary className="cursor-pointer text-sm font-semibold">Forecast + Scenarios + Triggers</summary>
                          <div className="mt-3 grid gap-3 xl:grid-cols-2 text-sm text-slate-300">
                            <ul className="space-y-1">{(isBeginner ? primary.forecastInsights.slice(0, 2) : primary.forecastInsights).map((line) => <li key={line}>• {line}</li>)}</ul>
                            <ul className="space-y-1">{(isBeginner ? primary.scenarioInsights.slice(0, 2) : primary.scenarioInsights).map((line) => <li key={line}>• {line}</li>)}</ul>
                            <ul className="space-y-1 xl:col-span-2">{primary.entryExitInsights.map((line) => <li key={line}>• {line}</li>)}</ul>
                          </div>
                        </details>

                        <details className="rounded-xl border border-border bg-card/45 p-3">
                          <summary className="cursor-pointer text-sm font-semibold">Sentiment + Trend + Peer + Alerts</summary>
                          <div className="mt-3 grid gap-3 xl:grid-cols-2 text-sm text-slate-300">
                            <ul className="space-y-1">{(isBeginner ? primary.sentimentInsights.slice(0, 2) : primary.sentimentInsights).map((line) => <li key={line}>• {line}</li>)}</ul>
                            <ul className="space-y-1">{(isBeginner ? primary.trendCycleInsights.slice(0, 3) : primary.trendCycleInsights).map((line) => <li key={line}>• {line}</li>)}</ul>
                            <ul className="space-y-1">{(isBeginner ? primary.peerInsights.slice(0, 2) : primary.peerInsights).map((line) => <li key={line}>• {line}</li>)}</ul>
                            <ul className="space-y-1">{(isBeginner ? primary.alerts.slice(0, 3) : primary.alerts).map((line) => <li key={line}>• {line}</li>)}</ul>
                          </div>
                        </details>

                        {isQuant ? (
                          <details className="rounded-xl border border-border bg-card/45 p-3">
                            <summary className="cursor-pointer text-sm font-semibold">Quant Snapshot</summary>
                            <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
                              <div className="rounded-lg border border-border bg-card/60 p-2">Growth score: <span className="font-semibold">{primary.quantSnapshot.growthScore}</span></div>
                              <div className="rounded-lg border border-border bg-card/60 p-2">Quality score: <span className="font-semibold">{primary.quantSnapshot.qualityScore}</span></div>
                              <div className="rounded-lg border border-border bg-card/60 p-2">Value score: <span className="font-semibold">{primary.quantSnapshot.valueScore}</span></div>
                              <div className="rounded-lg border border-border bg-card/60 p-2">Momentum score: <span className="font-semibold">{primary.quantSnapshot.momentumScore}</span></div>
                              <div className="rounded-lg border border-border bg-card/60 p-2">Style score: <span className="font-semibold">{primary.quantSnapshot.styleScore}</span></div>
                              <div className="rounded-lg border border-border bg-card/60 p-2">Sentiment score: <span className="font-semibold">{primary.quantSnapshot.sentimentScore}</span></div>
                              <div className="rounded-lg border border-border bg-card/60 p-2">Risk penalty: <span className="font-semibold">{primary.quantSnapshot.riskPenalty}</span></div>
                              <div className="rounded-lg border border-border bg-card/60 p-2">Personal adjustment: <span className="font-semibold">{primary.quantSnapshot.personalAdjustment}</span></div>
                              <div className="rounded-lg border border-border bg-card/60 p-2">Coverage count: <span className="font-semibold">{primary.quantSnapshot.coverageCount}</span></div>
                            </div>
                          </details>
                        ) : null}
                      </div>
                    </SectionCard>
                  ) : (
                    <SectionCard title="Deep Analysis" subtitle="No primary stock available for deep analysis in this run.">
                      <div className="rounded-xl border border-dashed border-border p-3 text-sm text-slate-400">Adjust constraints or provide a preferred share and rerun.</div>
                    </SectionCard>
                  )
                ) : null}
              </div>
            );
          })()
        : null}
    </div>
  );
}
