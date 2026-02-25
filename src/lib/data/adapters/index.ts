import { documentsAdapter } from './documents-adapter';
import { fundamentalsAdapter } from './fundamentals-adapter';
import { fxAdapter } from './fx-adapter';
import { marketAdapter } from './market-adapter';
import { newsAdapter } from './news-adapter';
import { localSearchAdapter } from './search-adapter';
import type { StockDetailBundle } from '@/types';

export async function searchEntities(query: string, market?: 'us' | 'india' | 'mf') {
  return localSearchAdapter.search(query, { market, limit: 12 });
}

export async function getEntityBySymbol(symbol: string) {
  return localSearchAdapter.getBySymbol(symbol);
}

export async function getStockDetail(symbol: string): Promise<StockDetailBundle> {
  const entity = await localSearchAdapter.getBySymbol(symbol);
  if (!entity) {
    throw new Error(`Unknown symbol: ${symbol}`);
  }

  const [quote, history, fundamentals, news, documents] = await Promise.all([
    marketAdapter.getQuote(entity),
    marketAdapter.getHistory(entity, 'max'),
    fundamentalsAdapter.getFundamentals(entity),
    newsAdapter.getNews(entity),
    documentsAdapter.getDocuments(entity),
  ]);

  return { entity, quote, history, fundamentals, news, documents };
}

export async function getUsdInrRate() {
  return fxAdapter.getUsdInr();
}
