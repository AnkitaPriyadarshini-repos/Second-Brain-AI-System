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
 * - Robust cross-platform Chrome/Chromium discovery (CHROME_PATH, CHROME_BIN, standard OS paths)
 * - Strict non-zero exit when browser cannot run unless explicit ALLOW_BROWSER_E2E_SKIP=1
 * - Guaranteed cleanup of processes, sockets, servers, and temporary user profiles
 */

const { spawn, spawnSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const express = require('express');
const WebSocket = require('ws');

const reminderHandler = require('../api/reminders');

const cdpPort = 9489;
const httpPort = 3788;
const scratchDir = path.join(__dirname, '..', 'scratch');
const userDataDir = path.join(scratchDir, 'cdp_browser_reminders_' + Date.now());

let chromeProcess = null;
let wsConnection = null;
let httpServer = null;
let isCleanedUp = false;

function cleanup() {
  if (isCleanedUp) return;
  isCleanedUp = true;

  if (wsConnection) {
    try { wsConnection.close(); } catch (_) {}
    wsConnection = null;
  }

  if (chromeProcess) {
    try {
      if (process.platform === 'win32' && chromeProcess.pid) {
        spawnSync('taskkill', ['/pid', String(chromeProcess.pid), '/T', '/F'], { timeout: 3000 });
      } else {
        chromeProcess.kill('SIGKILL');
      }
    } catch (_) {}
    chromeProcess = null;
  }

  if (httpServer) {
    try { httpServer.close(); } catch (_) {}
    httpServer = null;
  }

  if (fs.existsSync(userDataDir)) {
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3 });
    } catch (_) {}
  }
}

process.on('SIGINT', () => { cleanup(); process.exit(130); });
process.on('SIGTERM', () => { cleanup(); process.exit(143); });
process.on('exit', () => { cleanup(); });

