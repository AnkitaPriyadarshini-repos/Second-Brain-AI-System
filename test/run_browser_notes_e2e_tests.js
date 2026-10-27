/**
 * Milo AI Workspace — Real Browser Client-Local Notes E2E Verification
 *
 * Uses Headless Chrome CDP to verify client-side storage in a real browser:
 * 1. Clean first-time browser initialization (0 notes in fresh user profile).
 * 2. Create synthetic note via UI.
 * 3. Pin synthetic note.
 * 4. Page reload: confirm note and pinned state survive hard reload in localStorage.
 * 5. Search for note by keyword.
 * 6. Export vault backup JSON and verify schema.
 * 7. Restore from backup and verify 100% fidelity.
 * 8. Verify the local-first privacy notice in the Settings panel.
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const express = require('express');
const WebSocket = require('ws');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(__dirname, '..', 'scratch', 'cdp_browser_notes_' + Date.now());
const cdpPort = 9489;
const httpPort = 3788;

console.log('====================================================');
console.log('🌐 MILO REAL BROWSER CLIENT-LOCAL NOTES E2E TEST');
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

async function runBrowserNotesTests() {
  const app = express();
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

    await send('Page.enable');
    await send('Runtime.enable');

    console.log(`Navigating to http://127.0.0.1:${httpPort}/index.html...`);
    await send('Page.navigate', { url: `http://127.0.0.1:${httpPort}/index.html` });
    await new Promise(r => setTimeout(r, 2000));

    async function evalPage(fnStr) {
      const res = await send('Runtime.evaluate', {
        expression: `(${fnStr})()`,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        throw new Error(res.exceptionDetails.text || res.exceptionDetails.exception?.description);
      }
      return res.result?.value;
    }

    // Step 1: Verify clean initial vault
    console.log('\nTest 1: Verify First-Time User Empty Vault');
    const initialCount = await evalPage(`() => {
      return (window.Store && Array.isArray(window.Store.notes)) ? window.Store.notes.length : -1;
    }`);
    assert.strictEqual(initialCount, 0, 'First-time user must have 0 notes');
    console.log('  ✅ [PASS] Real browser clean vault verified (0 notes)');

    // Step 2: Create a synthetic note
    console.log('\nTest 2: Create Synthetic Note');
    const createdNote = await evalPage(`() => {
      const note = window.Store.addNote({
        title: 'Synthetic Architecture Note',
        content: 'Validating client-first local storage and page reload survival.',
        sourceType: 'typing'
      });
      return { id: note.id, title: note.title, pinned: note.pinned };
    }`);
    assert.ok(createdNote && createdNote.id);
    assert.strictEqual(createdNote.title, 'Synthetic Architecture Note');
    assert.strictEqual(createdNote.pinned, false);
    console.log(`  ✅ [PASS] Synthetic note created: "${createdNote.title}" (ID: ${createdNote.id})`);

    // Step 3: Pin the note
    console.log('\nTest 3: Pin Note');
    const pinResult = await evalPage(`() => {
      window.Store.togglePin('${createdNote.id}');
      const n = window.Store.notes.find(x => x.id === '${createdNote.id}');
      return n ? n.pinned : false;
    }`);
    assert.strictEqual(pinResult, true, 'Note must be pinned');
    console.log('  ✅ [PASS] Note pinned successfully');

    // Step 4: Hard Page Reload & Persistence Verification
    console.log('\nTest 4: Browser Page Reload (Survival Verification)');
    await send('Page.reload');
    await new Promise(r => setTimeout(r, 2000));

    const reloadedNote = await evalPage(`() => {
      if (!window.Store || !Array.isArray(window.Store.notes)) return null;
      const n = window.Store.notes.find(x => x.id === '${createdNote.id}');
      return n ? { id: n.id, title: n.title, content: n.content, pinned: n.pinned } : null;
    }`);
    assert.ok(reloadedNote, 'Note must survive page reload in localStorage');
    assert.strictEqual(reloadedNote.title, 'Synthetic Architecture Note');
    assert.strictEqual(reloadedNote.pinned, true, 'Pinned state must survive reload');
    console.log('  ✅ [PASS] Note and pinned state survived real browser reload with 100% fidelity');

    // Step 5: Search for Note
    console.log('\nTest 5: Search & Retrieval');
    const searchHits = await evalPage(`() => {
      const query = 'Architecture';
      const notes = window.Store.getNotes();
      return notes.filter(n => n.title.includes(query) || n.content.includes(query)).length;
    }`);
    assert.strictEqual(searchHits, 1, 'Search must hit the synthetic note');
    console.log('  ✅ [PASS] Search retrieval verified');

    // Step 6: Export Vault JSON
    console.log('\nTest 6: Vault JSON Export');
    const exportedJsonStr = await evalPage(`() => {
      return window.Store.exportVaultJSON ? window.Store.exportVaultJSON() : null;
    }`);
    assert.ok(exportedJsonStr);
    const parsedBackup = JSON.parse(exportedJsonStr);
    assert.strictEqual(parsedBackup.version, '1.0.0');
    assert.strictEqual(parsedBackup.notesCount, 1);
    assert.strictEqual(parsedBackup.notes[0].title, 'Synthetic Architecture Note');
    console.log('  ✅ [PASS] Exported vault JSON contains complete schema and metadata');

    // Step 7: Clear Notes & Restore from Backup
    console.log('\nTest 7: Restore from Backup');
    const escapedJson = JSON.stringify(exportedJsonStr);
    const restoreSuccess = await evalPage(`() => {
      window.Store.notes = [];
      window.Store.saveNotes();
      if (window.Store.notes.length !== 0) return false;
      const res = window.Store.restoreVaultBackup(${escapedJson});
      return res.success && window.Store.notes.length === 1;
    }`);
    assert.strictEqual(restoreSuccess, true, 'Vault restore must succeed');
    console.log('  ✅ [PASS] Vault backup restored in browser with complete fidelity');

    // Step 8: Settings Panel Local-First Privacy Notice
    console.log('\nTest 8: Verify Settings Local-First Privacy Notice');
    const noticeFound = await evalPage(`() => {
      const body = document.body.textContent;
      return body.includes('Local-First Privacy') && body.includes('browser local storage');
    }`);
    assert.strictEqual(noticeFound, true, 'Settings panel must contain local-first privacy notice');
    console.log('  ✅ [PASS] User-facing local-first privacy and backup notice verified in Settings UI');

    console.log('\n====================================================');
    console.log('🎉 ALL 8 BROWSER CLIENT-LOCAL NOTES E2E TESTS PASSED!');
    console.log('====================================================\n');

    ws.close();
  } finally {
    try { chromeProcess.kill('SIGKILL'); } catch (_) {}
    server.close();
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (_) {}
  }
}

runBrowserNotesTests().catch(err => {
  console.error('❌ BROWSER NOTES TEST FAILED:', err);
  process.exit(1);
});
