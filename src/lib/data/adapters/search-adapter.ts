import type { SearchAdapter } from './types';
import type { SearchEntity } from '@/types';
import { demoUniverse } from '@/lib/data/mock/demo-data';
import { fetchJsonWithTtl } from './fetch-cache';

function score(entity: SearchEntity, q: string) {
  const text = `${entity.symbol} ${entity.displaySymbol} ${entity.name} ${(entity.aliases ?? []).join(' ')}`.toLowerCase();
  if (text === q) return 100;
  if (entity.symbol.toLowerCase() === q || entity.displaySymbol.toLowerCase() === q) return 95;
  if (entity.name.toLowerCase().startsWith(q)) return 90;
  if (text.includes(q)) return 70;
  return 0;
}

export const localSearchAdapter: SearchAdapter = {
  async search(query, opts) {
    const q = query.trim().toLowerCase();
    const limit = opts?.limit ?? 10;
    const demoResults = !q
      ? demoUniverse.filter((e) => !opts?.market || e.market === opts.market).slice(0, limit)
      : demoUniverse
          .filter((e) => !opts?.market || e.market === opts.market)
          .map((e) => ({ e, s: score(e, q) }))
          .filter((x) => x.s > 0)
          .sort((a, b) => b.s - a.s)
          .slice(0, limit)
          .map((x) => x.e);

    if (!q) return demoResults;

    try {
      const params = new URLSearchParams({ q: query.trim(), limit: String(limit) });
      if (opts?.market) params.set('market', opts.market);
      const remote = await fetchJsonWithTtl<SearchEntity[]>(`/api/search/universal?${params.toString()}`, 5 * 60_000);
      if (!Array.isArray(remote) || !remote.length) return demoResults;
      const merged = new Map<string, SearchEntity>();
      for (const item of [...remote, ...demoResults]) {
        if (!merged.has(item.symbol)) merged.set(item.symbol, item);
      }
      return Array.from(merged.values()).slice(0, limit);
    } catch {
      return demoResults;
    }
  },
  async getBySymbol(symbol) {
    const local =
      demoUniverse.find(
        (e) => e.symbol.toLowerCase() === symbol.toLowerCase() || e.displaySymbol.toLowerCase() === symbol.toLowerCase(),
      ) ?? null;
    if (local) return local;

    try {
      const params = new URLSearchParams({ symbol });
      return await fetchJsonWithTtl<SearchEntity | null>(`/api/search/universal?${params.toString()}`, 6 * 60 * 60_000);
    } catch {
      return null;
    }
  },
};
