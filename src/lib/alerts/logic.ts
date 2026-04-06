import type { MarketKind } from '@/types';

export type AlertDirection = 'above' | 'below';

export interface AlertTriggerInput {
  symbol: string;
  market: MarketKind;
  direction: AlertDirection;
  targetPrice: number;
  latestPrice: number;
  lastConditionMet: boolean;
}

export interface AlertEvaluation {
  isConditionMet: boolean;
  shouldTrigger: boolean;
}

export function evaluatePriceAlert(input: AlertTriggerInput): AlertEvaluation {
  const isConditionMet =
    input.direction === 'above'
      ? input.latestPrice >= input.targetPrice
      : input.latestPrice <= input.targetPrice;

  return {
    isConditionMet,
    shouldTrigger: isConditionMet && !input.lastConditionMet,
  };
}

export function buildAlertMessage(input: {
  symbol: string;
  direction: AlertDirection;
  targetPrice: number;
  latestPrice: number;
  market: MarketKind;
  triggeredAt: string;
}) {
  const directionText = input.direction === 'above' ? 'rose above' : 'fell below';
  const marketLabel = input.market === 'india' ? 'India' : input.market === 'us' ? 'US' : 'Mutual Fund';

  return {
    subject: `Stock Alert: ${input.symbol} ${directionText} ${input.targetPrice.toFixed(2)}`,
    body: [
      `Alert triggered for ${input.symbol} (${marketLabel}).`,
      `${input.symbol} ${directionText} your target ${input.targetPrice.toFixed(2)}.`,
      `Latest price: ${input.latestPrice.toFixed(2)}.`,
      `Triggered at: ${new Date(input.triggeredAt).toLocaleString()}.`,
    ].join(' '),
  };
}
