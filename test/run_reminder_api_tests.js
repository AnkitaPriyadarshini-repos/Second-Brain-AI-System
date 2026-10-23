'use strict';
const assert = require('assert');
const crypto = require('crypto');
const handler = require('../api/reminders');

function res() {
  return {
    statusCode: 200, headers: {}, body: null,
    setHeader: function (name, value) { this.headers[name] = value; },
    status: function (code) { this.statusCode = code; return this; },
    json: function (body) { this.body = body; return this; }
  };
}

function req(method, options) {
  options = options || {};
  const r = {
    method: method,
    headers: Object.assign({ host: 'localhost:3000', origin: 'http://localhost:3000', 'sec-fetch-site': 'same-origin' }, options.headers || {}),
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
  const env = {
    secret: process.env.MILO_SESSION_SECRET,
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
    vercel: process.env.VERCEL
  };
  const oldFetch = global.fetch, memory = new Map();

  try {
    // ----------------------------------------------------
    // Suite 1: Session Secret Minimum Length & Decoded-Byte Gate
    // ----------------------------------------------------
    process.stdout.write('Testing Suite 1: Session Secret Minimum Length & Decoded-Byte Gate...\n');

    // Missing secret
    delete process.env.MILO_SESSION_SECRET;
    delete process.env.SESSION_SECRET;
    delete process.env.JUNO_SESSION_SECRET;
    assert.strictEqual(handler.getSessionSecret(), '', 'Missing secret must yield empty string');

    // Undersized secrets (< 32 characters or < 32 bytes)
    process.env.MILO_SESSION_SECRET = 'short_secret_16c';
    assert.strictEqual(handler.getSessionSecret(), '', '16-character secret must be rejected');

    process.env.MILO_SESSION_SECRET = 'a'.repeat(31);
    assert.strictEqual(handler.getSessionSecret(), '', '31-character secret must be rejected');

    // Secret at accepted minimum: exactly 32 characters / 32 bytes.
    // Demonstrates that length/byte boundaries are enforced, but code cannot prove cryptographic entropy;
    // operational security depends on provisioning a cryptographically random secret via openssl rand -hex 32.
    const minSecret = 'a'.repeat(32);
    process.env.MILO_SESSION_SECRET = minSecret;
    assert.strictEqual(handler.getSessionSecret(), minSecret, 'Exactly 32-character / 32-byte secret must be accepted (demonstrates length/byte enforcement vs entropy)');

    // Cryptographically random hex secret: 64 characters representing 32 raw bytes (e.g. openssl rand -hex 32)
    const hexSecret = crypto.randomBytes(32).toString('hex');
    process.env.MILO_SESSION_SECRET = hexSecret;
    assert.strictEqual(handler.getSessionSecret(), hexSecret, '64-hex-character (32-byte) secret must be accepted');

    // Cryptographically random base64 secret: 44 characters representing 32 raw bytes (e.g. openssl rand -base64 32)
    const b64Secret = crypto.randomBytes(32).toString('base64');
    process.env.MILO_SESSION_SECRET = b64Secret;
    assert.strictEqual(handler.getSessionSecret(), b64Secret, '44-base64-character (32-byte) secret must be accepted');

    process.stdout.write('  PASS Suite 1: Secret length & byte size validation verified\n');

    // ----------------------------------------------------
    // Suite 2: Preview Parsing Without Storage vs Save Gating
    // ----------------------------------------------------
    process.stdout.write('Testing Suite 2: Preview parsing without storage & save gating...\n');
    delete process.env.MILO_SESSION_SECRET;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const unconfiguredParse = res();
    await handler(req('POST', {
      body: { action: 'parse', text: 'Remind me to submit final report tomorrow at 7pm', timeZone: 'Asia/Kolkata' }
    }), unconfiguredParse);
    assert.strictEqual(unconfiguredParse.statusCode, 200, 'Preview parse must succeed without secret/storage');
    assert.strictEqual(unconfiguredParse.body.success, true);
    assert.strictEqual(unconfiguredParse.body.persistenceConfigured, false);
    assert.strictEqual(unconfiguredParse.headers['Set-Cookie'], undefined, 'No session cookie issued when secret is unconfigured');

    const blockedSaveNoSecret = res();
    await handler(req('POST', {
      body: {
        action: 'save', confirmed: true, title: 'Submit final report',
        dateLocal: '2035-10-23', timeLocal: '19:00', timeZone: 'Asia/Kolkata'
      }
    }), blockedSaveNoSecret);
    assert.strictEqual(blockedSaveNoSecret.statusCode, 503, 'Save must fail closed when secret is unconfigured');

    // Undersized secret must also block saves and issue no cookie on parse
    process.env.MILO_SESSION_SECRET = 'undersized_secret_16chars';
    const undersizedParse = res();
    await handler(req('POST', {
      body: { action: 'parse', text: 'Remind me to study tomorrow at 8pm', timeZone: 'Asia/Kolkata' }
    }), undersizedParse);
    assert.strictEqual(undersizedParse.statusCode, 200);
    assert.strictEqual(undersizedParse.body.persistenceConfigured, false);
    assert.strictEqual(undersizedParse.headers['Set-Cookie'], undefined, 'No cookie issued for undersized secret');

    const blockedSaveUndersized = res();
    await handler(req('POST', {
      body: {
        action: 'save', confirmed: true, title: 'Study',
        dateLocal: '2035-10-23', timeLocal: '20:00', timeZone: 'Asia/Kolkata'
      }
    }), blockedSaveUndersized);
    assert.strictEqual(blockedSaveUndersized.statusCode, 503, 'Save blocked for undersized secret');

    process.stdout.write('  PASS Suite 2: Preview works unconfigured, saves fail-closed\n');

    // ----------------------------------------------------
    // Suite 3: Session Cookie Integrity & Malformed/Expired Handling
    // ----------------------------------------------------
    process.stdout.write('Testing Suite 3: Cookie integrity & malformed/tampered/expired rejection...\n');
    const validSecret = 'milo_unit_test_session_secret_32bytes_minimum!';
    process.env.MILO_SESSION_SECRET = validSecret;
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.test';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'unit-test-token';
    delete process.env.VERCEL;

    global.fetch = async function (_url, options) {
      const command = JSON.parse(options.body); let result;
      if (command[0] === 'HSET') {
        if (!memory.has(command[1])) memory.set(command[1], new Map());
        memory.get(command[1]).set(command[2], command[3]); result = 1;
      } else if (command[0] === 'HGETALL') {
        result = Array.from((memory.get(command[1]) || new Map()).entries()).flat();
      } else if (command[0] === 'HDEL') {
        result = (memory.get(command[1]) || new Map()).delete(command[2]) ? 1 : 0;
      } else throw new Error('Unexpected Redis command ' + command[0]);
      return { ok: true, status: 200, json: async function () { return { result: result }; } };
    };

    // Malformed cookie string
    assert.strictEqual(handler.verifySession('malformed_token_without_period', validSecret), null);
    assert.strictEqual(handler.verifySession('part1.part2.part3', validSecret), null);

    const malformedReqRes = res();
    await handler(req('GET', { headers: { cookie: 'milo_reminder_session=invalid.token' } }), malformedReqRes);
    assert.strictEqual(malformedReqRes.statusCode, 503, 'Malformed cookie on GET must be rejected');

    // Tampered signature
    const realToken = handler.createSession(validSecret);
    const tokenParts = realToken.split('.');
    const tamperedToken = tokenParts[0] + '.' + (tokenParts[1].endsWith('a') ? tokenParts[1].slice(0, -1) + 'b' : tokenParts[1].slice(0, -1) + 'a');
    assert.strictEqual(handler.verifySession(tamperedToken, validSecret), null, 'Tampered token signature must fail verification');

    const tamperedReqRes = res();
    await handler(req('GET', { headers: { cookie: 'milo_reminder_session=' + tamperedToken } }), tamperedReqRes);
    assert.strictEqual(tamperedReqRes.statusCode, 503, 'Tampered cookie on GET must be rejected');

    // Expired session
    const expiredPayload = Buffer.from(JSON.stringify({
      version: 1,
      ownerId: crypto.randomUUID(),
      expiresAt: Date.now() - 5000
    })).toString('base64url');
    const expiredSig = crypto.createHmac('sha256', validSecret).update(expiredPayload).digest('base64url');
    const expiredToken = expiredPayload + '.' + expiredSig;
    assert.strictEqual(handler.verifySession(expiredToken, validSecret), null, 'Expired session token must fail verification');

    const expiredReqRes = res();
    await handler(req('GET', { headers: { cookie: 'milo_reminder_session=' + expiredToken } }), expiredReqRes);
    assert.strictEqual(expiredReqRes.statusCode, 503, 'Expired cookie on GET must be rejected');

    process.stdout.write('  PASS Suite 3: Malformed, altered, and expired cookies rejected\n');

    // ----------------------------------------------------
    // Suite 4: Cross-Origin Write Rejection (CSRF / Origin Check)
    // ----------------------------------------------------
    process.stdout.write('Testing Suite 4: Cross-origin write rejection...\n');

    // Parse to obtain a valid session cookie
    const freshParse = res();
    await handler(req('POST', { body: { action: 'parse', text: 'Study tomorrow at 7pm', timeZone: 'Asia/Kolkata' } }), freshParse);
    assert.strictEqual(freshParse.statusCode, 200);
    const validCookie = cookieOf(freshParse);
    assert.ok(validCookie.startsWith('milo_reminder_session='));

    // Cross-origin POST save must return 403 Forbidden
    const crossOriginSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie, origin: 'https://evil-attacker.example.com', host: 'localhost:3000' },
      body: { action: 'save', confirmed: true, title: 'Attack', dateLocal: '2035-10-23', timeLocal: '19:00', timeZone: 'Asia/Kolkata' }
    }), crossOriginSave);
    assert.strictEqual(crossOriginSave.statusCode, 403, 'Cross-origin save must be rejected with HTTP 403');
    assert.match(crossOriginSave.body.error, /cross-origin/i);

    // Missing origin on POST save must return 403 Forbidden
    const noOriginSave = res();
    const reqWithoutOrigin = req('POST', {
      headers: { cookie: validCookie },
      body: { action: 'save', confirmed: true, title: 'Attack', dateLocal: '2035-10-23', timeLocal: '19:00', timeZone: 'Asia/Kolkata' }
    });
    delete reqWithoutOrigin.headers.origin;
    await handler(reqWithoutOrigin, noOriginSave);
    assert.strictEqual(noOriginSave.statusCode, 403, 'Save without origin header must be rejected with HTTP 403');

    // Cross-origin DELETE must return 403 Forbidden
    const crossOriginDelete = res();
    await handler(req('DELETE', {
      headers: { cookie: validCookie, origin: 'https://evil-attacker.example.com', host: 'localhost:3000' },
      body: { id: 'rem_' + crypto.randomUUID() }
    }), crossOriginDelete);
    assert.strictEqual(crossOriginDelete.statusCode, 403, 'Cross-origin delete must be rejected with HTTP 403');

    process.stdout.write('  PASS Suite 4: Cross-origin write operations rejected with 403\n');

    // ----------------------------------------------------
    // Suite 5: Complete CRUD Flow & Owner Isolation
    // ----------------------------------------------------
    process.stdout.write('Testing Suite 5: Complete CRUD flow & owner isolation...\n');

    // User A saves a reminder
    const saved = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save', confirmed: true, title: 'Study for exam', dateLocal: '2035-10-23',
        timeLocal: '19:00', timeZone: 'Asia/Kolkata', recurrence: null
      }
    }), saved);
    assert.strictEqual(saved.statusCode, 201, JSON.stringify(saved.body));
    const reminderId = saved.body.reminder.id;
    assert.ok(reminderId.startsWith('rem_'));

    // User A lists own reminders
    const userAList = res();
    await handler(req('GET', { headers: { cookie: validCookie } }), userAList);
    assert.strictEqual(userAList.statusCode, 200);
    assert.strictEqual(userAList.body.reminders.length, 1);
    assert.strictEqual(userAList.body.reminders[0].id, reminderId);
    assert.strictEqual(userAList.body.reminders[0].title, 'Study for exam');
    assert.strictEqual(userAList.body.reminders[0].notificationStatus, 'not-configured');

    // User B (new session) lists reminders -> must be empty (owner isolation)
    const userBList = res();
    await handler(req('GET'), userBList);
    assert.strictEqual(userBList.statusCode, 200);
    assert.strictEqual(userBList.body.reminders.length, 0, 'User B must not see User A reminders');
    const userBCookie = cookieOf(userBList);

    // User B tries to delete User A's reminder -> must return 404 (isolated)
    const userBDelete = res();
    await handler(req('DELETE', { headers: { cookie: userBCookie }, body: { id: reminderId } }), userBDelete);
    assert.strictEqual(userBDelete.statusCode, 404, 'User B cannot delete User A reminder');

    // User A's reminder is still intact
    const userAVerify = res();
    await handler(req('GET', { headers: { cookie: validCookie } }), userAVerify);
    assert.strictEqual(userAVerify.statusCode, 200);
    assert.strictEqual(userAVerify.body.reminders.length, 1);

    // User A deletes own reminder -> must return 200
    const userADelete = res();
    await handler(req('DELETE', { headers: { cookie: validCookie }, body: { id: reminderId } }), userADelete);
    assert.strictEqual(userADelete.statusCode, 200);
    assert.strictEqual(userADelete.body.deleted, true);

    // Confirmation gate check (confirmed: false must return 400)
    const unconfirmed = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: { action: 'save', confirmed: false, title: 'Unconfirmed', dateLocal: '2035-10-23', timeLocal: '19:00', timeZone: 'Asia/Kolkata' }
    }), unconfirmed);
    assert.strictEqual(unconfirmed.statusCode, 400);

    process.stdout.write('  PASS Suite 5: CRUD and owner isolation verified\n');

    // ----------------------------------------------------
    // Suite 6: Authoritative Save Gate & Schedule Consistency
    // ----------------------------------------------------
    process.stdout.write('Testing Suite 6: Authoritative save gate & schedule consistency...\n');

    // 1. Incomplete time expression ("tomorrow at 7") rejected at save gate
    const incompleteTimeSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save', confirmed: true, title: 'Incomplete time',
        dateExpression: 'tomorrow at 7', dateLocal: '2035-10-24', timeLocal: '19:00', timeZone: 'Asia/Kolkata'
      }
    }), incompleteTimeSave);
    assert.strictEqual(incompleteTimeSave.statusCode, 422, 'Incomplete time expression must be rejected');
    assert.strictEqual(incompleteTimeSave.body.code, 'INCOMPLETE_TIME');

    // 2. Schedule field mismatch (expression vs calendar fields) rejected with 422
    const tokenPreviewRes = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      __testReferenceTime: '2035-10-23T10:00:00.000Z',
      body: {
        action: 'resolve',
        dateExpression: 'tomorrow at 7pm',
        timeZone: 'Asia/Kolkata'
      }
    }), tokenPreviewRes);
    assert.strictEqual(tokenPreviewRes.statusCode, 200);
    const validTomorrowToken = tokenPreviewRes.body.resolutionToken;
    assert.ok(validTomorrowToken);

    const mismatchSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      __testReferenceTime: '2035-10-23T10:00:00.000Z',
      body: {
        action: 'save', confirmed: true, title: 'Mismatch test',
        dateExpression: 'tomorrow at 7pm', dateLocal: '2035-12-25', timeLocal: '10:00', timeZone: 'Asia/Kolkata',
        resolutionToken: validTomorrowToken
      }
    }), mismatchSave);
    assert.strictEqual(mismatchSave.statusCode, 422, 'Schedule mismatch must be rejected with 422');
    assert.strictEqual(mismatchSave.body.code, 'SCHEDULE_FIELD_MISMATCH');

    // 3. Ambiguous numeric date expression rejected at save gate
    const ambiguousSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save', confirmed: true, title: 'Ambiguous test',
        dateExpression: '03/04/2027', dateLocal: '2027-04-03', timeLocal: '10:00', timeZone: 'Asia/Kolkata'
      }
    }), ambiguousSave);
    assert.strictEqual(ambiguousSave.statusCode, 422);
    assert.strictEqual(ambiguousSave.body.code, 'AMBIGUOUS_NUMERIC_DATE');

    // 4. Multi-date expression rejected at save gate
    const multiDateSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save', confirmed: true, title: 'Multi date test',
        dateExpression: 'Pay rent tomorrow and submit report on Friday', dateLocal: '2035-10-24', timeLocal: '10:00', timeZone: 'Asia/Kolkata'
      }
    }), multiDateSave);
    assert.strictEqual(multiDateSave.statusCode, 422);
    assert.strictEqual(multiDateSave.body.code, 'MULTIPLE_DATES');

    // 5. Valid manual calendar entry with dateExpression: null
    const validManualSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save', confirmed: true, title: 'Valid manual task',
        dateExpression: null, dateLocal: '2035-11-20', timeLocal: '15:30', timeZone: 'Asia/Kolkata',
        recurrence: { unit: 'month', interval: 1 }
      }
    }), validManualSave);
    assert.strictEqual(validManualSave.statusCode, 201, 'Valid manual calendar entry must be saved');
    assert.strictEqual(validManualSave.body.reminder.dateExpression, null);
    assert.strictEqual(validManualSave.body.reminder.dateLocal, '2035-11-20');
    assert.strictEqual(validManualSave.body.reminder.timeLocal, '15:30');
    assert.strictEqual(validManualSave.body.reminder.recurrence.unit, 'month');

    // 6. Invalid manual calendar date rejected with INVALID_DATE
    const invalidManualDate = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save', confirmed: true, title: 'Bad manual date',
        dateExpression: null, dateLocal: '2035-02-31', timeLocal: '12:00', timeZone: 'Asia/Kolkata'
      }
    }), invalidManualDate);
    assert.strictEqual(invalidManualDate.statusCode, 422);
    assert.strictEqual(invalidManualDate.body.code, 'INVALID_DATE');

    // 7. Past timed manual calendar entry rejected with TIME_IN_PAST
    const pastManualTime = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save', confirmed: true, title: 'Past manual time',
        dateExpression: null, dateLocal: '2020-01-01', timeLocal: '12:00', timeZone: 'Asia/Kolkata'
      }
    }), pastManualTime);
    assert.strictEqual(pastManualTime.statusCode, 422);
    assert.strictEqual(pastManualTime.body.code, 'TIME_IN_PAST');

    process.stdout.write('  PASS Suite 6: Save-gate schedule consistency & manual entries verified\n');

    // ----------------------------------------------------
    // Suite 7: Stateless Resolution Verification & Trust Boundary
    // ----------------------------------------------------
    process.stdout.write('Testing Suite 7: Stateless resolution verification & trust boundary...\n');
    const testFixedRef = '2026-10-23T10:00:00.000Z';
    handler.setReferenceClock(() => testFixedRef);

    // 1. Normal preview followed by matching save succeeds while signed token is valid
    const normalPreview = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      __testReferenceTime: testFixedRef,
      body: {
        action: 'parse',
        text: 'Doctor checkup tomorrow at 7pm',
        timeZone: 'Asia/Kolkata'
      }
    }), normalPreview);
    assert.strictEqual(normalPreview.statusCode, 200);
    assert.ok(normalPreview.body.draft.resolutionToken, 'Resolution token must be returned in draft');
    const normalToken = normalPreview.body.draft.resolutionToken;

    const normalSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save',
        confirmed: true,
        title: normalPreview.body.draft.title,
        taskType: normalPreview.body.draft.taskType,
        dateExpression: normalPreview.body.draft.dateExpression,
        resolutionToken: normalToken,
        schedulingStatus: normalPreview.body.draft.schedulingStatus,
        dateLocal: normalPreview.body.draft.dateLocal,
        timeLocal: normalPreview.body.draft.timeLocal,
        timeZone: normalPreview.body.draft.timeZone,
        recurrence: null
      }
    }), normalSave);
    assert.strictEqual(normalSave.statusCode, 201, 'Matching save with valid token must succeed');
    assert.strictEqual(normalSave.body.reminder.dateLocal, '2026-10-24');
    assert.strictEqual(normalSave.body.reminder.timeLocal, '19:00');

    // 2. Forged-anchor scenario: caller attempts to make "tomorrow at 7pm" match arbitrary future date by forging referenceTime
    // Case A: Attacker passes forged referenceTime in body while using token issued from genuine reference instant
    const forgedAnchorWithToken = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save',
        confirmed: true,
        title: 'Forged anchor attack',
        taskType: 'work',
        dateExpression: 'tomorrow at 7pm',
        dateLocal: '2029-05-15', // Arbitrary future date
        timeLocal: '19:00',
        timeZone: 'Asia/Kolkata',
        referenceTime: '2029-05-14T10:00:00.000Z', // Forged referenceTime
        resolutionToken: normalToken
      }
    }), forgedAnchorWithToken);
    assert.strictEqual(forgedAnchorWithToken.statusCode, 422);
    assert.strictEqual(forgedAnchorWithToken.body.code, 'SCHEDULE_FIELD_MISMATCH', 'Forged referenceTime in body must not override server verified anchor');

    // Case B: Attacker passes forged referenceTime without token
    const forgedAnchorNoToken = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save',
        confirmed: true,
        title: 'Forged anchor without token',
        taskType: 'work',
        dateExpression: 'tomorrow at 7pm',
        dateLocal: '2029-05-15',
        timeLocal: '19:00',
        timeZone: 'Asia/Kolkata',
        referenceTime: '2029-05-14T10:00:00.000Z'
      }
    }), forgedAnchorNoToken);
    assert.strictEqual(forgedAnchorNoToken.statusCode, 422);
    assert.strictEqual(forgedAnchorNoToken.body.code, 'MISSING_RESOLUTION_TOKEN');

    // 3. Tampered token signature is rejected
    const tamperedResToken = normalToken.slice(0, -6) + 'abcdef';
    const tamperedSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save',
        confirmed: true,
        title: 'Tampered token test',
        taskType: 'work',
        dateExpression: normalPreview.body.draft.dateExpression,
        resolutionToken: tamperedResToken,
        dateLocal: normalPreview.body.draft.dateLocal,
        timeLocal: normalPreview.body.draft.timeLocal,
        timeZone: normalPreview.body.draft.timeZone
      }
    }), tamperedSave);
    assert.strictEqual(tamperedSave.statusCode, 422);
    assert.strictEqual(tamperedSave.body.code, 'INVALID_RESOLUTION_TOKEN');

    // 4. Expired token is rejected
    const sessionTokenStr = validCookie.split('=')[1];
    const sessionObj = handler.verifySession(sessionTokenStr, validSecret);
    const expiredResToken = handler.createResolutionToken({
      ownerId: sessionObj.ownerId,
      dateExpression: 'tomorrow at 7pm',
      timeZone: 'Asia/Kolkata',
      dateLocal: '2026-10-24',
      timeLocal: '19:00',
      schedulingStatus: 'scheduled',
      referenceTime: testFixedRef
    }, validSecret, { ttlMs: -10000 });
    const expiredSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save',
        confirmed: true,
        title: 'Expired token test',
        taskType: 'work',
        dateExpression: 'tomorrow at 7pm',
        resolutionToken: expiredResToken,
        dateLocal: '2026-10-24',
        timeLocal: '19:00',
        timeZone: 'Asia/Kolkata'
      }
    }), expiredSave);
    assert.strictEqual(expiredSave.statusCode, 422);
    assert.strictEqual(expiredSave.body.code, 'EXPIRED_RESOLUTION_TOKEN');

    // 5. Token session owner mismatch is rejected
    const otherOwnerToken = handler.createResolutionToken({
      ownerId: '00000000-0000-0000-0000-000000000099', // Different owner
      dateExpression: 'tomorrow at 7pm',
      timeZone: 'Asia/Kolkata',
      dateLocal: '2026-10-24',
      timeLocal: '19:00',
      schedulingStatus: 'scheduled',
      referenceTime: testFixedRef
    }, validSecret);
    const ownerMismatchSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save',
        confirmed: true,
        title: 'Owner mismatch test',
        taskType: 'work',
        dateExpression: 'tomorrow at 7pm',
        resolutionToken: otherOwnerToken,
        dateLocal: '2026-10-24',
        timeLocal: '19:00',
        timeZone: 'Asia/Kolkata'
      }
    }), ownerMismatchSave);
    assert.strictEqual(ownerMismatchSave.statusCode, 422);
    assert.strictEqual(ownerMismatchSave.body.code, 'RESOLUTION_OWNER_MISMATCH');

    // 6. Altered fields (date, time, timezone, scheduling status) rejected
    const alteredDateSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save', confirmed: true, title: 'Altered date',
        dateExpression: 'tomorrow at 7pm', resolutionToken: normalToken,
        dateLocal: '2026-10-28', timeLocal: '19:00', timeZone: 'Asia/Kolkata'
      }
    }), alteredDateSave);
    assert.strictEqual(alteredDateSave.statusCode, 422);
    assert.strictEqual(alteredDateSave.body.code, 'SCHEDULE_FIELD_MISMATCH');

    const alteredTimeSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save', confirmed: true, title: 'Altered time',
        dateExpression: 'tomorrow at 7pm', resolutionToken: normalToken,
        dateLocal: '2026-10-24', timeLocal: '20:00', timeZone: 'Asia/Kolkata'
      }
    }), alteredTimeSave);
    assert.strictEqual(alteredTimeSave.statusCode, 422);
    assert.strictEqual(alteredTimeSave.body.code, 'SCHEDULE_FIELD_MISMATCH');

    const alteredZoneSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save', confirmed: true, title: 'Altered zone',
        dateExpression: 'tomorrow at 7pm', resolutionToken: normalToken,
        dateLocal: '2026-10-24', timeLocal: '19:00', timeZone: 'America/New_York'
      }
    }), alteredZoneSave);
    assert.strictEqual(alteredZoneSave.statusCode, 422);
    assert.strictEqual(alteredZoneSave.body.code, 'SCHEDULE_FIELD_MISMATCH');

    const alteredStatusSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save', confirmed: true, title: 'Altered status',
        dateExpression: 'tomorrow at 7pm', resolutionToken: normalToken,
        schedulingStatus: 'date_only',
        dateLocal: '2026-10-24', timeLocal: '19:00', timeZone: 'Asia/Kolkata'
      }
    }), alteredStatusSave);
    assert.strictEqual(alteredStatusSave.statusCode, 422);
    assert.strictEqual(alteredStatusSave.body.code, 'SCHEDULE_FIELD_MISMATCH');

    // 7. Recurrence checks: missing or mismatched recurrence cannot bypass consistency
    const recurringPreview = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      __testReferenceTime: testFixedRef,
      body: {
        action: 'resolve',
        dateExpression: 'every day at 10am',
        timeZone: 'Asia/Kolkata'
      }
    }), recurringPreview);
    assert.strictEqual(recurringPreview.statusCode, 200);
    const recurringToken = recurringPreview.body.resolutionToken;
    assert.ok(recurringToken);

    // Missing recurrence when expression requires recurrence
    const missingRecurrenceSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save', confirmed: true, title: 'Missing recurrence',
        dateExpression: 'every day at 10am', resolutionToken: recurringToken,
        dateLocal: recurringPreview.body.draft.dateLocal,
        timeLocal: recurringPreview.body.draft.timeLocal,
        timeZone: 'Asia/Kolkata',
        recurrence: null // Missing recurrence
      }
    }), missingRecurrenceSave);
    assert.strictEqual(missingRecurrenceSave.statusCode, 422);
    assert.strictEqual(missingRecurrenceSave.body.code, 'RECURRENCE_MISMATCH');

    // Mismatched recurrence rule
    const mismatchedRecurrenceSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save', confirmed: true, title: 'Mismatched recurrence',
        dateExpression: 'every day at 10am', resolutionToken: recurringToken,
        dateLocal: recurringPreview.body.draft.dateLocal,
        timeLocal: recurringPreview.body.draft.timeLocal,
        timeZone: 'Asia/Kolkata',
        recurrence: { unit: 'week', interval: 1 } // Expression is day: 1
      }
    }), mismatchedRecurrenceSave);
    assert.strictEqual(mismatchedRecurrenceSave.statusCode, 422);
    assert.strictEqual(mismatchedRecurrenceSave.body.code, 'RECURRENCE_MISMATCH');

    // Adding recurrence to non-recurring expression rejected
    const nonRecurringToken = normalToken;
    const addedRecurrenceSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save', confirmed: true, title: 'Added recurrence',
        dateExpression: 'tomorrow at 7pm', resolutionToken: nonRecurringToken,
        dateLocal: normalPreview.body.draft.dateLocal,
        timeLocal: normalPreview.body.draft.timeLocal,
        timeZone: 'Asia/Kolkata',
        recurrence: { unit: 'week', interval: 1 }
      }
    }), addedRecurrenceSave);
    assert.strictEqual(addedRecurrenceSave.statusCode, 422);
    assert.strictEqual(addedRecurrenceSave.body.code, 'RECURRENCE_MISMATCH');

    // 8. Manual calendar override with dateExpression: null works without token
    const manualCalendarSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save', confirmed: true, title: 'Manual override task',
        dateExpression: null,
        dateLocal: '2028-11-15', timeLocal: '14:00', timeZone: 'Asia/Kolkata',
        recurrence: { unit: 'month', interval: 2 }
      }
    }), manualCalendarSave);
    assert.strictEqual(manualCalendarSave.statusCode, 201);
    assert.strictEqual(manualCalendarSave.body.reminder.dateExpression, null);
    assert.strictEqual(manualCalendarSave.body.reminder.dateLocal, '2028-11-15');

    process.stdout.write('  PASS Suite 7: Stateless resolution verification & trust boundary verified\n');

    // ----------------------------------------------------
    // Suite 8: Final Security & Correctness Audit — Timestamp Contract & Drift Prevention
    // ----------------------------------------------------
    process.stdout.write('Testing Suite 8: Timestamp contract, temporal validation & boundary drift...\n');

    // 1. Invariant: Signed dueAt cannot disagree with independently resolved timestamp
    const disagreeToken = handler.createResolutionToken({
      ownerId: sessionObj.ownerId,
      dateExpression: 'tomorrow at 7pm',
      timeZone: 'Asia/Kolkata',
      dateLocal: '2026-10-24',
      timeLocal: '19:00',
      schedulingStatus: 'scheduled',
      dueAt: '2026-10-25T13:30:00.000Z', // Forged timestamp disagreeing with resolver (2026-10-24T13:30:00.000Z)
      referenceTime: testFixedRef
    }, validSecret);

    const disagreeSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      __testReferenceTime: testFixedRef,
      body: {
        action: 'save', confirmed: true, title: 'Disagreeing timestamp test',
        taskType: 'work', dateExpression: 'tomorrow at 7pm', resolutionToken: disagreeToken,
        dateLocal: '2026-10-24', timeLocal: '19:00', timeZone: 'Asia/Kolkata'
      }
    }), disagreeSave);
    assert.strictEqual(disagreeSave.statusCode, 422, 'Disagreeing signed dueAt must be rejected with 422');
    assert.strictEqual(disagreeSave.body.code, 'SCHEDULE_FIELD_MISMATCH');

    // Date-only token with non-null dueAt must be rejected
    const fixedEpoch = new Date(testFixedRef).getTime();
    const forgedDateOnlyPayload = Buffer.from(JSON.stringify({
      v: 1,
      ownerId: sessionObj.ownerId,
      dateExpression: 'tomorrow',
      timeZone: 'Asia/Kolkata',
      dateLocal: '2026-10-24',
      timeLocal: '',
      schedulingStatus: 'date_only',
      dueAt: '2026-10-24T13:30:00.000Z', // Forged non-null dueAt
      referenceTime: testFixedRef,
      issuedAt: fixedEpoch,
      expiresAt: fixedEpoch + 20 * 60 * 1000
    })).toString('base64url');
    const forgedDateOnlySig = crypto.createHmac('sha256', validSecret).update(forgedDateOnlyPayload).digest('base64url');
    const dateOnlyForgedDueAtToken = forgedDateOnlyPayload + '.' + forgedDateOnlySig;

    const dateOnlyForgedDueAtSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      __testReferenceTime: testFixedRef,
      body: {
        action: 'save', confirmed: true, title: 'Date-only with dueAt test',
        taskType: 'work', dateExpression: 'tomorrow', resolutionToken: dateOnlyForgedDueAtToken,
        dateLocal: '2026-10-24', timeLocal: '', timeZone: 'Asia/Kolkata'
      }
    }), dateOnlyForgedDueAtSave);
    assert.strictEqual(dateOnlyForgedDueAtSave.statusCode, 422);
    assert.strictEqual(dateOnlyForgedDueAtSave.body.code, 'SCHEDULE_FIELD_MISMATCH');

    // 2. Future-issued token rejected
    const futureIssuedToken = handler.createResolutionToken({
      ownerId: sessionObj.ownerId,
      dateExpression: 'tomorrow at 7pm',
      timeZone: 'Asia/Kolkata',
      dateLocal: '2026-10-24',
      timeLocal: '19:00',
      schedulingStatus: 'scheduled',
      dueAt: '2026-10-24T13:30:00.000Z',
      referenceTime: testFixedRef
    }, validSecret, { issuedAt: fixedEpoch + 10 * 60 * 1000, ttlMs: 20 * 60 * 1000 }); // 10 minutes in future

    const futureIssuedSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save', confirmed: true, title: 'Future issued token',
        taskType: 'work', dateExpression: 'tomorrow at 7pm', resolutionToken: futureIssuedToken,
        dateLocal: '2026-10-24', timeLocal: '19:00', timeZone: 'Asia/Kolkata'
      }
    }), futureIssuedSave);
    assert.strictEqual(futureIssuedSave.statusCode, 422);
    assert.strictEqual(futureIssuedSave.body.code, 'INVALID_RESOLUTION_TOKEN');

    // Overlong-lifetime token rejected (> 20 min TTL)
    const overlongToken = handler.createResolutionToken({
      ownerId: sessionObj.ownerId,
      dateExpression: 'tomorrow at 7pm',
      timeZone: 'Asia/Kolkata',
      dateLocal: '2026-10-24',
      timeLocal: '19:00',
      schedulingStatus: 'scheduled',
      dueAt: '2026-10-24T13:30:00.000Z',
      referenceTime: testFixedRef
    }, validSecret, { issuedAt: fixedEpoch - 1000, ttlMs: 40 * 60 * 1000 }); // 40 minutes TTL

    const overlongSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save', confirmed: true, title: 'Overlong token',
        taskType: 'work', dateExpression: 'tomorrow at 7pm', resolutionToken: overlongToken,
        dateLocal: '2026-10-24', timeLocal: '19:00', timeZone: 'Asia/Kolkata'
      }
    }), overlongSave);
    assert.strictEqual(overlongSave.statusCode, 422);
    assert.strictEqual(overlongSave.body.code, 'INVALID_RESOLUTION_TOKEN');

    // Malformed token without delimiter rejected
    const malformedResToken = 'not_a_valid_token_string';
    const malformedSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      body: {
        action: 'save', confirmed: true, title: 'Malformed token',
        taskType: 'work', dateExpression: 'tomorrow at 7pm', resolutionToken: malformedResToken,
        dateLocal: '2026-10-24', timeLocal: '19:00', timeZone: 'Asia/Kolkata'
      }
    }), malformedSave);
    assert.strictEqual(malformedSave.statusCode, 422);
    assert.strictEqual(malformedSave.body.code, 'INVALID_RESOLUTION_TOKEN');

    // 3. Calendar boundary crossing: preview at 23:55 UTC (Oct 23), saved at 00:05 UTC the next day (Oct 24)
    const previewTimeT0 = '2026-10-23T23:55:00.000Z';
    const boundaryPreview = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      __testReferenceTime: previewTimeT0,
      body: {
        action: 'parse',
        text: 'Deploy application tomorrow at 7pm',
        timeZone: 'UTC'
      }
    }), boundaryPreview);
    assert.strictEqual(boundaryPreview.statusCode, 200);
    const boundaryToken = boundaryPreview.body.draft.resolutionToken;
    assert.ok(boundaryToken);
    assert.strictEqual(boundaryPreview.body.draft.dateLocal, '2026-10-24');
    assert.strictEqual(boundaryPreview.body.draft.timeLocal, '19:00');

    // Clock advances 10 minutes across midnight to 00:05 UTC (Oct 24)
    const saveTimeT1 = '2026-10-24T00:05:00.000Z';
    const boundarySave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      __testReferenceTime: saveTimeT1,
      body: {
        action: 'save', confirmed: true, title: 'Deploy application',
        taskType: 'work', dateExpression: 'tomorrow at 7pm', resolutionToken: boundaryToken,
        dateLocal: '2026-10-24', timeLocal: '19:00', timeZone: 'UTC'
      }
    }), boundarySave);
    assert.strictEqual(boundarySave.statusCode, 201, 'Save crossing midnight must resolve against signed token anchor');
    assert.strictEqual(boundarySave.body.reminder.dateLocal, '2026-10-24');

    // But if current time has genuinely passed the scheduled time while token is still active, TIME_IN_PAST must still be enforced
    const nearPreviewTime = '2026-10-24T18:50:00.000Z';
    const nearPreview = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      __testReferenceTime: nearPreviewTime,
      body: {
        action: 'parse',
        text: 'Call client today at 6:55pm',
        timeZone: 'UTC'
      }
    }), nearPreview);
    assert.strictEqual(nearPreview.statusCode, 200);
    const nearToken = nearPreview.body.draft.resolutionToken;
    assert.ok(nearToken);

    // 6 minutes later (18:56 UTC), token is still valid (expires in 14 min), but scheduled time (18:55 UTC) has passed
    const pastTimeT2 = '2026-10-24T18:56:00.000Z';
    const pastSave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      __testReferenceTime: pastTimeT2,
      body: {
        action: 'save', confirmed: true, title: 'Call client',
        taskType: 'work', dateExpression: 'today at 6:55pm', resolutionToken: nearToken,
        dateLocal: '2026-10-24', timeLocal: '18:55', timeZone: 'UTC'
      }
    }), pastSave);
    assert.strictEqual(pastSave.statusCode, 422);
    assert.strictEqual(pastSave.body.code, 'TIME_IN_PAST');

    // 4. Incomplete & clarification-only resolutions never issue saveable tokens
    const monthlyPreview = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      __testReferenceTime: testFixedRef,
      body: { action: 'parse', text: 'Pay taxes every month', timeZone: 'Asia/Kolkata' }
    }), monthlyPreview);
    assert.strictEqual(monthlyPreview.statusCode, 200);
    assert.strictEqual(monthlyPreview.body.draft.schedulingStatus, 'needs_clarification');
    assert.strictEqual(monthlyPreview.body.draft.resolutionToken, null, 'Clarification draft must have resolutionToken === null');
    assert.strictEqual(monthlyPreview.body.resolutionToken, null);

    const resolveIncompleteRes = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      __testReferenceTime: testFixedRef,
      body: { action: 'resolve', dateExpression: 'tomorrow at 7', timeZone: 'Asia/Kolkata' }
    }), resolveIncompleteRes);
    assert.strictEqual(resolveIncompleteRes.statusCode, 200);
    assert.strictEqual(resolveIncompleteRes.body.draft.schedulingStatus, 'needs_clarification');
    assert.strictEqual(resolveIncompleteRes.body.draft.resolutionToken, null, 'Incomplete time must have resolutionToken === null');

    // 5. Date-only resolution and persistence guarantees dueAt === null
    const dateOnlyParse = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      __testReferenceTime: testFixedRef,
      body: { action: 'parse', text: 'Renew passport tomorrow', timeZone: 'Asia/Kolkata' }
    }), dateOnlyParse);
    assert.strictEqual(dateOnlyParse.statusCode, 200);
    assert.strictEqual(dateOnlyParse.body.draft.schedulingStatus, 'date_only');
    assert.strictEqual(dateOnlyParse.body.draft.dueAt, null);
    const dateOnlyToken = dateOnlyParse.body.draft.resolutionToken;
    assert.ok(dateOnlyToken);

    const dateOnlySave = res();
    await handler(req('POST', {
      headers: { cookie: validCookie },
      __testReferenceTime: testFixedRef,
      body: {
        action: 'save', confirmed: true, title: 'Renew passport',
        taskType: 'general', dateExpression: 'tomorrow', resolutionToken: dateOnlyToken,
        dateLocal: '2026-10-24', timeLocal: '', timeZone: 'Asia/Kolkata'
      }
    }), dateOnlySave);
    assert.strictEqual(dateOnlySave.statusCode, 201);
    assert.strictEqual(dateOnlySave.body.reminder.dueAt, null);
    assert.strictEqual(dateOnlySave.body.reminder.schedulingStatus, 'date_only');

    process.stdout.write('  PASS Suite 8: Timestamp contract, temporal validation & boundary drift verified\n');

    process.stdout.write('\nPASS reminder API: all session security, length gates, CSRF, and isolation tests passed.\n');
  } finally {
    handler.setReferenceClock(null);
    global.fetch = oldFetch;
    if (env.secret === undefined) delete process.env.MILO_SESSION_SECRET; else process.env.MILO_SESSION_SECRET = env.secret;
    if (env.url === undefined) delete process.env.UPSTASH_REDIS_REST_URL; else process.env.UPSTASH_REDIS_REST_URL = env.url;
    if (env.token === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN; else process.env.UPSTASH_REDIS_REST_TOKEN = env.token;
    if (env.vercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = env.vercel;
  }
}

main().catch(function (error) {
  process.stderr.write('FAIL reminder API: ' + error.stack + '\n');
  process.exitCode = 1;
});

