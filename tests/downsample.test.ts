import { describe, expect, it } from 'vitest';
import { downsampleSeries } from '@/lib/utils/downsample';
import type { PricePoint } from '@/types';

describe('downsampleSeries', () => {
  it('returns the same reference when points are already within the max size', () => {
    const points: PricePoint[] = [
      { ts: '2026-01-01T00:00:00Z', close: 100, volume: 10 },
      { ts: '2026-01-01T01:00:00Z', close: 101, volume: 15 },
    ];

    const result = downsampleSeries(points, 5);

    expect(result).toBe(points);
  });

  it('averages close, sums volume, and keeps bucket end timestamps', () => {
    const points: PricePoint[] = [
      { ts: 't1', close: 10, volume: 1 },
      { ts: 't2', close: 20, volume: 2 },
      { ts: 't3', close: 30, volume: 3 },
      { ts: 't4', close: 40, volume: 4 },
      { ts: 't5', close: 50, volume: 5 },
      { ts: 't6', close: 60, volume: 6 },
    ];

    const result = downsampleSeries(points, 3);

    expect(result).toEqual([
      { ts: 't2', close: 15, volume: 3 },
      { ts: 't4', close: 35, volume: 7 },
      { ts: 't6', close: 55, volume: 11 },
    ]);
  });

  it('treats missing volume as zero while aggregating buckets', () => {
    const points: PricePoint[] = [
      { ts: 't1', close: 10 },
      { ts: 't2', close: 20, volume: 3 },
      { ts: 't3', close: 30 },
      { ts: 't4', close: 40, volume: 2 },
    ];

    const result = downsampleSeries(points, 2);

    expect(result).toEqual([
      { ts: 't2', close: 15, volume: 3 },
      { ts: 't4', close: 35, volume: 2 },
    ]);
  });
});
