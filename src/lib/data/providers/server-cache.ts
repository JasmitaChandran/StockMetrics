const cache = new Map<string, { expiresAt: number; value: unknown }>();

export async function withServerCache<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const existing = cache.get(key);
  if (existing && existing.expiresAt > Date.now()) return existing.value as T;
  const value = await loader();
  cache.set(key, { expiresAt: Date.now() + ttlMs, value });
  return value;
}
