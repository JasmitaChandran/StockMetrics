import { NextRequest, NextResponse } from 'next/server';
import { getSecFundamentals } from '@/lib/data/providers/sec';

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker');
  if (!ticker) return NextResponse.json({ error: 'Missing ticker' }, { status: 400 });
  try {
    const data = await getSecFundamentals(ticker);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
