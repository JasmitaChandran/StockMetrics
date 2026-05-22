import { openDB } from 'idb';
import type { MarketKind } from '@/types';

export const DB_NAME = 'stock-metrics-db';
export const DB_VERSION = 2;

export type LocalUserRecord = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type WatchlistValuationLabel = 'Undervalued' | 'Fair' | 'Expensive';
export type WatchlistQualityLabel = 'Strong' | 'Average' | 'Weak';
export type WatchlistGrowthLabel = 'High' | 'Stable' | 'Slow';
export type WatchlistRiskLabel = 'Low' | 'Moderate' | 'High';
export type WatchlistTrendLabel = 'Bullish' | 'Sideways' | 'Bearish';

export interface WatchlistSymbolProfile {
  reasonForAdding?: string;
  valuation?: WatchlistValuationLabel;
  quality?: WatchlistQualityLabel;
  growth?: WatchlistGrowthLabel;
  risk?: WatchlistRiskLabel;
  trend?: WatchlistTrendLabel;
}

export interface WatchlistRecord {
  id: string;
  name: string;
  symbols: string[];
  symbolProfiles?: Record<string, WatchlistSymbolProfile>;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioTxn {
  id: string;
  symbol: string;
  market: 'us' | 'india' | 'mf';
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  date: string;
}

export interface NoteRecord {
  id: string;
  stockId: string;
  content: string;
  updatedAt: string;
}

export interface CustomScreenRecord {
  id: string;
  name: string;
  query: string;
  createdAt: string;
}

export interface PriceAlertRecord {
  id: string;
  userId: string;
  symbol: string;
  market: MarketKind;
  direction: 'above' | 'below';
  targetPrice: number;
  enabled: boolean;
  notifyEmail: boolean;
  createdAt: string;
  updatedAt: string;
  lastConditionMet: boolean;
  lastTriggeredAt?: string;
  lastTriggeredPrice?: number;
}

export interface AlertMessageRecord {
  id: string;
  userId: string;
  alertId: string;
  symbol: string;
  market: MarketKind;
  direction: 'above' | 'below';
  targetPrice: number;
  triggeredPrice: number;
  createdAt: string;
  message: string;
  emailStatus: 'sent' | 'failed' | 'skipped';
  emailError?: string;
}

export async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('users')) db.createObjectStore('users', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('session')) db.createObjectStore('session', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('watchlists')) db.createObjectStore('watchlists', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('portfolioTxns')) db.createObjectStore('portfolioTxns', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('notes')) db.createObjectStore('notes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('customScreens')) db.createObjectStore('customScreens', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('priceAlerts')) db.createObjectStore('priceAlerts', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('alertMessages')) db.createObjectStore('alertMessages', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'key' });
    },
  });
}
