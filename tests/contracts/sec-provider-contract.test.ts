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

describe('SEC provider contract', () => {
  afterEach(() => {
    restoreFetch();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('maps valid SEC payloads into fundamentals bundle', async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce(
        okJson({
          0: {
            cik_str: 320193,
            ticker: 'AAPL',
            title: 'Apple Inc.',
          },
        }),
      )
      .mockResolvedValueOnce(
        okJson({
          entityName: 'Apple Inc.',
          facts: {
            'us-gaap': {
              Revenues: {
                units: {
                  USD: [
                    { end: '2024-09-28', val: 383285000000, fp: 'FY' },
                    { end: '2023-09-30', val: 383000000000, fp: 'FY' },
                  ],
                },
              },
              NetIncomeLoss: {
                units: {
                  USD: [
                    { end: '2024-09-28', val: 96995000000, fp: 'FY' },
                    { end: '2023-09-30', val: 95000000000, fp: 'FY' },
                  ],
                },
              },
              Assets: {
                units: {
                  USD: [{ end: '2024-09-28', val: 352583000000, fp: 'FY' }],
                },
              },
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        okJson({
          sicDescription: 'Electronic Computers',
          filings: {
            recent: {
              accessionNumber: [],
              filingDate: [],
              form: [],
              primaryDocument: [],
            },
          },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const { getSecFundamentals } = await import('@/lib/data/providers/sec');
    const fundamentals = await getSecFundamentals('AAPL');

    expect(fundamentals.companyName).toBe('Apple Inc.');
    expect(fundamentals.currency).toBe('USD');
    expect(fundamentals.keyMetrics.length).toBeGreaterThan(0);
  });

  it('throws when SEC ticker map contract changes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        okJson({
          entries: [],
        }),
      ),
    );

    const { getSecFundamentals } = await import('@/lib/data/providers/sec');
    await expect(getSecFundamentals('AAPL')).rejects.toThrow(
      'SEC contract mismatch: ticker map shape changed',
    );
  });

  it('throws when SEC company facts contract changes', async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce(
        okJson({
          0: {
            cik_str: 320193,
            ticker: 'AAPL',
            title: 'Apple Inc.',
          },
        }),
      )
      .mockResolvedValueOnce(
        okJson({
          facts: 'unexpected-string',
        }),
      )
      .mockResolvedValueOnce(
        okJson({
          filings: {
            recent: {
              accessionNumber: [],
              filingDate: [],
              form: [],
              primaryDocument: [],
            },
          },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const { getSecFundamentals } = await import('@/lib/data/providers/sec');
    await expect(getSecFundamentals('AAPL')).rejects.toThrow(
      'SEC contract mismatch: company facts shape changed',
    );
  });

  it('throws when SEC submissions contract changes for documents API', async () => {
    const fetchMock = vi.fn();
    fetchMock
      .mockResolvedValueOnce(
        okJson({
          0: {
            cik_str: 320193,
            ticker: 'AAPL',
            title: 'Apple Inc.',
          },
        }),
      )
      .mockResolvedValueOnce(
        okJson({
          filings: 'invalid',
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const { getSecDocuments } = await import('@/lib/data/providers/sec');
    await expect(getSecDocuments('AAPL')).rejects.toThrow(
      'SEC contract mismatch: submissions shape changed',
    );
  });
});
