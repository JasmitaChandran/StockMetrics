export type StatementKind = 'profitLoss' | 'quarterly' | 'balanceSheet' | 'cashFlow';

export interface MetricValue {
  key: string;
  label: string;
  value: number;
  unit?: 'currency' | 'percent' | 'ratio' | 'count';
  currency?: 'USD' | 'INR';
  precision?: number;
  asOf?: string;
  source?: string;
}

export interface MetricGroup {
  metrics: MetricValue[];
  missingKeys?: string[];
}

export interface StatementRow {
  label: string;
  valuesByYear: Record<string, number | null>;
}

export interface FinancialStatementTable {
  kind: StatementKind;
  title: string;
  years: string[];
  rows: StatementRow[];
  consolidatedAvailable: boolean;
  standaloneAvailable: boolean;
  activeViewDefault: 'consolidated' | 'standalone';
  source: string;
}

export interface ShareholdingBreakdown {
  promoters?: number;
  fiis?: number;
  diis?: number;
  government?: number;
  public?: number;
  others?: number;
  asOf?: string;
}

export interface FundamentalsBundle {
  companyId: string;
  companyName: string;
  summary?: string;
  website?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  currency: 'USD' | 'INR';
  keyMetrics: MetricValue[];
  statements: FinancialStatementTable[];
  shareholding?: ShareholdingBreakdown;
  peerSymbols?: string[];
  source: string;
  notes?: string[];
}
