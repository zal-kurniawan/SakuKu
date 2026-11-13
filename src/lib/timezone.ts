/**
 * Timezone utilities for SakuKu
 * Defaults to Asia/Jakarta (WIB, UTC+7).
 * Ensures daily and monthly reset boundaries occur exactly at 00:00:00 local time
 * regardless of whether the Node.js process / cloud server runs in UTC.
 */

export const APP_TIMEZONE = process.env.TIMEZONE || 'Asia/Jakarta';

/**
 * Returns formatted offset string for the given timezone, e.g. "+07:00", "+08:00", "+00:00"
 */
export function getTimezoneOffsetString(date: Date = new Date(), timeZone: string = APP_TIMEZONE): string {
  const str = date.toLocaleTimeString('en-US', { timeZone, timeZoneName: 'longOffset' });
  const match = str.match(/GMT([+-]\d{1,2})(?::?(\d{2}))?/);
  if (!match) return '+07:00';
  const sign = match[1][0];
  const hours = Math.abs(parseInt(match[1], 10)).toString().padStart(2, '0');
  const minutes = (match[2] || '00').padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}

/**
 * Returns the calendar date parts (year, month 1-12, day 1-31, hour 0-23, minute, second)
 * in the target application timezone.
 */
export function getTimezoneDateParts(date: Date = new Date(), timeZone: string = APP_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';

  const rawHour = parseInt(get('hour'), 10);
  const hour = rawHour === 24 ? 0 : rawHour;

  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10), // 1 - 12
    day: parseInt(get('day'), 10),     // 1 - 31
    hour,
    minute: parseInt(get('minute'), 10),
    second: parseInt(get('second'), 10),
  };
}

/**
 * Returns the exact UTC Date boundaries for "Today" (00:00:00.000 to 23:59:59.999)
 * calculated according to the user's local timezone (Asia/Jakarta / WIB by default).
 *
 * Example in WIB (+07:00):
 * If now is 05:56 WIB on 13 Nov 2026:
 * startOfDay: 2026-11-13 00:00:00.000+07:00 (2026-11-12T17:00:00.000Z UTC)
 * endOfDay:   2026-11-13 23:59:59.999+07:00 (2026-11-13T16:59:59.999Z UTC)
 */
export function getTodayRange(baseDate: Date = new Date(), timeZone: string = APP_TIMEZONE): {
  startOfDay: Date;
  endOfDay: Date;
  year: number;
  month: number;
  day: number;
  dateKey: string; // YYYY-MM-DD
} {
  const { year, month, day } = getTimezoneDateParts(baseDate, timeZone);
  const offset = getTimezoneOffsetString(baseDate, timeZone);
  const yStr = String(year);
  const mStr = String(month).padStart(2, '0');
  const dStr = String(day).padStart(2, '0');

  const startOfDay = new Date(`${yStr}-${mStr}-${dStr}T00:00:00.000${offset}`);
  const endOfDay = new Date(`${yStr}-${mStr}-${dStr}T23:59:59.999${offset}`);
  const dateKey = `${yStr}-${mStr}-${dStr}`;

  return { startOfDay, endOfDay, year, month, day, dateKey };
}

/**
 * Returns the exact UTC Date boundaries for a month (00:00:00.000 on the 1st to 23:59:59.999 on the last day)
 * calculated according to the user's local timezone (Asia/Jakarta / WIB by default).
 * targetMonth is 1-indexed (1 = January, 12 = December). Defaults to current month in target timezone.
 */
export function getMonthRange(
  targetYear?: number,
  targetMonth?: number,
  timeZone: string = APP_TIMEZONE
): {
  startOfMonth: Date;
  endOfMonth: Date;
  year: number;
  month: number;
  monthKey: string; // YYYY-MM
} {
  const parts = getTimezoneDateParts(new Date(), timeZone);
  const year = targetYear ?? parts.year;
  const month = targetMonth ?? parts.month;
  const offset = getTimezoneOffsetString(new Date(), timeZone);

  const yStr = String(year);
  const mStr = String(month).padStart(2, '0');

  const lastDay = new Date(year, month, 0).getDate();
  const dStr = String(lastDay).padStart(2, '0');

  const startOfMonth = new Date(`${yStr}-${mStr}-01T00:00:00.000${offset}`);
  const endOfMonth = new Date(`${yStr}-${mStr}-${dStr}T23:59:59.999${offset}`);
  const monthKey = `${yStr}-${mStr}`;

  return { startOfMonth, endOfMonth, year, month, monthKey };
}

/**
 * Returns the exact UTC Date boundaries for a full year in the target timezone.
 */
export function getYearRange(
  targetYear?: number,
  timeZone: string = APP_TIMEZONE
): {
  startOfYear: Date;
  endOfYear: Date;
  year: number;
} {
  const parts = getTimezoneDateParts(new Date(), timeZone);
  const year = targetYear ?? parts.year;
  const offset = getTimezoneOffsetString(new Date(), timeZone);

  const yStr = String(year);
  const startOfYear = new Date(`${yStr}-01-01T00:00:00.000${offset}`);
  const endOfYear = new Date(`${yStr}-12-31T23:59:59.999${offset}`);

  return { startOfYear, endOfYear, year };
}
