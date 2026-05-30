import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => import('../helpers/next-server-mock'));
vi.mock('@/lib/data/providers/server-cache', () => ({
  withServerCache: vi.fn(),
}));

import { GET as getUsdInr } from '@/app/api/fx/usd-inr/route';
import { withServerCache } from '@/lib/data/providers/server-cache';

const ORIGINAL_FETCH = globalThis.fetch;

function restoreFetch() {
  if (ORIGINAL_FETCH === undefined) {
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  } else {
    globalThis.fetch = ORIGINAL_FETCH;
  }
}

describe('fx USD-INR API route integration', () => {
  afterEach(() => {
    restoreFetch();
    vi.clearAllMocks();
  });

  it('returns parsed FX payload with cache headers on success', async () => {
    vi.mocked(withServerCache).mockImplementation(async (_key, _ttlMs, loader) => loader());
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        rates: { INR: 83.12 },
        time_last_update_utc: 'Thu, 01 Jan 2026 00:00:00 +0000',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await getUsdInr();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      rate: 83.12,
      source: 'open.er-api.com',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=21600, stale-while-revalidate=86400');
    expect(withServerCache).toHaveBeenCalledWith('fx-usd-inr', 6 * 60 * 60_000, expect.any(Function));
    expect(fetchMock).toHaveBeenCalledWith('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 21600 },
    });
  });

  it('returns 502 when upstream response is not ok', async () => {
    vi.mocked(withServerCache).mockImplementation(async (_key, _ttlMs, loader) => loader());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }),
    );

    const response = await getUsdInr();

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'FX failed 503' });
  });

  it('returns 502 when INR rate is missing from upstream payload', async () => {
    vi.mocked(withServerCache).mockImplementation(async (_key, _ttlMs, loader) => loader());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ rates: { USD: 1 } }),
      }),
    );

    const response = await getUsdInr();

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'INR rate missing' });
  });

  it('returns 502 when cache wrapper throws before loader resolves', async () => {
    vi.mocked(withServerCache).mockRejectedValue(new Error('Cache backend unavailable'));

    const response = await getUsdInr();

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Cache backend unavailable' });
  });
});
