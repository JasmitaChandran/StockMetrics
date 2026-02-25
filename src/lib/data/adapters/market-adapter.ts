import type { MarketAdapter } from './types';
import type { HistorySeries, Quote, SearchEntity } from '@/types';
import { deriveQuoteFromHistory, generateDemoHistory } from '@/lib/data/mock/demo-data';
import { fetchJsonWithTtl } from './fetch-cache';

export const marketAdapter: MarketAdapter = {
  async getQuote(entity: SearchEntity): Promise<Quote> {
    try {
      const data = await fetchJsonWithTtl<Quote>(`/api/market/quote?symbol=${encodeURIComponent(entity.symbol)}&market=${entity.market}`, 30_000);
      return data;
    } catch {
      const history = generateDemoHistory(entity);
      return deriveQuoteFromHistory(entity, history);
    }
  },
  async getHistory(entity: SearchEntity, range = 'max'): Promise<HistorySeries> {
    try {
      const data = await fetchJsonWithTtl<HistorySeries>(`/api/market/history?symbol=${encodeURIComponent(entity.symbol)}&market=${entity.market}&range=${encodeURIComponent(range)}`, 5 * 60_000);
      return data;
    } catch {
      return generateDemoHistory(entity);
    }
  },
};
