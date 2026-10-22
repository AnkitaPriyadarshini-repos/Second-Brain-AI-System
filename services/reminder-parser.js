'use strict';
const chrono = require('chrono-node');
const RECURRENCE_RE = /\bevery\s+(?:(\d+)\s+)?(day|week|month|year)s?\b|\b(daily|weekly|monthly|yearly|annually)\b/i;
const AMBIGUOUS_DATE_RE = /\b(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})\b/;
const INCOMPLETE_AT_RE = /\b(?:at|around|by)\s+(\d{1,2})(?!\s*(?:am|pm|a\.m\.|p\.m\.|:\d{2}|o'?clock))\b/i;
const INCOMPLETE_AFTER_DATE_RE = /\b(?:today|tomorrow|tonight|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\s+(\d{1,2})\b(?!\s*(?:am|pm|:\d{2}))/i;

function pad(value) { return String(value).padStart(2, '0'); }
function validTimeZone(timeZone) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: timeZone }).format(new Date()); return true; }
  catch (_) { return false; }
}
function zonedParts(epochMs, timeZone) {
  const values = {};
  new Intl.DateTimeFormat('en-GB', {
    timeZone: timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(epochMs)).forEach(function (part) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  });
  return { year: values.year, month: values.month, day: values.day, hour: values.hour, minute: values.minute, second: values.second };
}
function offsetMinutesAt(epochMs, timeZone) {
  const ms = Math.floor(epochMs / 1000) * 1000;
  const p = zonedParts(ms, timeZone);
  return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - ms) / 60000;
}
function sameParts(a, b) {
  return a.year === b.year && a.month === b.month && a.day === b.day &&
    a.hour === b.hour && a.minute === b.minute && a.second === b.second;
}

/* Resolve local wall time against IANA timezone, rejecting DST gaps and overlaps. */
function resolveLocalDateTime(localDate, localTime, timeZone) {
  if (!validTimeZone(timeZone)) return { ok: false, code: 'INVALID_TIME_ZONE', message: 'Choose a valid time zone, such as Asia/Kolkata.' };
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(localDate || ''));
  const tm = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(localTime || ''));
  if (!dm || !tm) return { ok: false, code: 'INCOMPLETE_DATE_TIME', message: 'Choose both a date and a time before saving.' };

  const target = {
    year: Number(dm[1]), month: Number(dm[2]), day: Number(dm[3]),
    hour: Number(tm[1]), minute: Number(tm[2]), second: 0
  };
  const naive = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute, 0);
  const check = new Date(Date.UTC(target.year, target.month - 1, target.day));
  if (target.year < 1970 || target.year > 9999 ||
      check.getUTCFullYear() !== target.year ||
      check.getUTCMonth() + 1 !== target.month ||
      check.getUTCDate() !== target.day) {
    return { ok: false, code: 'INVALID_DATE', message: 'The selected date is not valid.' };
  }

  const offsets = new Set();
  for (let hours = -48; hours <= 48; hours += 3) offsets.add(offsetMinutesAt(naive + hours * 3600000, timeZone));
  const matches = [];
  offsets.forEach(function (offset) {
    const candidate = naive - offset * 60000;
    if (sameParts(zonedParts(candidate, timeZone), target)) matches.push(candidate);
  });
  const unique = Array.from(new Set(matches));
  if (unique.length === 0) return { ok: false, code: 'NONEXISTENT_LOCAL_TIME', message: 'That local time does not exist because of a daylight-saving clock change. Choose another time.' };
  if (unique.length > 1) return { ok: false, code: 'AMBIGUOUS_LOCAL_TIME', message: 'That local time occurs twice because of a daylight-saving clock change. Choose a different time.' };
  return { ok: true, epochMs: unique[0], iso: new Date(unique[0]).toISOString(), localDate: localDate, localTime: localTime, timeZone: timeZone };
}

