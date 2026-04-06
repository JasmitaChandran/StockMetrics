import { describe, expect, it } from 'vitest';
import { buildAlertMessage, evaluatePriceAlert } from '@/lib/alerts/logic';

describe('alerts logic', () => {
  it('triggers when price crosses above target from unmet state', () => {
    const evaluation = evaluatePriceAlert({
      symbol: 'AAPL',
      market: 'us',
      direction: 'above',
      targetPrice: 100,
      latestPrice: 101,
      lastConditionMet: false,
    });
    expect(evaluation.isConditionMet).toBe(true);
    expect(evaluation.shouldTrigger).toBe(true);
  });

  it('does not retrigger repeatedly while condition remains met', () => {
    const evaluation = evaluatePriceAlert({
      symbol: 'AAPL',
      market: 'us',
      direction: 'above',
      targetPrice: 100,
      latestPrice: 110,
      lastConditionMet: true,
    });
    expect(evaluation.isConditionMet).toBe(true);
    expect(evaluation.shouldTrigger).toBe(false);
  });

  it('triggers when price drops below target from unmet state', () => {
    const evaluation = evaluatePriceAlert({
      symbol: 'INFY.NS',
      market: 'india',
      direction: 'below',
      targetPrice: 1500,
      latestPrice: 1495,
      lastConditionMet: false,
    });
    expect(evaluation.isConditionMet).toBe(true);
    expect(evaluation.shouldTrigger).toBe(true);
  });

  it('builds a readable email/in-app alert message', () => {
    const message = buildAlertMessage({
      symbol: 'AAPL',
      market: 'us',
      direction: 'above',
      targetPrice: 200,
      latestPrice: 201.34,
      triggeredAt: '2026-04-06T12:00:00.000Z',
    });
    expect(message.subject).toContain('AAPL');
    expect(message.body).toContain('Latest price: 201.34');
  });
});
