import type { NewsAdapter } from './types';
import type { NewsItem, SearchEntity } from '@/types';
import { getDemoNews } from '@/lib/data/mock/demo-data';
import { fetchJsonWithTtl } from './fetch-cache';

export const newsAdapter: NewsAdapter = {
  async getNews(entity: SearchEntity): Promise<NewsItem[]> {
    try {
      const url = `/api/news?symbol=${encodeURIComponent(entity.displaySymbol)}&name=${encodeURIComponent(entity.name)}`;
      const data = await fetchJsonWithTtl<NewsItem[]>(url, 10 * 60_000);
      return data.length ? data : getDemoNews(entity);
    } catch {
      return getDemoNews(entity);
    }
  },
};
