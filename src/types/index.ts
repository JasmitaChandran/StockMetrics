export * from './market';
export * from './fundamentals';
export * from './ai';
export * from './auth';

import type { FundamentalsBundle } from './fundamentals';
import type { DocumentLink, HistorySeries, NewsItem, Quote, SearchEntity } from './market';

export interface StockDetailBundle {
  entity: SearchEntity;
  quote: Quote;
  history: HistorySeries;
  fundamentals: FundamentalsBundle;
  news: NewsItem[];
  documents: DocumentLink[];
}
