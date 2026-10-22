/**
 * Milo AI Workspace — Real Browser Reminders & Multi-View E2E Regression Gate
 *
 * Uses Headless Chrome CDP to execute authentic browser-level user workflows:
 * - Desktop (1280x950) and Mobile (375x812) viewports
 * - Screen navigation between all core views (jarvis, vault, goals, agents, resurfacing, flashcards, reminders)
 * - Repeated switching without state corruption
 * - Reminder parsing, preview card rendering, live draft editing
 * - Incomplete time & ambiguous date validation feedback in real DOM
 * - Fail-closed storage behavior when Redis is unconfigured
 * - Console error monitoring across all interactions
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const express = require('express');
const WebSocket = require('ws');

const reminderHandler = require('../api/reminders');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(__dirname, '..', 'scratch', 'cdp_browser_reminders_' + Date.now());
const cdpPort = 9489;
const httpPort = 3788;

console.log('====================================================');
console.log('🌐 MILO REAL BROWSER REMINDERS & VIEWS E2E GATE');
console.log('====================================================\n');

function waitForHttp(port, maxAttempts = 30) {
  return new Promise(async (resolve, reject) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await new Promise((resHttp, rejHttp) => {
          http.get(`http://127.0.0.1:${port}/json`, (r) => {
            let data = '';
            r.on('data', chunk => data += chunk);
            r.on('end', () => {
              try { resHttp(JSON.parse(data)); } catch (e) { rejHttp(e); }
            });
          }).on('error', rejHttp);
        });
        if (res && res.length > 0) return resolve(res);
      } catch (e) {
        await new Promise(r => setTimeout(r, 300));
      }
    }
    reject(new Error(`Chrome CDP failed to start on port ${port}`));
  });
}

async function runBrowserRemindersTests() {
  const app = express();
  app.use(express.json());

  // Mount reminders endpoint with real api/reminders handler
  app.all('/api/reminders', (req, res) => {
    return reminderHandler(req, res);
  });

  // Health and fallback endpoints
  app.get('/api/ai/health', (req, res) => {
    res.json({ ok: true, service: 'milo-ai-gateway', timestamp: new Date().toISOString() });
  });

  app.use(express.static(path.join(__dirname, '..')));

  const server = app.listen(httpPort);
  console.log(`Local test webserver listening on http://127.0.0.1:${httpPort}`);

  if (!fs.existsSync(chromePath)) {
    console.warn(`[SKIP] Chrome executable not found at ${chromePath}.`);
    server.close();
    return;
  }

  const chromeProcess = spawn(chromePath, [
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,950',
    'about:blank'
  ]);

  try {
    const targets = await waitForHttp(cdpPort);
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise(r => ws.on('open', r));

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const handler = (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.id === id) {
            ws.off('message', handler);
            if (msg.error) reject(msg.error);
            else resolve(msg.result);
          }
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    const consoleErrors = [];
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
          const text = (msg.params.args || []).map(a => a.value || a.description || '').join(' ');
          // Ignore expected 503 network errors for unconfigured services in test
          if (!text.includes('503') && !text.includes('REMINDER_STORE_NOT_CONFIGURED')) {
            consoleErrors.push(text);
          }
        }
      } catch (_) {}
    });

    await send('Page.enable');
    await send('Runtime.enable');

    console.log(`Navigating to http://127.0.0.1:${httpPort}/index.html...`);
    await send('Page.navigate', { url: `http://127.0.0.1:${httpPort}/index.html` });
    await new Promise(r => setTimeout(r, 2500));

    async function evalPage(fnStr) {
      const res = await send('Runtime.evaluate', {
        expression: `(${fnStr})()`,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        const desc = res.exceptionDetails.exception?.description || res.exceptionDetails.text || 'Unknown eval error';
        throw new Error(desc);
      }
      return res.result?.value;
    }

    // ----------------------------------------------------
    // Test 1: Navigation across core screens
    // ----------------------------------------------------
    console.log('Test 1: Core Screen Navigation');
    const viewsToTest = [
      { view: 'vault', id: 'view-vault' },
      { view: 'goals', id: 'view-goals' },
      { view: 'resurfacing', id: 'view-resurfacing' },
      { view: 'flashcards', id: 'view-flashcards' },
      { view: 'reminders', id: 'view-reminders' },
      { view: 'jarvis', id: 'view-jarvis' }
    ];

    for (const item of viewsToTest) {
      const activeId = await evalPage(`() => {
        window.activateView('${item.view}');
        const activeSection = document.querySelector('.view-section.active');
        return activeSection ? activeSection.id : null;
      }`);
      assert.strictEqual(activeId, item.id, `Navigating to ${item.view} must activate ${item.id}`);
    }
    console.log('  ✅ [PASS] Successfully navigated across core application views');

    // ----------------------------------------------------
    // Test 2: Repeated Navigation back and forth
    // ----------------------------------------------------
    console.log('Test 2: Repeated Navigation Between Chat, Vault, and Reminders');
    for (let i = 0; i < 3; i++) {
      await evalPage(`() => { window.activateView('reminders'); }`);
      const remActive = await evalPage(`() => document.getElementById('view-reminders').classList.contains('active')`);
      assert.strictEqual(remActive, true);

      await evalPage(`() => { window.activateView('jarvis'); }`);
      const jarvisActive = await evalPage(`() => document.getElementById('view-jarvis').classList.contains('active')`);
      assert.strictEqual(jarvisActive, true);
    }
    console.log('  ✅ [PASS] Repeated navigation between views maintained stable DOM state');

    // ----------------------------------------------------
    // Test 3: Reminder Prototype Preview & Live Draft Editing
    // ----------------------------------------------------
    console.log('Test 3: Natural Language Reminder Preview Flow');
    await evalPage(`() => { window.activateView('reminders'); }`);

    const previewResult = await evalPage(`async () => {
      const input = document.getElementById('reminder-input');
      const form = document.getElementById('reminder-form');
      input.value = 'Remind me to submit final report tomorrow at 7pm';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
      form.dispatchEvent(submitEvent);

      // Wait for async preview response
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 100));
        const card = document.getElementById('reminder-preview-card');
        if (card && card.style.display !== 'none') {
          return {
            previewVisible: true,
            title: document.getElementById('reminder-preview-title').textContent,
            when: document.getElementById('reminder-preview-when').textContent,
            titleInput: document.getElementById('reminder-title').value,
            dateInput: document.getElementById('reminder-date').value,
            timeInput: document.getElementById('reminder-time').value,
            saveDisabled: document.getElementById('reminder-save-btn').disabled
          };
        }
      }
      return { previewVisible: false };
    }`);

    assert.strictEqual(previewResult.previewVisible, true, 'Preview card should become visible');
    assert.strictEqual(previewResult.title.toLowerCase(), 'submit final report');
    assert.strictEqual(previewResult.timeInput, '19:00');
    assert.strictEqual(previewResult.saveDisabled, true, 'Save must be disabled when storage is unconfigured');
    console.log('  ✅ [PASS] Natural language phrase correctly parsed, previewed, and gated');

    // ----------------------------------------------------
    // Test 4: Live Editing of Draft Title
    // ----------------------------------------------------
    console.log('Test 4: Live Editing of Preview Draft');
    const liveEditResult = await evalPage(`() => {
      const titleInput = document.getElementById('reminder-title');
      titleInput.value = 'submit final audited report';
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      return document.getElementById('reminder-preview-title').textContent;
    }`);
    assert.strictEqual(liveEditResult, 'submit final audited report');
    console.log('  ✅ [PASS] Live draft title updates reflected instantaneously in review card');

    // ----------------------------------------------------
    // Test 5: Incomplete Time Requires User Input
    // ----------------------------------------------------
    console.log('Test 5: Incomplete Time Rejection & Clarification Prompt');
    const incompleteResult = await evalPage(`async () => {
      const input = document.getElementById('reminder-input');
      const form = document.getElementById('reminder-form');
      input.value = 'Call dentist tomorrow at 7';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
      form.dispatchEvent(submitEvent);

      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 100));
        const btn = document.getElementById('reminder-preview-btn');
        if (btn && !btn.disabled && btn.textContent === 'Preview reminder') {
          const timeVal = document.getElementById('reminder-time').value;
          const summary = document.getElementById('reminder-parse-summary');
          const notice = document.getElementById('reminder-notice');
          return {
            timeValue: timeVal,
            summaryText: summary ? summary.textContent : '',
            noticeText: notice ? notice.textContent : ''
          };
        }
      }
      return null;
    }`);
    assert.ok(incompleteResult, 'Clarification summary must appear');
    assert.strictEqual(incompleteResult.timeValue, '', 'Time must not be assumed');
    assert.match(incompleteResult.summaryText, /AM\/PM|24-hour/i, 'Summary must instruct user to specify AM/PM or 24-hour');
    console.log('  ✅ [PASS] Bare hour expression ("at 7") safely refused to invent a default time');

    // ----------------------------------------------------
    // Test 6: Ambiguous Numeric Date Rejection
    // ----------------------------------------------------
    console.log('Test 6: Ambiguous Numeric Date Rejection');
    const ambiguousResult = await evalPage(`async () => {
      const input = document.getElementById('reminder-input');
      const form = document.getElementById('reminder-form');
      input.value = 'Submit taxes on 03/04/2027';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
      form.dispatchEvent(submitEvent);

      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 100));
        const btn = document.getElementById('reminder-preview-btn');
        if (btn && !btn.disabled && btn.textContent === 'Preview reminder') {
          const notice = document.getElementById('reminder-notice');
          return notice ? notice.textContent : '';
        }
      }
      return null;
    }`);
    assert.ok(ambiguousResult, 'Ambiguous date error notice must appear');
    assert.match(ambiguousResult, /two different dates|month name|YYYY-MM-DD/i);
    console.log('  ✅ [PASS] Ambiguous date ("03/04/2027") safely rejected with clear guidance');

    // ----------------------------------------------------
    // Test 7: Mobile Viewport & Drawer Navigation
    // ----------------------------------------------------
    console.log('Test 7: Mobile Viewport & Drawer Navigation');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true
    });

    const mobileDrawerResult = await evalPage(`() => {
      window.toggleMobileDrawer(true);
      const drawer = document.getElementById('mobile-drawer-panel');
      const isOpen = drawer && drawer.classList.contains('active');
      return { drawerOpen: isOpen };
    }`);
    assert.strictEqual(mobileDrawerResult.drawerOpen, true, 'Mobile drawer should open');

    const mobileNavResult = await evalPage(`() => {
      window.activateView('reminders');
      window.toggleMobileDrawer(false);
      const remSec = document.getElementById('view-reminders');
      const drawer = document.getElementById('mobile-drawer-panel');
      return {
        remindersActive: remSec.classList.contains('active'),
        drawerClosed: !drawer.classList.contains('active')
      };
    }`);
    assert.strictEqual(mobileNavResult.remindersActive, true);
    assert.strictEqual(mobileNavResult.drawerClosed, true);
    console.log('  ✅ [PASS] Mobile drawer toggle and mobile view switching verified cleanly');

    // Reset device metrics
    await send('Emulation.clearDeviceMetricsOverride');

    // ----------------------------------------------------
    // Test 8: Console Error Integrity
    // ----------------------------------------------------
    console.log('Test 8: Console Error Integrity');
    assert.strictEqual(consoleErrors.length, 0, `Unexpected console errors found: ${consoleErrors.join('; ')}`);
    console.log('  ✅ [PASS] Zero unexpected client console errors detected across all flows');

    console.log('\n====================================================');
    console.log('🎉 ALL BROWSER REMINDERS & VIEWS E2E TESTS PASSED');
    console.log('====================================================');

    ws.close();
    chromeProcess.kill();
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ E2E Browser Test Failed:', err);
    if (chromeProcess) chromeProcess.kill();
    if (server) server.close();
    process.exit(1);
  }
}

runBrowserRemindersTests();
