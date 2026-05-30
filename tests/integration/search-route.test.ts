import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => import('../helpers/next-server-mock'));

vi.mock('@/lib/data/providers/universal-search', () => ({
  universalSearch: vi.fn(),
  resolveSearchEntityBySymbol: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { GET as getSearch } from '@/app/api/search/universal/route';
import { resolveSearchEntityBySymbol, universalSearch } from '@/lib/data/providers/universal-search';

describe('search API route integration', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resolves a symbol directly when symbol query param is provided', async () => {
    vi.mocked(resolveSearchEntityBySymbol).mockResolvedValue({
      id: 'AAPL-us',
      symbol: 'AAPL',
      displaySymbol: 'AAPL',
      name: 'Apple Inc.',
      market: 'us',
      type: 'stock',
    });

    const response = await getSearch(new NextRequest('http://localhost/api/search/universal?symbol=AAPL'));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ symbol: 'AAPL', market: 'us' });
    expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=21600, stale-while-revalidate=86400');
    expect(resolveSearchEntityBySymbol).toHaveBeenCalledWith('AAPL');
    expect(universalSearch).not.toHaveBeenCalled();
  });

  it('runs universal search with clamped limit/offset and market scope', async () => {
    vi.mocked(universalSearch).mockResolvedValue([]);

    const response = await getSearch(
      new NextRequest('http://localhost/api/search/universal?q=bank&market=india&limit=50000&offset=-20'),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=3600, stale-while-revalidate=86400');
    expect(universalSearch).toHaveBeenCalledWith('bank', {
      market: 'india',
      limit: 1000,
      offset: 0,
    });
  });

  it('falls back to default paging when limit/offset are invalid', async () => {
    vi.mocked(universalSearch).mockResolvedValue([]);

    await getSearch(new NextRequest('http://localhost/api/search/universal?q=apple&limit=abc&offset=xyz'));

    expect(universalSearch).toHaveBeenCalledWith('apple', {
      market: undefined,
      limit: 12,
      offset: 0,
    });
  });

  it('returns 500 when search provider throws', async () => {
    vi.mocked(universalSearch).mockRejectedValue(new Error('Search backend down'));

    const response = await getSearch(new NextRequest('http://localhost/api/search/universal?q=apple'));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Search backend down' });
  });
});
