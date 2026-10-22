'use strict';
const crypto = require('crypto');
const { parseReminderText, resolveLocalDateTime, validTimeZone } = require('../services/reminder-parser');
const authGuard = require('./auth-guard');
const COOKIE_NAME = 'milo_reminder_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_TITLE_LENGTH = 180;

function getSessionSecret() {
  const secret = String(process.env.MILO_SESSION_SECRET || process.env.SESSION_SECRET || process.env.JUNO_SESSION_SECRET || '').trim();
  return secret.length >= 16 ? secret : '';
}
function signPayload(encoded, secret) {
  return crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
}
function createSession(secret) {
  const payload = Buffer.from(JSON.stringify({ version: 1, ownerId: crypto.randomUUID(), expiresAt: Date.now() + SESSION_TTL_MS })).toString('base64url');
  return payload + '.' + signPayload(payload, secret);
}
function verifySession(token, secret) {
  if (!token || !secret || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const expected = Buffer.from(signPayload(parts[0], secret)), actual = Buffer.from(parts[1]);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (payload.version !== 1 || !/^[0-9a-f-]{36}$/i.test(payload.ownerId || '') || !Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now()) return null;
    return { ownerId: payload.ownerId, expiresAt: payload.expiresAt };
  } catch (_) { return null; }
}
function readCookie(req, name) {
  const header = req && req.headers ? req.headers.cookie : '';
  if (typeof header !== 'string') return '';
  const prefix = name + '=';
  for (const part of header.split(';')) {
    const entry = part.trim();
    if (entry.indexOf(prefix) === 0) return entry.slice(prefix.length);
  }
  return '';
}
function issueCookie(req, res, token) {
  const parts = [COOKIE_NAME + '=' + token, 'Path=/api/reminders', 'HttpOnly', 'SameSite=Lax', 'Max-Age=' + Math.floor(SESSION_TTL_MS / 1000)];
  if (process.env.VERCEL || (req.headers && req.headers['x-forwarded-proto'] === 'https')) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}
