import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => import('../helpers/next-server-mock'));
vi.mock('@/lib/data/providers/sec', () => ({
  getSecFundamentals: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { GET as getUsFundamentals } from '@/app/api/fundamentals/us/route';
import { getSecFundamentals } from '@/lib/data/providers/sec';

describe('US fundamentals API route integration', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when ticker is missing', async () => {
    const response = await getUsFundamentals(new NextRequest('http://localhost/api/fundamentals/us'));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Missing ticker' });
    expect(getSecFundamentals).not.toHaveBeenCalled();
  });

  it('returns fundamentals payload with cache headers', async () => {
    vi.mocked(getSecFundamentals).mockResolvedValue({
      symbol: 'AAPL',
      marketCap: 1000,
      pe: 25,
    });

    const response = await getUsFundamentals(new NextRequest('http://localhost/api/fundamentals/us?ticker=AAPL'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ symbol: 'AAPL', marketCap: 1000, pe: 25 });
    expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=21600, stale-while-revalidate=86400');
    expect(getSecFundamentals).toHaveBeenCalledWith('AAPL');
  });

  it('returns 502 when provider throws', async () => {
    vi.mocked(getSecFundamentals).mockRejectedValue(new Error('SEC fundamentals unavailable'));

    const response = await getUsFundamentals(new NextRequest('http://localhost/api/fundamentals/us?ticker=MSFT'));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'SEC fundamentals unavailable' });
  });
});
