'use strict';

/**
 * Milo AI Workspace — ReminderDateResolutionService
 * Pure, deterministic date/time resolution service using chrono-node,
 * an explicit reference instant, and a validated IANA timezone.
 *
 * The AI model extracts raw date expressions; this service is the
 * sole authority for calendar mathematics, wall-time offsets, DST checks,
 * and normalized timestamps.
 */

const chrono = require('chrono-node');

const RECURRENCE_RE = /\bevery\s+(?:(\d+)\s+)?(day|week|month|year)s?\b|\b(daily|weekly|monthly|yearly|annually)\b/i;
const AMBIGUOUS_DATE_RE = /\b(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})\b/;
const INCOMPLETE_AT_RE = /\b(?:at|around|by)\s+(\d{1,2})(?!\s*(?:am|pm|a\.m\.|p\.m\.|:\d{2}|o'?clock))\b/i;
const INCOMPLETE_AFTER_DATE_RE = /\b(?:today|tomorrow|tonight|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\s+(\d{1,2})\b(?!\s*(?:am|pm|:\d{2}))/i;
const BARE_HOUR_STANDALONE_RE = /^\s*(?:at|around|by)?\s*(\d{1,2})\s*$/i;

function pad(value) {
  return String(value).padStart(2, '0');
}

function validTimeZone(timeZone) {
  if (!timeZone || typeof timeZone !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timeZone.trim() }).format(new Date());
    return true;
  } catch (_) {
    return false;
  }
}

function zonedParts(epochMs, timeZone) {
  const values = {};
  new Intl.DateTimeFormat('en-GB', {
    timeZone: timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date(epochMs)).forEach(function (part) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  });
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second
  };
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

/**
 * Resolve local wall time against IANA timezone, rejecting DST gaps and overlaps.
 */
function resolveLocalDateTime(localDate, localTime, timeZone) {
  if (!validTimeZone(timeZone)) {
    return { ok: false, code: 'INVALID_TIME_ZONE', message: 'Choose a valid time zone, such as Asia/Kolkata.' };
  }
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(localDate || ''));
  const tm = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(localTime || ''));
  if (!dm || !tm) {
    return { ok: false, code: 'INCOMPLETE_DATE_TIME', message: 'Choose both a date and a time before saving.' };
  }

  const target = {
    year: Number(dm[1]),
    month: Number(dm[2]),
    day: Number(dm[3]),
    hour: Number(tm[1]),
    minute: Number(tm[2]),
    second: 0
  };
  const naive = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute, 0);
  const check = new Date(Date.UTC(target.year, target.month - 1, target.day));
  if (
    target.year < 1970 ||
    target.year > 9999 ||
    check.getUTCFullYear() !== target.year ||
    check.getUTCMonth() + 1 !== target.month ||
    check.getUTCDate() !== target.day
  ) {
    return { ok: false, code: 'INVALID_DATE', message: 'The selected date is not valid.' };
  }

  const offsets = new Set();
  for (let hours = -48; hours <= 48; hours += 3) {
    offsets.add(offsetMinutesAt(naive + hours * 3600000, timeZone));
  }
  const matches = [];
  offsets.forEach(function (offset) {
    const candidate = naive - offset * 60000;
    if (sameParts(zonedParts(candidate, timeZone), target)) matches.push(candidate);
  });
  const unique = Array.from(new Set(matches));
  if (unique.length === 0) {
    return {
      ok: false,
      code: 'NONEXISTENT_LOCAL_TIME',
      message: 'That local time does not exist because of a daylight-saving clock change. Choose another time.'
    };
  }
  if (unique.length > 1) {
    return {
      ok: false,
      code: 'AMBIGUOUS_LOCAL_TIME',
      message: 'That local time occurs twice because of a daylight-saving clock change. Choose a different time.'
    };
  }
  return {
    ok: true,
    epochMs: unique[0],
    iso: new Date(unique[0]).toISOString(),
    localDate: localDate,
    localTime: localTime,
    timeZone: timeZone
  };
}

