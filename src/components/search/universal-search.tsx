'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SearchEntity } from '@/types';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { useSearchEntities } from '@/lib/hooks/use-stock-data';
import { cn } from '@/lib/utils/cn';

export function UniversalSearch({
  marketFilter,
  placeholder,
}: {
  marketFilter?: 'us' | 'india' | 'mf';
  placeholder?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const debounced = useDebouncedValue(query, 250);
  const { data, isLoading } = useSearchEntities(debounced, marketFilter);
  const items = useMemo(() => data ?? [], [data]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!rootRef.current || !target) return;
      if (!rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  function selectEntity(entity: SearchEntity) {
    setOpen(false);
    setQuery(entity.displaySymbol);
    router.push(`/dashboard/${entity.market}/${encodeURIComponent(entity.symbol)}`);
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="focus-violet ui-panel glass relative rounded-2xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? 'Search US stocks, Indian stocks, Mutual Funds...'}
          className="w-full rounded-2xl border-0 bg-transparent pl-10 pr-10 py-3 text-sm outline-none ring-0 placeholder:text-slate-400"
        />
        {query ? (
          <button className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 transition hover:bg-muted/60" onClick={() => setQuery('')}>
            <X className="h-4 w-4 text-slate-400" />
          </button>
        ) : null}
      </div>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="ui-panel glass absolute z-30 mt-2 w-full overflow-hidden rounded-2xl shadow-panel"
          >
            <div className="max-h-96 overflow-auto p-2">
              {isLoading ? <div className="p-3 text-sm text-slate-500">Searching...</div> : null}
              {!isLoading && items.length === 0 ? (
                <div className="p-3 text-sm text-slate-500">No matches. Try ticker (e.g., AAPL, HDFCBANK) or company name.</div>
              ) : null}
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => selectEntity(item)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl border border-transparent px-3 py-2 text-left text-sm transition hover:border-indigo-400/20 hover:bg-muted/50',
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-900 dark:text-white">{item.name}</div>
                    <div className="text-xs text-slate-500">
                      {item.displaySymbol} • {item.market.toUpperCase()} {item.exchange ? `• ${item.exchange}` : ''}
                    </div>
                  </div>
                  <span className="rounded-lg border border-border/70 bg-muted/50 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">
                    {item.type === 'mutual_fund' ? 'MF' : 'Stock'}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
