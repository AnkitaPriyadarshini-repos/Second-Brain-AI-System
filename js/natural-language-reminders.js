(function () {
  'use strict';

  const state = { persistenceConfigured: false, draft: null, reminders: [], loading: false };
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
    try {
      return new Intl.DateTimeFormat(undefined, {
        timeZone: item.timeZone, dateStyle: 'medium', timeStyle: 'short'
      }).format(new Date(item.dueAt)) + ' · ' + item.timeZone;
    } catch (_) {
      return item.dateLocal + ' ' + item.timeLocal + ' · ' + item.timeZone;
    }
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
      status.textContent = 'Saved · Notifications off';
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

  function validateDraft() {
    const title = byId('reminder-title').value.trim();
    const date = byId('reminder-date').value;
    const time = byId('reminder-time').value;
    const zone = byId('reminder-time-zone').value.trim();
    let validZone = false;
    try { new Intl.DateTimeFormat('en-US', { timeZone: zone }).format(new Date()); validZone = true; }
    catch (_) {}
    const repeat = readRecurrence();
    const interval = Number(byId('reminder-recurrence-interval').value);
    const valid = Boolean(state.draft && title && title.length <= 180 &&
      /^\d{4}-\d{2}-\d{2}$/.test(date) && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) &&
      validZone && (!repeat || (Number.isInteger(interval) && interval >= 1 && interval <= 99)));
    const save = byId('reminder-save-btn');
    if (save) save.disabled = !valid || !state.persistenceConfigured || state.loading;
    byId('reminder-recurrence-interval').disabled = byId('reminder-recurrence').value === 'none';

    byId('reminder-preview-title').textContent = title || 'Add a task title';
    byId('reminder-preview-when').textContent = date && time && validZone
      ? date + ' · ' + time + ' · ' + zone
      : 'Choose both a date and a time to complete the preview.';
    byId('reminder-preview-repeat').textContent = recurrenceLabel(repeat);
  }

  function applyDraft(draft, persistenceConfigured) {
    state.draft = draft;
    state.persistenceConfigured = Boolean(persistenceConfigured);
    byId('reminder-preview-card').style.display = 'block';
    byId('reminder-title').value = draft.title || '';
    byId('reminder-date').value = draft.dateLocal || '';
    byId('reminder-time').value = draft.timeLocal || '';
    byId('reminder-time-zone').value = draft.timeZone || defaultTimeZone();
    byId('reminder-recurrence').value = draft.recurrence ? draft.recurrence.unit : 'none';
    byId('reminder-recurrence-interval').value = draft.recurrence ? draft.recurrence.interval : 1;
    byId('reminder-parse-summary').textContent = draft.message || 'Review and edit the details before saving.';
    if (!state.persistenceConfigured) {
      setStorageStatus('Preview only: secure reminder storage is not configured. Nothing can be saved yet.', false);
      setNotice('The date preview is ready. Complete any missing fields. Saving stays disabled until secure storage is configured.', 'warning');
    } else {
      setStorageStatus('Secure storage is available. Review the details before confirming.', true);
      setNotice(draft.message || 'Review the details before saving.', 'info');
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

    try {
      const data = await apiRequest('POST', { action: 'parse', text: text, timeZone: timeZone });
      applyDraft(data.draft, data.persistenceConfigured);
    } catch (error) {
      state.draft = null;
      byId('reminder-preview-card').style.display = 'none';
      setNotice(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Preview reminder';
    }
  }

  async function saveReminder() {
    if (!state.draft || !state.persistenceConfigured || state.loading) return;
    const button = byId('reminder-save-btn');
    state.loading = true;
    validateDraft();
    button.textContent = 'Saving…';
    setNotice('Saving confirmed reminder…', 'info');
    try {
      const data = await apiRequest('POST', {
        action: 'save',
        confirmed: true,
        title: byId('reminder-title').value.trim(),
        dateLocal: byId('reminder-date').value,
        timeLocal: byId('reminder-time').value,
        timeZone: byId('reminder-time-zone').value.trim(),
        recurrence: readRecurrence()
      });
      state.reminders.push(data.reminder);
      state.reminders.sort(function (a, b) { return String(a.dueAt).localeCompare(String(b.dueAt)); });
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

    ['reminder-title', 'reminder-date', 'reminder-time', 'reminder-time-zone',
      'reminder-recurrence', 'reminder-recurrence-interval'].forEach(function (id) {
      byId(id).addEventListener('input', validateDraft);
      byId(id).addEventListener('change', validateDraft);
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