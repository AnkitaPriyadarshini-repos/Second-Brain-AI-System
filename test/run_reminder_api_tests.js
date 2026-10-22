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
  return {
    method: method,
    headers: Object.assign({ host: 'localhost:3000', origin: 'http://localhost:3000', 'sec-fetch-site': 'same-origin' }, options.headers || {}),
    body: options.body || {},
    query: options.query || {}
  };
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
    // Suite 1: Session Secret Minimum Length & Entropy Gate
    // ----------------------------------------------------
    process.stdout.write('Testing Suite 1: Session Secret Minimum Length & Entropy Gate...\n');

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

    // Secret at accepted minimum: exactly 32 characters / 32 bytes
    const minSecret = 'a'.repeat(32);
    process.env.MILO_SESSION_SECRET = minSecret;
    assert.strictEqual(handler.getSessionSecret(), minSecret, 'Exactly 32-character / 32-byte secret must be accepted');

    // High-entropy hex secret: 64 characters representing 32 raw bytes
    const hexSecret = crypto.randomBytes(32).toString('hex');
    process.env.MILO_SESSION_SECRET = hexSecret;
    assert.strictEqual(handler.getSessionSecret(), hexSecret, '64-hex-character (32-byte) secret must be accepted');

    // High-entropy base64 secret: 44 characters representing 32 raw bytes
    const b64Secret = crypto.randomBytes(32).toString('base64');
    process.env.MILO_SESSION_SECRET = b64Secret;
    assert.strictEqual(handler.getSessionSecret(), b64Secret, '44-base64-character (32-byte) secret must be accepted');

    process.stdout.write('  PASS Suite 1: Secret length & entropy validation verified\n');

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

    process.stdout.write('\nPASS reminder API: all session security, length gates, CSRF, and isolation tests passed.\n');
  } finally {
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

