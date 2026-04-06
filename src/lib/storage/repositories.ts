import {
  getDb,
  type AlertMessageRecord,
  type CustomScreenRecord,
  type NoteRecord,
  type PortfolioTxn,
  type PriceAlertRecord,
  type WatchlistRecord,
} from './idb';

export async function listWatchlists(): Promise<WatchlistRecord[]> {
  const db = await getDb();
  return db.getAll('watchlists');
}

export async function upsertWatchlist(record: WatchlistRecord) {
  const db = await getDb();
  await db.put('watchlists', record);
}

export async function deleteWatchlist(id: string) {
  const db = await getDb();
  await db.delete('watchlists', id);
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

export async function listPriceAlerts(userId?: string): Promise<PriceAlertRecord[]> {
  const db = await getDb();
  const rows = (await db.getAll('priceAlerts')) as PriceAlertRecord[];
  const filtered = userId ? rows.filter((row) => row.userId === userId) : rows;
  return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function upsertPriceAlert(record: PriceAlertRecord) {
  const db = await getDb();
  await db.put('priceAlerts', record);
}

export async function deletePriceAlert(id: string) {
  const db = await getDb();
  await db.delete('priceAlerts', id);
}

export async function listAlertMessages(userId?: string, limit = 250): Promise<AlertMessageRecord[]> {
  const db = await getDb();
  const rows = (await db.getAll('alertMessages')) as AlertMessageRecord[];
  const filtered = userId ? rows.filter((row) => row.userId === userId) : rows;
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, Math.max(1, limit));
}

export async function addAlertMessage(record: AlertMessageRecord) {
  const db = await getDb();
  await db.put('alertMessages', record);
}

export async function deleteAlertMessage(id: string) {
  const db = await getDb();
  await db.delete('alertMessages', id);
}

export async function deleteAlertMessagesForUser(userId: string) {
  const db = await getDb();
  const rows = (await db.getAll('alertMessages')) as AlertMessageRecord[];
  const deletions = rows
    .filter((row) => row.userId === userId)
    .map((row) => db.delete('alertMessages', row.id));
  await Promise.all(deletions);
}
