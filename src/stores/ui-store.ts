'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UiMode = 'beginner' | 'pro';
export type ThemeMode = 'light' | 'dark';

interface UiState {
  uiMode: UiMode;
  theme: ThemeMode;
  dashboardMarket: 'us' | 'india' | 'mf';
  preferredCurrencyForUs: 'USD' | 'INR';
  setUiMode: (mode: UiMode) => void;
  toggleUiMode: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setDashboardMarket: (market: 'us' | 'india' | 'mf') => void;
  setPreferredCurrencyForUs: (currency: 'USD' | 'INR') => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      uiMode: 'pro',
      theme: 'dark',
      dashboardMarket: 'india',
      preferredCurrencyForUs: 'USD',
      setUiMode: (uiMode) => set({ uiMode }),
      toggleUiMode: () => set((s) => ({ uiMode: s.uiMode === 'pro' ? 'beginner' : 'pro' })),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setDashboardMarket: (dashboardMarket) => set({ dashboardMarket }),
      setPreferredCurrencyForUs: (preferredCurrencyForUs) => set({ preferredCurrencyForUs }),
    }),
    {
      name: 'stock-metrics-ui',
      partialize: (s) => ({
        uiMode: s.uiMode,
        theme: s.theme,
        dashboardMarket: s.dashboardMarket,
        preferredCurrencyForUs: s.preferredCurrencyForUs,
      }),
    },
  ),
);
