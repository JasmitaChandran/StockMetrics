import type { DocumentLink, FundamentalsBundle, HistorySeries, NewsItem, Quote, SearchEntity } from '@/types';

export interface SearchAdapter {
  search(query: string, opts?: { market?: 'us' | 'india' | 'mf'; limit?: number }): Promise<SearchEntity[]>;
  getBySymbol(symbol: string): Promise<SearchEntity | null>;
}

export interface MarketAdapter {
  getQuote(entity: SearchEntity): Promise<Quote>;
  getHistory(entity: SearchEntity, range?: string): Promise<HistorySeries>;
}

export interface FundamentalsAdapter {
  getFundamentals(entity: SearchEntity): Promise<FundamentalsBundle>;
}

export interface NewsAdapter {
  getNews(entity: SearchEntity): Promise<NewsItem[]>;
}

export interface DocumentsAdapter {
  getDocuments(entity: SearchEntity): Promise<DocumentLink[]>;
}

export interface FxAdapter {
  getUsdInr(): Promise<{ rate: number; source: string; timestamp: string; stale?: boolean }>;
}