function parseRecurrence(text) {
  const match = RECURRENCE_RE.exec(text);
  if (!match) return { text: text, recurrence: null };
  let unit;
  let interval = 1;
  if (match[2]) {
    unit = match[2].toLowerCase();
    interval = match[1] ? Number(match[1]) : 1;
  } else {
    const alias = match[3].toLowerCase();
    unit = alias === 'daily' ? 'day' : alias === 'weekly' ? 'week' : alias === 'monthly' ? 'month' : 'year';
  }
  if (!Number.isInteger(interval) || interval < 1 || interval > 99) {
    return { error: { ok: false, code: 'INVALID_RECURRENCE', message: 'Recurrence intervals must be between 1 and 99.' } };
  }
  return {
    text: text.slice(0, match.index) + ' '.repeat(match[0].length) + text.slice(match.index + match[0].length),
    recurrence: { unit: unit, interval: interval }
  };
}
function cleanTitle(value) {
  let title = String(value || '');
  title = title.replace(/^\s*(?:please\s+)?(?:remind\s+me\s+to|remind\s+me|set\s+(?:a\s+)?reminder(?:\s+to)?|create\s+(?:a\s+)?reminder(?:\s+to)?|schedule(?:\s+a\s+reminder)?(?:\s+to)?|don't\s+forget\s+to|remember\s+to|task\s*:\s*)\s*/i, '');
  return title.replace(/\s+(?:on|at|by)\s*$/i, ' ').replace(/^[\s,;:–—-]+|[\s,;:–—-]+$/g, '').replace(/\s+/g, ' ').trim();
}

function parseReminderText(text, options) {
  options = options || {};
  if (typeof text !== 'string' || !text.trim()) return { ok: false, code: 'EMPTY_TEXT', message: 'Enter what you want to be reminded about.' };
  if (text.length > 500) return { ok: false, code: 'TEXT_TOO_LONG', message: 'Keep reminder text under 500 characters.' };
  const timeZone = typeof options.timeZone === 'string' ? options.timeZone.trim() : 'UTC';
  if (!validTimeZone(timeZone)) return { ok: false, code: 'INVALID_TIME_ZONE', message: 'Choose a valid IANA time zone, such as Asia/Kolkata.' };
  const referenceDate = options.referenceTime instanceof Date ? new Date(options.referenceTime.getTime()) : new Date(options.referenceTime || Date.now());
  if (Number.isNaN(referenceDate.getTime())) return { ok: false, code: 'INVALID_REFERENCE_TIME', message: 'The reference time is invalid.' };

  const ambiguous = AMBIGUOUS_DATE_RE.exec(text);
  if (ambiguous) {
    const a = Number(ambiguous[1]), b = Number(ambiguous[2]);
    if (a >= 1 && a <= 12 && b >= 1 && b <= 12 && a !== b) {
      return { ok: false, code: 'AMBIGUOUS_NUMERIC_DATE', message: 'That numeric date can mean two different dates. Write the month name or use YYYY-MM-DD.' };
    }
  }

  const recurrenceResult = parseRecurrence(text);
  if (recurrenceResult.error) return recurrenceResult.error;
  const parseText = recurrenceResult.text;
  const offset = offsetMinutesAt(referenceDate.getTime(), timeZone);
  const results = chrono.parse(parseText, { instant: referenceDate, timezone: offset }, { forwardDate: true });
  if (results.length > 1) return { ok: false, code: 'MULTIPLE_DATES', message: 'I found more than one date or time. Keep one reminder time in the text, or choose the date manually.' };

  const incompleteTime = INCOMPLETE_AT_RE.test(text) || INCOMPLETE_AFTER_DATE_RE.test(text);
  let dateLocal = '', timeLocal = '', dueAt = null, dateMatch = null;
  if (results.length === 1) {
    dateMatch = results[0];
    if (dateMatch.end) return { ok: false, code: 'DATE_RANGE_UNSUPPORTED', message: 'This prototype accepts one reminder time, not a time range. Choose a single date and time.' };
    const component = dateMatch.start;
    const year = component.get('year'), month = component.get('month'), day = component.get('day');
    if (year && month && day) dateLocal = String(year).padStart(4, '0') + '-' + pad(month) + '-' + pad(day);
    if (component.isCertain('hour') && !incompleteTime && dateLocal) {
      const hour = component.get('hour'), minute = component.get('minute');
      if (hour !== null && hour !== undefined) {
        timeLocal = pad(hour) + ':' + pad(minute === null || minute === undefined ? 0 : minute);
        const resolved = resolveLocalDateTime(dateLocal, timeLocal, timeZone);
        if (!resolved.ok) return resolved;
        if (resolved.epochMs <= referenceDate.getTime()) return { ok: false, code: 'TIME_IN_PAST', message: 'That time is in the past. Choose a future date and time.' };
        dueAt = resolved.iso;
      }
    }
  }

  let titleSource = parseText;
  if (dateMatch) titleSource = parseText.slice(0, dateMatch.index) + ' ' + parseText.slice(dateMatch.index + dateMatch.text.length);
  if (incompleteTime) titleSource = titleSource.replace(INCOMPLETE_AT_RE, ' ').replace(INCOMPLETE_AFTER_DATE_RE, ' ');
  const title = cleanTitle(titleSource);
  if (!title) return { ok: false, code: 'MISSING_TITLE', message: 'What should the reminder be about? Add a short task title.' };

  const needs = [];
  if (!dateLocal) needs.push('date');
  if (!timeLocal) needs.push('time');
  let message = 'Review the details below before saving.';
  if (!dateLocal && recurrenceResult.recurrence) message = 'Recurrence recognized. Choose the first date and time before saving.';
  else if (dateLocal && !timeLocal && incompleteTime) message = 'Please specify AM/PM or a 24-hour time, for example 7pm or 19:00.';
  else if (dateLocal && !timeLocal) message = 'Date found. Choose a time; no default time has been assumed.';
  else if (!dateLocal) message = 'No date was assumed. Choose a date and time to complete the reminder.';

  return {
    ok: true, title: title, dateLocal: dateLocal, timeLocal: timeLocal,
    timeZone: timeZone, recurrence: recurrenceResult.recurrence, dueAt: dueAt,
    needs: needs, message: message, referenceTime: referenceDate.toISOString()
  };
}
module.exports = { parseReminderText: parseReminderText, resolveLocalDateTime: resolveLocalDateTime, validTimeZone: validTimeZone };
