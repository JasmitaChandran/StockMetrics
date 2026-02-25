import { NextRequest, NextResponse } from 'next/server';
import { getSecDocuments } from '@/lib/data/providers/sec';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  const market = req.nextUrl.searchParams.get('market');
  if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });
  if (market !== 'us') {
    return NextResponse.json([], {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
    });
  }
  try {
    const docs = await getSecDocuments(symbol);
    return NextResponse.json(docs, {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
