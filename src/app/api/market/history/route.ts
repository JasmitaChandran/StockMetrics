import { NextRequest, NextResponse } from 'next/server';
import { getYahooHistory } from '@/lib/data/providers/yahoo';
import { getMfApiHistory } from '@/lib/data/providers/mfapi';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  const range = req.nextUrl.searchParams.get('range') ?? 'max';
  if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });
  try {
    const history =
      symbol.toUpperCase().startsWith('AMFI:') ? await getMfApiHistory(symbol) : await getYahooHistory(symbol, range);
    return NextResponse.json(history, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
