import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => import('../helpers/next-server-mock'));
vi.mock('@/lib/data/providers/rss', () => ({
  fetchRelevantRssNews: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { GET as getNews } from '@/app/api/news/route';
import { fetchRelevantRssNews } from '@/lib/data/providers/rss';

describe('news API route integration', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when symbol is missing', async () => {
    const response = await getNews(new NextRequest('http://localhost/api/news'));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Missing symbol' });
    expect(fetchRelevantRssNews).not.toHaveBeenCalled();
  });

  it('uses symbol as default name and india as default market', async () => {
    vi.mocked(fetchRelevantRssNews).mockResolvedValue([]);

    const response = await getNews(new NextRequest('http://localhost/api/news?symbol=INFY.NS'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(fetchRelevantRssNews).toHaveBeenCalledWith('INFY.NS', 'INFY.NS', 'india');
    expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=600, stale-while-revalidate=3600');
  });

  it('passes explicit name and market to RSS provider', async () => {
    vi.mocked(fetchRelevantRssNews).mockResolvedValue([{ id: '1', title: 'AAPL jumps' }]);

    const response = await getNews(
      new NextRequest('http://localhost/api/news?symbol=AAPL&name=Apple%20Inc.&market=us'),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: '1', title: 'AAPL jumps' }]);
    expect(fetchRelevantRssNews).toHaveBeenCalledWith('AAPL', 'Apple Inc.', 'us');
  });

  it('returns 502 when RSS provider throws', async () => {
    vi.mocked(fetchRelevantRssNews).mockRejectedValue(new Error('RSS upstream failed'));

    const response = await getNews(new NextRequest('http://localhost/api/news?symbol=AAPL&market=us'));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'RSS upstream failed' });
  });
});
