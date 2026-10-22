(function () {
  'use strict';

  const state = {
    persistenceConfigured: false,
    draft: null,
    reminders: [],
    loading: false,
    resolving: false,
    scheduleValid: true,
    activeRequestId: 0,
    manualCalendarEdit: false
  };
  const byId = function (id) { return document.getElementById(id); };

  function defaultTimeZone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
    catch (_) { return 'UTC'; }
  }

  function setNotice(message, tone) {
    const node = byId('reminder-notice');
    if (!node) return;
    node.textContent = message || '';
    node.className = 'milo-reminder-notice' + (tone ? ' is-' + tone : '');
    node.style.display = message ? 'block' : 'none';
  }

  function setStorageStatus(message, ready) {
    const node = byId('reminder-storage-status');
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('is-ready', Boolean(ready));
    node.classList.toggle('is-unavailable', !ready);
  }

  async function apiRequest(method, body, query) {
    let url = '/api/reminders';
    if (query) url += '?' + new URLSearchParams(query).toString();
    const options = { method: method, credentials: 'same-origin', cache: 'no-store' };
    options.headers = { Accept: 'application/json' };
    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    const response = await fetch(url, options);
    const payload = await response.json().catch(function () { return {}; });
    if (!response.ok || payload.success !== true) {
      const error = new Error(payload.error || 'Reminder request failed (HTTP ' + response.status + ').');
      error.status = response.status;
      error.code = payload.code;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function recurrenceLabel(value) {
    if (!value) return 'Does not repeat';
    const names = { day: 'day', week: 'week', month: 'month', year: 'year' };
    const interval = Number(value.interval) || 1;
    return 'Every ' + (interval === 1 ? '' : interval + ' ') + names[value.unit] + (interval === 1 ? '' : 's');
  }

  function formatWhen(item) {
    if (item.dueAt) {
      try {
        return new Intl.DateTimeFormat(undefined, {
          timeZone: item.timeZone, dateStyle: 'medium', timeStyle: 'short'
        }).format(new Date(item.dueAt)) + ' · ' + item.timeZone;
      } catch (_) {
        return item.dateLocal + ' ' + item.timeLocal + ' · ' + item.timeZone;
      }
    }
    if (item.dateLocal) {
      return item.dateLocal + ' (Date only) · ' + item.timeZone;
    }
    return 'Unscheduled · ' + item.timeZone;
  }

  function renderSavedReminders() {
    const container = byId('reminder-list');
    const empty = byId('reminder-empty-state');
    if (!container || !empty) return;
    container.replaceChildren();

    if (!state.reminders.length) {
      empty.style.display = 'block';
      empty.textContent = state.persistenceConfigured
        ? 'No saved reminders yet. Preview a phrase above to get started.'
        : 'Saved reminders will appear here after secure storage is configured.';
      return;
    }

    empty.style.display = 'none';
    state.reminders.forEach(function (item) {
      const card = document.createElement('article');
      card.className = 'milo-reminder-saved-card';

      const copy = document.createElement('div');
      copy.className = 'milo-reminder-saved-copy';
      const title = document.createElement('h3');
      title.textContent = item.title;
      const when = document.createElement('p');
      when.textContent = formatWhen(item);
      const repeat = document.createElement('p');
      repeat.textContent = recurrenceLabel(item.recurrence);
      const status = document.createElement('span');
      status.className = 'milo-reminder-status-pill';
      status.textContent = item.schedulingStatus === 'date_only' ? 'Saved · Date only' : 'Saved · Notifications off';
      copy.append(title, when, repeat, status);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'milo-reminder-delete';
      remove.textContent = 'Delete';
      remove.setAttribute('aria-label', 'Delete reminder ' + item.title);
      remove.addEventListener('click', async function () {
        if (!window.confirm('Delete this saved reminder?')) return;
        remove.disabled = true;
        try {
          await apiRequest('DELETE', { id: item.id });
          state.reminders = state.reminders.filter(function (other) { return other.id !== item.id; });
          renderSavedReminders();
          setNotice('Reminder deleted. No notification was sent.', 'success');
        } catch (error) {
          setNotice(error.message, 'error');
          remove.disabled = false;
        }
      });
      card.append(copy, remove);
      container.appendChild(card);
    });
  }

  function readRecurrence() {
    const unit = byId('reminder-recurrence').value;
    if (unit === 'none') return null;
    return { unit: unit, interval: Number(byId('reminder-recurrence-interval').value || 1) };
  }

  function capitalize(str) {
    if (!str || typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function validateDraft() {
    const title = byId('reminder-title').value.trim();
    const date = byId('reminder-date').value;
    const time = byId('reminder-time').value;
    const zone = byId('reminder-time-zone').value.trim();
    const catSelect = byId('reminder-category');
    const category = catSelect ? catSelect.value : 'general';

    let validZone = false;
    try { new Intl.DateTimeFormat('en-US', { timeZone: zone }).format(new Date()); validZone = true; }
    catch (_) {}
    const repeat = readRecurrence();
    const interval = Number(byId('reminder-recurrence-interval').value);

    // Update title and classification previews immediately without re-parsing
    byId('reminder-preview-title').textContent = title || 'Add a task title';
    const catPreview = byId('reminder-preview-category');
    if (catPreview) catPreview.textContent = capitalize(category);

    // Compute and display scheduling status
    let statusText = 'Unscheduled';
    let statusClass = 'status-unscheduled';
    let whenText = 'Unscheduled draft (no date/time)';

    if (state.resolving) {
      statusText = 'Resolving…';
      statusClass = 'status-needs-clarification';
      whenText = 'Re-resolving schedule for ' + zone + '…';
    } else if (!state.scheduleValid) {
      statusText = 'Needs clarification';
      statusClass = 'status-needs-clarification';
      whenText = 'Correct the date expression or enter date/time manually.';
    } else if (date && time && validZone) {
      statusText = 'Scheduled';
      statusClass = 'status-scheduled';
      whenText = date + ' · ' + time + ' · ' + zone;
    } else if (date && !time && /^\d{4}-\d{2}-\d{2}$/.test(date) && validZone) {
      statusText = 'Date only';
      statusClass = 'status-date-only';
      whenText = date + ' · (No specific time) · ' + zone;
    } else if (!date && !time) {
      statusText = 'Unscheduled draft';
      statusClass = 'status-unscheduled';
      whenText = 'Unscheduled draft (no date/time set)';
    } else {
      statusText = 'Needs clarification';
      statusClass = 'status-needs-clarification';
      whenText = 'Choose both a date and a time, or clear the time for a date-only task.';
    }

    const statusBadge = byId('reminder-preview-status');
    if (statusBadge) {
      statusBadge.textContent = statusText;
      statusBadge.className = 'milo-reminder-preview-value milo-reminder-status-pill ' + statusClass;
    }

    byId('reminder-preview-when').textContent = whenText;
    byId('reminder-preview-repeat').textContent = recurrenceLabel(repeat);

    const dateValid = (
      (!date && !time) ||
      (date && !time && /^\d{4}-\d{2}-\d{2}$/.test(date)) ||
      (date && time && /^\d{4}-\d{2}-\d{2}$/.test(date) && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))
    );

    const valid = Boolean(
      state.draft &&
      title &&
      title.length <= 180 &&
      validZone &&
      dateValid &&
      state.scheduleValid &&
      !state.resolving &&
      (!repeat || (Number.isInteger(interval) && interval >= 1 && interval <= 99))
    );

    const save = byId('reminder-save-btn');
    if (save) save.disabled = !valid || !state.persistenceConfigured || state.loading || state.resolving;
    byId('reminder-recurrence-interval').disabled = byId('reminder-recurrence').value === 'none';
  }

  function applyDraft(draft, persistenceConfigured) {
    state.draft = draft;
    state.persistenceConfigured = Boolean(persistenceConfigured);
    state.resolving = false;
    state.manualCalendarEdit = false;
    state.scheduleValid = draft.schedulingStatus !== 'needs_clarification';

    byId('reminder-preview-card').style.display = 'block';

    byId('reminder-title').value = draft.title || '';
    if (byId('reminder-category')) {
      byId('reminder-category').value = draft.taskType || draft.taskClassification || 'general';
    }
    if (byId('reminder-date-expression-input')) {
      byId('reminder-date-expression-input').value = draft.dateExpression || '';
    }
    if (byId('reminder-preview-date-expression')) {
      byId('reminder-preview-date-expression').textContent = draft.dateExpression || 'None (unscheduled)';
    }

    byId('reminder-date').value = draft.dateLocal || '';
    byId('reminder-time').value = draft.timeLocal || '';
    byId('reminder-time-zone').value = draft.timeZone || defaultTimeZone();
    byId('reminder-recurrence').value = draft.recurrence ? draft.recurrence.unit : 'none';
    byId('reminder-recurrence-interval').value = draft.recurrence ? draft.recurrence.interval : 1;
    byId('reminder-parse-summary').textContent = draft.message || 'Review and edit the details before saving.';

    const resolverLine = byId('reminder-preview-resolver');
    if (resolverLine) {
      const resolverName = draft.dateResolvedBy === 'deterministic_parser' ? 'Deterministic parser' : 'Rule-based parser';
      const refFormatted = draft.referenceTime ? ' · Ref: ' + draft.referenceTime.slice(0, 19).replace('T', ' ') + 'Z' : '';
      resolverLine.textContent = resolverName + refFormatted;
    }

    if (!state.persistenceConfigured) {
      setStorageStatus('Preview only: secure reminder storage is not configured. Nothing can be saved yet.', false);
      setNotice('The date preview is ready. Complete any missing fields. Saving stays disabled until secure storage is configured.', 'warning');
    } else {
      setStorageStatus('Secure storage is available. Review the details before confirming.', true);
      setNotice(draft.message || 'Review the details before saving.', 'info');
    }
    validateDraft();
  }

  async function reResolveSchedule() {
    if (!state.draft) return;
    const dateExprInput = byId('reminder-date-expression-input');
    const expr = dateExprInput ? dateExprInput.value.trim() : '';
    const zone = byId('reminder-time-zone').value.trim() || defaultTimeZone();
    const refTime = state.draft.referenceTime || new Date().toISOString();

    const requestId = ++state.activeRequestId;
    state.resolving = true;
    state.scheduleValid = false;
    state.manualCalendarEdit = false;

    // Immediately clear date and time fields to prevent stale schedule persistence
    byId('reminder-date').value = '';
    byId('reminder-time').value = '';
    state.draft.dateLocal = '';
    state.draft.timeLocal = '';
    state.draft.dueAt = null;
    state.draft.schedulingStatus = 'needs_clarification';

    if (byId('reminder-preview-date-expression')) {
      byId('reminder-preview-date-expression').textContent = expr || 'None (unscheduled)';
    }
    byId('reminder-parse-summary').textContent = 'Re-resolving schedule for ' + zone + '…';

    setNotice('Re-resolving schedule for ' + zone + '…', 'info');
    validateDraft();

    try {
      const data = await apiRequest('POST', {
        action: 'resolve',
        dateExpression: expr || null,
        timeZone: zone,
        referenceTime: refTime
      });

      // Guard against race conditions: only apply if this is still the active request
      if (requestId !== state.activeRequestId) return;

      state.resolving = false;
      if (data.draft) {
        state.draft.dateExpression = data.draft.dateExpression;
        state.draft.dateLocal = data.draft.dateLocal || '';
        state.draft.timeLocal = data.draft.timeLocal || '';
        state.draft.dueAt = data.draft.dueAt || null;
        state.draft.schedulingStatus = data.draft.schedulingStatus;
        state.draft.needs = data.draft.needs;
        state.draft.message = data.draft.message;

        state.scheduleValid = data.draft.schedulingStatus !== 'needs_clarification';

        byId('reminder-date').value = data.draft.dateLocal || '';
        byId('reminder-time').value = data.draft.timeLocal || '';
        if (byId('reminder-preview-date-expression')) {
          byId('reminder-preview-date-expression').textContent = data.draft.dateExpression || 'None (unscheduled)';
        }
        byId('reminder-parse-summary').textContent = data.draft.message || 'Review and edit the details before saving.';
        if (data.draft.recurrence) {
          byId('reminder-recurrence').value = data.draft.recurrence.unit;
          byId('reminder-recurrence-interval').value = data.draft.recurrence.interval;
        }

        const resolverLine = byId('reminder-preview-resolver');
        if (resolverLine) {
          resolverLine.textContent = 'Deterministic parser · Ref: ' + refTime.slice(0, 19).replace('T', ' ') + 'Z';
        }

        setNotice(data.draft.message || 'Schedule updated.', 'info');
        validateDraft();
      }
    } catch (err) {
      // Guard against race conditions
      if (requestId !== state.activeRequestId) return;

      state.resolving = false;
      state.scheduleValid = false;
      state.draft.dueAt = null;
      state.draft.dateLocal = '';
      state.draft.timeLocal = '';
      state.draft.schedulingStatus = 'needs_clarification';
      state.draft.message = err.message;

      byId('reminder-date').value = '';
      byId('reminder-time').value = '';
      byId('reminder-parse-summary').textContent = err.message || 'Needs clarification.';

      setNotice(err.message, 'error');
      validateDraft();
    }
  }

  function handleManualCalendarEdit() {
    if (!state.draft) return;
    const dateVal = byId('reminder-date').value;
    const timeVal = byId('reminder-time').value;

    state.manualCalendarEdit = true;
    state.resolving = false;

    // Check validity of manual entry
    const validDate = !dateVal || /^\d{4}-\d{2}-\d{2}$/.test(dateVal);
    const validTime = !timeVal || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(timeVal);

    if (validDate && validTime) {
      state.scheduleValid = true;
      state.draft.dateLocal = dateVal;
      state.draft.timeLocal = timeVal;
      state.draft.schedulingStatus = (dateVal && timeVal) ? 'scheduled' : (dateVal ? 'date_only' : 'unscheduled');
      const resolverLine = byId('reminder-preview-resolver');
      if (resolverLine) {
        resolverLine.textContent = 'Manual calendar entry';
      }
    } else {
      state.scheduleValid = false;
    }
    validateDraft();
  }

  async function loadSavedReminders() {
    try {
      const data = await apiRequest('GET', undefined, { action: 'list' });
      state.persistenceConfigured = data.persistenceConfigured === true;
      state.reminders = Array.isArray(data.reminders) ? data.reminders : [];
      setStorageStatus('Secure reminder storage is available. Notifications are not configured.', true);
      renderSavedReminders();
    } catch (error) {
      state.persistenceConfigured = false;
      state.reminders = [];
      setStorageStatus(
        error.code === 'REMINDER_STORE_NOT_CONFIGURED'
          ? 'Secure reminder storage is not configured. You can preview dates, but reminders cannot be saved.'
          : 'Saved reminders are unavailable until secure storage and a reminder session are configured.',
        false
      );
      renderSavedReminders();
    }
    if (state.draft) validateDraft();
  }

  async function previewReminder(event) {
    event.preventDefault();
    const text = byId('reminder-input').value.trim();
    const timeZone = byId('reminder-time-zone-input').value.trim() || defaultTimeZone();
    const button = byId('reminder-preview-btn');
    button.disabled = true;
    button.textContent = 'Parsing…';
    setNotice('Resolving the date and time for ' + timeZone + '…', 'info');

    const requestId = ++state.activeRequestId;

    try {
      const data = await apiRequest('POST', { action: 'parse', text: text, timeZone: timeZone });
      // Protect against stale asynchronous responses overwriting newer user requests
      if (requestId !== state.activeRequestId) return;
      applyDraft(data.draft, data.persistenceConfigured);
    } catch (error) {
      if (requestId !== state.activeRequestId) return;
      if (error.code === 'MULTIPLE_DATE_EXPRESSIONS') {
        const candidateText = Array.isArray(error.payload && error.payload.candidateExpressions)
          ? error.payload.candidateExpressions.join(', ')
          : '';
        const summaryMsg = error.message + (candidateText ? ' (Found: ' + candidateText + ')' : '');
        const clarificationDraft = {
          title: (error.payload && error.payload.title) || text,
          taskType: (error.payload && error.payload.taskType) || 'general',
          dateExpression: candidateText || null,
          schedulingStatus: 'needs_clarification',
          dateLocal: '',
          timeLocal: '',
          timeZone: timeZone,
          recurrence: null,
          dueAt: null,
          message: summaryMsg,
          dateResolvedBy: 'deterministic_parser'
        };
        applyDraft(clarificationDraft, state.persistenceConfigured);
        setNotice(error.message, 'warning');
      } else {
        state.draft = null;
        byId('reminder-preview-card').style.display = 'none';
        setNotice(error.message, 'error');
      }
    } finally {
      if (requestId === state.activeRequestId) {
        button.disabled = false;
        button.textContent = 'Preview reminder';
      }
    }
  }

  async function saveReminder() {
    if (!state.draft || !state.persistenceConfigured || state.loading || state.resolving || !state.scheduleValid) return;
    const button = byId('reminder-save-btn');
    state.loading = true;
    validateDraft();
    button.textContent = 'Saving…';
    setNotice('Saving confirmed reminder…', 'info');

    const catSelect = byId('reminder-category');
    const taskType = catSelect ? catSelect.value : (state.draft.taskType || 'general');
    const exprInput = byId('reminder-date-expression-input');
    const dateExpression = state.manualCalendarEdit ? null : (exprInput ? exprInput.value.trim() : (state.draft.dateExpression || null));

    try {
      const data = await apiRequest('POST', {
        action: 'save',
        confirmed: true,
        title: byId('reminder-title').value.trim(),
        taskType: taskType,
        dateExpression: dateExpression || null,
        dateLocal: byId('reminder-date').value,
        timeLocal: byId('reminder-time').value,
        timeZone: byId('reminder-time-zone').value.trim(),
        recurrence: readRecurrence(),
        referenceTime: state.draft ? (state.draft.referenceTime || null) : null
      });
      state.reminders.push(data.reminder);
      state.reminders.sort(function (a, b) {
        if (!a.dueAt && !b.dueAt) return String(a.createdAt).localeCompare(String(b.createdAt));
        if (!a.dueAt) return 1;
        if (!b.dueAt) return -1;
        return String(a.dueAt).localeCompare(String(b.dueAt));
      });
      renderSavedReminders();
      setNotice('Reminder saved. Notifications are not configured, so Milo will not send an alert.', 'success');
      state.draft = null;
      byId('reminder-preview-card').style.display = 'none';
    } catch (error) {
      setNotice(error.message, 'error');
    } finally {
      state.loading = false;
      button.textContent = 'Confirm & save reminder';
      validateDraft();
    }
  }

  function init() {
    if (!byId('view-reminders') || !byId('reminder-form')) return;
    const zone = defaultTimeZone();
    byId('reminder-time-zone-input').value = zone;
    byId('reminder-time-zone').value = zone;
    byId('reminder-form').addEventListener('submit', previewReminder);
    byId('reminder-save-btn').addEventListener('click', saveReminder);

    // Title editing is separated: input/change events only update the client review card instantaneously
    byId('reminder-title').addEventListener('input', validateDraft);
    byId('reminder-title').addEventListener('change', validateDraft);

    // Classification changes update the preview badge instantaneously
    if (byId('reminder-category')) {
      byId('reminder-category').addEventListener('change', validateDraft);
    }

    // Date phrase edits and time-zone edits trigger deterministic schedule re-resolution
    if (byId('reminder-date-expression-input')) {
      byId('reminder-date-expression-input').addEventListener('change', reResolveSchedule);
    }
    byId('reminder-time-zone').addEventListener('change', reResolveSchedule);

    // Direct calendar edits validate draft without re-running NLP
    ['reminder-date', 'reminder-time'].forEach(function (id) {
      const el = byId(id);
      if (el) {
        el.addEventListener('input', handleManualCalendarEdit);
        el.addEventListener('change', handleManualCalendarEdit);
      }
    });

    ['reminder-recurrence', 'reminder-recurrence-interval'].forEach(function (id) {
      const el = byId(id);
      if (el) {
        el.addEventListener('input', validateDraft);
        el.addEventListener('change', validateDraft);
      }
    });

    document.querySelectorAll('[data-reminder-example]').forEach(function (button) {
      button.addEventListener('click', function () {
        byId('reminder-input').value = button.getAttribute('data-reminder-example') || '';
        byId('reminder-input').focus();
      });
    });
    loadSavedReminders();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
