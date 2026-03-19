'use client';

import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useEffect, useMemo, useState } from 'react';
import { SectionCard } from '@/components/common/section-card';
import { PillToggle } from '@/components/common/pill-toggle';
import { cn } from '@/lib/utils/cn';
import type { HistorySeries, MetricValue } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';

const RANGE_OPTIONS = [
  { value: '1m', label: '1M', days: 31 },
  { value: '6m', label: '6M', days: 186 },
  { value: '1y', label: '1Yr', days: 365 + 1 },
  { value: '3y', label: '3Y', days: 365 * 3 + 5 },
  { value: '5y', label: '5Y', days: 365 * 5 + 8 },
  { value: '10y', label: '10Y', days: 365 * 10 + 16 },
  { value: 'max', label: 'Max', days: Infinity },
] as const;

type RangeKey = (typeof RANGE_OPTIONS)[number]['value'];
type ChartMetric = 'price' | 'pe' | 'return';

const NUMBER_COMPACT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

function rollingAverage(values: number[], window: number): Array<number | undefined> {
  const out: Array<number | undefined> = [];
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    if (i >= window - 1) out.push(sum / window);
    else out.push(undefined);
  }
  return out;
}

function thinSeries<T>(points: T[], maxPoints = 360): T[] {
  if (points.length <= maxPoints) return points;
  const step = (points.length - 1) / (maxPoints - 1);
  const out: T[] = [];
  let lastIdx = -1;
  for (let i = 0; i < maxPoints; i += 1) {
    const idx = Math.round(i * step);
    if (idx === lastIdx) continue;
    out.push(points[idx]);
    lastIdx = idx;
  }
  return out;
}

function formatVolume(value: number) {
  return NUMBER_COMPACT.format(value);
}

function labelFormatForRange(range: RangeKey) {
  if (range === '1m' || range === '6m') {
    return { day: '2-digit', month: 'short' } satisfies Intl.DateTimeFormatOptions;
  }
  return { day: '2-digit', month: 'short', year: '2-digit' } satisfies Intl.DateTimeFormatOptions;
}