function getSession(req, res, createIfMissing) {
  const secret = getSessionSecret();
  if (!secret) return { ok: false, error: 'Secure reminder sessions are not configured on this deployment.' };
  const existing = verifySession(readCookie(req, COOKIE_NAME), secret);
  if (existing) return { ok: true, session: existing };
  if (!createIfMissing) return { ok: false, error: 'Reminder session is missing or expired. Refresh the page and try again.' };
  const token = createSession(secret), session = verifySession(token, secret);
  issueCookie(req, res, token);
  return { ok: true, session: session };
}
function getRedisConfig() {
  const url = String(process.env.UPSTASH_REDIS_REST_URL || process.env.MILO_REMINDERS_REDIS_URL || '').trim().replace(/\/+$/, '');
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.MILO_REMINDERS_REDIS_TOKEN || '').trim();
  if (!url || !token) return null;
  try { if (new URL(url).protocol !== 'https:') return null; return { url: url, token: token }; } catch (_) { return null; }
}
async function redisCommand(command) {
  const config = getRedisConfig();
  if (!config) throw new Error('REMINDER_STORE_NOT_CONFIGURED');
  const controller = new AbortController();
  const timeout = setTimeout(function () { controller.abort(); }, 4500);
  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + config.token, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
      cache: 'no-store',
      signal: controller.signal
    });
    const payload = await response.json().catch(function () { return {}; });
    if (!response.ok || payload.error) throw new Error('REMINDER_STORE_REQUEST_FAILED');
    return payload.result;
  } finally {
    clearTimeout(timeout);
  }
}
function sameOrigin(req) {
  const headers = req.headers || {};
  if (!headers.origin) return false;
  const host = headers['x-forwarded-host'] || headers.host || '';
  if (!host) return false;
  try { return new URL(headers.origin).host.toLowerCase() === String(host).split(',')[0].trim().toLowerCase(); }
  catch (_) { return false; }
}
function respond(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return res.status(status).json(payload);
}
function ownerKey(ownerId) { return 'milo:reminders:v1:' + ownerId; }
function validRecurrence(value) {
  if (value == null) return null;
  if (!value || !['day', 'week', 'month', 'year'].includes(value.unit)) return undefined;
  const interval = Number(value.interval);
  if (!Number.isInteger(interval) || interval < 1 || interval > 99) return undefined;
  return { unit: value.unit, interval: interval };
}
function safeReminder(value, ownerId) {
  if (!value || typeof value !== 'object' || value.ownerId !== ownerId) return null;
  return {
    id: value.id, title: value.title, dateLocal: value.dateLocal, timeLocal: value.timeLocal,
    timeZone: value.timeZone, dueAt: value.dueAt, recurrence: value.recurrence || null,
    status: 'saved', notificationStatus: 'not-configured', createdAt: value.createdAt
  };
}
async function listReminders(session) {
  const result = await redisCommand(['HGETALL', ownerKey(session.ownerId)]);
  if (!Array.isArray(result)) return [];
  const reminders = [];
  for (let i = 0; i + 1 < result.length; i += 2) {
    try { const safe = safeReminder(JSON.parse(result[i + 1]), session.ownerId); if (safe) reminders.push(safe); } catch (_) {}
  }
  return reminders.sort(function (a, b) { return String(a.dueAt).localeCompare(String(b.dueAt)); });
}

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST, DELETE');
    return respond(res, 405, { success: false, error: 'Method not allowed.' });
  }
  const sessionResult = getSession(req, res, true);
  const session = sessionResult.ok ? sessionResult.session : null;

  if (req.method === 'POST') {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    if (body.action === 'parse') {
      const clientIp = authGuard.getVerifiedClientIp(req);
      const parseRate = authGuard.checkRateLimit('reminder-parse:' + clientIp, 120, 60000);
      if (!parseRate.allowed) return respond(res, 429, { success: false, error: 'Too many reminder previews. Please try again shortly.' });
      const draft = parseReminderText(body.text, { timeZone: body.timeZone || 'UTC', referenceTime: new Date() });
      if (!draft.ok) return respond(res, 422, { success: false, code: draft.code, error: draft.message });
      return respond(res, 200, { success: true, draft: draft, persistenceConfigured: Boolean(getRedisConfig() && session) });
    }
    if (body.action !== 'save') return respond(res, 400, { success: false, error: 'Use action=parse or action=save.' });
    if (!sameOrigin(req)) return respond(res, 403, { success: false, error: 'Cross-origin reminder writes are not allowed.' });
    if (!session) return respond(res, 503, { success: false, error: sessionResult.error || 'Secure reminder session is unavailable.' });
    if (!getRedisConfig()) return respond(res, 503, { success: false, code: 'REMINDER_STORE_NOT_CONFIGURED', error: 'Secure reminder storage is not configured. Nothing was saved.' });
    const rate = authGuard.checkRateLimit('reminders:' + session.ownerId, 40, 60000);
    if (!rate.allowed) return respond(res, 429, { success: false, error: 'Too many reminder changes. Please try again shortly.' });
    if (body.confirmed !== true) return respond(res, 400, { success: false, error: 'Confirm the reminder details before saving.' });

    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const timeZone = typeof body.timeZone === 'string' ? body.timeZone.trim() : '';
    const dateLocal = typeof body.dateLocal === 'string' ? body.dateLocal : '';
    const timeLocal = typeof body.timeLocal === 'string' ? body.timeLocal : '';
    const recurrence = validRecurrence(body.recurrence);
    if (!title || title.length > MAX_TITLE_LENGTH) return respond(res, 400, { success: false, error: 'Enter a reminder title of 1–180 characters.' });
    if (!validTimeZone(timeZone)) return respond(res, 400, { success: false, error: 'Choose a valid time zone.' });
    if (recurrence === undefined) return respond(res, 400, { success: false, error: 'The recurrence rule is invalid.' });
    const resolved = resolveLocalDateTime(dateLocal, timeLocal, timeZone);
    if (!resolved.ok) return respond(res, 422, { success: false, code: resolved.code, error: resolved.message });
    if (resolved.epochMs <= Date.now()) return respond(res, 422, { success: false, code: 'TIME_IN_PAST', error: 'Choose a future date and time.' });

    const item = {
      id: 'rem_' + crypto.randomUUID(), ownerId: session.ownerId, title: title, dateLocal: dateLocal,
      timeLocal: timeLocal, timeZone: timeZone, dueAt: resolved.iso, recurrence: recurrence,
      status: 'saved', notificationStatus: 'not-configured', createdAt: new Date().toISOString()
    };
    try {
      await redisCommand(['HSET', ownerKey(session.ownerId), item.id, JSON.stringify(item)]);
      return respond(res, 201, { success: true, reminder: safeReminder(item, session.ownerId) });
    } catch (_) {
      console.error('[milo/reminders] storage write failed');
      return respond(res, 503, { success: false, error: 'Reminder storage is unavailable. Nothing was confirmed as saved.' });
    }
  }

  if (req.method === 'GET') {
    if (!session) return respond(res, 503, { success: false, error: sessionResult.error || 'Secure reminder session is unavailable.', persistenceConfigured: false });
    if (!getRedisConfig()) return respond(res, 503, { success: false, code: 'REMINDER_STORE_NOT_CONFIGURED', error: 'Secure reminder storage is not configured.', persistenceConfigured: false });
    try { return respond(res, 200, { success: true, reminders: await listReminders(session), persistenceConfigured: true, notificationsConfigured: false }); }
    catch (_) { return respond(res, 503, { success: false, error: 'Reminder storage is unavailable.', persistenceConfigured: false }); }
  }

  if (!sameOrigin(req)) return respond(res, 403, { success: false, error: 'Cross-origin reminder writes are not allowed.' });
  if (!session) return respond(res, 503, { success: false, error: sessionResult.error || 'Secure reminder session is unavailable.' });
  if (!getRedisConfig()) return respond(res, 503, { success: false, code: 'REMINDER_STORE_NOT_CONFIGURED', error: 'Secure reminder storage is not configured.' });
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const id = typeof body.id === 'string' ? body.id : '';
  if (!/^rem_[0-9a-f-]{36}$/i.test(id)) return respond(res, 400, { success: false, error: 'Reminder ID is invalid.' });
  const rate = authGuard.checkRateLimit('reminders:' + session.ownerId, 40, 60000);
  if (!rate.allowed) return respond(res, 429, { success: false, error: 'Too many reminder changes. Please try again shortly.' });
  try {
    const removed = await redisCommand(['HDEL', ownerKey(session.ownerId), id]);
    if (!Number(removed)) return respond(res, 404, { success: false, error: 'Reminder not found.' });
    return respond(res, 200, { success: true, deleted: true });
  } catch (_) { return respond(res, 503, { success: false, error: 'Reminder storage is unavailable.' }); }
}
module.exports = handler;
module.exports.default = handler;
