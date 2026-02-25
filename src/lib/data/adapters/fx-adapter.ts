import type { FxAdapter } from './types';
import { getKv, setKv } from '@/lib/storage/repositories';

const FX_KV_KEY = 'fx:usd-inr';

export const fxAdapter: FxAdapter = {
  async getUsdInr() {
    try {
      const response = await fetch('/api/fx/usd-inr', { cache: 'no-store' });
      if (!response.ok) throw new Error('fx failed');
      const data = await response.json();
      await setKv(FX_KV_KEY, data);
      return data;
    } catch {
      const cached = await getKv<{ rate: number; source: string; timestamp: string }>(FX_KV_KEY);
      if (cached) return { ...cached, stale: true };
      return { rate: 83.0, source: 'Reference FX rate', timestamp: new Date().toISOString(), stale: true };
    }
  },
};
