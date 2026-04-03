import { NextRequest, NextResponse } from 'next/server';
import { fetchRelevantRssNews } from '@/lib/data/providers/rss';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol') ?? '';
  const name = req.nextUrl.searchParams.get('name') ?? symbol;
  const market = (req.nextUrl.searchParams.get('market') as 'us' | 'india' | 'mf' | null) ?? 'india';
  if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });
  try {
    const data = await fetchRelevantRssNews(symbol, name, market);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
