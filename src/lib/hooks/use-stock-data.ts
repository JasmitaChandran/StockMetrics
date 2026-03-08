'use client';

import { useQuery } from '@tanstack/react-query';
import type { Quote, SearchEntity } from '@/types';
import { getEntityBySymbol, getStockDetail, getUsdInrRate, searchEntities } from '@/lib/data/adapters';
import { marketAdapter } from '@/lib/data/adapters/market-adapter';

export function useSearchEntities(query: string, market?: 'us' | 'india' | 'mf') {
  return useQuery({
    queryKey: ['search', query, market],
    queryFn: () => searchEntities(query, market),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

export function useStockDetail(symbol: string) {
  return useQuery({
    queryKey: ['stock-detail', symbol],
    queryFn: () => getStockDetail(symbol),
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    enabled: Boolean(symbol),
  });
}

export function useLiveQuote(
  entity: SearchEntity | null | undefined,
  options?: {
    enabled?: boolean;
    initialData?: Quote;
    refetchMs?: number;
  },
) {
  const enabled = Boolean(entity?.symbol) && (options?.enabled ?? true);
  return useQuery({
    queryKey: ['quote-live', entity?.symbol, entity?.market],
    queryFn: () => marketAdapter.getQuote(entity as SearchEntity),
    enabled,
    initialData: options?.initialData,
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchInterval: enabled ? (options?.refetchMs ?? 15_000) : false,
    refetchOnWindowFocus: true,
  });
}

export function useEntity(symbol: string) {
  return useQuery({
    queryKey: ['entity', symbol],
    queryFn: () => getEntityBySymbol(symbol),
    staleTime: 10 * 60_000,
  });
}

export function useFxUsdInr() {
  return useQuery({
    queryKey: ['fx', 'usd-inr'],
    queryFn: getUsdInrRate,
    staleTime: 6 * 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
    retry: 1,
  });
}
