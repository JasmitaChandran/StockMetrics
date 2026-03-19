'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Mic, Search } from 'lucide-react';
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
  const rotatingHints = ['Indian stocks', 'US stocks', 'Mutual Funds'];
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const debounced = useDebouncedValue(query, 250);
  const { data, isLoading } = useSearchEntities(debounced, marketFilter);
  const items = useMemo(() => data ?? [], [data]);
  const hasQuery = query.trim().length > 0;
  const showDropdown = open && hasQuery;
  const useAnimatedHint = !marketFilter && !placeholder;
  const showAnimatedHint = useAnimatedHint && !hasQuery;

  useEffect(() => {
    if (!useAnimatedHint) return;
    const id = window.setInterval(() => {
      setHintIndex((idx) => (idx + 1) % rotatingHints.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [rotatingHints.length, useAnimatedHint]);

  useEffect(() => {
    const w = window as typeof window & {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: ((event: any) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: ((event: any) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
      };
    };
    setIsVoiceSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

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

  function autocompleteFromTopResult() {
    if (!items.length) return;
    setQuery(items[0].displaySymbol);
    setOpen(true);
  }

  function clearQuery() {
    setQuery('');
    setOpen(false);
  }

  function toggleVoiceSearch() {
    if (isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }
    const w = window as typeof window & {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: ((event: any) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: ((event: any) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
      };
    };
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognitionRef.current = recognition as unknown as { stop: () => void };
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() ?? '';
      if (!transcript) return;
      setQuery(transcript);
      setOpen(true);
    };
    recognition.onerror = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognition.start();
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative rounded-2xl border border-border/80 bg-card shadow-panel">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            setOpen(value.trim().length > 0);
          }}
          onFocus={() => setOpen(query.trim().length > 0)}
          onKeyDown={(event) => {
            if (event.key === 'Tab' && hasQuery && items.length) {
              event.preventDefault();
              autocompleteFromTopResult();
              return;
            }
            if (event.key === 'Enter' && showDropdown && items.length) {
              event.preventDefault();
              selectEntity(items[0]);
            }
          }}
          placeholder={showAnimatedHint ? '' : placeholder ?? 'Search for Indian stocks / US stocks / Mutual Funds'}
          className="w-full rounded-2xl border-0 bg-transparent pl-10 pr-28 py-3 text-sm outline-none ring-0 placeholder:text-slate-400"
        />
        {showAnimatedHint ? (
          <div className="pointer-events-none absolute inset-y-0 left-10 right-28 flex items-center text-sm text-slate-400">
            <span className="mr-1.5">Search for</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={rotatingHints[hintIndex]}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="inline-block font-medium text-slate-200"
              >
                {rotatingHints[hintIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
        ) : null}
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          <button
            type="button"
            onClick={clearQuery}
            disabled={!hasQuery}
            className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-400 transition hover:bg-muted/60 disabled:cursor-default disabled:opacity-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={toggleVoiceSearch}
            disabled={!isVoiceSupported}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-muted/60 disabled:cursor-default disabled:opacity-50"
            title={isVoiceSupported ? (isListening ? 'Stop voice search' : 'Voice search') : 'Voice search not supported'}
            aria-label={isListening ? 'Stop voice search' : 'Voice search'}
          >
            <Mic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={autocompleteFromTopResult}
            disabled={!hasQuery || !items.length}
            className="rounded-md border border-border/80 px-2 py-1 text-[11px] font-medium text-slate-400 transition hover:bg-muted/60 disabled:cursor-default disabled:opacity-50"
            title="Autocomplete with top result"
          >
            Tab
          </button>
        </div>
      </div>
      <AnimatePresence>
        {showDropdown ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-border/80 bg-card shadow-panel"
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
