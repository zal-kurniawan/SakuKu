import assert from 'node:assert';
import {
  APP_TIMEZONE,
  getTimezoneDateParts,
  getTodayRange,
  getMonthRange,
  getYearRange,
} from './timezone';

console.log('====================================================');
console.log('🧪 TESTING SAKUKU TIMEZONE & MIDNIGHT RESET ENGINE');
console.log('====================================================');

// 1. Test Today Range at 05:56 WIB on Nov 13, 2026 (The User Reported Scenario)
const testDate0556 = new Date('2026-11-13T05:56:00+07:00');
const today0556 = getTodayRange(testDate0556);

console.log('Scenario 1: 05:56 AM WIB on Nov 13, 2026');
console.log('  startOfDay UTC:', today0556.startOfDay.toISOString());
console.log('  endOfDay UTC:  ', today0556.endOfDay.toISOString());
console.log('  dateKey:       ', today0556.dateKey);

// In UTC:
// 2026-11-13 00:00:00+07:00 is 2026-11-12T17:00:00.000Z
// 2026-11-13 23:59:59.999+07:00 is 2026-11-13T16:59:59.999Z
assert.strictEqual(today0556.dateKey, '2026-11-13');
assert.strictEqual(today0556.startOfDay.toISOString(), '2026-11-12T17:00:00.000Z');
assert.strictEqual(today0556.endOfDay.toISOString(), '2026-11-13T16:59:59.999Z');

// Yesterday's transaction at 19:24 WIB on Nov 12
const yesterdayTx = new Date('2026-11-12T19:24:00+07:00');
assert.strictEqual(
  yesterdayTx >= today0556.startOfDay && yesterdayTx <= today0556.endOfDay,
  false,
  'Yesterday 19:24 WIB must NOT be included in today 05:56 WIB range'
);
console.log('✓ Yesterday 19:24 WIB is strictly EXCLUDED at 05:56 WIB (PASSED)');

// Today's transaction at 05:30 WIB on Nov 13
const earlyTodayTx = new Date('2026-11-13T05:30:00+07:00');
assert.strictEqual(
  earlyTodayTx >= today0556.startOfDay && earlyTodayTx <= today0556.endOfDay,
  true,
  'Today 05:30 WIB must be INCLUDED in today range'
);
console.log('✓ Early today transaction (05:30 WIB) is INCLUDED (PASSED)');

// 2. Test Midnight Reset at 00:00:01 WIB on Nov 13, 2026
const midnightJustAfter = new Date('2026-11-13T00:00:01+07:00');
const todayMidnight = getTodayRange(midnightJustAfter);
assert.strictEqual(todayMidnight.dateKey, '2026-11-13');
assert.strictEqual(todayMidnight.startOfDay.toISOString(), '2026-11-12T17:00:00.000Z');

const justBeforeMidnight = new Date('2026-11-12T23:59:59+07:00');
assert.strictEqual(
  justBeforeMidnight >= todayMidnight.startOfDay,
  false,
  '23:59:59 of yesterday must NOT be included in new day starting at 00:00:00'
);
console.log('✓ Midnight reset occurs exactly at 00:00:00 WIB (PASSED)');

// 3. Test 07:35 WIB on Nov 13, 2026 (Same Day Consistency)
const testDate0735 = new Date('2026-11-13T07:35:00+07:00');
const today0735 = getTodayRange(testDate0735);
assert.strictEqual(today0735.startOfDay.getTime(), today0556.startOfDay.getTime());
assert.strictEqual(today0735.endOfDay.getTime(), today0556.endOfDay.getTime());
console.log('✓ 05:56 AM and 07:35 AM produce 100% IDENTICAL day boundaries (PASSED)');

// 4. Test Month Range (November 2026)
const novRange = getMonthRange(2026, 11);
console.log('\nScenario 2: Month Range for November 2026 (WIB)');
console.log('  startOfMonth UTC:', novRange.startOfMonth.toISOString());
console.log('  endOfMonth UTC:  ', novRange.endOfMonth.toISOString());

// 2026-11-01 00:00:00+07:00 is 2026-10-31T17:00:00.000Z
// 2026-11-30 23:59:59.999+07:00 is 2026-11-30T16:59:59.999Z
assert.strictEqual(novRange.startOfMonth.toISOString(), '2026-10-31T17:00:00.000Z');
assert.strictEqual(novRange.endOfMonth.toISOString(), '2026-11-30T16:59:59.999Z');

// Early 1st of month: 2026-11-01 01:00:00 WIB
const novFirstEarly = new Date('2026-11-01T01:00:00+07:00');
assert.strictEqual(novFirstEarly >= novRange.startOfMonth && novFirstEarly <= novRange.endOfMonth, true);
console.log('✓ Early month transaction (Nov 1st 01:00 WIB) is INCLUDED (PASSED)');