function parseRecurrence(text) {
  if (!text || typeof text !== 'string') return { text: '', recurrence: null };
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
    return {
      error: {
        ok: false,
        code: 'INVALID_RECURRENCE',
        message: 'Recurrence intervals must be between 1 and 99.'
      }
    };
  }
  return {
    text: text.slice(0, match.index) + ' '.repeat(match[0].length) + text.slice(match.index + match[0].length),
    recurrence: { unit: unit, interval: interval }
  };
}

class ReminderDateResolutionService {
  constructor() {}

  /**
   * Resolves a raw date/time expression deterministically against an explicit
   * reference instant and validated IANA timezone.
   *
   * @param {string|null} dateExpression - Extracted phrase (e.g. "tomorrow at 7pm", "next Friday", or null)
   * @param {object} options - { referenceTime: Date|string|number, timeZone: string }
   * @returns {object} Standardized resolution result
   */
  resolveDateExpression(dateExpression, options) {
    options = options || {};
    const timeZone = typeof options.timeZone === 'string' ? options.timeZone.trim() : 'UTC';
    if (!validTimeZone(timeZone)) {
      return {
        ok: false,
        code: 'INVALID_TIME_ZONE',
        message: 'Choose a valid IANA time zone, such as Asia/Kolkata.',
        dateExpression: dateExpression || null,
        schedulingStatus: 'needs_clarification',
        dueAt: null,
        dateLocal: '',
        timeLocal: '',
        timeZone: timeZone,
        recurrence: null,
        needs: ['timeZone'],
        dateResolvedBy: 'deterministic_parser',
        requiresConfirmation: true
      };
    }

    const referenceDate = options.referenceTime instanceof Date
      ? new Date(options.referenceTime.getTime())
      : new Date(options.referenceTime != null ? options.referenceTime : Date.now());

    if (Number.isNaN(referenceDate.getTime())) {
      return {
        ok: false,
        code: 'INVALID_REFERENCE_TIME',
        message: 'The reference time is invalid.',
        dateExpression: dateExpression || null,
        schedulingStatus: 'needs_clarification',
        dueAt: null,
        dateLocal: '',
        timeLocal: '',
        timeZone: timeZone,
        recurrence: null,
        needs: ['referenceTime'],
        dateResolvedBy: 'deterministic_parser',
        requiresConfirmation: true
      };
    }

    const referenceIso = referenceDate.toISOString();

    // ----------------------------------------------------
    // Case 1: No date/time stated -> Unscheduled task draft
    // ----------------------------------------------------
    if (!dateExpression || typeof dateExpression !== 'string' || !dateExpression.trim()) {
      return {
        ok: true,
        schedulingStatus: 'unscheduled',
        dateExpression: null,
        dateLocal: '',
        timeLocal: '',
        timeZone: timeZone,
        dueAt: null,
        recurrence: null,
        needs: ['date', 'time'],
        message: 'No schedule specified. Task saved as an unscheduled draft.',
        referenceTime: referenceIso,
        dateResolvedBy: 'deterministic_parser',
        requiresConfirmation: true
      };
    }

    const rawExpr = dateExpression.trim();

    // Check ambiguous numeric date (e.g. 03/04/2027)
    const ambiguous = AMBIGUOUS_DATE_RE.exec(rawExpr);
    if (ambiguous) {
      const a = Number(ambiguous[1]);
      const b = Number(ambiguous[2]);
      if (a >= 1 && a <= 12 && b >= 1 && b <= 12 && a !== b) {
        return {
          ok: false,
          code: 'AMBIGUOUS_NUMERIC_DATE',
          message: 'That numeric date can mean two different dates. Write the month name or use YYYY-MM-DD.',
          dateExpression: rawExpr,
          schedulingStatus: 'needs_clarification',
          dateLocal: '',
          timeLocal: '',
          timeZone: timeZone,
          dueAt: null,
          recurrence: null,
          needs: ['date'],
          referenceTime: referenceIso,
          dateResolvedBy: 'deterministic_parser',
          requiresConfirmation: true
        };
      }
    }

    // Parse recurrence if embedded in the expression
    const recurrenceResult = parseRecurrence(rawExpr);
    if (recurrenceResult.error) {
      return Object.assign({}, recurrenceResult.error, {
        dateExpression: rawExpr,
        schedulingStatus: 'needs_clarification',
        dateLocal: '',
        timeLocal: '',
        timeZone: timeZone,
        dueAt: null,
        recurrence: null,
        needs: ['recurrence'],
        referenceTime: referenceIso,
        dateResolvedBy: 'deterministic_parser',
        requiresConfirmation: true
      });
    }

    const parseText = recurrenceResult.text.trim();

    // Standalone bare hour expression without date (e.g. "at 7" or "7")
    if (BARE_HOUR_STANDALONE_RE.test(parseText) && !/\b(?:today|tomorrow|tonight|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(parseText)) {
      return {
        ok: false,
        code: 'INCOMPLETE_TIME',
        message: 'Please specify AM/PM or a 24-hour time, for example 7pm or 19:00.',
        dateExpression: rawExpr,
        schedulingStatus: 'needs_clarification',
        dateLocal: '',
        timeLocal: '',
        timeZone: timeZone,
        dueAt: null,
        recurrence: recurrenceResult.recurrence,
        needs: ['time'],
        referenceTime: referenceIso,
        dateResolvedBy: 'deterministic_parser',
        requiresConfirmation: true
      };
    }

    const incompleteTime = INCOMPLETE_AT_RE.test(rawExpr) || INCOMPLETE_AFTER_DATE_RE.test(rawExpr);

    const offset = offsetMinutesAt(referenceDate.getTime(), timeZone);
    const results = chrono.parse(parseText, { instant: referenceDate, timezone: offset }, { forwardDate: true });

    if (results.length === 0) {
      if (recurrenceResult.recurrence) {
        return {
          ok: true,
          schedulingStatus: 'needs_clarification',
          dateExpression: rawExpr,
          dateLocal: '',
          timeLocal: '',
          timeZone: timeZone,
          recurrence: recurrenceResult.recurrence,
          dueAt: null,
          needs: ['date', 'time'],
          message: 'Recurrence recognized. Choose the first date and time before saving.',
          referenceTime: referenceIso,
          dateResolvedBy: 'deterministic_parser',
          requiresConfirmation: true
        };
      }
      return {
        ok: false,
        code: 'UNRECOGNIZED_DATE_EXPRESSION',
        message: 'Could not recognize the date/time expression. Check the schedule wording or enter the date manually.',
        dateExpression: rawExpr,
        schedulingStatus: 'needs_clarification',
        dateLocal: '',
        timeLocal: '',
        timeZone: timeZone,
        dueAt: null,
        recurrence: null,
        needs: ['date', 'time'],
        referenceTime: referenceIso,
        dateResolvedBy: 'deterministic_parser',
        requiresConfirmation: true
      };
    }

    if (results.length > 1) {
      return {
        ok: false,
        code: 'MULTIPLE_DATES',
        message: 'I found more than one date or time. Keep one reminder time in the text, or choose the date manually.',
        dateExpression: rawExpr,
        schedulingStatus: 'needs_clarification',
        dateLocal: '',
        timeLocal: '',
        timeZone: timeZone,
        dueAt: null,
        recurrence: recurrenceResult.recurrence,
        needs: ['date', 'time'],
        referenceTime: referenceIso,
        dateResolvedBy: 'deterministic_parser',
        requiresConfirmation: true
      };
    }

    const dateMatch = results[0];
    if (dateMatch.end) {
      return {
        ok: false,
        code: 'DATE_RANGE_UNSUPPORTED',
        message: 'This prototype accepts one reminder time, not a time range. Choose a single date and time.',
        dateExpression: rawExpr,
        schedulingStatus: 'needs_clarification',
        dateLocal: '',
        timeLocal: '',
        timeZone: timeZone,
        dueAt: null,
        recurrence: recurrenceResult.recurrence,
        needs: ['date', 'time'],
        referenceTime: referenceIso,
        dateResolvedBy: 'deterministic_parser',
        requiresConfirmation: true
      };
    }

    const component = dateMatch.start;
    const year = component.get('year');
    const month = component.get('month');
    const day = component.get('day');

    let dateLocal = '';
    let timeLocal = '';
    let dueAt = null;
    let schedulingStatus = 'unscheduled';
    const needs = [];
    let message = 'Review the details below before saving.';

    if (year && month && day) {
      dateLocal = String(year).padStart(4, '0') + '-' + pad(month) + '-' + pad(day);
    }

    if (component.isCertain('hour') && !incompleteTime && dateLocal) {
      const hour = component.get('hour');
      const minute = component.get('minute');
      if (hour !== null && hour !== undefined) {
        timeLocal = pad(hour) + ':' + pad(minute === null || minute === undefined ? 0 : minute);
        const resolved = resolveLocalDateTime(dateLocal, timeLocal, timeZone);
        if (!resolved.ok) {
          return Object.assign({}, resolved, {
            dateExpression: rawExpr,
            schedulingStatus: 'needs_clarification',
            dateLocal: dateLocal,
            timeLocal: timeLocal,
            timeZone: timeZone,
            dueAt: null,
            recurrence: recurrenceResult.recurrence,
            needs: ['time'],
            referenceTime: referenceIso,
            dateResolvedBy: 'deterministic_parser',
            requiresConfirmation: true
          });
        }
        if (resolved.epochMs <= referenceDate.getTime()) {
          return {
            ok: false,
            code: 'TIME_IN_PAST',
            message: 'That time is in the past. Choose a future date and time.',
            dateExpression: rawExpr,
            schedulingStatus: 'needs_clarification',
            dateLocal: dateLocal,
            timeLocal: timeLocal,
            timeZone: timeZone,
            dueAt: null,
            recurrence: recurrenceResult.recurrence,
            needs: ['date', 'time'],
            referenceTime: referenceIso,
            dateResolvedBy: 'deterministic_parser',
            requiresConfirmation: true
          };
        }
        dueAt = resolved.iso;
        schedulingStatus = 'scheduled';
        message = 'Scheduled time resolved successfully.';
      }
    } else if (dateLocal && incompleteTime) {
      timeLocal = '';
      schedulingStatus = 'needs_clarification';
      needs.push('time');
      message = 'Please specify AM/PM or a 24-hour time, for example 7pm or 19:00.';
    } else if (dateLocal) {
      timeLocal = '';
      schedulingStatus = 'date_only';
      needs.push('time');
      message = 'Date found. Choose a time; no default time has been assumed.';
    } else {
      needs.push('date', 'time');
      schedulingStatus = 'unscheduled';
      message = 'No date was assumed. Choose a date and time to complete the reminder.';
    }

    const resultPayload = {
      ok: true,
      schedulingStatus: schedulingStatus,
      dateExpression: rawExpr,
      dateLocal: dateLocal,
      timeLocal: timeLocal,
      timeZone: timeZone,
      recurrence: recurrenceResult.recurrence,
      dueAt: dueAt,
      needs: needs,
      message: message,
      referenceTime: referenceIso,
      dateResolvedBy: 'deterministic_parser',
      requiresConfirmation: true
    };
    if (schedulingStatus === 'needs_clarification') {
      resultPayload.code = incompleteTime ? 'INCOMPLETE_TIME' : (recurrenceResult.recurrence && !dateLocal ? 'RECURRENCE_NEEDS_DATE' : 'UNRESOLVED_DATE_EXPRESSION');
    }

    return resultPayload;
  }
}

module.exports = ReminderDateResolutionService;
module.exports.default = ReminderDateResolutionService;
module.exports.resolveLocalDateTime = resolveLocalDateTime;
module.exports.validTimeZone = validTimeZone;
module.exports.parseRecurrence = parseRecurrence;
