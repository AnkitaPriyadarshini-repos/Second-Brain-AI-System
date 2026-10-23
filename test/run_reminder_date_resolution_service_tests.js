'use strict';

const assert = require('assert');
const ReminderDateResolutionService = require('../services/ReminderDateResolutionService');
const { resolveLocalDateTime } = require('../services/ReminderDateResolutionService');

async function main() {
  console.log('====================================================');
  console.log('🧪 RUNNING REMINDER DATE RESOLUTION SERVICE TESTS');
  console.log('====================================================\n');

  const resolver = new ReminderDateResolutionService();
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      passed++;
      console.log(`  ✅ [PASS] ${name}`);
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      throw err;
    }
  }

  // Fixed reference instant for reproducible calendar assertions
  // Oct 22, 2026 at 10:00:00 UTC (15:30 IST)
  const FIXED_REF = new Date('2026-10-22T10:00:00.000Z');

  // 1. tomorrow at 7pm
  test('1. "tomorrow at 7pm" resolves with explicit reference time and Asia/Kolkata timezone', () => {
    const res = resolver.resolveDateExpression('tomorrow at 7pm', {
      referenceTime: FIXED_REF,
      timeZone: 'Asia/Kolkata'
    });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.schedulingStatus, 'scheduled');
    assert.strictEqual(res.dateLocal, '2026-10-23');
    assert.strictEqual(res.timeLocal, '19:00');
    assert.strictEqual(res.timeZone, 'Asia/Kolkata');
    assert.strictEqual(res.dueAt, '2026-10-23T13:30:00.000Z'); // 19:00 IST is 13:30 UTC
    assert.strictEqual(res.dateResolvedBy, 'deterministic_parser');
    assert.strictEqual(res.requiresConfirmation, true);
  });

  // 2. An explicit ISO date and time
  test('2. An explicit ISO date and time resolves cleanly', () => {
    const res = resolver.resolveDateExpression('2027-08-15 at 14:30', {
      referenceTime: FIXED_REF,
      timeZone: 'UTC'
    });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.schedulingStatus, 'scheduled');
    assert.strictEqual(res.dateLocal, '2027-08-15');
    assert.strictEqual(res.timeLocal, '14:30');
    assert.strictEqual(res.dueAt, '2027-08-15T14:30:00.000Z');
  });

  // 3. A date without a time
  test('3. A date without a time preserves date without inventing clock time', () => {
    const res = resolver.resolveDateExpression('next Friday', {
      referenceTime: FIXED_REF,
      timeZone: 'Asia/Kolkata'
    });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.schedulingStatus, 'date_only');
    assert.strictEqual(res.dateLocal, '2026-10-30'); // Next week Friday when ref is Thursday Oct 22
    assert.strictEqual(res.timeLocal, '', 'Time must not be assumed');
    assert.strictEqual(res.dueAt, null, 'dueAt must be null when no time is specified');
    assert.deepStrictEqual(res.needs, ['time']);
  });

  // 4. No date expression
  test('4. No date expression creates a valid unscheduled task draft', () => {
    const resNull = resolver.resolveDateExpression(null, {
      referenceTime: FIXED_REF,
      timeZone: 'Asia/Kolkata'
    });
    assert.strictEqual(resNull.ok, true);
    assert.strictEqual(resNull.schedulingStatus, 'unscheduled');
    assert.strictEqual(resNull.dateExpression, null);
    assert.strictEqual(resNull.dateLocal, '');
    assert.strictEqual(resNull.timeLocal, '');
    assert.strictEqual(resNull.dueAt, null);
    assert.deepStrictEqual(resNull.needs, ['date', 'time']);

    const resEmpty = resolver.resolveDateExpression('   ', {
      referenceTime: FIXED_REF,
      timeZone: 'Asia/Kolkata'
    });
    assert.strictEqual(resEmpty.schedulingStatus, 'unscheduled');
    assert.strictEqual(resEmpty.dueAt, null);
  });

  // 5. Ambiguous numeric dates
  test('5. Ambiguous numeric dates (03/04/2027) are rejected safely', () => {
    const res = resolver.resolveDateExpression('03/04/2027 at 5pm', {
      referenceTime: FIXED_REF,
      timeZone: 'Asia/Kolkata'
    });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.code, 'AMBIGUOUS_NUMERIC_DATE');
    assert.strictEqual(res.schedulingStatus, 'needs_clarification');
    assert.match(res.message, /two different dates|month name|YYYY-MM-DD/i);
  });

  // 6. Bare hour expressions
  test('6. Bare hour expressions without am/pm require clarification', () => {
    const resStandalone = resolver.resolveDateExpression('at 7', {
      referenceTime: FIXED_REF,
      timeZone: 'Asia/Kolkata'
    });
    assert.strictEqual(resStandalone.ok, false);
    assert.strictEqual(resStandalone.code, 'INCOMPLETE_TIME');
    assert.match(resStandalone.message, /AM\/PM|24-hour/i);

    const resWithDate = resolver.resolveDateExpression('tomorrow at 7', {
      referenceTime: FIXED_REF,
      timeZone: 'Asia/Kolkata'
    });
    assert.strictEqual(resWithDate.ok, true);
    assert.strictEqual(resWithDate.schedulingStatus, 'needs_clarification');
    assert.strictEqual(resWithDate.timeLocal, '');
    assert.deepStrictEqual(resWithDate.needs, ['time']);
    assert.match(resWithDate.message, /AM\/PM|24-hour/i);
  });

  // 7. Invalid calendar values
  test('7. Invalid calendar values (e.g. Feb 31) are safely rejected', () => {
    const res = resolveLocalDateTime('2026-02-31', '10:00', 'UTC');
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.code, 'INVALID_DATE');
  });

  // 8. Invalid IANA timezone
  test('8. Invalid IANA timezone is strictly rejected without silent fallback', () => {
    const res = resolver.resolveDateExpression('tomorrow at 7pm', {
      referenceTime: FIXED_REF,
      timeZone: 'Mars/Curiosity'
    });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.code, 'INVALID_TIME_ZONE');
    assert.strictEqual(res.schedulingStatus, 'needs_clarification');
  });

  // 9. DST gap and overlap cases
  test('9. DST gap and overlap cases reject ambiguous/nonexistent wall clock times', () => {
    // Gap: March 8, 2026 at 02:30 does not exist in America/New_York (clocks jump 02:00 -> 03:00)
    const gap = resolveLocalDateTime('2026-03-08', '02:30', 'America/New_York');
    assert.strictEqual(gap.ok, false);
    assert.strictEqual(gap.code, 'NONEXISTENT_LOCAL_TIME');

    // Overlap: Nov 1, 2026 at 01:30 occurs twice in America/New_York (clocks jump back 02:00 -> 01:00)
    const overlap = resolveLocalDateTime('2026-11-01', '01:30', 'America/New_York');
    assert.strictEqual(overlap.ok, false);
    assert.strictEqual(overlap.code, 'AMBIGUOUS_LOCAL_TIME');
  });

  // 10. Past scheduled time
  test('10. Scheduled time in the past relative to reference instant is rejected', () => {
    // Reference instant is Oct 22 at 10:00 UTC. Test 08:00 UTC same day:
    const res = resolver.resolveDateExpression('today at 8am', {
      referenceTime: FIXED_REF,
      timeZone: 'UTC'
    });
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.code, 'TIME_IN_PAST');
    assert.strictEqual(res.schedulingStatus, 'needs_clarification');
  });

  // 11. Recurrence intervals
  test('11. Supported recurrence intervals are preserved; unsupported (>99) are rejected', () => {
    const resWeek = resolver.resolveDateExpression('every 2 weeks tomorrow at 3pm', {
      referenceTime: FIXED_REF,
      timeZone: 'UTC'
    });
    assert.strictEqual(resWeek.ok, true);
    assert.deepStrictEqual(resWeek.recurrence, { unit: 'week', interval: 2 });

    const resMonth = resolver.resolveDateExpression('every month tomorrow at 3pm', {
      referenceTime: FIXED_REF,
      timeZone: 'UTC'
    });
    assert.strictEqual(resMonth.ok, true);
    assert.deepStrictEqual(resMonth.recurrence, { unit: 'month', interval: 1 });

    const resInvalid = resolver.resolveDateExpression('every 150 days tomorrow at 3pm', {
      referenceTime: FIXED_REF,
      timeZone: 'UTC'
    });
    assert.strictEqual(resInvalid.ok, false);
    assert.strictEqual(resInvalid.code, 'INVALID_RECURRENCE');
  });

  // 12. Month/year boundaries and leap days
  test('12. Month/year boundaries and leap days resolve deterministically', () => {
    const endOfYear = new Date('2026-12-31T20:00:00.000Z');
    const resNewYear = resolver.resolveDateExpression('tomorrow at 10am', {
      referenceTime: endOfYear,
      timeZone: 'UTC'
    });
    assert.strictEqual(resNewYear.ok, true);
    assert.strictEqual(resNewYear.dateLocal, '2027-01-01');
    assert.strictEqual(resNewYear.timeLocal, '10:00');
    assert.strictEqual(resNewYear.dueAt, '2027-01-01T10:00:00.000Z');

    // Valid leap day: 2028-02-29
    const leapDay = resolveLocalDateTime('2028-02-29', '14:00', 'UTC');
    assert.strictEqual(leapDay.ok, true);
    assert.strictEqual(leapDay.localDate, '2028-02-29');

    // Invalid non-leap day: 2027-02-29
    const nonLeapDay = resolveLocalDateTime('2027-02-29', '14:00', 'UTC');
    assert.strictEqual(nonLeapDay.ok, false);
    assert.strictEqual(nonLeapDay.code, 'INVALID_DATE');
  });

  // 13. Different timezones using the same explicit reference instant
  test('13. Different timezones using the same explicit reference instant produce distinct verified epochs', () => {
    const resKolkata = resolver.resolveDateExpression('tomorrow at 9am', {
      referenceTime: FIXED_REF,
      timeZone: 'Asia/Kolkata'
    });
    const resNewYork = resolver.resolveDateExpression('tomorrow at 9am', {
      referenceTime: FIXED_REF,
      timeZone: 'America/New_York'
    });

    assert.strictEqual(resKolkata.ok, true);
    assert.strictEqual(resNewYork.ok, true);
    assert.strictEqual(resKolkata.dateLocal, '2026-10-23');
    assert.strictEqual(resNewYork.dateLocal, '2026-10-23');
    assert.strictEqual(resKolkata.timeLocal, '09:00');
    assert.strictEqual(resNewYork.timeLocal, '09:00');

    // 09:00 IST is 03:30 UTC
    assert.strictEqual(resKolkata.dueAt, '2026-10-23T03:30:00.000Z');
    // 09:00 EDT (UTC-4) is 13:00 UTC
    assert.strictEqual(resNewYork.dueAt, '2026-10-23T13:00:00.000Z');

    assert.notStrictEqual(resKolkata.dueAt, resNewYork.dueAt, 'Different timezones must produce different UTC epochs');
  });

  // 14. Consistent results for repeated calls
  test('14. Consistent results for repeated calls using identical input, reference instant, and timezone', () => {
    const first = JSON.stringify(resolver.resolveDateExpression('next Monday at 2pm', {
      referenceTime: FIXED_REF,
      timeZone: 'Asia/Kolkata'
    }));

    for (let i = 0; i < 10; i++) {
      const repeated = JSON.stringify(resolver.resolveDateExpression('next Monday at 2pm', {
        referenceTime: FIXED_REF,
        timeZone: 'Asia/Kolkata'
      }));
      assert.strictEqual(repeated, first, `Call ${i + 1} must match call 1 byte-for-byte`);
    }
  });

  console.log(`\n====================================================`);
  console.log(`🎉 ALL ${passed}/${total} DATE RESOLUTION TESTS PASSED`);
  console.log(`====================================================\n`);
}

main().catch((err) => {
  console.error('\n❌ Date resolution test suite failed:', err);
  process.exit(1);
});
