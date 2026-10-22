'use strict';
const assert = require('assert');
const { parseReminderText, resolveLocalDateTime } = require('../services/reminder-parser');
function run(name, fn) {
  try { fn(); process.stdout.write('PASS ' + name + '\n'); }
  catch (error) { process.stderr.write('FAIL ' + name + ': ' + error.message + '\n'); process.exitCode = 1; }
}
const reference = new Date('2026-10-22T04:00:00.000Z');
run('explicit relative date and time resolves in Asia/Kolkata', function () {
  const r = parseReminderText('Remind me to buy milk tomorrow at 7pm', { referenceTime: reference, timeZone: 'Asia/Kolkata' });
  assert.strictEqual(r.ok, true, r.message); assert.strictEqual(r.title.toLowerCase(), 'buy milk');
  assert.strictEqual(r.dateLocal, '2026-10-23'); assert.strictEqual(r.timeLocal, '19:00');
  assert.strictEqual(r.dueAt, '2026-10-23T13:30:00.000Z');
});
run('date-only expression does not invent a time', function () {
  const r = parseReminderText('Finish DBMS next Friday', { referenceTime: new Date('2026-10-23T04:00:00Z'), timeZone: 'Asia/Kolkata' });
  assert.strictEqual(r.ok, true, r.message); assert.strictEqual(r.title, 'Finish DBMS');
  assert.strictEqual(r.dateLocal, '2026-10-30'); assert.strictEqual(r.timeLocal, '');
  assert.ok(r.needs.includes('time'));
});
run('monthly recurrence is extracted from the title', function () {
  const r = parseReminderText('Remind me to pay rent every month', { referenceTime: reference, timeZone: 'Asia/Kolkata' });
  assert.strictEqual(r.ok, true, r.message); assert.strictEqual(r.title.toLowerCase(), 'pay rent');
  assert.deepStrictEqual(r.recurrence, { unit: 'month', interval: 1 });
  assert.ok(r.needs.includes('date')); assert.ok(r.needs.includes('time'));
});
run('interval recurrence is recognized', function () {
  const r = parseReminderText('Review notes every 2 weeks', { referenceTime: reference, timeZone: 'Asia/Kolkata' });
  assert.strictEqual(r.ok, true, r.message); assert.deepStrictEqual(r.recurrence, { unit: 'week', interval: 2 });
});
run('ambiguous numeric dates are rejected', function () {
  const r = parseReminderText('Submit form on 03/04/2027', { referenceTime: reference, timeZone: 'Asia/Kolkata' });
  assert.strictEqual(r.ok, false); assert.strictEqual(r.code, 'AMBIGUOUS_NUMERIC_DATE');
});
run('bare hour requires clarification', function () {
  const r = parseReminderText('Call the dentist tomorrow at 7', { referenceTime: reference, timeZone: 'Asia/Kolkata' });
  assert.strictEqual(r.ok, true, r.message); assert.strictEqual(r.timeLocal, '');
  assert.ok(r.needs.includes('time')); assert.match(r.message, /AM\/PM|24-hour/i);
});
run('invalid time zones are rejected', function () {
  const r = parseReminderText('Call the dentist tomorrow at 7pm', { referenceTime: reference, timeZone: 'Not/AZone' });
  assert.strictEqual(r.ok, false); assert.strictEqual(r.code, 'INVALID_TIME_ZONE');
});
run('daylight-saving gap is rejected', function () {
  const r = resolveLocalDateTime('2026-03-08', '02:30', 'America/New_York');
  assert.strictEqual(r.ok, false); assert.strictEqual(r.code, 'NONEXISTENT_LOCAL_TIME');
});
run('daylight-saving overlap is rejected', function () {
  const r = resolveLocalDateTime('2026-11-01', '01:30', 'America/New_York');
  assert.strictEqual(r.ok, false); assert.strictEqual(r.code, 'AMBIGUOUS_LOCAL_TIME');
});
run('invalid calendar dates are rejected', function () {
  const r = resolveLocalDateTime('2026-02-30', '10:00', 'UTC');
  assert.strictEqual(r.ok, false); assert.strictEqual(r.code, 'INVALID_DATE');
});
run('year boundary rolls to the correct local date and instant', function () {
  const r = parseReminderText('Settle invoice tomorrow at 9am', {
    referenceTime: new Date('2026-12-31T03:00:00Z'), timeZone: 'Asia/Kolkata'
  });
  assert.strictEqual(r.ok, true, r.message);
  assert.strictEqual(r.dateLocal, '2027-01-01');
  assert.strictEqual(r.timeLocal, '09:00');
  assert.strictEqual(r.dueAt, '2027-01-01T03:30:00.000Z');
});
run('valid leap-day reminder parses correctly', function () {
  const r = parseReminderText('Call mom on February 29, 2028 at 4pm', {
    referenceTime: reference, timeZone: 'Asia/Kolkata'
  });
  assert.strictEqual(r.ok, true, r.message);
  assert.strictEqual(r.title.toLowerCase(), 'call mom');
  assert.strictEqual(r.dateLocal, '2028-02-29');
  assert.strictEqual(r.timeLocal, '16:00');
});
run('past same-day times are rejected', function () {
  const r = parseReminderText('Breakfast today at 7am', {
    referenceTime: reference, timeZone: 'Asia/Kolkata'
  });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'TIME_IN_PAST');
});
run('unsupported recurrence intervals are rejected', function () {
  const r = parseReminderText('Review notes every 100 days', {
    referenceTime: reference, timeZone: 'Asia/Kolkata'
  });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.code, 'INVALID_RECURRENCE');
});
