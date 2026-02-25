'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMemo, useState } from 'react';
import { SectionCard } from '@/components/common/section-card';
import { PillToggle } from '@/components/common/pill-toggle';
import type { HistorySeries } from '@/types';
import { downsampleSeries } from '@/lib/utils/downsample';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';

const RANGE_OPTIONS = [
  { value: '1m', label: '1M', days: 31 },
  { value: '6m', label: '6M', days: 186 },
  { value: '3y', label: '3Y', days: 365 * 3 + 5 },
  { value: '5y', label: '5Y', days: 365 * 5 + 8 },
  { value: 'max', label: 'Max', days: Infinity },
] as const;

type RangeKey = (typeof RANGE_OPTIONS)[number]['value'];

export function StockChartPanel({ history, displayCurrency }: { history: HistorySeries; displayCurrency: 'USD' | 'INR' }) {
  const [range, setRange] = useState<RangeKey>('6m');

  const filtered = useMemo(() => {
    const cfg = RANGE_OPTIONS.find((r) => r.value === range)!;
    const cutoff = Number.isFinite(cfg.days) ? Date.now() - cfg.days * 24 * 60 * 60 * 1000 : 0;
    const points = history.points.filter((p) => !cutoff || new Date(p.ts).getTime() >= cutoff);
    return downsampleSeries(points.length ? points : history.points, 320);
  }, [history.points, range]);

  const chartData = useMemo(
    () =>
      filtered.map((p) => ({
        ts: p.ts,
        label: new Date(p.ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }),
        close: Number(p.close.toFixed(2)),
        volume: p.volume ?? 0,
      })),
    [filtered],
  );

  return (
    <SectionCard
      title="Price Chart"
      subtitle={`${history.source}${history.delayed ? ' • Delayed / availability-dependent' : ''}`}
      action={
        <PillToggle
          options={RANGE_OPTIONS.map((r) => ({ value: r.value, label: r.label }))}
          value={range}
          onChange={(v) => setRange(v as RangeKey)}
        />
      }
    >
      <div className="h-[320px] w-full">
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="stockFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
            <XAxis dataKey="label" minTickGap={24} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(15,23,42,0.92)' }}
              labelStyle={{ color: '#cbd5e1' }}
              formatter={(value: number) => [formatCurrency(value, displayCurrency, false), 'Close']}
              labelFormatter={(label, payload) => {
                const ts = payload?.[0]?.payload?.ts;
                return ts ? formatDateTime(ts) : String(label);
              }}
            />
            <Area type="monotone" dataKey="close" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#stockFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Detailed chart controls are optimized for speed using downsampling to keep UI responsive.
      </p>
    </SectionCard>
  );
}
