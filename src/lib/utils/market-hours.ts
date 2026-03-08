import type { MarketKind, MarketStatusInfo } from '@/types';

const IST_TZ = 'Asia/Kolkata';
const ET_TZ = 'America/New_York';
const DAY_MS = 24 * 60 * 60 * 1000;

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
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    weekday: map.weekday,
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

function isWeekend(weekday: string) {
  return weekday === 'Sat' || weekday === 'Sun';
}

function makeDateWithFixedOffset(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  utcOffsetMinutes: number,
) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - utcOffsetMinutes * 60_000);
}

function makeDateForTimeZone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
) {
  const baseUtcMidnight = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  // Brute-force a UTC timestamp that formats back to the requested local wall-clock time.
  for (let deltaMinutes = -16 * 60; deltaMinutes <= 40 * 60; deltaMinutes += 15) {
    const candidate = new Date(baseUtcMidnight + deltaMinutes * 60_000);
    const p = getParts(candidate, timeZone);
    if (p.year === year && p.month === month && p.day === day && p.hour === hour && p.minute === minute) {
      return candidate;
    }
  }
  return new Date(baseUtcMidnight);
}

function getNextOpen(
  now: Date,
  marketTz: string,
  openHour: number,
  openMinute: number,
  closeHour: number,
  closeMinute: number,
) {
  const nowParts = getParts(now, marketTz);
  const nowMinutes = nowParts.hour * 60 + nowParts.minute;
  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;

  for (let i = 0; i < 10; i += 1) {
    const probe = new Date(now.getTime() + i * DAY_MS);
    const p = getParts(probe, marketTz);
    if (isWeekend(p.weekday)) continue;

    if (i === 0) {
      if (nowMinutes < openMinutes) {
        return marketTz === IST_TZ
          ? makeDateWithFixedOffset(p.year, p.month, p.day, openHour, openMinute, 330)
          : makeDateForTimeZone(p.year, p.month, p.day, openHour, openMinute, marketTz);
      }
      if (nowMinutes <= closeMinutes) {
        // If market is already open, the "next open" is the next trading day.
        continue;
      }
    }

    return marketTz === IST_TZ
      ? makeDateWithFixedOffset(p.year, p.month, p.day, openHour, openMinute, 330)
      : makeDateForTimeZone(p.year, p.month, p.day, openHour, openMinute, marketTz);
  }

  return now;
}

function getSessionClose(now: Date, marketTz: string, closeHour: number, closeMinute: number) {
  const p = getParts(now, marketTz);
  if (marketTz === IST_TZ) {
    return makeDateWithFixedOffset(p.year, p.month, p.day, closeHour, closeMinute, 330);
  }
  return makeDateForTimeZone(p.year, p.month, p.day, closeHour, closeMinute, marketTz);
}

export function getMarketStatus(market: MarketKind): MarketStatusInfo {
  const now = new Date();

  if (market === 'india' || market === 'mf') {
    const p = getParts(now, IST_TZ);
    const minutes = p.hour * 60 + p.minute;
    const open = 9 * 60 + 15;
    const close = 15 * 60 + 30;
    const isTradingDay = !isWeekend(p.weekday);
    const isOpen = isTradingDay && minutes >= open && minutes <= close;
    const nextOpenBase = getNextOpen(now, IST_TZ, 9, 15, 15, 30);
    const sessionClose = getSessionClose(now, IST_TZ, 15, 30);
    return {
      isOpen,
      marketLabel: market === 'mf' ? 'Mutual Fund / NAV' : 'Indian Market (NSE/BSE)',
      timezone: IST_TZ,
      localTime: formatInTZ(now, IST_TZ),
      nextOpenIst: formatInTZ(nextOpenBase, IST_TZ),
      sessionCloseIst: formatInTZ(sessionClose, IST_TZ),
      message: isOpen ? 'Market is open (IST).' : 'Market is closed (IST).',
    };
  }

  const p = getParts(now, ET_TZ);
  const minutes = p.hour * 60 + p.minute;
  const open = 9 * 60 + 30;
  const close = 16 * 60;
  const isTradingDay = !isWeekend(p.weekday);
  const isOpen = isTradingDay && minutes >= open && minutes <= close;
  const nextOpenBase = getNextOpen(now, ET_TZ, 9, 30, 16, 0);
  const sessionClose = getSessionClose(now, ET_TZ, 16, 0);
  return {
    isOpen,
    marketLabel: 'US Market (NYSE/NASDAQ)',
    timezone: ET_TZ,
    localTime: formatInTZ(now, ET_TZ),
    nextOpenIst: formatInTZ(nextOpenBase, IST_TZ),
    sessionCloseIst: formatInTZ(sessionClose, IST_TZ),
    message: isOpen ? 'US market is open.' : 'US market is closed.',
  };
}
