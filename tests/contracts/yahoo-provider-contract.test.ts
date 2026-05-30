import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_FETCH = globalThis.fetch;

function okJson(payload: unknown) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

function restoreFetch() {
  if (ORIGINAL_FETCH === undefined) {
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  } else {
    globalThis.fetch = ORIGINAL_FETCH;
  }
}

describe('Yahoo provider contract', () => {
  afterEach(() => {
    restoreFetch();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('maps a valid Yahoo quote chart payload into app quote shape', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        okJson({
          chart: {
            result: [
              {
                meta: {
                  symbol: 'AAPL',
                  currency: 'USD',
                  regularMarketPrice: 200.5,
                  previousClose: 198.5,
                  regularMarketTime: 1735689600,
                  exchangeName: 'NMS',
                },
                timestamp: [1735689540, 1735689600],
                indicators: {
                  quote: [
                    {
                      close: [199.3, 200.5],
                      volume: [100, 125],
                    },
                  ],
                },
              },
            ],
          },
        }),
      ),
    );

    const { getYahooQuote } = await import('@/lib/data/providers/yahoo');
    const quote = await getYahooQuote(`AAPL-${Date.now()}`, 'us');

    expect(quote.currency).toBe('USD');
    expect(quote.price).toBe(200.5);
    expect(quote.previousClose).toBe(198.5);
    expect(quote.change).toBe(2);
    expect(quote.exchange).toBe('NASDAQ');
  });

  it('maps a valid Yahoo history chart payload into app history shape', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        okJson({
          chart: {
            result: [
              {
                meta: {
                  currency: 'USD',
                },
                timestamp: [1735603200, 1735689600],
                indicators: {
                  quote: [
                    {
                      close: [198, 201],
                      open: [197, 199],
                      high: [199, 202],
                      low: [196, 198],
                      volume: [1000, 1100],
                    },
                  ],
                },
              },
            ],
          },
        }),
      ),
    );

    const { getYahooHistory } = await import('@/lib/data/providers/yahoo');
    const history = await getYahooHistory(`MSFT-${Date.now()}`, '1m');

    expect(history.currency).toBe('USD');
    expect(history.points).toHaveLength(2);
    expect(history.points[0]?.close).toBe(198);
    expect(history.source).toBe('Yahoo Finance');
  });

  it('throws when Yahoo contract changes and chart wrapper is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        okJson({
          result: [],
        }),
      ),
    );

    const { getYahooQuote } = await import('@/lib/data/providers/yahoo');
    await expect(getYahooQuote(`NVDA-${Date.now()}`, 'us')).rejects.toThrow(
      'Yahoo contract mismatch: missing chart object',
    );
  });
});
