import { NextRequest, NextResponse } from 'next/server';
import { getYahooQuote } from '@/lib/data/providers/yahoo';
import { getMfApiQuote } from '@/lib/data/providers/mfapi';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  const market = (req.nextUrl.searchParams.get('market') as 'us' | 'india' | 'mf' | null) ?? 'us';
  if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });
  try {
    const quote =
      symbol.toUpperCase().startsWith('AMFI:') ? await getMfApiQuote(symbol) : await getYahooQuote(symbol, market);
    return NextResponse.json(quote, {
      headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
