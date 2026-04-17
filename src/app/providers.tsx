'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { useUiStore } from '@/stores/ui-store';
import { getAuthAdapter } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth-store';
import { AlertBackgroundMonitor } from '@/components/alerts/alert-background-monitor';

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
      mediaQueryList.addListener = (listener: EventListenerOrEventListenerObject) => {
        mediaQueryList.addEventListener?.('change', listener);
      };
    }
    if (typeof mediaQueryList.removeListener !== 'function') {
      mediaQueryList.removeListener = (listener: EventListenerOrEventListenerObject) => {
        mediaQueryList.removeEventListener?.('change', listener);
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
      <MotionConfig reducedMotion="user">
        <AlertBackgroundMonitor />
        {children}
      </MotionConfig>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
