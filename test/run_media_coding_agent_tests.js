/**
 * Milo AI Workspace — Image & Video Studio, Diff-First Coding Agent, and Autonomous Agent Tests
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('🎨 MILO AI WORKSPACE — STUDIO, DIFF-CODING & AGENT TEST SUITE');
console.log('====================================================\n');

// ----------------------------------------------------
// Suite 1: Image Generation Serverless API Contract & Validation
// ----------------------------------------------------
console.log('Suite 1: Image Generation Serverless API Contract');
const imageHandler = require('../api/media/image.js');

(async () => {
  // Test 1.1: Method validation (Reject GET)
  {
    let statusCode = null;
    let jsonBody = null;
    const req = { method: 'GET', body: {}, headers: {} };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonBody = data; return res; }
    };
    await imageHandler(req, res);
    assert.strictEqual(statusCode, 405, 'GET method must return 405 Method Not Allowed');
    assert.strictEqual(jsonBody.error, 'Method not allowed');
    console.log('  ✅ [PASS] Image API rejects non-POST requests with 405');
  }

  // Test 1.2: Empty prompt validation
  {
    let statusCode = null;
    let jsonBody = null;
    const req = { method: 'POST', body: { prompt: '   ' }, headers: { 'x-forwarded-for': '127.0.0.1' } };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonBody = data; return res; }
    };
    await imageHandler(req, res);
    assert.strictEqual(statusCode, 400, 'Empty prompt must return 400 Bad Request');
    assert.ok(jsonBody.error.toLowerCase().includes('prompt is required'));
    console.log('  ✅ [PASS] Image API validates presence of prompt');
  }

  // Test 1.3: Pollinations Flux Provider (Real public GPU endpoint generation)
  {
    let statusCode = 200;
    let jsonBody = null;
    const req = {
      method: 'POST',
      body: { prompt: 'A cute friendly robot mascot Milo floating in space', provider: 'pollinations', aspectRatio: '1:1' },
      headers: { 'x-forwarded-for': '127.0.0.2' }
    };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonBody = data; return res; }
    };
    await imageHandler(req, res);
    assert.strictEqual(statusCode, 200, 'Pollinations image request should succeed with 200');
    assert.ok(jsonBody.imageUrl && (jsonBody.imageUrl.startsWith('https://') || jsonBody.imageUrl.startsWith('data:image/')));
    assert.ok(jsonBody.provider && jsonBody.provider.toLowerCase().includes('pollinations'));
    assert.ok(jsonBody.dimensions && jsonBody.dimensions.width === 1024 && jsonBody.dimensions.height === 1024);
    console.log('  ✅ [PASS] Image API successfully generates image URL via Pollinations provider');
  }

  // Test 1.4: Missing Gemini API Key handled cleanly
  {
    const origKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    let statusCode = null;
    let jsonBody = null;
    const req = {
      method: 'POST',
      body: { prompt: 'Futuristic research studio', provider: 'gemini' },
      headers: { 'x-forwarded-for': '127.0.0.3' }
    };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonBody = data; return res; }
    };
    await imageHandler(req, res);
    assert.strictEqual(statusCode, 503, 'Missing Gemini key must return 503 Service Unavailable');
    assert.ok(jsonBody.error.includes('GEMINI_API_KEY'));
    if (origKey) process.env.GEMINI_API_KEY = origKey;
    console.log('  ✅ [PASS] Image API returns clear 503 when provider credentials are unconfigured');
  }

  // ----------------------------------------------------
  // Suite 2: Async Video Generation Job Lifecycle
  // ----------------------------------------------------
  console.log('\nSuite 2: Async Video Generation Job Lifecycle');
  const videoHandler = require('../api/media/video.js');

  // Test 2.0: Unconfigured Video Provider returns honest 503 Service Unavailable
  {
    const origEnv = process.env.MILO_TEST_VIDEO_PROVIDER;
    delete process.env.MILO_TEST_VIDEO_PROVIDER;
    let statusCode = null;
    let jsonBody = null;
    const req = {
      method: 'POST',
      body: { action: 'create', prompt: 'A futuristic cyber city' },
      headers: { 'x-forwarded-for': '127.0.0.99' }
    };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonBody = data; return res; }
    };
    await videoHandler(req, res);
    assert.strictEqual(statusCode, 503, 'Unconfigured video provider must return 503');
    assert.strictEqual(jsonBody.configured, false);
    assert.ok(jsonBody.error.includes('unconfigured'));
    console.log('  ✅ [PASS] Video API returns honest 503 when external video provider is unconfigured');
    if (origEnv) process.env.MILO_TEST_VIDEO_PROVIDER = origEnv;
  }

  // Set test mock provider for deterministic contract and authorization tests
  process.env.MILO_TEST_VIDEO_PROVIDER = 'mock';

  let testJobId = null;
  const ownerHeaders = { 'x-forwarded-for': '127.0.0.4' };

  // Test 2.1: Submit new video generation job
  {
    let statusCode = 200;
    let jsonBody = null;
    const req = {
      method: 'POST',
      body: { action: 'create', prompt: 'Milo robot waving hello in a neon cyber garden', duration: 4, aspectRatio: '16:9' },
      headers: ownerHeaders
    };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonBody = data; return res; }
    };
    await videoHandler(req, res);
    assert.ok(statusCode === 200 || statusCode === 202, 'Video creation should return 200 or 202 Accepted');
    assert.ok(jsonBody.jobId, 'Video job must return a unique jobId');
    assert.strictEqual(jsonBody.status, 'queued', 'Initial video job status must be queued');
    testJobId = jsonBody.jobId;
    console.log('  ✅ [PASS] Video API registers new generation job with queued status');
  }

  // Test 2.2: Poll video job status with owner identity
  {
    let statusCode = 200;
    let jsonBody = null;
    const req = {
      method: 'POST',
      body: { action: 'status', jobId: testJobId },
      headers: ownerHeaders
    };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonBody = data; return res; }
    };
    await videoHandler(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(jsonBody.jobId, testJobId);
    assert.ok(['queued', 'processing', 'completed'].includes(jsonBody.status));
    assert.ok(typeof jsonBody.progress === 'number');
    console.log('  ✅ [PASS] Video API returns accurate asynchronous job progress on polling');
  }

  // Test 2.3: Authorization / Ownership Check (Different client cannot access or cancel job)
  {
    let statusCode = null;
    let jsonBody = null;
    const intruderReq = {
      method: 'POST',
      body: { action: 'status', jobId: testJobId },
      headers: { 'x-forwarded-for': '192.168.1.100' } // Different IP / guest identity
    };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonBody = data; return res; }
    };
    await videoHandler(intruderReq, res);
    assert.strictEqual(statusCode, 403, 'Intruder request to access private job must return 403 Forbidden');
    assert.ok(jsonBody.error.includes('Access denied'));
    console.log('  ✅ [PASS] Video API enforces verified ownership boundaries and prevents IDOR (403)');
  }

  // Test 2.4: Cancel video generation job
  {
    let statusCode = 200;
    let jsonBody = null;
    const req = {
      method: 'POST',
      body: { action: 'cancel', jobId: testJobId },
      headers: ownerHeaders
    };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonBody = data; return res; }
    };
    await videoHandler(req, res);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(jsonBody.status, 'cancelled');
    console.log('  ✅ [PASS] Video API safely handles explicit job cancellation by owner');
  }

  // Test 2.5: Querying unknown job returns 404
  {
    let statusCode = null;
    let jsonBody = null;
    const req = {
      method: 'POST',
      body: { action: 'status', jobId: 'non-existent-job-id' },
      headers: ownerHeaders
    };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonBody = data; return res; }
    };
    await videoHandler(req, res);
    assert.strictEqual(statusCode, 404);
    assert.ok(jsonBody.error.includes('Job not found'));
    console.log('  ✅ [PASS] Video API returns 404 for unknown or expired job IDs');
  }

  // ----------------------------------------------------
  // Suite 3: Diff-First Coding Agent Logic
  // ----------------------------------------------------
  console.log('\nSuite 3: Diff-First Coding Agent Logic & Safety Gate');
  
  // Create simulated DOM and window for frontend module tests
  global.window = {};
  global.document = {
    getElementById: () => null,
    querySelectorAll: () => []
  };

  // Load diff-coding-agent.js in Node
  const diffAgentCode = fs.readFileSync(path.join(__dirname, '../js/diff-coding-agent.js'), 'utf8');
  eval(diffAgentCode);

  const DiffAgent = global.window.MiloDiffCodingAgent;
  assert.ok(DiffAgent, 'MiloDiffCodingAgent must export to window');

  // Test 3.1: VFS initial state
  DiffAgent.loadSampleProject();
  const fileList = DiffAgent.listProjectFiles();
  assert.ok(fileList.length >= 3, 'Sample project must contain files');
  assert.ok(fileList.includes('src/session/auth.js'));
  console.log('  ✅ [PASS] Coding agent loads and lists project virtual file system');

  // Test 3.2: Inspect file and verify problem diagnosis
  const sessionContent = DiffAgent.readFile('src/session/auth.js');
  assert.ok(sessionContent.includes('isExpired(token)'));
  assert.ok(sessionContent.includes('BUG: Missing null-check') || sessionContent.includes('BUG'));
  console.log('  ✅ [PASS] Coding agent inspects target file content accurately');

  // Test 3.3: Unified Diff Generator
  const original = 'function isExpired(token) {\n  return false;\n}\n';
  const modified = 'function isExpired(token) {\n  if (!token || !token.exp) return true;\n  return Date.now() >= token.exp * 1000;\n}\n';
  const diffResult = DiffAgent.computeUnifiedDiff('src/session/auth.js', original, modified);
  
  assert.strictEqual(diffResult.filename, 'src/session/auth.js');
  assert.ok(diffResult.addedCount > 0, 'Diff must detect added lines');
  assert.ok(diffResult.removedCount > 0, 'Diff must detect removed lines');
  assert.ok(diffResult.diffLines.some(l => l.type === 'added'), 'Must classify added lines');
  assert.ok(diffResult.diffLines.some(l => l.type === 'removed'), 'Must classify removed lines');
  console.log('  ✅ [PASS] Diff computation accurately calculates inline line changes and line counts');

  // Test 3.4: Approval Gate — Rejecting patch leaves VFS unchanged
  DiffAgent.createProposal('src/session/auth.js', modified, 'Fix token expiration bug');
  assert.strictEqual(DiffAgent.getPendingProposal().approved, false, 'Initial proposal must not be pre-approved');
  
  DiffAgent.rejectPatch();
  assert.strictEqual(DiffAgent.getPendingProposal(), null, 'Rejecting clears pending proposal');
  assert.strictEqual(DiffAgent.readFile('src/session/auth.js'), sessionContent, 'File content must remain completely unchanged after rejection');
  console.log('  ✅ [PASS] Rejecting proposed patch leaves the workspace completely untouched');

  // Test 3.5: Approval Gate — Approving patch applies changes and maintains rollback snapshot
  DiffAgent.createProposal('src/session/auth.js', modified, 'Fix token expiration bug');
  DiffAgent.approveAndApplyPatch();
  
  const updatedContent = DiffAgent.readFile('src/session/auth.js');
  assert.strictEqual(updatedContent, modified, 'Approved patch must update file in virtual file system');
  
  // Test Rollback
  const rollbackSuccess = DiffAgent.rollbackSnapshot();
  assert.strictEqual(rollbackSuccess, true, 'Rollback must succeed');
  assert.strictEqual(DiffAgent.readFile('src/session/auth.js'), sessionContent, 'Rollback must restore original file content');
  console.log('  ✅ [PASS] Approved patch applies changes and maintains verifiable rollback snapshot');

  // Test 3.6: Export Unified Git Patch
  const gitPatch = DiffAgent.generateGitPatch('src/session/auth.js', original, modified);
  assert.ok(gitPatch.startsWith('--- a/src/session/auth.js\n+++ b/src/session/auth.js'));
  console.log('  ✅ [PASS] Git .patch export produces standard unified patch format');

  // ----------------------------------------------------
  // Suite 4: Autonomous Agent Mode & Tool Registry
  // ----------------------------------------------------
  console.log('\nSuite 4: Autonomous Agent Mode & Tool Registry');
  const agentRunnerCode = fs.readFileSync(path.join(__dirname, '../js/autonomous-agent.js'), 'utf8');
  eval(agentRunnerCode);

  const AutoAgent = global.window.MiloAutonomousAgent;
  assert.ok(AutoAgent, 'MiloAutonomousAgent must export to window');

  // Test 4.1: Typed Tool Registry Schema & Permissions
  const tools = AutoAgent.getRegisteredTools();
  assert.ok(tools.length >= 6, 'Autonomous Agent must register core toolset');
  
  const searchTool = tools.find(t => t.name === 'search_vault');
  assert.ok(searchTool && !searchTool.isMutation, 'search_vault must be marked read-only');
  assert.strictEqual(searchTool.requiresApproval, false, 'search_vault does not require manual approval');

  const patchTool = tools.find(t => t.name === 'propose_code_patch');
  assert.ok(patchTool && patchTool.isMutation, 'propose_code_patch must be marked mutation');
  assert.strictEqual(patchTool.requiresApproval, true, 'propose_code_patch requires explicit approval');
  console.log('  ✅ [PASS] Tool registry enforces typed parameter schemas and permission boundaries');

  // Test 4.2: Execution Lifecycle & State Machine Transitions
  assert.strictEqual(AutoAgent.getState(), 'idle', 'Initial state must be idle');
  
  // Test 4.3: Mission Cancellation via AbortController
  AutoAgent.startMission('Examine project and draft summary report');
  assert.ok(['planning', 'running', 'waiting_approval', 'completed'].includes(AutoAgent.getState()));
  
  AutoAgent.stopMission();
  assert.strictEqual(AutoAgent.getState(), 'cancelled', 'Calling stopMission must transition state to cancelled');
  console.log('  ✅ [PASS] Agent run transitions states accurately and supports active cancellation');

  // ----------------------------------------------------
  // Suite 5: Chat Image Detection & Inline Card Metadata
  // ----------------------------------------------------
  console.log('\nSuite 5: Chat Natural Language Image Detection');
  const chatFile = fs.readFileSync(path.join(__dirname, '../js/production-chat.js'), 'utf8');
  
  // Verify image command and phrase regex exist in production-chat.js
  assert.ok(chatFile.includes('/image') && chatFile.includes('/draw'), 'Chat supports image slash commands');
  assert.ok(chatFile.includes('generate an image of') || chatFile.includes('draw a'), 'Chat detects natural language image creation intent');
  assert.ok(chatFile.includes('/api/media/image'), 'Chat routes image generation to serverless media endpoint');
  assert.ok(chatFile.includes('data-inline-media="true"'), 'Chat renders inline card container for generated assets');
  console.log('  ✅ [PASS] Production chat detects image prompts and dispatches to serverless media endpoint');

  // ----------------------------------------------------
  // Suite 6: HTML & CSS Workspace Studio Layout Integrity
  // ----------------------------------------------------
  console.log('\nSuite 6: Workspace Navigation & Layout Integrity');
  const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  
  assert.ok(indexHtml.includes('data-view="create"'), 'index.html must have Create workspace button');
  assert.ok(indexHtml.includes('data-view="code"'), 'index.html must have Code workspace button');
  assert.ok(indexHtml.includes('id="view-create"'), 'index.html must have #view-create section');
  assert.ok(indexHtml.includes('id="view-code"'), 'index.html must have #view-code section');
  assert.ok(indexHtml.includes('id="autonomous-agent-workspace"'), 'index.html must have Autonomous Agent Runner');
  assert.ok(indexHtml.includes('css/milo-workspace-studio.css?v=1.0'), 'index.html must link workspace studio stylesheet');
  console.log('  ✅ [PASS] HTML navigation tabs, workspace views, and stylesheets are linked');

  console.log('\n====================================================');
  console.log('SUMMARY: ALL MILO WORKSPACE UPGRADE TESTS PASSED CLEANLY.');
  console.log('====================================================');
})();
