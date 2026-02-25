import { NextResponse } from 'next/server';
import { withServerCache } from '@/lib/data/providers/server-cache';

export async function GET() {
  try {
    const data = await withServerCache('fx-usd-inr', 6 * 60 * 60_000, async () => {
      const res = await fetch('https://open.er-api.com/v6/latest/USD', {
        next: { revalidate: 21600 },
      });
      if (!res.ok) throw new Error(`FX failed ${res.status}`);
      const json = (await res.json()) as { rates?: Record<string, number>; time_last_update_utc?: string };
      const rate = json.rates?.INR;
      if (!rate) throw new Error('INR rate missing');
      return {
        rate,
        source: 'open.er-api.com',
        timestamp: json.time_last_update_utc ? new Date(json.time_last_update_utc).toISOString() : new Date().toISOString(),
      };
    });
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
