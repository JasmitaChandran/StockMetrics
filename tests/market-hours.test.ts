import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMarketStatus } from '@/lib/utils/market-hours';

describe('market hours', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks India market as open during weekday trading hours', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-25T05:00:00.000Z')); // Monday 10:30 IST

    const status = getMarketStatus('india');

    expect(status.isOpen).toBe(true);
    expect(status.marketLabel).toBe('Indian Market (NSE/BSE)');
    expect(status.timezone).toBe('Asia/Kolkata');
    expect(status.message).toBe('Market is open (IST).');
    expect(status.nextOpenIst).toMatch(/26[- ]May[- ]2026/i);
  });

  it('marks India market as closed on weekends', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-30T05:00:00.000Z')); // Saturday

    const status = getMarketStatus('india');

    expect(status.isOpen).toBe(false);
    expect(status.message).toBe('Market is closed (IST).');
    expect(status.nextOpenIst).toMatch(/01[- ]Jun[- ]2026/i);
  });

  it('uses mutual fund label for mf market scope', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-25T05:00:00.000Z'));

    const status = getMarketStatus('mf');

    expect(status.marketLabel).toBe('Mutual Fund / NAV');
    expect(status.timezone).toBe('Asia/Kolkata');
  });

  it('marks US market as open during NYSE/NASDAQ hours', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-26T14:00:00.000Z')); // Tuesday 10:00 ET (DST)

    const status = getMarketStatus('us');

    expect(status.isOpen).toBe(true);
    expect(status.marketLabel).toBe('US Market (NYSE/NASDAQ)');
    expect(status.timezone).toBe('America/New_York');
    expect(status.message).toBe('US market is open.');
  });

  it('marks US market as closed after trading hours', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-26T22:00:00.000Z')); // Tuesday 18:00 ET (DST)

    const status = getMarketStatus('us');

    expect(status.isOpen).toBe(false);
    expect(status.message).toBe('US market is closed.');
    expect(status.nextOpenIst).toMatch(/27[- ]May[- ]2026/i);
  });
});
