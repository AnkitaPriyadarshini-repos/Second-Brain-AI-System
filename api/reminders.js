'use strict';
const crypto = require('crypto');
const { parseReminderText, resolveLocalDateTime, validTimeZone } = require('../services/reminder-parser');
const ReminderDateResolutionService = require('../services/ReminderDateResolutionService');
const TaskExtractionService = require('../services/TaskExtractionService');
const authGuard = require('./auth-guard');

const taskExtractionService = new TaskExtractionService();
const dateResolutionService = new ReminderDateResolutionService();
const COOKIE_NAME = 'milo_reminder_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_TITLE_LENGTH = 180;
const MIN_SECRET_LENGTH = 32;

// Enforces minimum decoded-byte length (>= 32 bytes for hex, base64, or raw UTF-8).
function getDecodedSecretByteLength(secret) {
  if (!secret || typeof secret !== 'string') return 0;
  if (/^[0-9a-fA-F]{64,}$/.test(secret)) {
    return Buffer.from(secret, 'hex').length;
  }
  if (/^[A-Za-z0-9+/_-]{43,}={0,2}$/.test(secret)) {
    try {
      const normalized = secret.replace(/-/g, '+').replace(/_/g, '/');
      const b = Buffer.from(normalized, 'base64');
      if (b.length >= 32) return b.length;
    } catch (_) {}
  }
  return Buffer.byteLength(secret, 'utf8');
}

