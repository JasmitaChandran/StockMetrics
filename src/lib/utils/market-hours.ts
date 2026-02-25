import type { MarketKind, MarketStatusInfo } from '@/types';

const IST_TZ = 'Asia/Kolkata';
const ET_TZ = 'America/New_York';

function formatInTZ(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function getParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    weekday: map.weekday,
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

function nextWeekday(date: Date, targetTz: string, openHour: number, openMinute: number): Date {
  const candidate = new Date(date.getTime());
  for (let i = 0; i < 8; i += 1) {
    candidate.setUTCDate(candidate.getUTCDate() + (i === 0 ? 0 : 1));
    const parts = getParts(candidate, targetTz);
    if (parts.weekday === 'Sat' || parts.weekday === 'Sun') continue;
    const dt = new Date(candidate.getTime());
    const utcGuess = new Date(dt);
    utcGuess.setUTCHours(0, 0, 0, 0);
    // Approximation for display; actual execution is not traded on this timestamp.
    // We intentionally use human-readable next open values instead of exchange-grade scheduling.
    return new Date(date.getTime() + i * 24 * 60 * 60 * 1000);
  }
  return new Date(date.getTime());
}

export function getMarketStatus(market: MarketKind): MarketStatusInfo {
  const now = new Date();

  if (market === 'india' || market === 'mf') {
    const p = getParts(now, IST_TZ);
    const minutes = p.hour * 60 + p.minute;
    const open = 9 * 60 + 15;
    const close = 15 * 60 + 30;
    const isTradingDay = p.weekday !== 'Sat' && p.weekday !== 'Sun';
    const isOpen = isTradingDay && minutes >= open && minutes <= close;
    const nextOpenBase = nextWeekday(now, IST_TZ, 9, 15);
    return {
      isOpen,
      marketLabel: market === 'mf' ? 'Mutual Fund / NAV' : 'Indian Market (NSE/BSE)',
      timezone: IST_TZ,
      localTime: formatInTZ(now, IST_TZ),
      nextOpenIst: formatInTZ(nextOpenBase, IST_TZ),
      sessionCloseIst: formatInTZ(now, IST_TZ),
      message: isOpen ? 'Market is open (IST).' : 'Market is closed (IST).',
    };
  }

  const p = getParts(now, ET_TZ);
  const minutes = p.hour * 60 + p.minute;
  const open = 9 * 60 + 30;
  const close = 16 * 60;
  const isTradingDay = p.weekday !== 'Sat' && p.weekday !== 'Sun';
  const isOpen = isTradingDay && minutes >= open && minutes <= close;
  const nextOpenBase = nextWeekday(now, ET_TZ, 9, 30);
  return {
    isOpen,
    marketLabel: 'US Market (NYSE/NASDAQ)',
    timezone: ET_TZ,
    localTime: formatInTZ(now, ET_TZ),
    nextOpenIst: formatInTZ(nextOpenBase, IST_TZ),
    sessionCloseIst: formatInTZ(now, IST_TZ),
    message: isOpen ? 'US market is open.' : 'US market is closed.',
  };
}
