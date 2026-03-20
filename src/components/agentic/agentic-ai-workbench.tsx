'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bot, Brain, Briefcase, LineChart, Loader2, Sparkles } from 'lucide-react';
import { SectionCard } from '@/components/common/section-card';
import { demoUniverse } from '@/lib/data/mock/demo-data';
import { listPortfolioTxns } from '@/lib/storage/repositories';
import type { PortfolioTxn } from '@/lib/storage/idb';
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

export function AgenticAiWorkbench() {
  const [portfolioTxns, setPortfolioTxns] = useState<PortfolioTxn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<AgenticAnalysisReport | null>(null);
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

  async function runAgenticAnalysis() {
    if (!form.goal.trim()) {
      setError('Please provide your goal so the agent can detect intent correctly.');
      return;
    }
    if (form.preferredShareMode === 'yes' && !form.preferredShareSymbol?.trim()) {
      setError('You selected preferred share mode. Please provide a stock symbol/name.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const generated = await generateAgenticAnalysis(form, portfolioTxns);
      setReport(generated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate agentic report.');
    } finally {
      setLoading(false);
    }
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
                onClick={runAgenticAnalysis}
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

      {report ? (
        <div className="space-y-6">
          <SectionCard title="Agentic Summary" subtitle={`Generated at ${formatDateTime(report.generatedAt)}`}>
            <p className="text-sm leading-relaxed text-slate-200">{report.summary}</p>
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

          <SectionCard title="Portfolio Diagnostics" subtitle="Agentic review of your current holdings and diversification profile.">
            {report.portfolio.hasPortfolio ? (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-border bg-card/50 p-3 text-sm">
                    <div className="text-slate-500">Holdings</div>
                    <div className="mt-1 text-lg font-semibold">{report.portfolio.holdingsCount}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-card/50 p-3 text-sm">
                    <div className="text-slate-500">Diversification Score</div>
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
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-card/50 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Market Exposure</div>
                    <div className="space-y-1 text-sm">
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
                    <div className="space-y-1 text-sm">
                      {report.portfolio.sectorExposure.map((entry) => (
                        <div key={entry.sector} className="flex justify-between">
                          <span>{entry.sector}</span>
                          <span className="font-semibold">{entry.weightPct.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <ul className="space-y-1 text-sm text-slate-300">
                  {report.portfolio.notes.map((note) => (
                    <li key={note}>• {note}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-3 text-sm text-slate-400">
                No portfolio records found yet. The report is generated from your profile and selected market universe.
              </div>
            )}
          </SectionCard>

          {report.preferredStockReport ? (
            <SectionCard
              title={`Preferred Share Deep Report: ${report.preferredStockReport.displaySymbol}`}
              subtitle={`${report.preferredStockReport.name} • ${report.preferredStockReport.sector} • ${report.preferredStockReport.industry}`}
            >
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-xl border border-border bg-card/50 p-3">
                    <div className="text-xs text-slate-500">Suitability Score</div>
                    <div className="mt-1 text-xl font-semibold">{report.preferredStockReport.suitabilityScore}/100</div>
                  </div>
                  <div className="rounded-xl border border-border bg-card/50 p-3">
                    <div className="text-xs text-slate-500">Recommendation</div>
                    <div className={cn('mt-1 text-xl font-semibold', recommendationTone(report.preferredStockReport.recommendation))}>
                      {report.preferredStockReport.recommendation}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card/50 p-3">
                    <div className="text-xs text-slate-500">Confidence</div>
                    <div className={cn('mt-1 text-xl font-semibold capitalize', confidenceTone(report.preferredStockReport.confidence))}>
                      {report.preferredStockReport.confidence}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card/50 p-3">
                    <div className="text-xs text-slate-500">Buy / Hold / Sell</div>
                    <div className="mt-1 text-lg font-semibold">
                      {report.preferredStockReport.buyPct}% / {report.preferredStockReport.holdPct}% / {report.preferredStockReport.sellPct}%
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card/50 p-3">
                    <div className="text-xs text-slate-500">Net Impact</div>
                    <div
                      className={cn(
                        'mt-1 text-lg font-semibold',
                        report.preferredStockReport.prosConsNetImpact === 'Positive' || report.preferredStockReport.prosConsNetImpact === 'Slightly Positive'
                          ? 'text-emerald-400'
                          : report.preferredStockReport.prosConsNetImpact === 'Neutral'
                            ? 'text-amber-400'
                            : 'text-rose-400',
                      )}
                    >
                      {report.preferredStockReport.prosConsNetImpact}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm leading-relaxed text-slate-100">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">AI Smart Summary</div>
                  {report.preferredStockReport.smartSummary}
                </div>

                <div className="rounded-xl border border-border bg-card/60 p-3 text-sm leading-relaxed text-slate-200">
                  {report.preferredStockReport.detailedSummary}
                </div>

                <div className="grid gap-3 xl:grid-cols-2">
                  <div className="rounded-xl border border-border bg-card/50 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Recommendation + Strategy</div>
                    <div className="space-y-1 text-sm text-slate-300">
                      <div>
                        Recommendation: <span className="font-semibold">{report.preferredStockReport.decisionPlan.recommendation}</span>
                      </div>
                      <div>
                        Confidence:{' '}
                        <span className={cn('font-semibold capitalize', confidenceTone(report.preferredStockReport.decisionPlan.confidence))}>
                          {report.preferredStockReport.decisionPlan.confidence}
                        </span>
                      </div>
                      <div className="rounded-lg border border-border bg-card/55 p-2 leading-relaxed">{report.preferredStockReport.decisionPlan.explanation}</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-lg border border-border bg-card/55 p-2">
                          Buy below
                          <div className="mt-1 text-sm font-semibold">
                            {typeof report.preferredStockReport.decisionPlan.buyBelow === 'number'
                              ? report.preferredStockReport.decisionPlan.buyBelow.toLocaleString('en-IN')
                              : 'N/A'}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border bg-card/55 p-2">
                          Sell above
                          <div className="mt-1 text-sm font-semibold">
                            {typeof report.preferredStockReport.decisionPlan.sellAbove === 'number'
                              ? report.preferredStockReport.decisionPlan.sellAbove.toLocaleString('en-IN')
                              : 'N/A'}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border bg-card/55 p-2">
                          Stop loss
                          <div className="mt-1 text-sm font-semibold">
                            {typeof report.preferredStockReport.decisionPlan.stopLoss === 'number'
                              ? report.preferredStockReport.decisionPlan.stopLoss.toLocaleString('en-IN')
                              : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card/50 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Explainability (Why This Decision)</div>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {report.preferredStockReport.explainabilityInsights.map((line) => (
                        <li key={line}>• {line}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-border bg-card/50 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Trend & Bull/Bear Cycles</div>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {report.preferredStockReport.trendCycleInsights.map((line) => (
                        <li key={line}>• {line}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-border bg-card/50 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Forecast + Assumptions</div>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {report.preferredStockReport.forecastInsights.map((line) => (
                        <li key={line}>• {line}</li>
                      ))}
                    </ul>
                    {report.preferredStockReport.forecastRows.length ? (
                      <div className="mt-2 overflow-auto rounded-lg border border-border">
                        <table className="min-w-full text-xs">
                          <thead className="bg-muted/35 text-slate-500">
                            <tr>
                              <th className="px-2 py-1.5 text-left">Period</th>
                              <th className="px-2 py-1.5 text-right">Sales</th>
                              <th className="px-2 py-1.5 text-right">Profit</th>
                              <th className="px-2 py-1.5 text-right">Confidence</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.preferredStockReport.forecastRows.map((row) => (
                              <tr key={row.period} className="border-t border-border">
                                <td className="px-2 py-1.5">{row.period}</td>
                                <td className="px-2 py-1.5 text-right">
                                  {typeof row.sales === 'number' ? row.sales.toLocaleString('en-IN') : 'N/A'}
                                </td>
                                <td className="px-2 py-1.5 text-right">
                                  {typeof row.profit === 'number' ? row.profit.toLocaleString('en-IN') : 'N/A'}
                                </td>
                                <td className={cn('px-2 py-1.5 text-right capitalize', confidenceTone(row.confidence))}>{row.confidence}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-border bg-card/50 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Ratio Analysis</div>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {report.preferredStockReport.ratioInsights.map((line) => (
                        <li key={line}>• {line}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-border bg-card/50 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Income Statement Analysis</div>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {report.preferredStockReport.statementInsights.map((line) => (
                        <li key={line}>• {line}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-border bg-card/50 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Valuation & DCF</div>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {report.preferredStockReport.valuationInsights.map((line) => (
                        <li key={line}>• {line}</li>
                      ))}
                    </ul>
                    <div className="mt-2 rounded-lg border border-border bg-card/60 p-2 text-xs text-slate-300">
                      <div>DCF verdict: <span className="font-semibold uppercase">{report.preferredStockReport.dcf.verdict}</span> ({report.preferredStockReport.dcf.confidence} confidence)</div>
                      <div>Growth: {report.preferredStockReport.dcf.growthRatePct.toFixed(1)}% | Discount: {report.preferredStockReport.dcf.discountRatePct.toFixed(1)}%</div>
                      <div>
                        Fair Value/Share:{' '}
                        {typeof report.preferredStockReport.dcf.fairValuePerShare === 'number'
                          ? report.preferredStockReport.dcf.fairValuePerShare.toLocaleString('en-IN', { maximumFractionDigits: 2 })
                          : 'N/A'}
                        {' | '}Upside:
                        {typeof report.preferredStockReport.dcf.upsidePct === 'number' ? ` ${report.preferredStockReport.dcf.upsidePct.toFixed(1)}%` : ' N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card/50 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Sentiment + Technical</div>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {[...report.preferredStockReport.sentimentInsights, ...report.preferredStockReport.technicalInsights]
                        .slice(0, 10)
                        .map((line) => (
                          <li key={line}>• {line}</li>
                        ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-border bg-card/50 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Risk + Governance Flags</div>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {report.preferredStockReport.riskInsights.map((line) => (
                        <li key={line}>• {line}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-border bg-card/50 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Peer + Event Analysis</div>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {[...report.preferredStockReport.peerInsights, ...report.preferredStockReport.eventInsights].map((line) => (
                        <li key={line}>• {line}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-border bg-card/50 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Time Horizon + Scenarios</div>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {[...report.preferredStockReport.horizonInsights, ...report.preferredStockReport.scenarioInsights].map((line) => (
                        <li key={line}>• {line}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-border bg-card/50 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Entry / Exit Signals</div>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {report.preferredStockReport.entryExitInsights.map((line) => (
                        <li key={line}>• {line}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-border bg-card/50 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Suggested Alerts</div>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {report.preferredStockReport.alerts.map((line) => (
                        <li key={line}>• {line}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard
            title={report.preferredStockReport ? 'Alternative Screened Opportunities' : 'Screened Stock Recommendations'}
            subtitle="If no preferred share is provided, these become your primary suggestions."
          >
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
                    <th className="px-3 py-2 text-left">Why It Fits</th>
                  </tr>
                </thead>
                <tbody>
                  {report.suggestedStocks.length ? (
                    report.suggestedStocks.map((stock) => (
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
                        <td className="px-3 py-2 text-xs text-slate-400">{stock.smartSummary}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                        No stock matched all active constraints. Relax constraints and rerun.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}
