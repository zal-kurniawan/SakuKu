/**
 * Timezone utilities for SakuKu
 * Defaults to Asia/Jakarta (WIB, UTC+7).
 * Ensures daily and monthly reset boundaries occur exactly at 00:00:00 local time
 * regardless of whether the Node.js process / cloud server runs in UTC.
 */

export const APP_TIMEZONE = process.env.TIMEZONE || 'Asia/Jakarta';

export const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Returns YYYY-MM-DD in Asia/Jakarta timezone, independent of server timezone.
 */
export function getJakartaDateKey(now: Date = new Date()): string {
  const jakartaNow = new Date(now.getTime() + JAKARTA_OFFSET_MS);
  const y = jakartaNow.getUTCFullYear();
  const m = String(jakartaNow.getUTCMonth() + 1).padStart(2, '0');
  const d = String(jakartaNow.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns exact UTC Date for the next upcoming 00:00:00 in Asia/Jakarta timezone.
 */
export function getNextJakartaMidnight(now: Date = new Date()): Date {
  const jakartaNow = new Date(now.getTime() + JAKARTA_OFFSET_MS);
  const nextMidnightJakartaUTC = Date.UTC(
    jakartaNow.getUTCFullYear(),
    jakartaNow.getUTCMonth(),
    jakartaNow.getUTCDate() + 1,
    0, 0, 0, 0
  );
  return new Date(nextMidnightJakartaUTC - JAKARTA_OFFSET_MS);
}

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

/**
 * Returns the exact UTC Date boundaries for a custom date range in the target timezone (Asia/Jakarta / WIB by default).
 * startDateStr and endDateStr must be in YYYY-MM-DD format.
 */
export function getCustomDateRange(
  startDateStr: string,
  endDateStr: string,
  timeZone: string = APP_TIMEZONE
): {
  start: Date;
  end: Date;
  startDateKey: string;
  endDateKey: string;
} {
  const offset = getTimezoneOffsetString(new Date(), timeZone);
  const start = new Date(`${startDateStr}T00:00:00.000${offset}`);
  const end = new Date(`${endDateStr}T23:59:59.999${offset}`);

  return {
    start,
    end,
    startDateKey: startDateStr,
    endDateKey: endDateStr,
  };
}

/**
 * Converts a Date to YYYY-MM-DD string in the target application timezone.
 */
export function formatDateKey(date: Date, timeZone: string = APP_TIMEZONE): string {
  const parts = getTimezoneDateParts(date, timeZone);
  const yStr = String(parts.year);
  const mStr = String(parts.month).padStart(2, '0');
  const dStr = String(parts.day).padStart(2, '0');
  return `${yStr}-${mStr}-${dStr}`;
}

/**
 * Formats a date range into a localized human-readable string.
 * Examples:
 * ID: "25 Okt – 24 Nov 2026"
 * EN: "Oct 25 – Nov 24, 2026"
 */
export function formatDateRangeDisplay(
  startDate: Date | string,
  endDate: Date | string,
  locale: string = 'id',
  timeZone: string = APP_TIMEZONE
): string {
  const d1 = typeof startDate === 'string' ? new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00.000+07:00`) : startDate;
  const d2 = typeof endDate === 'string' ? new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999+07:00`) : endDate;

  const p1 = getTimezoneDateParts(d1, timeZone);
  const p2 = getTimezoneDateParts(d2, timeZone);

  const monthNamesIdShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];
  const monthNamesEnShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const m1 = (locale === 'en' ? monthNamesEnShort : monthNamesIdShort)[p1.month - 1];
  const m2 = (locale === 'en' ? monthNamesEnShort : monthNamesIdShort)[p2.month - 1];

  if (p1.year === p2.year) {
    if (locale === 'en') {
      if (p1.month === p2.month && p1.day === p2.day) {
        return `${m1} ${p1.day}, ${p1.year}`;
      }
      if (p1.month === p2.month) {
        return `${m1} ${p1.day} – ${p2.day}, ${p1.year}`;
      }
      return `${m1} ${p1.day} – ${m2} ${p2.day}, ${p1.year}`;
    } else {
      if (p1.month === p2.month && p1.day === p2.day) {
        return `${p1.day} ${m1} ${p1.year}`;
      }
      return `${p1.day} ${m1} – ${p2.day} ${m2} ${p1.year}`;
    }
  }

  // Different years
  if (locale === 'en') {
    return `${m1} ${p1.day}, ${p1.year} – ${m2} ${p2.day}, ${p2.year}`;
  }
  return `${p1.day} ${m1} ${p1.year} – ${p2.day} ${m2} ${p2.year}`;
}

export type BudgetPeriodStatusType = 'UPCOMING' | 'ACTIVE' | 'ENDS_TODAY' | 'ENDED';

export interface BudgetPeriodStatusResult {
  status: BudgetPeriodStatusType;
  daysLeft?: number;
}

/**
 * Calculates whether a budget is upcoming, active (with days left), ending today, or ended.
 */
export function getBudgetPeriodStatus(
  startDate: Date | string,
  endDate: Date | string,
  timeZone: string = APP_TIMEZONE
): BudgetPeriodStatusResult {
  const d1 = typeof startDate === 'string' ? new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00.000+07:00`) : startDate;
  const d2 = typeof endDate === 'string' ? new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999+07:00`) : endDate;

  const { startOfDay: todayStart, endOfDay: todayEnd } = getTodayRange(new Date(), timeZone);

  if (d2 < todayStart) {
    return { status: 'ENDED' };
  }

  if (d1 > todayEnd) {
    return { status: 'UPCOMING' };
  }

  // Check if ending today
  if (d2 >= todayStart && d2 <= todayEnd) {
    return { status: 'ENDS_TODAY', daysLeft: 0 };
  }

  // Active with days remaining
  const msRemaining = d2.getTime() - todayEnd.getTime();
  const daysLeft = Math.max(1, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  return { status: 'ACTIVE', daysLeft };
}