// Enforces a minimum character length (32 chars) and decoded-byte length (32 bytes).
// Note: Length and byte-size checks alone cannot prove cryptographic entropy (e.g. 'a'.repeat(32) passes).
// Operational security depends on provisioning a cryptographically random secret generated via
// 'openssl rand -hex 32' or an equivalent secure method.
function getSessionSecret() {
  const secret = String(process.env.MILO_SESSION_SECRET || process.env.SESSION_SECRET || process.env.JUNO_SESSION_SECRET || '').trim();
  if (secret.length < MIN_SECRET_LENGTH) return '';
  if (getDecodedSecretByteLength(secret) < MIN_SECRET_LENGTH) return '';
  return secret;
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
  const rawCookie = readCookie(req, COOKIE_NAME);
  if (rawCookie) {
    const existing = verifySession(rawCookie, secret);
    if (existing) return { ok: true, session: existing };
    return { ok: false, error: 'Reminder session is invalid or expired. Refresh the page and try again.' };
  }
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
    id: value.id,
    title: value.title,
    taskType: value.taskType || 'general',
    dateExpression: value.dateExpression || null,
    schedulingStatus: value.schedulingStatus || (value.dueAt ? 'scheduled' : 'unscheduled'),
    dateLocal: value.dateLocal,
    timeLocal: value.timeLocal,
    timeZone: value.timeZone,
    dueAt: value.dueAt,
    recurrence: value.recurrence || null,
    status: 'saved',
    notificationStatus: 'not-configured',
    createdAt: value.createdAt
  };
}
async function listReminders(session) {
  const result = await redisCommand(['HGETALL', ownerKey(session.ownerId)]);
  if (!Array.isArray(result)) return [];
  const reminders = [];
  for (let i = 0; i + 1 < result.length; i += 2) {
    try { const safe = safeReminder(JSON.parse(result[i + 1]), session.ownerId); if (safe) reminders.push(safe); } catch (_) {}
  }
  return reminders.sort(function (a, b) {
    if (!a.dueAt && !b.dueAt) return String(a.createdAt).localeCompare(String(b.createdAt));
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return String(a.dueAt).localeCompare(String(b.dueAt));
  });
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

    // -------------------------------------------------------------------------
    // Action 1: Parse (Model Task Extraction -> Deterministic Date Resolution)
    // -------------------------------------------------------------------------
    if (body.action === 'parse') {
      const clientIp = authGuard.getVerifiedClientIp(req);
      const parseRate = authGuard.checkRateLimit('reminder-parse:' + clientIp, 120, 60000);
      if (!parseRate.allowed) return respond(res, 429, { success: false, error: 'Too many reminder previews. Please try again shortly.' });

      const text = typeof body.text === 'string' ? body.text.trim() : '';
      if (!text) return respond(res, 422, { success: false, code: 'EMPTY_TEXT', error: 'Enter what you want to be reminded about.' });
      if (text.length > 500) return respond(res, 422, { success: false, code: 'TEXT_TOO_LONG', error: 'Keep reminder text under 500 characters.' });

      const timeZone = typeof body.timeZone === 'string' && body.timeZone.trim() ? body.timeZone.trim() : 'UTC';
      if (!validTimeZone(timeZone)) return respond(res, 422, { success: false, code: 'INVALID_TIME_ZONE', error: 'Choose a valid IANA time zone, such as Asia/Kolkata.' });

      // Explicit reference instant captured at start of resolution request
      const referenceTime = body.referenceTime ? new Date(body.referenceTime) : new Date();

      // Stage 1: AI Task Extraction (model-backed or deterministic fallback)
      const extracted = await taskExtractionService.extractTask(body.text, { timeZone: timeZone });
      if (!extracted.ok) {
        return respond(res, 422, {
          success: false,
          code: extracted.code,
          error: extracted.message,
          title: extracted.title || null,
          taskType: extracted.taskType || 'general',
          candidateExpressions: extracted.candidateExpressions || null,
          extraction: extracted
        });
      }

      // Stage 2: Pure deterministic rule-based date resolution
      const resolution = dateResolutionService.resolveDateExpression(extracted.dateExpression, {
        referenceTime: referenceTime,
        timeZone: timeZone
      });

      if (!resolution.ok) {
        return respond(res, 422, { success: false, code: resolution.code, error: resolution.message });
      }

      const draft = {
        ok: true,
        title: extracted.title,
        taskType: extracted.taskType,
        taskClassification: extracted.taskType,
        dateExpression: extracted.dateExpression,
        schedulingStatus: resolution.schedulingStatus,
        dateLocal: resolution.dateLocal,
        timeLocal: resolution.timeLocal,
        timeZone: resolution.timeZone,
        dueAt: resolution.dueAt,
        recurrence: resolution.recurrence,
        needs: resolution.needs,
        message: resolution.message,
        referenceTime: resolution.referenceTime,
        dateResolvedBy: 'deterministic_parser',
        requiresConfirmation: true,
        providerUsed: extracted.providerUsed
      };

      return respond(res, 200, { success: true, draft: draft, persistenceConfigured: Boolean(getRedisConfig() && session) });
    }

    // -------------------------------------------------------------------------
    // Action 2: Resolve (Deterministic Re-resolution only, without re-extracting)
    // -------------------------------------------------------------------------
    if (body.action === 'resolve') {
      const clientIp = authGuard.getVerifiedClientIp(req);
      const parseRate = authGuard.checkRateLimit('reminder-parse:' + clientIp, 120, 60000);
      if (!parseRate.allowed) return respond(res, 429, { success: false, error: 'Too many reminder previews. Please try again shortly.' });

      const timeZone = typeof body.timeZone === 'string' && body.timeZone.trim() ? body.timeZone.trim() : 'UTC';
      if (!validTimeZone(timeZone)) return respond(res, 422, { success: false, code: 'INVALID_TIME_ZONE', error: 'Choose a valid IANA time zone, such as Asia/Kolkata.' });

      const referenceTime = body.referenceTime ? new Date(body.referenceTime) : new Date();
      const resolution = dateResolutionService.resolveDateExpression(body.dateExpression || null, {
        referenceTime: referenceTime,
        timeZone: timeZone
      });

      if (!resolution.ok) {
        return respond(res, 422, { success: false, code: resolution.code, error: resolution.message });
      }

      return respond(res, 200, {
        success: true,
        draft: resolution,
        resolution: resolution,
        persistenceConfigured: Boolean(getRedisConfig() && session)
      });
    }

    // -------------------------------------------------------------------------
    // Action 3: Extract (Model Extraction only)
    // -------------------------------------------------------------------------
    if (body.action === 'extract') {
      const clientIp = authGuard.getVerifiedClientIp(req);
      const parseRate = authGuard.checkRateLimit('reminder-parse:' + clientIp, 120, 60000);
      if (!parseRate.allowed) return respond(res, 429, { success: false, error: 'Too many reminder previews. Please try again shortly.' });

      const text = typeof body.text === 'string' ? body.text.trim() : '';
      if (!text) return respond(res, 422, { success: false, code: 'EMPTY_TEXT', error: 'Enter what you want to be reminded about.' });
      if (text.length > 500) return respond(res, 422, { success: false, code: 'TEXT_TOO_LONG', error: 'Keep reminder text under 500 characters.' });

      const extracted = await taskExtractionService.extractTask(text);
      if (!extracted.ok) {
        return respond(res, 422, { success: false, code: extracted.code, error: extracted.message });
      }
      return respond(res, 200, { success: true, extraction: extracted });
    }

    // -------------------------------------------------------------------------
    // Action 4: Save (Persistent Write with Explicit Confirmation)
    // -------------------------------------------------------------------------
    if (body.action !== 'save') return respond(res, 400, { success: false, error: 'Use action=parse, action=resolve, action=extract, or action=save.' });
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

    let dueAt = null;
    let schedulingStatus = 'unscheduled';

    // Authoritative date-expression verification: If an un-cleared date expression is submitted,
    // verify it is not ambiguous, incomplete, or unresolved (e.g. AMBIGUOUS_NUMERIC_DATE, MULTIPLE_DATES, INCOMPLETE_TIME)
    if (body.dateExpression && typeof body.dateExpression === 'string' && body.dateExpression.trim()) {
      const refTime = body.referenceTime ? new Date(body.referenceTime) : new Date();
      const exprRes = dateResolutionService.resolveDateExpression(body.dateExpression.trim(), {
        referenceTime: refTime,
        timeZone: timeZone
      });

      // 1. Reject unresolved, incomplete, or clarification states even if ok is true
      if (!exprRes.ok || exprRes.schedulingStatus === 'needs_clarification' || exprRes.schedulingStatus === 'unscheduled') {
        return respond(res, 422, {
          success: false,
          code: exprRes.code || 'UNRESOLVED_DATE_EXPRESSION',
          error: 'The date expression "' + body.dateExpression + '" cannot be saved: ' + (exprRes.message || 'Needs clarification.')
        });
      }

      // Check submitted schedulingStatus if provided
      if (body.schedulingStatus && body.schedulingStatus !== exprRes.schedulingStatus) {
        return respond(res, 422, {
          success: false,
          code: 'SCHEDULE_FIELD_MISMATCH',
          error: `The submitted scheduling status (${body.schedulingStatus}) does not match the resolved status (${exprRes.schedulingStatus}) for "${body.dateExpression}". Submit dateExpression: null for manual calendar overrides.`
        });
      }

      // 2. Validate consistency between submitted calendar fields and the resolved expression
      if (exprRes.schedulingStatus === 'scheduled') {
        if (dateLocal !== exprRes.dateLocal || timeLocal !== exprRes.timeLocal) {
          return respond(res, 422, {
            success: false,
            code: 'SCHEDULE_FIELD_MISMATCH',
            error: `The submitted date (${dateLocal || 'none'}) and time (${timeLocal || 'none'}) do not match the resolved schedule from "${body.dateExpression}" (${exprRes.dateLocal} ${exprRes.timeLocal}). Submit dateExpression: null for manual calendar overrides.`
          });
        }
      } else if (exprRes.schedulingStatus === 'date_only') {
        if (dateLocal !== exprRes.dateLocal || timeLocal !== '') {
          return respond(res, 422, {
            success: false,
            code: 'SCHEDULE_FIELD_MISMATCH',
            error: `The submitted date (${dateLocal}) and time (${timeLocal || 'none'}) do not match the date-only expression "${body.dateExpression}" (${exprRes.dateLocal}). Submit dateExpression: null for manual calendar overrides.`
          });
        }
      } else if (exprRes.schedulingStatus === 'unscheduled') {
        if (dateLocal !== '' || timeLocal !== '') {
          return respond(res, 422, {
            success: false,
            code: 'SCHEDULE_FIELD_MISMATCH',
            error: `The submitted date (${dateLocal}) and time (${timeLocal}) do not match the unscheduled expression "${body.dateExpression}". Submit dateExpression: null for manual calendar overrides.`
          });
        }
      }

      // 3. Validate recurrence consistency
      if (exprRes.recurrence) {
        if (!recurrence || recurrence.unit !== exprRes.recurrence.unit || recurrence.interval !== exprRes.recurrence.interval) {
          return respond(res, 422, {
            success: false,
            code: 'RECURRENCE_MISMATCH',
            error: `The submitted recurrence does not match the recurrence from date expression "${body.dateExpression}".`
          });
        }
      } else if (recurrence) {
        return respond(res, 422, {
          success: false,
          code: 'RECURRENCE_MISMATCH',
          error: `The submitted recurrence does not match the non-recurring date expression "${body.dateExpression}".`
        });
      }
    }

    if (dateLocal && timeLocal) {
      const resolved = resolveLocalDateTime(dateLocal, timeLocal, timeZone);
      if (!resolved.ok) return respond(res, 422, { success: false, code: resolved.code, error: resolved.message });
      if (resolved.epochMs <= Date.now()) return respond(res, 422, { success: false, code: 'TIME_IN_PAST', error: 'Choose a future date and time.' });
      dueAt = resolved.iso;
      schedulingStatus = 'scheduled';
    } else if (dateLocal && !timeLocal) {
      const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateLocal);
      if (!dm) return respond(res, 422, { success: false, code: 'INVALID_DATE', error: 'The selected date is not valid.' });
      const y = Number(dm[1]), m = Number(dm[2]), d = Number(dm[3]);
      const check = new Date(Date.UTC(y, m - 1, d));
      if (y < 1970 || y > 9999 || check.getUTCFullYear() !== y || check.getUTCMonth() + 1 !== m || check.getUTCDate() !== d) {
        return respond(res, 422, { success: false, code: 'INVALID_DATE', error: 'The selected date is not valid.' });
      }
      schedulingStatus = 'date_only';
    } else if (!dateLocal && !timeLocal) {
      schedulingStatus = 'unscheduled';
    } else {
      return respond(res, 422, { success: false, code: 'INCOMPLETE_DATE_TIME', error: 'Choose a date for the scheduled time.' });
    }

    const taskType = typeof body.taskType === 'string' && ['academic', 'work', 'personal', 'health', 'finance', 'general'].includes(body.taskType.toLowerCase())
      ? body.taskType.toLowerCase()
      : 'general';
    const dateExpression = typeof body.dateExpression === 'string' ? body.dateExpression.slice(0, 200) : null;

    const item = {
      id: 'rem_' + crypto.randomUUID(),
      ownerId: session.ownerId,
      title: title,
      taskType: taskType,
      dateExpression: dateExpression,
      schedulingStatus: schedulingStatus,
      dateLocal: dateLocal,
      timeLocal: timeLocal,
      timeZone: timeZone,
      dueAt: dueAt,
      recurrence: recurrence,
      status: 'saved',
      notificationStatus: 'not-configured',
      createdAt: new Date().toISOString()
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
module.exports.getSessionSecret = getSessionSecret;
module.exports.verifySession = verifySession;
module.exports.createSession = createSession;
module.exports.sameOrigin = sameOrigin;
module.exports.MIN_SECRET_LENGTH = MIN_SECRET_LENGTH;
module.exports.taskExtractionService = taskExtractionService;
module.exports.dateResolutionService = dateResolutionService;