// Just before month start: 2026-10-31 23:59:59 WIB
const octLastMinute = new Date('2026-10-31T23:59:59+07:00');
assert.strictEqual(octLastMinute >= novRange.startOfMonth, false);
console.log('✓ Previous month transaction (Oct 31st 23:59 WIB) is EXCLUDED (PASSED)');

// 5. Test February in Leap Year (2024 vs 2026)
const feb2024 = getMonthRange(2024, 2);
assert.strictEqual(feb2024.endOfMonth.toISOString(), '2024-02-29T16:59:59.999Z'); // 29 days
const feb2026 = getMonthRange(2026, 2);
assert.strictEqual(feb2026.endOfMonth.toISOString(), '2026-02-28T16:59:59.999Z'); // 28 days
console.log('✓ Leap year February (2024 = 29 days, 2026 = 28 days) handled correctly (PASSED)');

// 6. Test Custom Date Range & Budget Period Status
import {
  getCustomDateRange,
  formatDateKey,
  formatDateRangeDisplay,
  getBudgetPeriodStatus,
  getJakartaDateKey,
  getNextJakartaMidnight,
} from './timezone';

const customRange = getCustomDateRange('2026-10-25', '2026-11-24');
assert.strictEqual(customRange.start.toISOString(), '2026-10-24T17:00:00.000Z'); // 2026-10-25 00:00 WIB
assert.strictEqual(customRange.end.toISOString(), '2026-11-24T16:59:59.999Z'); // 2026-11-24 23:59:59.999 WIB
console.log('✓ Custom date range WIB boundaries verified (PASSED)');

const formattedId = formatDateRangeDisplay('2026-10-25', '2026-11-24', 'id');
assert.strictEqual(formattedId, '25 Okt – 24 Nov 2026');
const formattedEn = formatDateRangeDisplay('2026-10-25', '2026-11-24', 'en');
assert.strictEqual(formattedEn, 'Oct 25 – Nov 24, 2026');
console.log('✓ Date range display formatting ID and EN verified (PASSED)');

const formattedIdCrossYear = formatDateRangeDisplay('2026-12-25', '2027-01-24', 'id');
assert.strictEqual(formattedIdCrossYear, '25 Des 2026 – 24 Jan 2027');
const formattedEnCrossYear = formatDateRangeDisplay('2026-12-25', '2027-01-24', 'en');
assert.strictEqual(formattedEnCrossYear, 'Dec 25, 2026 – Jan 24, 2027');
console.log('✓ Cross-year date range formatting verified (PASSED)');

// 7. Test Midnight Jakarta Expiration & Date Key Helpers
const testNowWIB = new Date('2026-11-14T18:00:00+07:00');
assert.strictEqual(getJakartaDateKey(testNowWIB), '2026-11-14');
const nextMidnight = getNextJakartaMidnight(testNowWIB);
// 2026-11-15 00:00:00 WIB in UTC is 2026-11-14T17:00:00.000Z
assert.strictEqual(nextMidnight.toISOString(), '2026-11-14T17:00:00.000Z');
console.log('✓ Next Jakarta midnight for 18:00 WIB correctly points to 00:00 WIB next day (PASSED)');

// Exactly 1 second before midnight: 23:59:59 WIB on Nov 14
const oneSecBeforeMidnight = new Date('2026-11-14T23:59:59+07:00');
assert.strictEqual(getJakartaDateKey(oneSecBeforeMidnight), '2026-11-14');
assert.strictEqual(getNextJakartaMidnight(oneSecBeforeMidnight).toISOString(), '2026-11-14T17:00:00.000Z');
console.log('✓ Next Jakarta midnight at 23:59:59 WIB points to upcoming 00:00 WIB (PASSED)');

// Exactly 1 second after midnight: 00:00:01 WIB on Nov 15
const oneSecAfterMidnight = new Date('2026-11-15T00:00:01+07:00');
assert.strictEqual(getJakartaDateKey(oneSecAfterMidnight), '2026-11-15');
assert.strictEqual(getNextJakartaMidnight(oneSecAfterMidnight).toISOString(), '2026-11-15T17:00:00.000Z'); // Nov 16 00:00 WIB
console.log('✓ Next Jakarta midnight at 00:00:01 WIB correctly advances to next night 00:00 WIB (PASSED)');

// End of year rollover: Dec 31, 2026 22:00:00 WIB
const newYearsEve = new Date('2026-12-31T22:00:00+07:00');
assert.strictEqual(getJakartaDateKey(newYearsEve), '2026-12-31');
assert.strictEqual(getNextJakartaMidnight(newYearsEve).toISOString(), '2026-12-31T17:00:00.000Z'); // 2027-01-01 00:00 WIB
console.log('✓ Next Jakarta midnight on New Year\'s Eve rolls over to Jan 1 00:00 WIB (PASSED)');

console.log('\n🎉 ALL TIMEZONE & RESET ENGINE TESTS PASSED 100% SUCCESSFULLY!\n');