export function StockChartPanel({
  history,
  displayCurrency,
  keyMetrics,
}: {
  history: HistorySeries;
  displayCurrency: 'USD' | 'INR';
  keyMetrics?: MetricValue[];
}) {
  const [range, setRange] = useState<RangeKey>('6m');
  const [metric, setMetric] = useState<ChartMetric>('price');
  const [showVolume, setShowVolume] = useState(true);
  const [show50Dma, setShow50Dma] = useState(false);
  const [show200Dma, setShow200Dma] = useState(false);

  const peMetric = keyMetrics?.find((m) => m.key === 'pe' && m.value > 0)?.value;

  const rawPoints = useMemo(() => {
    const cfg = RANGE_OPTIONS.find((r) => r.value === range)!;
    const latestTs = history.points.length ? new Date(history.points[history.points.length - 1].ts).getTime() : Date.now();
    const cutoff = Number.isFinite(cfg.days) ? latestTs - cfg.days * 24 * 60 * 60 * 1000 : 0;
    const points = history.points.filter((p) => !cutoff || new Date(p.ts).getTime() >= cutoff);
    return points.length ? points : history.points;
  }, [history.points, range]);

  const hasPeSeries = Boolean(peMetric && rawPoints.length > 1);

  useEffect(() => {
    if (metric === 'pe' && !hasPeSeries) {
      setMetric('price');
    }
  }, [metric, hasPeSeries]);

  const chartData = useMemo(
    () => {
      const prices = rawPoints.map((p) => p.close);
      const ma50 = rollingAverage(prices, 50);
      const ma200 = rollingAverage(prices, 200);
      const firstClose = prices[0] || 0;
      const latestClose = prices[prices.length - 1] || 0;
      const points = rawPoints.map((p, idx) => ({
        ts: p.ts,
        label: new Date(p.ts).toLocaleDateString('en-IN', labelFormatForRange(range)),
        close: Number(p.close.toFixed(2)),
        volume: p.volume ?? 0,
        dma50: ma50[idx] === undefined ? undefined : Number(ma50[idx]!.toFixed(2)),
        dma200: ma200[idx] === undefined ? undefined : Number(ma200[idx]!.toFixed(2)),
        returnPct: firstClose > 0 ? Number((((p.close - firstClose) / firstClose) * 100).toFixed(2)) : 0,
        pe: peMetric && latestClose > 0 ? Number((((p.close / latestClose) * peMetric).toFixed(2))) : undefined,
      }));
      return thinSeries(points, 360);
    },
    [rawPoints, range, peMetric],
  );

  const activeMetric: ChartMetric = metric === 'pe' && !hasPeSeries ? 'price' : metric;
  const activeDataKey = activeMetric === 'price' ? 'close' : activeMetric === 'pe' ? 'pe' : 'returnPct';
  const activeMetricName = activeMetric === 'price' ? 'Price' : activeMetric === 'pe' ? 'P/E Ratio (implied)' : 'Return %';
  const isPriceMode = activeMetric === 'price';

  return (
    <SectionCard title="Price Chart">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <PillToggle
          options={RANGE_OPTIONS.map((r) => ({ value: r.value, label: r.label }))}
          value={range}
          onChange={(v) => setRange(v as RangeKey)}
        />
        <div className="inline-flex rounded-full border border-border/70 bg-card/80 p-1 shadow-panel backdrop-blur-sm">
          {([
            { value: 'price', label: 'Price', disabled: false },
            { value: 'pe', label: 'PE Ratio', disabled: !hasPeSeries },
            { value: 'return', label: 'Return %', disabled: false },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => !opt.disabled && setMetric(opt.value)}
              disabled={opt.disabled}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition',
                activeMetric === opt.value
                  ? 'bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500 text-white shadow-violet'
                  : 'text-slate-600 hover:bg-muted/70 dark:text-slate-300',
                opt.disabled ? 'cursor-not-allowed opacity-45' : '',
              )}
              title={opt.disabled ? 'PE metric is not available for this security' : undefined}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[320px] w-full">
        <ResponsiveContainer>
          <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
            <XAxis dataKey="label" minTickGap={24} tick={{ fontSize: 11 }} />
            {showVolume ? (
              <YAxis
                yAxisId="volume"
                orientation="left"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatVolume(v as number)}
                width={52}
              />
            ) : null}
            <YAxis
              yAxisId="metric"
              orientation="right"
              tick={{ fontSize: 11 }}
              domain={['auto', 'auto']}
              width={58}
              tickFormatter={(v) => {
                const value = Number(v);
                if (activeMetric === 'price') return formatCurrency(value, displayCurrency, false);
                if (activeMetric === 'pe') return value.toFixed(1);
                return `${value.toFixed(0)}%`;
              }}
            />
            {activeMetric === 'return' ? <ReferenceLine yAxisId="metric" y={0} stroke="rgba(148,163,184,0.45)" strokeDasharray="4 4" /> : null}
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid rgba(148,163,184,0.3)', background: 'rgba(15,23,42,0.92)' }}
              labelStyle={{ color: '#cbd5e1' }}
              formatter={(value: number, name: string) => {
                if (name === 'Volume') return [formatVolume(value), name];
                if (name.includes('DMA')) return [formatCurrency(value, displayCurrency, false), name];
                if (name.includes('P/E')) return [value.toFixed(2), name];
                if (name.includes('Return')) return [`${value.toFixed(2)}%`, name];
                return [formatCurrency(value, displayCurrency, false), name];
              }}
              labelFormatter={(label, payload) => {
                const ts = payload?.[0]?.payload?.ts;
                return ts ? formatDateTime(ts) : String(label);
              }}
            />
            {showVolume ? (
              <Bar yAxisId="volume" dataKey="volume" name="Volume" fill="rgba(129,140,248,0.35)" stroke="rgba(129,140,248,0.45)" />
            ) : null}
            <Line yAxisId="metric" type="monotone" dataKey={activeDataKey} name={activeMetricName} stroke="hsl(var(--accent))" strokeWidth={2.2} dot={false} />
            {isPriceMode && show50Dma ? (
              <Line yAxisId="metric" type="monotone" dataKey="dma50" name="50 DMA" stroke="#22c55e" strokeWidth={1.8} dot={false} />
            ) : null}
            {isPriceMode && show200Dma ? (
              <Line yAxisId="metric" type="monotone" dataKey="dma200" name="200 DMA" stroke="#f59e0b" strokeWidth={1.8} dot={false} />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 bg-card/70 px-2 py-1">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-indigo-500"
            checked={showVolume}
            onChange={(e) => setShowVolume(e.target.checked)}
          />
          <span className="text-slate-600 dark:text-slate-300">Volume</span>
        </label>
        <label
          className={cn('inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card/70 px-2 py-1', {
            'cursor-not-allowed opacity-45': !isPriceMode,
            'cursor-pointer': isPriceMode,
          })}
          title={isPriceMode ? undefined : '50 DMA is available in Price mode only'}
        >
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-emerald-500"
            checked={show50Dma}
            onChange={(e) => setShow50Dma(e.target.checked)}
            disabled={!isPriceMode}
          />
          <span className="text-slate-600 dark:text-slate-300">50 DMA</span>
        </label>
        <label
          className={cn('inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card/70 px-2 py-1', {
            'cursor-not-allowed opacity-45': !isPriceMode,
            'cursor-pointer': isPriceMode,
          })}
          title={isPriceMode ? undefined : '200 DMA is available in Price mode only'}
        >
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-amber-500"
            checked={show200Dma}
            onChange={(e) => setShow200Dma(e.target.checked)}
            disabled={!isPriceMode}
          />
          <span className="text-slate-600 dark:text-slate-300">200 DMA</span>
        </label>
        {activeMetric === 'pe' ? (
          <span className="rounded-lg border border-border/70 bg-muted/30 px-2 py-1 text-[11px] text-slate-500">
            PE is an implied trend based on the latest available PE ratio.
          </span>
        ) : null}
      </div>
    </SectionCard>
  );
}
