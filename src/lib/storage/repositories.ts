import {
  getDb,
  type AlertContactSettings,
  type AlertMessageRecord,
  type CustomScreenRecord,
  type NoteRecord,
  type PortfolioTxn,
  type PriceAlertRecord,
  type WatchlistRecord,
} from './idb';
import { useAuthStore } from '@/stores/auth-store';

const ANONYMOUS_SCOPE_USER_ID = '__anonymous__';
const ALERT_CONTACT_SETTINGS_KEY = 'alert-contact-settings';

type UserScopedOptions = {
  userId?: string | null;
};

type KvOptions = UserScopedOptions & {
  scope?: 'user' | 'global';
};

function resolveScopedUserId(options?: UserScopedOptions): string {
  return options?.userId ?? useAuthStore.getState().user?.id ?? ANONYMOUS_SCOPE_USER_ID;
}

function withScopedUserId<T extends { userId?: string }>(
  record: T,
  options?: UserScopedOptions,
): T & { userId: string } {
  return { ...record, userId: resolveScopedUserId(options) };
}

function isOwnedByUser(record: { userId?: string }, userId: string) {
  return record.userId === userId;
}

function getScopedKvStorageKey(key: string, options?: KvOptions) {
  if (options?.scope === 'global') return key;
  return `${resolveScopedUserId(options)}::${key}`;
}

export async function listWatchlists(options?: UserScopedOptions): Promise<WatchlistRecord[]> {
  const db = await getDb();
  const userId = resolveScopedUserId(options);
  const rows = (await db.getAll('watchlists')) as WatchlistRecord[];
  return rows.filter((row) => isOwnedByUser(row, userId));
}

export async function upsertWatchlist(record: WatchlistRecord, options?: UserScopedOptions) {
  const db = await getDb();
  await db.put('watchlists', withScopedUserId(record, options));
}

export async function deleteWatchlist(id: string, options?: UserScopedOptions) {
  const db = await getDb();
  const userId = resolveScopedUserId(options);
  const existing = (await db.get('watchlists', id)) as WatchlistRecord | undefined;
  if (!existing || !isOwnedByUser(existing, userId)) return;
  await db.delete('watchlists', id);
}

export async function listPortfolioTxns(options?: UserScopedOptions): Promise<PortfolioTxn[]> {
  const db = await getDb();
  const userId = resolveScopedUserId(options);
  const rows = (await db.getAll('portfolioTxns')) as PortfolioTxn[];
  return rows.filter((row) => isOwnedByUser(row, userId));
}

export async function upsertPortfolioTxn(record: PortfolioTxn, options?: UserScopedOptions) {
  const db = await getDb();
  await db.put('portfolioTxns', withScopedUserId(record, options));
}

export async function getNote(stockId: string, options?: UserScopedOptions): Promise<NoteRecord | undefined> {
  const db = await getDb();
  const userId = resolveScopedUserId(options);
  const notes = (await db.getAll('notes')) as NoteRecord[];
  return notes
    .filter((note) => isOwnedByUser(note, userId) && note.stockId === stockId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
}

export async function upsertNote(record: NoteRecord, options?: UserScopedOptions) {
  const db = await getDb();
  const userId = resolveScopedUserId(options);
  await db.put('notes', {
    ...record,
    id: `note:${userId}:${record.stockId}`,
    userId,
  } satisfies NoteRecord);
}

export async function listCustomScreens(options?: UserScopedOptions): Promise<CustomScreenRecord[]> {
  const db = await getDb();
  const userId = resolveScopedUserId(options);
  const rows = (await db.getAll('customScreens')) as CustomScreenRecord[];
  return rows.filter((row) => isOwnedByUser(row, userId));
}

export async function upsertCustomScreen(record: CustomScreenRecord, options?: UserScopedOptions) {
  const db = await getDb();
  await db.put('customScreens', withScopedUserId(record, options));
}

export async function getKv<T>(key: string, options?: KvOptions): Promise<T | undefined> {
  const db = await getDb();
  const storageKey = getScopedKvStorageKey(key, options);
  return (await db.get('kv', storageKey))?.value as T | undefined;
}

export async function setKv<T>(key: string, value: T, options?: KvOptions) {
  const db = await getDb();
  const storageKey = getScopedKvStorageKey(key, options);
  await db.put('kv', { key: storageKey, value, updatedAt: new Date().toISOString() });
}

export async function getAlertContactSettings(options?: UserScopedOptions): Promise<AlertContactSettings> {
  const existing = await getKv<AlertContactSettings>(ALERT_CONTACT_SETTINGS_KEY, options);
  return existing ?? { whatsappVerified: false };
}

export async function setAlertContactSettings(
  settings: AlertContactSettings,
  options?: UserScopedOptions,
) {
  await setKv<AlertContactSettings>(ALERT_CONTACT_SETTINGS_KEY, settings, options);
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
