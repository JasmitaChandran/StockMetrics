import type { FinancialStatementTable, ShareholdingBreakdown } from './fundamentals';
import type { HistorySeries, NewsItem } from './market';

export type InsightConfidence = 'low' | 'medium' | 'high';

export interface SentimentDriver {
  tone: 'positive' | 'negative' | 'neutral';
  detail: string;
}

export interface SentimentSummary {
  score: number;
  label: 'Bullish' | 'Bearish' | 'Neutral';
  buyProbability: number;
  holdProbability: number;
  sellProbability: number;
  confidence: InsightConfidence;
  buyBias: 'Strong Bullish' | 'Mild Bullish' | 'Balanced' | 'Mild Bearish' | 'Strong Bearish';
  suggestedAction: string;
  drivers: SentimentDriver[];
  rationale: string[];
}

export interface RiskAnalysis {
  volatility?: number;
  maxDrawdown?: number;
  beta?: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  confidence: InsightConfidence;
  marketComparison?: string;
  decisionGuide: string[];
  notes: string[];
}

export interface TrendPeriod {
  start: string;
  end: string;
  returnPct: number;
  type: 'bull' | 'bear';
  durationDays?: number;
  phaseLabel?: string;
  context?: string;
}

export interface FraudFlag {
  id: string;
  severity: 'low' | 'medium' | 'high';
  riskScore: number;
  title: string;
  detail: string;
  suggestedAction: string;
}

export interface ForecastPoint {
  period: string;
  sales?: number;
  profit?: number;
  salesGrowthPct?: number;
  profitGrowthPct?: number;
  confidence: InsightConfidence;
  bestCaseSales?: number;
  worstCaseSales?: number;
  bestCaseProfit?: number;
  worstCaseProfit?: number;
}

export interface ProsCons {
  pros: string[];
  cons: string[];
  netImpact: 'Positive' | 'Slightly Positive' | 'Neutral' | 'Negative';
}

export interface TrendSummary {
  averageBullDurationDays?: number;
  averageBearDurationDays?: number;
  currentPhaseLabel: string;
  currentPhaseProbability: number;
}

export interface DecisionEngine {
  recommendation: 'Buy' | 'Hold' | 'Reduce';
  explanation: string;
  buyBelow?: number;
  sellAbove?: number;
  stopLoss?: number;
  confidence: InsightConfidence;
}

export interface ExplainabilityBreakdown {
  driver: 'Financials' | 'Sentiment' | 'Technical Trend';
  weight: number;
  detail: string;
}

export interface HorizonInsight {
  horizon: 'Short-term (0-3M)' | 'Mid-term (3-12M)' | 'Long-term (1-3Y)';
  stance: 'Positive' | 'Neutral' | 'Cautious';
  detail: string;
}

export interface EntryExitSignals {
  buyZoneLow?: number;
  buyZoneHigh?: number;
  resistance?: number;
  breakoutProbability: number;
  note: string;
}

export interface ScenarioInsight {
  scenario: string;
  expectedImpact: string;
  riskChange: string;
}

export interface AiInsights {
  confidence: InsightConfidence;
  overview: string;
  trendPeriods: TrendPeriod[];
  trendSummary: TrendSummary;
  risk: RiskAnalysis;
  fraudFlags: FraudFlag[];
  sentiment: SentimentSummary;
  forecast: ForecastPoint[];
  forecastAssumption: string;
  scenarioInsights: ScenarioInsight[];
  decisionEngine: DecisionEngine;
  explainability: ExplainabilityBreakdown[];
  horizonInsights: HorizonInsight[];
  entryExit: EntryExitSignals;
  prosCons: ProsCons;
  peerSignals: string[];
  patternSignals: string[];
  alertSuggestions: string[];
}

export interface BeginnerAssessment {
  recommendation: 'Yes' | 'No' | 'Neutral';
  buyScore: 1 | 2 | 3 | 4 | 5;
  reasons: string[];
  simpleChecks: Array<{ label: string; status: 'good' | 'watch' | 'bad'; explanation: string }>;
  disclaimer: string;
}

export interface StatementSummaryInput {
  table: FinancialStatementTable;
  currentView: 'consolidated' | 'standalone';
}

export interface StatementSummaryOutput {
  title: string;
  bullets: string[];
  confidence: 'low' | 'medium' | 'high';
}

export interface PeerSuggestionResult {
  peers: string[];
  reason: string;
}

export interface AiContextInput {
  companyName: string;
  symbol: string;
  market: string;
  history?: HistorySeries;
  statements?: FinancialStatementTable[];
  shareholding?: ShareholdingBreakdown;
  news?: NewsItem[];
  metrics?: Array<{ key: string; label: string; value: number }>;
}

export interface AiProvider {
  id: string;
  name: string;
  summarizeStatement(input: StatementSummaryInput): Promise<StatementSummaryOutput>;
  generateInsights(input: AiContextInput): Promise<AiInsights>;
  beginnerAssessment(input: AiContextInput): Promise<BeginnerAssessment>;
  suggestPeers(input: AiContextInput): Promise<PeerSuggestionResult>;
  answerLearningQuestion(input: { question: string; docs: string[] }): Promise<{ answer: string; sources: string[] }>;
  parseScreenerQuery(input: { query: string }): Promise<{ filters: ParsedScreenFilter[]; explanation: string }>;
}

export type ComparisonOp = '>' | '<' | '>=' | '<=' | '=' | 'contains';

export interface ParsedScreenFilter {
  field: string;
  op: ComparisonOp;
  value: string | number;
}
