'use client';

import { useEffect, useState } from 'react';
import { SectionCard } from '@/components/common/section-card';
import { DB_NAME, DB_VERSION, getDb } from '@/lib/storage/idb';

type StoreDump = {
  name: string;
  count: number;
  records: unknown[];
};

const REDACTED_KEYS = new Set(['passwordHash', 'accessToken', 'refreshToken']);

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        REDACTED_KEYS.has(key) ? '[redacted]' : sanitizeValue(item),
      ]),
    );
  }

  if (typeof value === 'string' && value.length > 240) {
    return `${value.slice(0, 120)}...[truncated]`;
  }

  return value;
}

export default function DebugDbPage() {
  const [stores, setStores] = useState<StoreDump[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);

  async function loadDbContents() {
    setIsLoading(true);
    setError(null);

    let db: Awaited<ReturnType<typeof getDb>> | null = null;

    try {
      db = await getDb();
      const storeNames = Array.from(db.objectStoreNames).sort((left, right) => left.localeCompare(right));
      const nextStores = await Promise.all(
        storeNames.map(async (name) => {
          const records = await db.getAll(name);
          return {
            name,
            count: records.length,
            records: records.map((record) => sanitizeValue(record)),
          };
        }),
      );

      setStores(nextStores);
      setLastLoadedAt(new Date().toLocaleString());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to read IndexedDB.');
    } finally {
      db?.close();
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDbContents();
    // The initial read should only happen once; manual refreshes use the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500 dark:text-indigo-300">
          Local DB Inspector
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            IndexedDB contents for {DB_NAME}
          </h1>
          <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            This page reads the browser-local database for the current origin and profile only. Sensitive fields are
            redacted by default.
          </p>
        </div>
      </section>

      <SectionCard
        title="Database Summary"
        subtitle={`Version ${DB_VERSION}`}
        action={
          <button
            type="button"
            onClick={loadDbContents}
            disabled={isLoading}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:text-indigo-300"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        }
      >
        <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Object Stores</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{stores.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Total Records</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
              {stores.reduce((total, store) => total + store.count, 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Last Loaded</p>
            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{lastLoadedAt ?? 'Not loaded yet'}</p>
          </div>
        </div>
        {error ? (
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </p>
        ) : null}
      </SectionCard>

      <div className="grid gap-4">
        {stores.map((store) => (
          <SectionCard
            key={store.name}
            title={store.name}
            subtitle={`${store.count} record${store.count === 1 ? '' : 's'}`}
          >
            {store.count === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No records found in this object store.</p>
            ) : (
              <pre className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-slate-950 p-4 text-xs leading-6 text-slate-100 dark:border-slate-800">
                {JSON.stringify(store.records, null, 2)}
              </pre>
            )}
          </SectionCard>
        ))}
      </div>
    </main>
  );
}
