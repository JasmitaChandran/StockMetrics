import { describe, expect, it } from 'vitest';
import { mapMetricEntries } from '@/lib/utils/metrics';

describe('mapMetricEntries', () => {
  it('maps known metrics and skips missing values', () => {
    const metrics = mapMetricEntries(
      {
        sales: 1000,
        pe: 22.5,
        roe: 18.2,
        opm: undefined,
        currentPrice: null,
      },
      'INR',
    );

    expect(metrics.find((m) => m.key === 'sales')?.label).toBe('Sales');
    expect(metrics.find((m) => m.key === 'sales')?.unit).toBe('currency');
    expect(metrics.find((m) => m.key === 'pe')?.unit).toBe('ratio');
    expect(metrics.find((m) => m.key === 'roe')?.unit).toBe('percent');
    expect(metrics.find((m) => m.key === 'opm')).toBeUndefined();
    expect(metrics.find((m) => m.key === 'currentPrice')).toBeUndefined();
  });
});
