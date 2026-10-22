'use strict';
const assert = require('assert');
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
  return { method: method, headers: Object.assign({ host: 'localhost:3000', origin: 'http://localhost:3000', 'sec-fetch-site': 'same-origin' }, options.headers || {}), body: options.body || {}, query: options.query || {} };
}
function cookieOf(response) { return String(response.headers['Set-Cookie'] || '').split(';')[0]; }
async function main() {
  const env = { secret: process.env.MILO_SESSION_SECRET, url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN, vercel: process.env.VERCEL };
  const oldFetch = global.fetch, memory = new Map();
  try {
    process.env.MILO_SESSION_SECRET = 'unit-test-reminder-session-secret-32';
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

    const parsed = res();
    await handler(req('POST', { body: { action: 'parse', text: 'Remind me to study tomorrow at 7pm', timeZone: 'Asia/Kolkata' } }), parsed);
    assert.strictEqual(parsed.statusCode, 200);
    const cookie = cookieOf(parsed);
    assert.ok(cookie.startsWith('milo_reminder_session='));

    const saved = res();
    await handler(req('POST', { headers: { cookie: cookie }, body: {
      action: 'save', confirmed: true, title: 'Study', dateLocal: '2035-10-23',
      timeLocal: '19:00', timeZone: 'Asia/Kolkata', recurrence: null
    }}), saved);
    assert.strictEqual(saved.statusCode, 201, JSON.stringify(saved.body));
    const id = saved.body.reminder.id;

    const ownList = res();
    await handler(req('GET', { headers: { cookie: cookie } }), ownList);
    assert.strictEqual(ownList.statusCode, 200); assert.strictEqual(ownList.body.reminders.length, 1);
    assert.strictEqual(ownList.body.reminders[0].notificationStatus, 'not-configured');

    const otherList = res();
    await handler(req('GET'), otherList);
    assert.strictEqual(otherList.statusCode, 200); assert.strictEqual(otherList.body.reminders.length, 0);

    const otherDelete = res();
    await handler(req('DELETE', { headers: { cookie: cookieOf(otherList) }, body: { id: id } }), otherDelete);
    assert.strictEqual(otherDelete.statusCode, 404);

    const ownAgain = res();
    await handler(req('GET', { headers: { cookie: cookie } }), ownAgain);
    assert.strictEqual(ownAgain.body.reminders.length, 1);

    const unconfirmed = res();
    await handler(req('POST', { headers: { cookie: cookie }, body: {
      action: 'save', confirmed: false, title: 'Study', dateLocal: '2035-10-23',
      timeLocal: '19:00', timeZone: 'Asia/Kolkata'
    }}), unconfirmed);
    assert.strictEqual(unconfirmed.statusCode, 400);
    process.stdout.write('PASS reminder API: save, list, confirmation gate, and owner isolation\n');
  } finally {
    global.fetch = oldFetch;
    if (env.secret === undefined) delete process.env.MILO_SESSION_SECRET; else process.env.MILO_SESSION_SECRET = env.secret;
    if (env.url === undefined) delete process.env.UPSTASH_REDIS_REST_URL; else process.env.UPSTASH_REDIS_REST_URL = env.url;
    if (env.token === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN; else process.env.UPSTASH_REDIS_REST_TOKEN = env.token;
    if (env.vercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = env.vercel;
  }
}
main().catch(function (error) { process.stderr.write('FAIL reminder API: ' + error.stack + '\n'); process.exitCode = 1; });
