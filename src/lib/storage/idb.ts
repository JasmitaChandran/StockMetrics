import { openDB } from 'idb';

const DB_NAME = 'stock-metrics-db';
const DB_VERSION = 1;

export type LocalUserRecord = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export interface WatchlistRecord {
  id: string;
  name: string;
  symbols: string[];
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

export async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('users')) db.createObjectStore('users', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('session')) db.createObjectStore('session', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('watchlists')) db.createObjectStore('watchlists', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('portfolioTxns')) db.createObjectStore('portfolioTxns', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('notes')) db.createObjectStore('notes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('customScreens')) db.createObjectStore('customScreens', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'key' });
    },
  });
}
