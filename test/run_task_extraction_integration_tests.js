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
  return {
    method: method,
    headers: Object.assign({
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      'sec-fetch-site': 'same-origin'
    }, options.headers || {}),
    body: options.body || {},
    query: options.query || {}
  };
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

  // 10. Fix 3: Reject multiple scheduling expressions in action=parse
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
  pass('10. Multiple date expressions in action=parse return HTTP 422 MULTIPLE_DATE_EXPRESSIONS');

  // 11. Fix 4: Date-only task can be confirmed and saved without inventing clock time
  total++;
  const dateOnlySaveRes = mockRes();
  await handler(mockReq('POST', {
    headers: { cookie: sessionCookie },
    body: {
      action: 'save',
      confirmed: true,
      title: 'Submit tax declaration form',
      taskType: 'finance',
      dateExpression: '2027-05-15',
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

  console.log(`\n====================================================`);
  console.log(`🎉 ALL ${passed}/${total} INTEGRATION TESTS PASSED`);
  console.log(`====================================================\n`);
}

main().catch((err) => {
  console.error('\n❌ Integration test failed:', err);
  process.exit(1);
});
