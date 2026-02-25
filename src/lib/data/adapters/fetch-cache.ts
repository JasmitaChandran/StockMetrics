const memoryCache = new Map<string, { expiresAt: number; value: unknown }>();

export async function fetchJsonWithTtl<T>(url: string, ttlMs = 60_000): Promise<T> {
  const cached = memoryCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.value as T;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Fetch failed (${response.status}) for ${url}`);
  }
  const data = (await response.json()) as T;
  memoryCache.set(url, { expiresAt: Date.now() + ttlMs, value: data });
  return data;
}
