import { describe, expect, it } from 'vitest';
import type { AgenticFormInput } from '@/lib/agentic/personalized-engine';
import { personalizedEngineTestables } from '@/lib/agentic/personalized-engine';

function makeForm(overrides: Partial<AgenticFormInput> = {}): AgenticFormInput {
  const base: AgenticFormInput = {
    analysisMode: 'suggest',
    targetTicker: '',
    age: 32,
    maritalStatus: 'single',
    dependentsKids: 0,
    dependentsParents: 0,
    employmentType: 'salaried',
    monthlyIncome: 100000,
    monthlyFixedExpenses: 40000,
    monthlyDiscretionaryExpenses: 10000,
    effectiveTaxRate: 20,
    assets: {
      equity: 1000000,
      debt: 300000,
      gold: 80000,
      realEstate: 0,
      cash: 250000,
      alternatives: 0,
    },
    retirement: {
      epf: 100000,
      ppf: 50000,
      nps: 50000,
      other: 0,
    },
    loans: [],
    emergencyFundMonths: 4,
    investmentGoal: 'wealth_creation',
    investmentHorizon: 'long',
    riskPreference: 'moderate',
    expectedReturnTarget: 12,
    liquidityNeed: 'medium',
    country: 'India',
    countryCode: 'IN',
    marketScope: 'india',
    compareWithAlternatives: true,
  };

  return {
    ...base,
    ...overrides,
    assets: { ...base.assets, ...(overrides.assets ?? {}) },
    retirement: { ...base.retirement, ...(overrides.retirement ?? {}) },
    loans: overrides.loans ?? base.loans,
  };
}

describe('personalized engine guardrails and core math', () => {
  it('rejects invalid input bounds', () => {
    expect(() =>
      personalizedEngineTestables.validateAgenticInput(
        makeForm({
          effectiveTaxRate: 75,
        }),
      ),
    ).toThrow();

    expect(() =>
      personalizedEngineTestables.validateAgenticInput(
        makeForm({
          emergencyFundMonths: 48,
        }),
      ),
    ).toThrow();

    expect(() =>
      personalizedEngineTestables.validateAgenticInput(
        makeForm({
          age: 12,
        }),
      ),
    ).toThrow();
  });

  it('rejects negative cash-flow and liability values', () => {
    expect(() =>
      personalizedEngineTestables.validateAgenticInput(
        makeForm({
          monthlyFixedExpenses: -1,
        }),
      ),
    ).toThrow();

    expect(() =>
      personalizedEngineTestables.validateAgenticInput(
        makeForm({
          loans: [
            {
              id: 'loan-1',
              type: 'home',
              outstandingAmount: 100000,
              monthlyEmi: -5000,
              interestRate: 8.5,
            },
          ],
        }),
      ),
    ).toThrow();
  });

  it('does not double-count emergency fund while computing total assets', () => {
    const form = makeForm({
      monthlyIncome: 100000,
      monthlyFixedExpenses: 40000,
      monthlyDiscretionaryExpenses: 10000,
      emergencyFundMonths: 6,
      assets: {
        equity: 1000,
        debt: 0,
        gold: 0,
        realEstate: 0,
        cash: 300,
        alternatives: 0,
      },
      retirement: {
        epf: 0,
        ppf: 0,
        nps: 0,
        other: 0,
      },
    });

    const finance = personalizedEngineTestables.buildFinancialProfile(form, []);
    expect(finance.totalAssets).toBe(1300);
    expect(finance.netWorth).toBe(1300);
  });

  it('respects explicit market scope selection', () => {
    const usOnly = personalizedEngineTestables.resolveMarketScope(
      makeForm({
        countryCode: 'IN',
        country: 'India',
        marketScope: 'us',
      }),
    );
    expect(usOnly).toBe('us');
  });

  it('backfills missing country + scope when normalizing legacy inputs', () => {
    const normalized = personalizedEngineTestables.normalizeInput(
      makeForm({
        countryCode: undefined as unknown as AgenticFormInput['countryCode'],
        marketScope: undefined as unknown as AgenticFormInput['marketScope'],
        country: 'United States',
      }),
    );
    expect(normalized.countryCode).toBe('US');
    expect(normalized.marketScope).toBe('us');
  });

  it('converts allocation currency with USD/INR FX', () => {
    expect(personalizedEngineTestables.convertCurrency(1000, 'INR', 'USD', 80)).toBe(12.5);
    expect(personalizedEngineTestables.convertCurrency(12.5, 'USD', 'INR', 80)).toBe(1000);
    expect(personalizedEngineTestables.convertCurrency(1000, 'INR', 'USD', Number.NaN)).toBe(1000);
    expect(personalizedEngineTestables.convertCurrency(1000, 'USD', 'INR', 0)).toBe(1000);
  });

  it('classifies demo fallback freshness from reference sources', () => {
    expect(personalizedEngineTestables.classifyFreshness('Reference historical series', true)).toBe('Demo fallback');
    expect(personalizedEngineTestables.classifyFreshness('Yahoo Finance', true)).toBe('Delayed');
    expect(personalizedEngineTestables.classifyFreshness('SEC EDGAR', false)).toBe('Live');
  });

  it('keeps explicit market scope even when country changes', () => {
    const normalized = personalizedEngineTestables.normalizeInput(
      makeForm({
        country: 'United States',
        countryCode: 'US',
        marketScope: 'india',
      }),
    );
    expect(normalized.marketScope).toBe('india');
  });

  it('flags high debt households conservatively in profile analysis', () => {
    const profile = personalizedEngineTestables.buildFinancialProfile(
      makeForm({
        monthlyIncome: 60000,
        monthlyFixedExpenses: 20000,
        monthlyDiscretionaryExpenses: 5000,
        loans: [
          {
            id: 'loan-1',
            type: 'home',
            outstandingAmount: 2500000,
            monthlyEmi: 28000,
            interestRate: 9.1,
          },
        ],
        emergencyFundMonths: 1,
        riskPreference: 'aggressive',
      }),
      [],
    );

    expect(profile.debtBurdenFlag).toBe('High');
    expect(profile.riskProfileLabel).toBe('Conservative');
  });
});
