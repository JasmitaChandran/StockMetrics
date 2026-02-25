import { describe, expect, it } from 'vitest';
import { buildBeginnerAssessment, generateAiInsights, parseScreenerQueryHeuristic } from '@/lib/ai/heuristics';
import type { AiContextInput } from '@/types';

function makeHistory() {
  const points = Array.from({ length: 120 }, (_, i) => ({
    ts: new Date(Date.UTC(2025, 0, 1 + i)).toISOString(),
    close: 100 + i * 0.5 + Math.sin(i / 8) * 3,
  }));
  return { symbol: 'TEST', currency: 'USD' as const, source: 'test', points };
}

describe('heuristic AI', () => {
  it('parses common screener phrases into filters', () => {
    const parsed = parseScreenerQueryHeuristic('Show profitable low debt companies with rising sales and high ROE');
    const fields = parsed.filters.map((f) => f.field);
    expect(fields).toContain('pat');
    expect(fields).toContain('debtToEquity');
    expect(fields).toContain('salesGrowth');
    expect(fields).toContain('roe');
  });

  it('generates insights and beginner assessment without paid APIs', () => {
    const ctx: AiContextInput = {
      companyName: 'Test Co',
      symbol: 'TEST',
      market: 'us',
      history: makeHistory(),
      metrics: [
        { key: 'salesGrowth', label: 'Sales growth', value: 12 },
        { key: 'profitGrowth', label: 'Profit growth', value: 15 },
        { key: 'debtToEquity', label: 'Debt to equity', value: 0.6 },
        { key: 'roe', label: 'ROE', value: 18 },
        { key: 'pe', label: 'P/E', value: 18 },
        { key: 'industryPe', label: 'Industry PE', value: 22 },
      ],
      news: [
        {
          id: '1',
          title: 'Test Co reports strong growth and profit beat',
          url: 'https://example.com',
          source: 'Example',
        },
      ],
    };

    const insights = generateAiInsights(ctx);
    const beginner = buildBeginnerAssessment(ctx);

    expect(insights.risk.notes.length).toBeGreaterThan(0);
    expect(['Bullish', 'Neutral', 'Bearish']).toContain(insights.sentiment.label);
    expect(beginner.verdict).toBe('Green');
    expect(beginner.simpleChecks.length).toBeGreaterThan(0);
  });
});
