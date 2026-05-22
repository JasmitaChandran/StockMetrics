'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useUiStore } from '@/stores/ui-store';
import { getAuthAdapter } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth-store';
import { AlertBackgroundMonitor } from '@/components/alerts/alert-background-monitor';

const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then((mod) => mod.ReactQueryDevtools),
  { ssr: false },
);

if (typeof window !== 'undefined') {
  const existingMatchMedia = window.matchMedia?.bind(window);

  window.matchMedia = (query: string): MediaQueryList => {
    if (!existingMatchMedia) {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      } as MediaQueryList;
    }

    const mediaQueryList = existingMatchMedia(query);
    if (typeof mediaQueryList.addListener !== 'function') {
      mediaQueryList.addListener = (callback: ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null) => {
        if (!callback) return;
        mediaQueryList.addEventListener?.('change', callback as EventListener);
      };
    }
    if (typeof mediaQueryList.removeListener !== 'function') {
      mediaQueryList.removeListener = (callback: ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null) => {
        if (!callback) return;
        mediaQueryList.removeEventListener?.('change', callback as EventListener);
      };
    }
    return mediaQueryList;
  };
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 10 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  const theme = useUiStore((s) => s.theme);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getAuthAdapter()
      .getSession()
      .then((session) => {
        if (!active) return;
        setUser(session.user);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [setLoading, setUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <AlertBackgroundMonitor />
      {children}
      {process.env.NODE_ENV === 'development' ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}
