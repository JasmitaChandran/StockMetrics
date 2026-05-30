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

  it('treats equal price as met for both above and below alerts', () => {
    const above = evaluatePriceAlert({
      symbol: 'AAPL',
      market: 'us',
      direction: 'above',
      targetPrice: 100,
      latestPrice: 100,
      lastConditionMet: false,
    });

    const below = evaluatePriceAlert({
      symbol: 'INFY.NS',
      market: 'india',
      direction: 'below',
      targetPrice: 1500,
      latestPrice: 1500,
      lastConditionMet: false,
    });

    expect(above).toEqual({ isConditionMet: true, shouldTrigger: true });
    expect(below).toEqual({ isConditionMet: true, shouldTrigger: true });
  });

  it('stays unmet when threshold is not crossed', () => {
    const evaluation = evaluatePriceAlert({
      symbol: 'AAPL',
      market: 'us',
      direction: 'above',
      targetPrice: 120,
      latestPrice: 119.99,
      lastConditionMet: false,
    });

    expect(evaluation).toEqual({ isConditionMet: false, shouldTrigger: false });
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

  it('uses mutual fund market label in alert body when market is mf', () => {
    const message = buildAlertMessage({
      symbol: 'HDFC-MF',
      market: 'mf',
      direction: 'below',
      targetPrice: 50,
      latestPrice: 49.9,
      triggeredAt: '2026-04-06T12:00:00.000Z',
    });

    expect(message.subject).toContain('fell below 50.00');
    expect(message.body).toContain('Mutual Fund');
  });
});
