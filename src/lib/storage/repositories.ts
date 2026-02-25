import { getDb, type CustomScreenRecord, type NoteRecord, type PortfolioTxn, type WatchlistRecord } from './idb';

export async function listWatchlists(): Promise<WatchlistRecord[]> {
  const db = await getDb();
  return db.getAll('watchlists');
}

export async function upsertWatchlist(record: WatchlistRecord) {
  const db = await getDb();
  await db.put('watchlists', record);
}

export async function listPortfolioTxns(): Promise<PortfolioTxn[]> {
  const db = await getDb();
  return db.getAll('portfolioTxns');
}

export async function upsertPortfolioTxn(record: PortfolioTxn) {
  const db = await getDb();
  await db.put('portfolioTxns', record);
}

export async function getNote(stockId: string): Promise<NoteRecord | undefined> {
  const db = await getDb();
  const notes = (await db.getAll('notes')) as NoteRecord[];
  return notes.find((n) => n.stockId === stockId);
}

export async function upsertNote(record: NoteRecord) {
  const db = await getDb();
  await db.put('notes', record);
}

export async function listCustomScreens(): Promise<CustomScreenRecord[]> {
  const db = await getDb();
  return db.getAll('customScreens');
}

export async function upsertCustomScreen(record: CustomScreenRecord) {
  const db = await getDb();
  await db.put('customScreens', record);
}

export async function getKv<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  return (await db.get('kv', key))?.value as T | undefined;
}

export async function setKv<T>(key: string, value: T) {
  const db = await getDb();
  await db.put('kv', { key, value, updatedAt: new Date().toISOString() });
}
