import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => import('../helpers/next-server-mock'));

vi.mock('@/lib/data/providers/yahoo', () => ({
  getYahooQuote: vi.fn(),
  getYahooHistory: vi.fn(),
}));

vi.mock('@/lib/data/providers/mfapi', () => ({
  getMfApiQuote: vi.fn(),
  getMfApiHistory: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { GET as getQuote } from '@/app/api/market/quote/route';
import { GET as getHistory } from '@/app/api/market/history/route';
import { getYahooHistory, getYahooQuote } from '@/lib/data/providers/yahoo';
import { getMfApiHistory, getMfApiQuote } from '@/lib/data/providers/mfapi';

describe('market API route integration', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for quote when symbol is missing', async () => {
    const response = await getQuote(new NextRequest('http://localhost/api/market/quote'));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Missing symbol' });
    expect(getYahooQuote).not.toHaveBeenCalled();
    expect(getMfApiQuote).not.toHaveBeenCalled();
  });

  it('uses Yahoo provider for regular quote symbols', async () => {
    vi.mocked(getYahooQuote).mockResolvedValue({
      symbol: 'AAPL',
      market: 'us',
      currency: 'USD',
      price: 201.5,
      source: 'yahoo',
    });

    const response = await getQuote(new NextRequest('http://localhost/api/market/quote?symbol=AAPL&market=us'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ symbol: 'AAPL', price: 201.5, source: 'yahoo' });
    expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0');
    expect(getYahooQuote).toHaveBeenCalledWith('AAPL', 'us');
    expect(getMfApiQuote).not.toHaveBeenCalled();
  });

  it('uses MFAPI provider for AMFI quote symbols', async () => {
    vi.mocked(getMfApiQuote).mockResolvedValue({
      symbol: 'AMFI:12345',
      market: 'mf',
      currency: 'INR',
      price: 52.12,
      source: 'mfapi',
    });

    const response = await getQuote(
      new NextRequest('http://localhost/api/market/quote?symbol=amfi:12345&market=india'),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ symbol: 'AMFI:12345', source: 'mfapi' });
    expect(getMfApiQuote).toHaveBeenCalledWith('amfi:12345');
    expect(getYahooQuote).not.toHaveBeenCalled();
  });

  it('returns 502 for quote provider failures', async () => {
    vi.mocked(getYahooQuote).mockRejectedValue(new Error('Quote upstream unavailable'));

    const response = await getQuote(new NextRequest('http://localhost/api/market/quote?symbol=MSFT&market=us'));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Quote upstream unavailable' });
  });

  it('returns 400 for history when symbol is missing', async () => {
    const response = await getHistory(new NextRequest('http://localhost/api/market/history?range=1mo'));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Missing symbol' });
    expect(getYahooHistory).not.toHaveBeenCalled();
    expect(getMfApiHistory).not.toHaveBeenCalled();
  });

  it('uses Yahoo provider for regular history symbols and passes range', async () => {
    vi.mocked(getYahooHistory).mockResolvedValue({
      symbol: 'AAPL',
      currency: 'USD',
      points: [{ ts: '2026-01-01', close: 200 }],
      source: 'yahoo',
    });

    const response = await getHistory(new NextRequest('http://localhost/api/market/history?symbol=AAPL&range=1y'));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ symbol: 'AAPL', source: 'yahoo' });
    expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=300, stale-while-revalidate=3600');
    expect(getYahooHistory).toHaveBeenCalledWith('AAPL', '1y');
    expect(getMfApiHistory).not.toHaveBeenCalled();
  });

  it('uses MFAPI provider for AMFI history symbols', async () => {
    vi.mocked(getMfApiHistory).mockResolvedValue({
      symbol: 'AMFI:12345',
      currency: 'INR',
      points: [{ ts: '2026-01-01', close: 52.12 }],
      source: 'mfapi',
    });

    const response = await getHistory(new NextRequest('http://localhost/api/market/history?symbol=AMFI:12345'));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ symbol: 'AMFI:12345', source: 'mfapi' });
    expect(getMfApiHistory).toHaveBeenCalledWith('AMFI:12345');
    expect(getYahooHistory).not.toHaveBeenCalled();
  });

  it('returns 502 for history provider failures', async () => {
    vi.mocked(getYahooHistory).mockRejectedValue(new Error('History upstream unavailable'));

    const response = await getHistory(new NextRequest('http://localhost/api/market/history?symbol=TSLA'));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'History upstream unavailable' });
  });
});
