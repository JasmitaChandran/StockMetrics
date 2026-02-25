import type { MetricValue } from '@/types';

export const METRIC_LABELS: Record<string, string> = {
  sales: 'Sales',
  opm: 'OPM',
  pat: 'Profit after tax',
  marketCap: 'Market Capitalization',
  salesLatestQuarter: 'Sales latest quarter',
  patLatestQuarter: 'Profit after tax latest quarter',
  yoyQuarterlySalesGrowth: 'YOY Quarterly sales growth',
  yoyQuarterlyProfitGrowth: 'YOY Quarterly profit growth',
  pe: 'Price to Earning',
  dividendYield: 'Dividend yield',
  pb: 'Price to book value',
  roce: 'Return on capital employed',
  roa: 'Return on assets',
  debtToEquity: 'Debt to equity',
  roe: 'Return on equity',
  eps: 'EPS',
  debt: 'Debt',
  promoterHolding: 'Promoter holding',
  changeInPromoterHolding: 'Change in promoter holding',
  earningsYield: 'Earnings yield',
  pledgedPercentage: 'Pledged percentage',
  industryPe: 'Industry PE',
  salesGrowth: 'Sales growth',
  profitGrowth: 'Profit growth',
  currentPrice: 'Current price',
  priceToSales: 'Price to Sales',
  priceToFcf: 'Price to Free Cash Flow',
  evEbitda: 'EV/EBITDA',
  enterpriseValue: 'Enterprise Value',
  currentRatio: 'Current ratio',
  interestCoverage: 'Interest Coverage Ratio',
  pegRatio: 'PEG Ratio',
  return3m: 'Return over 3 months',
  return6m: 'Return over 6 months',
};

export function mapMetricEntries(
  input: Record<string, number | null | undefined>,
  currency: 'USD' | 'INR',
): MetricValue[] {
  return Object.entries(METRIC_LABELS)
    .map(([key, label]) => {
      const value = input[key];
      if (value === null || value === undefined || Number.isNaN(value)) return null;
      const isCurrency = /sales|pat|marketCap|debt|currentPrice|enterpriseValue/i.test(key);
      const isPercent = /yield|growth|holding|return|opm|roce|roa|roe|pledged/i.test(key);
      return {
        key,
        label,
        value,
        unit: isCurrency ? 'currency' : isPercent ? 'percent' : 'ratio',
        currency: isCurrency ? currency : undefined,
      } satisfies MetricValue;
    })
    .filter(Boolean) as MetricValue[];
}
