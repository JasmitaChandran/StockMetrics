import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => import('../helpers/next-server-mock'));
vi.mock('@/lib/data/providers/india-documents', () => ({
  getIndiaDocuments: vi.fn(),
}));
vi.mock('@/lib/data/providers/sec', () => ({
  getSecDocuments: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { GET as getDocuments } from '@/app/api/documents/route';
import { getIndiaDocuments } from '@/lib/data/providers/india-documents';
import { getSecDocuments } from '@/lib/data/providers/sec';

describe('documents API route integration', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when symbol is missing', async () => {
    const response = await getDocuments(new NextRequest('http://localhost/api/documents?market=india'));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Missing symbol' });
    expect(getIndiaDocuments).not.toHaveBeenCalled();
    expect(getSecDocuments).not.toHaveBeenCalled();
  });

  it('returns India documents for india market', async () => {
    vi.mocked(getIndiaDocuments).mockResolvedValue([{ id: 'nse-1', title: 'Annual Report 2025' }]);

    const response = await getDocuments(
      new NextRequest('http://localhost/api/documents?market=india&symbol=INFY'),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: 'nse-1', title: 'Annual Report 2025' }]);
    expect(getIndiaDocuments).toHaveBeenCalledWith('INFY');
    expect(getSecDocuments).not.toHaveBeenCalled();
    expect(response.headers.get('Cache-Control')).toBe('public, s-maxage=21600, stale-while-revalidate=86400');
  });

  it('returns an empty array when india provider fails', async () => {
    vi.mocked(getIndiaDocuments).mockRejectedValue(new Error('NSE docs unavailable'));

    const response = await getDocuments(
      new NextRequest('http://localhost/api/documents?market=india&symbol=INFY'),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it('returns empty array for unsupported non-us non-india markets', async () => {
    const response = await getDocuments(new NextRequest('http://localhost/api/documents?market=mf&symbol=AMFI:1'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(getIndiaDocuments).not.toHaveBeenCalled();
    expect(getSecDocuments).not.toHaveBeenCalled();
  });

  it('returns SEC documents for us market', async () => {
    vi.mocked(getSecDocuments).mockResolvedValue([{ id: 'sec-1', title: '10-K 2025' }]);

    const response = await getDocuments(new NextRequest('http://localhost/api/documents?market=us&symbol=AAPL'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: 'sec-1', title: '10-K 2025' }]);
    expect(getSecDocuments).toHaveBeenCalledWith('AAPL');
    expect(getIndiaDocuments).not.toHaveBeenCalled();
  });

  it('returns 502 when SEC provider fails', async () => {
    vi.mocked(getSecDocuments).mockRejectedValue(new Error('SEC upstream failed'));

    const response = await getDocuments(new NextRequest('http://localhost/api/documents?market=us&symbol=AAPL'));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'SEC upstream failed' });
  });
});
