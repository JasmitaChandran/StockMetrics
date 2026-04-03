import type { FundamentalsAdapter } from './types';
import type { FundamentalsBundle, SearchEntity } from '@/types';
import { demoFundamentalsBySymbol } from '@/lib/data/mock/demo-data';
import { fetchJsonWithTtl } from './fetch-cache';

export const fundamentalsAdapter: FundamentalsAdapter = {
  async getFundamentals(entity: SearchEntity): Promise<FundamentalsBundle> {
    const demo = demoFundamentalsBySymbol[entity.symbol];
    const withDemoFallback = (bundle: FundamentalsBundle | undefined, reason: string): FundamentalsBundle | undefined => {
      if (!bundle) return undefined;
      return {
        ...bundle,
        source: `Demo fallback fundamentals (${reason})`,
        notes: [
          ...(bundle.notes ?? []),
          `This fundamentals view is running on demo fallback data because ${reason.toLowerCase()}.`,
        ],
      };
    };

    if (entity.market === 'us') {
      try {
        const live = await fetchJsonWithTtl<FundamentalsBundle>(`/api/fundamentals/us?ticker=${encodeURIComponent(entity.symbol)}`, 6 * 60 * 60_000);
        // Merge with demo statements/fields where the free source does not expose enough metrics.
        // Missing metrics remain hidden in the UI rather than showing guessed values.
        return {
          ...demo,
          ...live,
          keyMetrics: live.keyMetrics.length ? live.keyMetrics : demo?.keyMetrics ?? [],
          statements: live.statements.length ? live.statements : demo?.statements ?? [],
          shareholding: demo?.shareholding,
          peerSymbols: live.peerSymbols?.length ? live.peerSymbols : demo?.peerSymbols,
          notes: [...(live.notes ?? []), ...(demo?.notes ?? [])],
        };
      } catch {
        const fallback = withDemoFallback(demo, 'US fundamentals endpoint was unavailable');
        if (fallback) return fallback;
      }
    }

    const demoFallback = withDemoFallback(demo, 'live fundamentals coverage for this market is currently limited');
    if (demoFallback) return demoFallback;

    return {
      companyId: entity.id,
      companyName: entity.name,
      summary: entity.summary,
      website: entity.website,
      sector: entity.sector,
      industry: entity.industry,
      marketCap: undefined,
      currency: entity.currency ?? 'INR',
      keyMetrics: [],
      statements: [],
      source: 'Fundamentals unavailable',
      notes: ['Price and historical data are available, but fundamental data is not currently available for this security.'],
    };
  },
};
