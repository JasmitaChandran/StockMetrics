import type { DocumentsAdapter } from './types';
import type { DocumentLink, SearchEntity } from '@/types';
import { fetchJsonWithTtl } from './fetch-cache';

export const documentsAdapter: DocumentsAdapter = {
  async getDocuments(entity: SearchEntity): Promise<DocumentLink[]> {
    try {
      const url = `/api/documents?symbol=${encodeURIComponent(entity.symbol)}&market=${entity.market}&v=2`;
      const data = await fetchJsonWithTtl<DocumentLink[]>(url, 6 * 60 * 60_000);
      return data;
    } catch {
      return [];
    }
  },
};
