import type { FinancialStatementTable, ShareholdingBreakdown } from './fundamentals';
import type { HistorySeries, NewsItem } from './market';

export interface SentimentSummary {
  score: number;
  label: 'Bullish' | 'Bearish' | 'Neutral';
  buyProbability: number;
  holdProbability: number;
  sellProbability: number;
  rationale: string[];
}

export interface RiskAnalysis {
  volatility?: number;
  maxDrawdown?: number;
  beta?: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  notes: string[];
}

export interface TrendPeriod {
  start: string;
  end: string;
  returnPct: number;
  type: 'bull' | 'bear';
}

export interface FraudFlag {
  id: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  detail: string;
}

export interface ForecastPoint {
  period: string;
  sales?: number;
  profit?: number;
}

export interface ProsCons {
  pros: string[];
  cons: string[];
}

export interface AiInsights {
  trendPeriods: TrendPeriod[];
  risk: RiskAnalysis;
  fraudFlags: FraudFlag[];
  sentiment: SentimentSummary;
  forecast: ForecastPoint[];
  prosCons: ProsCons;
}

export interface BeginnerAssessment {
  verdict: 'Green' | 'Yellow' | 'Red';
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
