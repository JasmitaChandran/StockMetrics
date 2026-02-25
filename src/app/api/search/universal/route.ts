import { NextRequest, NextResponse } from 'next/server';
import { resolveSearchEntityBySymbol, universalSearch } from '@/lib/data/providers/universal-search';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const symbol = req.nextUrl.searchParams.get('symbol');
  const market = req.nextUrl.searchParams.get('market') as 'us' | 'india' | 'mf' | null;
  const limitParam = Number(req.nextUrl.searchParams.get('limit') ?? '12');
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 12;

  try {
    if (symbol) {
      const entity = await resolveSearchEntityBySymbol(symbol);
      return NextResponse.json(entity, {
        headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
      });
    }

    const results = await universalSearch(q, { market: market ?? undefined, limit });
    return NextResponse.json(results, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