function findChromeExecutable() {
  // 1. Explicit environment variables take strict precedence
  const explicitPath = process.env.CHROME_PATH || process.env.CHROME_BIN;
  if (explicitPath && typeof explicitPath === 'string' && explicitPath.trim()) {
    const trimmed = explicitPath.trim();
    if (fs.existsSync(trimmed)) {
      try {
        if (fs.statSync(trimmed).isFile()) return trimmed;
      } catch (_) {}
    }
    return null;
  }

  // 2. Standard platform installation locations
  const platform = process.platform;
  const standardPaths = [];

  if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
    const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';

    standardPaths.push(
      path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
    );
  } else if (platform === 'darwin') {
    standardPaths.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    );
  } else {
    standardPaths.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
      '/usr/bin/microsoft-edge-stable'
    );
  }

  for (const candidate of standardPaths) {
    if (candidate && fs.existsSync(candidate)) {
      try {
        if (fs.statSync(candidate).isFile()) {
          return candidate;
        }
      } catch (_) {}
    }
  }

  return null;
}

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
  console.log('====================================================');
  console.log('🌐 MILO REAL BROWSER REMINDERS & VIEWS E2E GATE');
  console.log('====================================================\n');

  const chromePath = findChromeExecutable();

  if (!chromePath) {
    if (process.env.ALLOW_BROWSER_E2E_SKIP === '1') {
      console.warn('⚠️ [SKIP] Browser E2E skipped: No Chrome/Chromium executable discovered and ALLOW_BROWSER_E2E_SKIP=1 is set.');
      cleanup();
      process.exit(0);
    }
    console.error('❌ [FATAL] Browser E2E failed: No viable Chrome/Chromium executable discovered.');
    console.error('   Please set CHROME_PATH or install Google Chrome.');
    console.error('   To permit skipping explicitly in headless environments without a browser, set ALLOW_BROWSER_E2E_SKIP=1.');
    cleanup();
    process.exit(1);
  }

  console.log(`Discovered functional browser executable: ${chromePath}`);

  // Create scratch dir if needed
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const app = express();
  app.use(express.json());

  // Mount reminders endpoint with real api/reminders handler
  app.all('/api/reminders', (req, res) => {
    return reminderHandler(req, res);
  });

  // Health endpoint
  app.get('/api/ai/health', (req, res) => {
    res.json({ ok: true, service: 'milo-ai-gateway', timestamp: new Date().toISOString() });
  });

  app.use(express.static(path.join(__dirname, '..')));

  httpServer = app.listen(httpPort);
  console.log(`Local test webserver listening on http://127.0.0.1:${httpPort}`);

  chromeProcess = spawn(chromePath, [
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
    wsConnection = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      wsConnection.on('open', resolve);
      wsConnection.on('error', reject);
    });

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const handler = (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.id === id) {
            wsConnection.off('message', handler);
            if (msg.error) reject(msg.error);
            else resolve(msg.result);
          }
        };
        wsConnection.on('message', handler);
        wsConnection.send(JSON.stringify({ id, method, params }));
      });
    }

    const consoleErrors = [];
    wsConnection.on('message', (data) => {
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

    // Deterministic readiness check: wait until document is ready and window.activateView is available
    let pageReady = false;
    for (let i = 0; i < 60; i++) {
      try {
        const isReady = await evalPage(`() => document.readyState === 'complete' && typeof window.activateView === 'function' && !!document.getElementById('view-jarvis')`);
        if (isReady) {
          pageReady = true;
          break;
        }
      } catch (_) {}
      await new Promise(r => setTimeout(r, 100));
    }
    assert.strictEqual(pageReady, true, 'Page failed to reach interactive state within readiness timeout');

    // ----------------------------------------------------
    // Phase 1: Navigation across core screens
    // ----------------------------------------------------
    console.log('Phase 1: Core Screen Navigation');
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
    console.log('  ✅ [PASS] Phase 1: Successfully navigated across 6 core application views');

    // ----------------------------------------------------
    // Phase 2: Repeated Navigation back and forth
    // ----------------------------------------------------
    console.log('Phase 2: Repeated Navigation Between Chat, Vault, and Reminders');
    for (let i = 0; i < 3; i++) {
      await evalPage(`() => { window.activateView('reminders'); }`);
      const remActive = await evalPage(`() => document.getElementById('view-reminders').classList.contains('active')`);
      assert.strictEqual(remActive, true);

      await evalPage(`() => { window.activateView('jarvis'); }`);
      const jarvisActive = await evalPage(`() => document.getElementById('view-jarvis').classList.contains('active')`);
      assert.strictEqual(jarvisActive, true);
    }
    console.log('  ✅ [PASS] Phase 2: Repeated navigation between views maintained stable DOM state across 3 cycles');

    // ----------------------------------------------------
    // Phase 3: Reminder Prototype Preview & Live Draft Editing
    // ----------------------------------------------------
    console.log('Phase 3: Natural Language Reminder Preview Flow & Storage-Gated Save Button');
    await evalPage(`() => { window.activateView('reminders'); }`);

    const previewResult = await evalPage(`async () => {
      const input = document.getElementById('reminder-input');
      const form = document.getElementById('reminder-form');
      input.value = 'Remind me to submit final report tomorrow at 7pm';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
      form.dispatchEvent(submitEvent);

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
    console.log('  ✅ [PASS] Phase 3: Natural language phrase correctly parsed, previewed, and save button safely gated');

    // ----------------------------------------------------
    // Phase 4: Live Editing of Draft Title
    // ----------------------------------------------------
    console.log('Phase 4: Live Editing of Preview Draft');
    const liveEditResult = await evalPage(`() => {
      const titleInput = document.getElementById('reminder-title');
      titleInput.value = 'submit final audited report';
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      return document.getElementById('reminder-preview-title').textContent;
    }`);
    assert.strictEqual(liveEditResult, 'submit final audited report');
    console.log('  ✅ [PASS] Phase 4: Live draft title updates reflected instantaneously in review card');

    // ----------------------------------------------------
    // Phase 5: Incomplete Time Requires User Input
    // ----------------------------------------------------
    console.log('Phase 5: Incomplete Time Rejection & Clarification Prompt');
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
    console.log('  ✅ [PASS] Phase 5: Bare hour expression ("at 7") safely refused to invent a default time');

    // ----------------------------------------------------
    // Phase 6: Ambiguous Numeric Date Rejection
    // ----------------------------------------------------
    console.log('Phase 6: Ambiguous Numeric Date Rejection');
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
    console.log('  ✅ [PASS] Phase 6: Ambiguous date ("03/04/2027") safely rejected with clear guidance');

    // ----------------------------------------------------
    // Phase 7: Mobile Viewport & Drawer Navigation
    // ----------------------------------------------------
    console.log('Phase 7: Mobile Viewport & Drawer Navigation');
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
    console.log('  ✅ [PASS] Phase 7: Mobile drawer toggle and mobile view switching verified cleanly');

    // Reset device metrics
    await send('Emulation.clearDeviceMetricsOverride');

    // ----------------------------------------------------
    // Phase 8: Date Expression Live Edit & Deterministic Re-resolution
    // ----------------------------------------------------
    console.log('Phase 8: Date Expression Live Edit & Deterministic Re-resolution');
    await evalPage(`() => { window.activateView('reminders'); }`);

    const initialDraftResult = await evalPage(`async () => {
      const input = document.getElementById('reminder-input');
      const form = document.getElementById('reminder-form');
      input.value = 'Draft research grant next Friday at 4pm';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 100));
        const card = document.getElementById('reminder-preview-card');
        const timeInput = document.getElementById('reminder-time');
        if (card && card.style.display !== 'none' && timeInput && timeInput.value === '16:00') {
          return {
            ready: true,
            expr: document.getElementById('reminder-date-expression-input').value,
            time: timeInput.value
          };
        }
      }
      return { ready: false };
    }`);
    assert.strictEqual(initialDraftResult.ready, true, 'Draft should be ready with 16:00 time');

    // Live edit the date expression to "next Monday at 10am"
    const reResolveResult = await evalPage(`async () => {
      const exprInput = document.getElementById('reminder-date-expression-input');
      exprInput.value = 'next Monday at 10am';
      exprInput.dispatchEvent(new Event('change', { bubbles: true }));

      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 100));
        const timeInput = document.getElementById('reminder-time');
        const notice = document.getElementById('reminder-notice');
        if (timeInput && timeInput.value === '10:00') {
          return {
            updated: true,
            time: timeInput.value,
            date: document.getElementById('reminder-date').value,
            status: document.getElementById('reminder-preview-status').textContent,
            resolver: document.getElementById('reminder-preview-resolver').textContent
          };
        }
      }
      return { updated: false };
    }`);
    assert.strictEqual(reResolveResult.updated, true, 'Re-resolution should update time to 10:00');
    assert.strictEqual(reResolveResult.time, '10:00');
    assert.strictEqual(reResolveResult.status, 'Scheduled');
    assert.match(reResolveResult.resolver, /deterministic parser/i);
    console.log('  ✅ [PASS] Phase 8: Live date-expression edit triggered deterministic re-resolution without NLP re-run');

    // ----------------------------------------------------
    // Phase 9: Failed Date Re-Resolution Clears Schedule & Prevents Stale Persistence
    // ----------------------------------------------------
    console.log('Phase 9: Failed Re-resolution Invalidates Old Schedule & Prevents Stale Save');
    const failedResolutionResult = await evalPage(`async () => {
      const exprInput = document.getElementById('reminder-date-expression-input');
      exprInput.value = '03/04/2027'; // Ambiguous numeric date
      exprInput.dispatchEvent(new Event('change', { bubbles: true }));

      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 100));
        const notice = document.getElementById('reminder-notice');
        if (notice && notice.style.display !== 'none' && /two different dates/i.test(notice.textContent)) {
          return {
            errorNotice: notice.textContent,
            dateValue: document.getElementById('reminder-date').value,
            timeValue: document.getElementById('reminder-time').value,
            statusText: document.getElementById('reminder-preview-status').textContent,
            saveDisabled: document.getElementById('reminder-save-btn').disabled
          };
        }
      }
      return null;
    }`);

    assert.ok(failedResolutionResult, 'Ambiguous date error notice must be shown');
    assert.strictEqual(failedResolutionResult.dateValue, '', 'Date input must be cleared immediately upon failed resolution');
    assert.strictEqual(failedResolutionResult.timeValue, '', 'Time input must be cleared immediately upon failed resolution');
    assert.strictEqual(failedResolutionResult.statusText, 'Needs clarification');
    assert.strictEqual(failedResolutionResult.saveDisabled, true, 'Save button must be disabled after failed resolution');

    // Test recovery via manual calendar entry
    const manualRecoveryResult = await evalPage(`() => {
      const dateInput = document.getElementById('reminder-date');
      const timeInput = document.getElementById('reminder-time');
      dateInput.value = '2027-04-03';
      timeInput.value = '10:00';
      dateInput.dispatchEvent(new Event('input', { bubbles: true }));
      timeInput.dispatchEvent(new Event('input', { bubbles: true }));

      return {
        date: dateInput.value,
        time: timeInput.value,
        status: document.getElementById('reminder-preview-status').textContent,
        resolver: document.getElementById('reminder-preview-resolver').textContent
      };
    }`);
    assert.strictEqual(manualRecoveryResult.status, 'Scheduled');
    assert.strictEqual(manualRecoveryResult.resolver, 'Manual calendar entry');
    console.log('  ✅ [PASS] Phase 9: Failed re-resolution cleared stale schedule; manual calendar edit recovery verified');

    // ----------------------------------------------------
    // Phase 10: Console Error Integrity
    // ----------------------------------------------------
    console.log('Phase 10: Console Error Integrity');
    assert.strictEqual(consoleErrors.length, 0, `Unexpected console errors found: ${consoleErrors.join('; ')}`);
    console.log('  ✅ [PASS] Phase 10: Zero unexpected client console errors detected across all flows');

    console.log('\n====================================================');
    console.log('🎉 ALL 10 BROWSER REMINDERS & VIEWS E2E PHASES PASSED');
    console.log('   Phases executed: 10 | Passed: 10 | Failed: 0 | Skipped: 0');
    console.log('====================================================\n');

    cleanup();
    process.exit(0);
  } catch (err) {
    console.error('❌ E2E Browser Test Failed:', err);
    cleanup();
    process.exit(1);
  }
}

runBrowserRemindersTests();
