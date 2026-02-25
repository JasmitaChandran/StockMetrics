import type { PricePoint } from '@/types';

export function downsampleSeries(points: PricePoint[], maxPoints = 400): PricePoint[] {
  if (points.length <= maxPoints) return points;
  const bucketSize = points.length / maxPoints;
  const out: PricePoint[] = [];
  for (let i = 0; i < maxPoints; i += 1) {
    const start = Math.floor(i * bucketSize);
    const end = Math.min(points.length, Math.floor((i + 1) * bucketSize));
    const bucket = points.slice(start, end);
    if (!bucket.length) continue;
    const close = bucket.reduce((sum, p) => sum + p.close, 0) / bucket.length;
    const volume = bucket.reduce((sum, p) => sum + (p.volume ?? 0), 0);
    out.push({ ts: bucket[bucket.length - 1].ts, close, volume });
  }
  return out;
}
