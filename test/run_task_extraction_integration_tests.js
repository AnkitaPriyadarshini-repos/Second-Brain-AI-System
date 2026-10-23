'use strict';

const assert = require('assert');
const crypto = require('crypto');
const handler = require('../api/reminders');

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader: function (name, value) { this.headers[name] = value; },
    status: function (code) { this.statusCode = code; return this; },
    json: function (body) { this.body = body; return this; }
  };
}

function mockReq(method, options) {
  options = options || {};
  const r = {
    method: method,
    headers: Object.assign({
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      'sec-fetch-site': 'same-origin'
    }, options.headers || {}),
    body: options.body || {},
    query: options.query || {}
  };
  if (options.__testReferenceTime) r.__testReferenceTime = options.__testReferenceTime;
  return r;
}

function cookieOf(response) {
  return String(response.headers['Set-Cookie'] || '').split(';')[0];
}

async function main() {
  console.log('====================================================');
  console.log('🧪 RUNNING TASK EXTRACTION & RESOLUTION INTEGRATION TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function pass(name) {
    passed++;
    console.log(`  ✅ [PASS] ${name}`);
  }

  // Setup mock storage and session secret
  const validSecret = 'integration_test_secret_32bytes_minimum_length!';
  process.env.MILO_SESSION_SECRET = validSecret;
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.integration.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'integration-test-token';
  delete process.env.VERCEL;

  const storage = new Map();
  global.fetch = async function (_url, options) {
    const command = JSON.parse(options.body);
    let result;
    if (command[0] === 'HSET') {
      if (!storage.has(command[1])) storage.set(command[1], new Map());
      storage.get(command[1]).set(command[2], command[3]);
      result = 1;
    } else if (command[0] === 'HGETALL') {
      result = Array.from((storage.get(command[1]) || new Map()).entries()).flat();
    } else if (command[0] === 'HDEL') {
      result = (storage.get(command[1]) || new Map()).delete(command[2]) ? 1 : 0;
    } else {
      throw new Error('Unexpected Redis command ' + command[0]);
    }
    return {
      ok: true,
      status: 200,
      json: async function () { return { result: result }; }
    };
  };

  // 1. Complete flow: User input -> Extraction -> Resolution -> Editable draft -> Explicit Confirmation -> Persistence
  total++;
  const parseRes = mockRes();
  await handler(mockReq('POST', {
    body: {
      action: 'parse',
      text: 'Remind me to finish assignment tomorrow at 7pm',
      timeZone: 'Asia/Kolkata'
    }
  }), parseRes);

  assert.strictEqual(parseRes.statusCode, 200);
  assert.strictEqual(parseRes.body.success, true);
  const draft = parseRes.body.draft;
  assert.strictEqual(draft.ok, true);
  assert.strictEqual(draft.title.toLowerCase(), 'finish assignment');
  assert.strictEqual(draft.taskType, 'academic');
  assert.strictEqual(draft.dateExpression.toLowerCase(), 'tomorrow at 7pm');
  assert.strictEqual(draft.dateResolvedBy, 'deterministic_parser');
  assert.strictEqual(draft.requiresConfirmation, true);
  assert.strictEqual(draft.schedulingStatus, 'scheduled');
  assert.ok(draft.dueAt, 'dueAt must be a normalized ISO timestamp');
  assert.strictEqual(draft.timeLocal, '19:00');

  const sessionCookie = cookieOf(parseRes);
  assert.ok(sessionCookie.startsWith('milo_reminder_session='));

  // Save the confirmed draft
  const saveRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'save',
      confirmed: true,
      title: draft.title,
      taskType: draft.taskType,
      dateExpression: draft.dateExpression,
      resolutionToken: draft.resolutionToken,
      dateLocal: draft.dateLocal,
      timeLocal: draft.timeLocal,
      timeZone: draft.timeZone
    }
  }), saveRes);

  assert.strictEqual(saveRes.statusCode, 201);
  assert.strictEqual(saveRes.body.success, true);
  assert.strictEqual(saveRes.body.reminder.title, draft.title);
  assert.strictEqual(saveRes.body.reminder.taskType, 'academic');
  assert.strictEqual(saveRes.body.reminder.schedulingStatus, 'scheduled');
  pass('1. Complete flow from user input through extraction, resolution, draft, and confirmed persistence');

  // 2. Unsupported dates never become silently scheduled
  total++;
  const ambiguousRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'parse',
      text: 'Review budget on 04/05/2027',
      timeZone: 'Asia/Kolkata'
    }
  }), ambiguousRes);
  assert.strictEqual(ambiguousRes.statusCode, 422);
  assert.strictEqual(ambiguousRes.body.code, 'AMBIGUOUS_NUMERIC_DATE');
  pass('2. Unsupported / ambiguous dates never become silently scheduled');

  // 3. No-date tasks remain valid unscheduled drafts and can be saved
  total++;
  const noDateParseRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'parse',
      text: 'Buy organic almond milk and fresh bread',
      timeZone: 'Asia/Kolkata'
    }
  }), noDateParseRes);

  assert.strictEqual(noDateParseRes.statusCode, 200);
  const unscheduledDraft = noDateParseRes.body.draft;
  assert.strictEqual(unscheduledDraft.schedulingStatus, 'unscheduled');
  assert.strictEqual(unscheduledDraft.dateExpression, null);
  assert.strictEqual(unscheduledDraft.dueAt, null);
  assert.strictEqual(unscheduledDraft.taskType, 'personal');

  // Save confirmed unscheduled task
  const saveUnscheduledRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'save',
      confirmed: true,
      title: unscheduledDraft.title,
      taskType: unscheduledDraft.taskType,
      dateExpression: null,
      dateLocal: '',
      timeLocal: '',
      timeZone: 'Asia/Kolkata'
    }
  }), saveUnscheduledRes);

  assert.strictEqual(saveUnscheduledRes.statusCode, 201);
  assert.strictEqual(saveUnscheduledRes.body.reminder.schedulingStatus, 'unscheduled');
  assert.strictEqual(saveUnscheduledRes.body.reminder.dueAt, null);
  pass('3. No-date tasks remain valid unscheduled drafts and persist upon confirmation');

  // 4. Editing a title does not change the date resolution
  total++;
  // Direct client title edit preserves existing schedule
  const editedTitle = 'Finish machine learning assignment';
  const saveEditedTitleRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'save',
      confirmed: true,
      title: editedTitle,
      taskType: draft.taskType,
      dateExpression: draft.dateExpression,
      resolutionToken: draft.resolutionToken,
      dateLocal: draft.dateLocal,
      timeLocal: draft.timeLocal,
      timeZone: draft.timeZone
    }
  }), saveEditedTitleRes);
  assert.strictEqual(saveEditedTitleRes.statusCode, 201);
  assert.strictEqual(saveEditedTitleRes.body.reminder.title, editedTitle);
  assert.strictEqual(saveEditedTitleRes.body.reminder.dueAt, draft.dueAt);
  pass('4. Editing a title does not alter resolved dates');

  // 5. Changing the timezone causes a predictable re-resolution via action=resolve
  total++;
  const reResolveRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'resolve',
      dateExpression: 'tomorrow at 7pm',
      timeZone: 'America/New_York',
      referenceTime: draft.referenceTime
    }
  }), reResolveRes);

  assert.strictEqual(reResolveRes.statusCode, 200);
  assert.strictEqual(reResolveRes.body.draft.timeZone, 'America/New_York');
  assert.strictEqual(reResolveRes.body.draft.timeLocal, '19:00');
  // Different timezone must have a different UTC instant
  assert.notStrictEqual(reResolveRes.body.draft.dueAt, draft.dueAt);
  pass('5. Changing timezone causes predictable deterministic re-resolution');

  // 6. Save confirmation is strictly required
  total++;
  const unconfirmedSaveRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'save',
      confirmed: false, // NOT confirmed
      title: 'Unconfirmed attempt',
      dateLocal: '2030-01-01',
      timeLocal: '10:00',
      timeZone: 'UTC'
    }
  }), unconfirmedSaveRes);
  assert.strictEqual(unconfirmedSaveRes.statusCode, 400);
  assert.match(unconfirmedSaveRes.body.error, /confirm/i);
  pass('6. Save confirmation gate is strictly enforced (HTTP 400 when unconfirmed)');

  // 7. Storage failure returns 503 without false success message
  total++;
  // Temporarily break storage
  const tempFetch = global.fetch;
  global.fetch = async function () {
    throw new Error('Redis connection timed out');
  };

  const failedSaveRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'save',
      confirmed: true,
      title: 'Should fail storage',
      dateLocal: '2030-01-01',
      timeLocal: '10:00',
      timeZone: 'UTC'
    }
  }), failedSaveRes);

  assert.strictEqual(failedSaveRes.statusCode, 503);
  assert.strictEqual(failedSaveRes.body.success, false);
  assert.match(failedSaveRes.body.error, /storage is unavailable/i);
  global.fetch = tempFetch; // restore
  pass('7. Storage errors return HTTP 503 and never show false success');

  // 8. Fix 1: Start with valid schedule, change phrase to 03/04/2027 (AMBIGUOUS_NUMERIC_DATE), prove stale schedule cannot save
  total++;
  // Step A: Parse a valid schedule
  const initParseRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'parse',
      text: 'Submit tax documents tomorrow at 2pm',
      timeZone: 'Asia/Kolkata'
    }
  }), initParseRes);
  assert.strictEqual(initParseRes.statusCode, 200);
  const initialValidDraft = initParseRes.body.draft;
  assert.strictEqual(initialValidDraft.schedulingStatus, 'scheduled');
  assert.ok(initialValidDraft.dueAt);

  // Step B: User edits the date expression to ambiguous 03/04/2027 -> triggers re-resolution
  const resolveAmbiguousRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'resolve',
      dateExpression: '03/04/2027',
      timeZone: 'Asia/Kolkata',
      referenceTime: initialValidDraft.referenceTime
    }
  }), resolveAmbiguousRes);
  assert.strictEqual(resolveAmbiguousRes.statusCode, 422);
  assert.strictEqual(resolveAmbiguousRes.body.code, 'AMBIGUOUS_NUMERIC_DATE');

  // Step C: Prove that attempting to save with the ambiguous expression or stale schedule is authoritatively rejected
  const staleSaveAttemptRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'save',
      confirmed: true,
      title: initialValidDraft.title,
      taskType: initialValidDraft.taskType,
      dateExpression: '03/04/2027', // Stale/unresolved expression
      dateLocal: initialValidDraft.dateLocal,
      timeLocal: initialValidDraft.timeLocal,
      timeZone: 'Asia/Kolkata'
    }
  }), staleSaveAttemptRes);
  assert.strictEqual(staleSaveAttemptRes.statusCode, 422, 'Server save endpoint must authoritatively reject unresolved ambiguous expressions');
  assert.strictEqual(staleSaveAttemptRes.body.code, 'AMBIGUOUS_NUMERIC_DATE');

  // Step D: User recovers by correcting date expression to unambiguous format
  const recoveredResolveRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'resolve',
      dateExpression: 'April 3, 2027 at 10am',
      timeZone: 'Asia/Kolkata',
      referenceTime: initialValidDraft.referenceTime
    }
  }), recoveredResolveRes);
  assert.strictEqual(recoveredResolveRes.statusCode, 200);
  assert.strictEqual(recoveredResolveRes.body.draft.dateLocal, '2027-04-03');
  assert.strictEqual(recoveredResolveRes.body.draft.timeLocal, '10:00');

  // Save recovered draft successfully
  const recoveredSaveRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'save',
      confirmed: true,
      title: initialValidDraft.title,
      taskType: initialValidDraft.taskType,
      dateExpression: 'April 3, 2027 at 10am',
      resolutionToken: recoveredResolveRes.body.resolutionToken,
      dateLocal: recoveredResolveRes.body.draft.dateLocal,
      timeLocal: recoveredResolveRes.body.draft.timeLocal,
      timeZone: 'Asia/Kolkata'
    }
  }), recoveredSaveRes);
  assert.strictEqual(recoveredSaveRes.statusCode, 201);
  assert.strictEqual(recoveredSaveRes.body.reminder.dateLocal, '2027-04-03');
  pass('8. Changing phrase to ambiguous numeric date (03/04/2027) prevents stale saving; recovery succeeds cleanly');

  // 9. Fix 2: Asynchronous race protection (latest user input always wins)
  total++;
  let activeRequestId = 0;
  let clientState = { draft: null, dueAt: null };

  async function simulateUserEdit(reqNumber, dateExpr, delayMs) {
    const reqId = ++activeRequestId;
    // Simulate async network request
    const res = mockRes();
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await handler(mockReq('POST', {
      headers: { cookie: sessionCookie },
      body: {
        action: 'resolve',
        dateExpression: dateExpr,
        timeZone: 'Asia/Kolkata',
        referenceTime: '2026-10-23T12:00:00.000Z'
      }
    }), res);

    // Apply only if this is still the active request
    if (reqId === activeRequestId && res.statusCode === 200) {
      clientState.draft = res.body.draft;
      clientState.dueAt = res.body.draft.dueAt;
    }
  }

  // Launch Request 1 (slow, 80ms) for "tomorrow at 10am", then immediately launch Request 2 (fast, 10ms) for "next Monday at 2pm"
  const p1 = simulateUserEdit(1, 'tomorrow at 10am', 80);
  const p2 = simulateUserEdit(2, 'next Monday at 2pm', 10);
  await Promise.all([p1, p2]);

  // Request 2 was launched last (activeRequestId was 2), so even though Request 1 finished later, Request 2 must win!
  assert.ok(clientState.draft);
  assert.strictEqual(clientState.draft.timeLocal, '14:00', 'Request 2 (latest edit) must win the race over delayed Request 1');
  pass('9. Asynchronous race guard ensures latest edit wins and slower previous request is discarded');

  // 10. Fix 3: Reject multiple scheduling expressions in action=parse with structured clarification details
  total++;
  const multiDateRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'parse',
      text: 'Pay rent tomorrow and submit the report on Friday',
      timeZone: 'Asia/Kolkata'
    }
  }), multiDateRes);
  assert.strictEqual(multiDateRes.statusCode, 422);
  assert.strictEqual(multiDateRes.body.code, 'MULTIPLE_DATE_EXPRESSIONS');
  assert.match(multiDateRes.body.error, /more than one date/i);
  assert.ok(multiDateRes.body.title, 'Must preserve input title for user correction');
  assert.ok(Array.isArray(multiDateRes.body.candidateExpressions), 'Must provide structured candidateExpressions');
  assert.ok(multiDateRes.body.candidateExpressions.length >= 2, 'Must include found candidate expressions');
  assert.ok(multiDateRes.body.extraction, 'Must preserve extraction details');
  pass('10. Multiple date expressions in action=parse return HTTP 422 MULTIPLE_DATE_EXPRESSIONS with preserved title and candidate details');

  // 11. Fix 4: Date-only task can be confirmed and saved without inventing clock time
  total++;
  const dateOnlyResolveRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'resolve',
      dateExpression: '2027-05-15',
      timeZone: 'Asia/Kolkata'
    }
  }), dateOnlyResolveRes);
  assert.strictEqual(dateOnlyResolveRes.statusCode, 200);

  const dateOnlySaveRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'save',
      confirmed: true,
      title: 'Submit tax declaration form',
      taskType: 'finance',
      dateExpression: '2027-05-15',
      resolutionToken: dateOnlyResolveRes.body.resolutionToken,
      dateLocal: '2027-05-15',
      timeLocal: '', // NO time specified
      timeZone: 'Asia/Kolkata'
    }
  }), dateOnlySaveRes);

  assert.strictEqual(dateOnlySaveRes.statusCode, 201);
  assert.strictEqual(dateOnlySaveRes.body.success, true);
  assert.strictEqual(dateOnlySaveRes.body.reminder.schedulingStatus, 'date_only');
  assert.strictEqual(dateOnlySaveRes.body.reminder.dateLocal, '2027-05-15');
  assert.strictEqual(dateOnlySaveRes.body.reminder.timeLocal, '');
  assert.strictEqual(dateOnlySaveRes.body.reminder.dueAt, null, 'Date-only task must not invent a clock time or dueAt');

  // Attempting invalid calendar date for date-only is rejected
  const badDateOnlyRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'save',
      confirmed: true,
      title: 'Invalid date task',
      taskType: 'general',
      dateLocal: '2027-02-31', // Feb 31 does not exist
      timeLocal: '',
      timeZone: 'Asia/Kolkata'
    }
  }), badDateOnlyRes);
  assert.strictEqual(badDateOnlyRes.statusCode, 422);
  assert.strictEqual(badDateOnlyRes.body.code, 'INVALID_DATE');
  pass('11. Date-only task confirmed and saved without clock time; invalid calendar dates rejected');

  // 12. Fix 4 & Fix 6: Cross-session owner isolation
  total++;
  // Create second session cookie
  const otherSessionToken = handler.createSession(validSecret);
  const otherSessionCookie = 'milo_reminder_session=' + otherSessionToken;

  const listOtherRes = mockRes();
  await handler(mockReq('GET', {
    headers: { cookie: otherSessionCookie }
  }), listOtherRes);
  assert.strictEqual(listOtherRes.statusCode, 200);
  assert.strictEqual(listOtherRes.body.reminders.length, 0, 'New session must have 0 reminders (strict owner isolation)');
  pass('12. Cross-session owner isolation verified: second session sees zero reminders from first session');

  // 13. Authoritative save gate comprehensive consistency & manual override tests
  total++;
  const refTimeFixed = '2026-10-23T12:00:00.000Z';
  handler.setReferenceClock(() => refTimeFixed);

  // 13a. dateExpression: "tomorrow at 7" with otherwise valid future dateLocal and timeLocal must be rejected as unresolved
  const incompleteTimeSaveRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'save',
      confirmed: true,
      title: 'Morning wake up',
      taskType: 'personal',
      dateExpression: 'tomorrow at 7',
      dateLocal: '2026-10-24',
      timeLocal: '19:00',
      timeZone: 'Asia/Kolkata',
      referenceTime: refTimeFixed
    }
  }), incompleteTimeSaveRes);
  assert.strictEqual(incompleteTimeSaveRes.statusCode, 422, 'Incomplete time expression must be rejected at save gate');
  assert.strictEqual(incompleteTimeSaveRes.body.code, 'INCOMPLETE_TIME');

  // Obtain trusted resolution token for "tomorrow at 7pm" with fixed test clock
  const resolveTokenRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    __testReferenceTime: refTimeFixed,
    body: {
      action: 'resolve',
      dateExpression: 'tomorrow at 7pm',
      timeZone: 'Asia/Kolkata'
    }
  }), resolveTokenRes);
  assert.strictEqual(resolveTokenRes.statusCode, 200);
  const validToken = resolveTokenRes.body.resolutionToken;
  assert.ok(validToken, 'Resolution token must be returned for valid date expression');

  // 13b. dateExpression: "tomorrow at 7pm" paired with calendar fields for a different date/time must be rejected
  const mismatchScheduleRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'save',
      confirmed: true,
      title: 'Mismatched schedule task',
      taskType: 'work',
      dateExpression: 'tomorrow at 7pm',
      resolutionToken: validToken,
      dateLocal: '2028-12-25', // Intentional mismatch
      timeLocal: '10:00',     // Intentional mismatch
      timeZone: 'Asia/Kolkata',
      referenceTime: refTimeFixed
    }
  }), mismatchScheduleRes);
  assert.strictEqual(mismatchScheduleRes.statusCode, 422, 'Mismatched calendar fields must be rejected with 422');
  assert.strictEqual(mismatchScheduleRes.body.code, 'SCHEDULE_FIELD_MISMATCH');

  // 13c. Ambiguous numeric dates and multi-date expressions must remain rejected at save gate
  const saveAmbiguousRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'save',
      confirmed: true,
      title: 'Ambiguous test',
      dateExpression: '03/04/2027',
      dateLocal: '2027-04-03',
      timeLocal: '10:00',
      timeZone: 'Asia/Kolkata'
    }
  }), saveAmbiguousRes);
  assert.strictEqual(saveAmbiguousRes.statusCode, 422);
  assert.strictEqual(saveAmbiguousRes.body.code, 'AMBIGUOUS_NUMERIC_DATE');

  const saveMultiDateRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'save',
      confirmed: true,
      title: 'Multi date test',
      dateExpression: 'Pay rent tomorrow and submit report on Friday',
      dateLocal: '2026-10-24',
      timeLocal: '10:00',
      timeZone: 'Asia/Kolkata'
    }
  }), saveMultiDateRes);
  assert.strictEqual(saveMultiDateRes.statusCode, 422);
  assert.strictEqual(saveMultiDateRes.body.code, 'MULTIPLE_DATES');

  // 13d. A valid consistent natural-language draft can be saved after confirmation
  const validNlpSaveRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'save',
      confirmed: true,
      title: 'Valid NLP Reminder',
      taskType: 'work',
      dateExpression: 'tomorrow at 7pm',
      resolutionToken: validToken,
      dateLocal: '2026-10-24',
      timeLocal: '19:00',
      timeZone: 'Asia/Kolkata',
      referenceTime: refTimeFixed
    }
  }), validNlpSaveRes);
  assert.strictEqual(validNlpSaveRes.statusCode, 201);
  assert.strictEqual(validNlpSaveRes.body.success, true);
  assert.strictEqual(validNlpSaveRes.body.reminder.dateLocal, '2026-10-24');
  assert.strictEqual(validNlpSaveRes.body.reminder.timeLocal, '19:00');

  // 13e. A valid explicit manual calendar entry can be saved with dateExpression: null
  const validManualSaveRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'save',
      confirmed: true,
      title: 'Manual Calendar Task',
      taskType: 'health',
      dateExpression: null, // Explicit manual entry
      dateLocal: '2028-06-15',
      timeLocal: '14:30',
      timeZone: 'Asia/Kolkata',
      recurrence: { unit: 'week', interval: 2 }
    }
  }), validManualSaveRes);
  assert.strictEqual(validManualSaveRes.statusCode, 201);
  assert.strictEqual(validManualSaveRes.body.success, true);
  assert.strictEqual(validManualSaveRes.body.reminder.dateExpression, null);
  assert.strictEqual(validManualSaveRes.body.reminder.dateLocal, '2028-06-15');
  assert.strictEqual(validManualSaveRes.body.reminder.timeLocal, '14:30');
  assert.strictEqual(validManualSaveRes.body.reminder.recurrence.unit, 'week');
  assert.strictEqual(validManualSaveRes.body.reminder.recurrence.interval, 2);

  // 13f. Invalid manual dates and past timed entries are rejected
  const invalidManualDateRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'save',
      confirmed: true,
      title: 'Invalid manual date',
      dateExpression: null,
      dateLocal: '2028-02-30', // Feb 30 invalid
      timeLocal: '12:00',
      timeZone: 'Asia/Kolkata'
    }
  }), invalidManualDateRes);
  assert.strictEqual(invalidManualDateRes.statusCode, 422);
  assert.strictEqual(invalidManualDateRes.body.code, 'INVALID_DATE');

  const pastManualTimeRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'save',
      confirmed: true,
      title: 'Past timed task',
      dateExpression: null,
      dateLocal: '2020-01-01', // Past date
      timeLocal: '12:00',
      timeZone: 'Asia/Kolkata'
    }
  }), pastManualTimeRes);
  assert.strictEqual(pastManualTimeRes.statusCode, 422);
  assert.strictEqual(pastManualTimeRes.body.code, 'TIME_IN_PAST');

  pass('13. Authoritative save gate strictly validates NLP consistency and permits valid manual entries with dateExpression: null');

  // -------------------------------------------------------------------------
  // 14. Stateless Resolution Verification Trust Boundary Regression Suite
  // -------------------------------------------------------------------------
  total++;

  // 14a. Forged-anchor attack: caller submits forged referenceTime in body while attempting to save future date
  const forgedAnchorSaveRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'save',
      confirmed: true,
      title: 'Forged anchor attack',
      taskType: 'work',
      dateExpression: 'tomorrow at 7pm',
      resolutionToken: validToken,
      dateLocal: '2030-01-02', // Arbitrary future date
      timeLocal: '19:00',
      timeZone: 'Asia/Kolkata',
      referenceTime: '2030-01-01T10:00:00.000Z' // Forged anchor in body
    }
  }), forgedAnchorSaveRes);
  assert.strictEqual(forgedAnchorSaveRes.statusCode, 422);
  assert.strictEqual(forgedAnchorSaveRes.body.code, 'SCHEDULE_FIELD_MISMATCH');

  // 14b. Forged anchor attack without token rejected with MISSING_RESOLUTION_TOKEN
  const forgedAnchorNoTokenRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'save',
      confirmed: true,
      title: 'Forged anchor without token',
      taskType: 'work',
      dateExpression: 'tomorrow at 7pm',
      dateLocal: '2030-01-02',
      timeLocal: '19:00',
      timeZone: 'Asia/Kolkata',
      referenceTime: '2030-01-01T10:00:00.000Z'
    }
  }), forgedAnchorNoTokenRes);
  assert.strictEqual(forgedAnchorNoTokenRes.statusCode, 422);
  assert.strictEqual(forgedAnchorNoTokenRes.body.code, 'MISSING_RESOLUTION_TOKEN');

  // 14c. Tampered token signature rejected with INVALID_RESOLUTION_TOKEN
  const tamperedTokenRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'save',
      confirmed: true,
      title: 'Tampered token test',
      taskType: 'work',
      dateExpression: 'tomorrow at 7pm',
      resolutionToken: validToken.slice(0, -6) + '123456',
      dateLocal: '2026-10-24',
      timeLocal: '19:00',
      timeZone: 'Asia/Kolkata'
    }
  }), tamperedTokenRes);
  assert.strictEqual(tamperedTokenRes.statusCode, 422);
  assert.strictEqual(tamperedTokenRes.body.code, 'INVALID_RESOLUTION_TOKEN');

  // 14d. Expired token rejected with EXPIRED_RESOLUTION_TOKEN
  const sessionTokenPayload = handler.verifySession(sessionCookie.split('=')[1], validSecret);
  const expiredToken = handler.createResolutionToken({
    ownerId: sessionTokenPayload.ownerId,
    dateExpression: 'tomorrow at 7pm',
    timeZone: 'Asia/Kolkata',
    dateLocal: '2026-10-24',
    timeLocal: '19:00',
    schedulingStatus: 'scheduled',
    referenceTime: refTimeFixed
  }, validSecret, { ttlMs: -10000 });

  const expiredTokenRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'save',
      confirmed: true,
      title: 'Expired token test',
      taskType: 'work',
      dateExpression: 'tomorrow at 7pm',
      resolutionToken: expiredToken,
      dateLocal: '2026-10-24',
      timeLocal: '19:00',
      timeZone: 'Asia/Kolkata'
    }
  }), expiredTokenRes);
  assert.strictEqual(expiredTokenRes.statusCode, 422);
  assert.strictEqual(expiredTokenRes.body.code, 'EXPIRED_RESOLUTION_TOKEN');

  // 14e. Session owner mismatch rejected with RESOLUTION_OWNER_MISMATCH
  const wrongOwnerToken = handler.createResolutionToken({
    ownerId: '11111111-2222-3333-4444-555555555555',
    dateExpression: 'tomorrow at 7pm',
    timeZone: 'Asia/Kolkata',
    dateLocal: '2026-10-24',
    timeLocal: '19:00',
    schedulingStatus: 'scheduled',
    referenceTime: refTimeFixed
  }, validSecret);

  const wrongOwnerRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'save',
      confirmed: true,
      title: 'Wrong owner test',
      taskType: 'work',
      dateExpression: 'tomorrow at 7pm',
      resolutionToken: wrongOwnerToken,
      dateLocal: '2026-10-24',
      timeLocal: '19:00',
      timeZone: 'Asia/Kolkata'
    }
  }), wrongOwnerRes);
  assert.strictEqual(wrongOwnerRes.statusCode, 422);
  assert.strictEqual(wrongOwnerRes.body.code, 'RESOLUTION_OWNER_MISMATCH');

  // 14f. Multiple-date clarification: title stripped when clean text exists, title null when text is only dates
  const cleanTitleMultiDate = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'parse',
      text: 'Pay rent tomorrow and submit report on Friday',
      timeZone: 'Asia/Kolkata'
    }
  }), cleanTitleMultiDate);
  assert.strictEqual(cleanTitleMultiDate.statusCode, 422);
  assert.strictEqual(cleanTitleMultiDate.body.code, 'MULTIPLE_DATE_EXPRESSIONS');
  assert.strictEqual(cleanTitleMultiDate.body.title, 'Pay rent and submit report');
  assert.deepStrictEqual(cleanTitleMultiDate.body.candidateExpressions, ['tomorrow', 'on Friday']);

  const nullTitleMultiDate = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'parse',
      text: 'tomorrow and Friday',
      timeZone: 'Asia/Kolkata'
    }
  }), nullTitleMultiDate);
  assert.strictEqual(nullTitleMultiDate.statusCode, 422);
  assert.strictEqual(nullTitleMultiDate.body.code, 'MULTIPLE_DATE_EXPRESSIONS');
  assert.strictEqual(nullTitleMultiDate.body.title, null, 'Fallback must not claim a clean title when only raw sentence/dates exist');

  pass('14. Stateless resolution token trust boundary verified: forged referenceTime, tampered tokens, expired tokens, owner mismatch, and clean title extraction verified');
  handler.setReferenceClock(null);

  // 15. Timestamp contract & temporal invariants:
  // - Signed dueAt disagreement rejected
  // - Future-issued token rejected
  // - Clarification expressions (e.g. recurrence without date) never issue resolutionToken
  // - Date boundary crossing resolves with signed reference instant
  total++;
  const contractTestRef = '2026-10-23T23:55:00.000Z';
  const contractEpoch = new Date(contractTestRef).getTime();

  // A. Clarification expression in parse never issues token
  const noTokenClarificationRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    __testReferenceTime: contractTestRef,
    body: { action: 'parse', text: 'Water plants every week', timeZone: 'UTC' }
  }), noTokenClarificationRes);
  assert.strictEqual(noTokenClarificationRes.statusCode, 200);
  assert.strictEqual(noTokenClarificationRes.body.draft.schedulingStatus, 'needs_clarification');
  assert.strictEqual(noTokenClarificationRes.body.draft.resolutionToken, null);

  // B. Valid scheduled preview at 23:55 UTC
  const validContractParse = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    __testReferenceTime: contractTestRef,
    body: { action: 'parse', text: 'Team review tomorrow at 9am', timeZone: 'UTC' }
  }), validContractParse);
  assert.strictEqual(validContractParse.statusCode, 200);
  const contractToken = validContractParse.body.draft.resolutionToken;
  assert.ok(contractToken);
  assert.strictEqual(validContractParse.body.draft.dateLocal, '2026-10-24');
  assert.strictEqual(validContractParse.body.draft.timeLocal, '09:00');
  assert.strictEqual(validContractParse.body.draft.dueAt, '2026-10-24T09:00:00.000Z');

  // C. Disagreeing dueAt in signed token is rejected at save gate
  const sessionData = handler.verifySession(sessionCookie.split('=')[1], validSecret);
  const disagreeToken = handler.createResolutionToken({
    ownerId: sessionData.ownerId,
    dateExpression: 'tomorrow at 9am',
    timeZone: 'UTC',
    dateLocal: '2026-10-24',
    timeLocal: '09:00',
    schedulingStatus: 'scheduled',
    dueAt: '2026-10-25T09:00:00.000Z', // Mismatched dueAt
    referenceTime: contractTestRef
  }, validSecret, { issuedAt: contractEpoch, ttlMs: 20 * 60 * 1000 });

  const disagreeSaveRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    __testReferenceTime: contractTestRef,
    body: {
      action: 'save', confirmed: true, title: 'Team review',
      dateExpression: 'tomorrow at 9am', resolutionToken: disagreeToken,
      dateLocal: '2026-10-24', timeLocal: '09:00', timeZone: 'UTC'
    }
  }), disagreeSaveRes);
  assert.strictEqual(disagreeSaveRes.statusCode, 422);
  assert.strictEqual(disagreeSaveRes.body.code, 'SCHEDULE_FIELD_MISMATCH');

  // D. Token crossing calendar boundary to 00:05 UTC (Oct 24) saves successfully
  const midnightCrossedRef = '2026-10-24T00:05:00.000Z';
  const boundarySaveRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    __testReferenceTime: midnightCrossedRef,
    body: {
      action: 'save', confirmed: true, title: 'Team review',
      dateExpression: 'tomorrow at 9am', resolutionToken: contractToken,
      dateLocal: '2026-10-24', timeLocal: '09:00', timeZone: 'UTC'
    }
  }), boundarySaveRes);
  assert.strictEqual(boundarySaveRes.statusCode, 201);
  assert.strictEqual(boundarySaveRes.body.reminder.dateLocal, '2026-10-24');
  assert.strictEqual(boundarySaveRes.body.reminder.dueAt, '2026-10-24T09:00:00.000Z');

  // E. Future-issued token rejected
  const futureToken = handler.createResolutionToken({
    ownerId: sessionData.ownerId,
    dateExpression: 'tomorrow at 9am',
    timeZone: 'UTC',
    dateLocal: '2026-10-24',
    timeLocal: '09:00',
    schedulingStatus: 'scheduled',
    dueAt: '2026-10-24T09:00:00.000Z',
    referenceTime: contractTestRef
  }, validSecret, { issuedAt: contractEpoch + 15 * 60 * 1000, ttlMs: 20 * 60 * 1000 }); // 15m in future

  const futureSaveRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    __testReferenceTime: contractTestRef,
    body: {
      action: 'save', confirmed: true, title: 'Team review',
      dateExpression: 'tomorrow at 9am', resolutionToken: futureToken,
      dateLocal: '2026-10-24', timeLocal: '09:00', timeZone: 'UTC'
    }
  }), futureSaveRes);
  assert.strictEqual(futureSaveRes.statusCode, 422);
  assert.strictEqual(futureSaveRes.body.code, 'INVALID_RESOLUTION_TOKEN');

  pass('15. Exact contract verified: signed dueAt invariance, date boundary crossing, clarification tokens nullified, and temporal limits');

  console.log(`\n====================================================`);
  console.log(`🎉 ALL ${passed}/${total} INTEGRATION TESTS PASSED`);
  console.log(`====================================================\n`);
  handler.setReferenceClock(null);
}

main().catch((err) => {
  handler.setReferenceClock(null);
  console.error('\n❌ Integration test failed:', err);
  process.exit(1);
});
