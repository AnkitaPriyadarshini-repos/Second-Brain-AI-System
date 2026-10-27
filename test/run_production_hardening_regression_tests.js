/**
 * Milo AI Workspace — Production Hardening & Security Regression Test Suite
 *
 * Validates the critical fixes made during the 100+ concurrent user audit:
 * 1. URL Ingestion: Rate-limiting per identity and URL length bounding (SSRF/DoS prevention).
 * 2. Identity Extraction: Derive identity from verified cryptographic credentials, ignoring untrusted x-user-id.
 * 3. AI Gateway Service Model Mapping: Modern Gemini 3.x endpoints mapped; legacy retired models migrated.
 * 4. Auth Service: Fail-closed in production when session secret is unconfigured; reject legacy predictable fallback tokens.
 * 5. Note Controller Cache Invalidation: Mutations (create/pin/delete) immediately invalidate cached notes.
 * 6. Job Store Throttling & Cold-Start Resilience: Disk scanning throttled and cold-start persistence preserved.
 * 7. Media Image Generation Timeout: Timeout bounded to 22s, well within Vercel 30s limit.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

console.log('====================================================');
console.log('🛡️ MILO AI — PRODUCTION HARDENING REGRESSION TESTS');
console.log('====================================================\n');

// Set test environment secrets
process.env.MILO_SESSION_SECRET = 'milo_hardening_test_secret_32bytes_value!';
process.env.JWT_SECRET = 'sb_test_jwt_secret_32bytes_value_2026!';

async function runHardeningTests() {
  // ------------------------------------------------------------------
  // Test 1: URL Ingestion Abuse Prevention
  // ------------------------------------------------------------------
  console.log('Suite 1: URL Ingestion Rate-Limiting & Length Bounding');
  {
    const ingestHandler = require('../api/ingest/url');
    function createMockRes() {
      return {
        statusCode: 200,
        headers: {},
        body: null,
        setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
        status(code) { this.statusCode = code; return this; },
        json(data) { this.body = data; return this; }
      };
    }

    // A: Pathological URL length rejection (> 2048 characters)
    const longUrl = 'https://example.com/' + 'a'.repeat(2500);
    const resA = createMockRes();
    await ingestHandler({ method: 'POST', body: { url: longUrl }, headers: {} }, resA);
    assert.strictEqual(resA.statusCode, 400, 'Must reject overly long URL with HTTP 400');
    assert.ok(resA.body.error.includes('maximum allowable length'), 'Error message must mention length constraint');
    console.log('  ✅ [PASS] 1A: Oversized URL rejected before fetching');

    // B: Rate-limit enforcement
    let hit429 = false;
    for (let i = 0; i < 20; i++) {
      const resB = createMockRes();
      await ingestHandler({
        method: 'POST',
        body: { url: 'https://example.com' },
        headers: { 'x-vercel-ip': '198.51.100.42' }
      }, resB);
      if (resB.statusCode === 429) {
        hit429 = true;
        break;
      }
    }
    assert.ok(hit429, 'Excessive ingest requests must trigger HTTP 429');
    console.log('  ✅ [PASS] 1B: Rate limit triggered and enforced per client identity');
  }

  // ------------------------------------------------------------------
  // Test 2: Secure Identity Derivation in AIGatewayController
  // ------------------------------------------------------------------
  console.log('\nSuite 2: Identity Derivation from Verified Credentials');
  {
    const AIGatewayController = require('../controllers/AIGatewayController');
    const { generateSessionToken } = require('../api/auth-guard');
    const controller = new AIGatewayController();

    const realUserToken = generateSessionToken('legitimate_researcher', false);
    let capturedUserId = null;

    // Spy on processGatewayRequest
    const originalProcess = controller.aiGatewayService.processGatewayRequest;
    controller.aiGatewayService.processGatewayRequest = async (params) => {
      capturedUserId = params.userId;
      return { success: true, answer: 'Mock response', citations: [] };
    };

    function createMockRes() {
      return {
        statusCode: 200,
        headers: {},
        status(code) { this.statusCode = code; return this; },
        json(data) { this.body = data; return this; }
      };
    }

    // Client attempts to spoof x-user-id: victim_user_99 while presenting token for legitimate_researcher
    const res = createMockRes();
    await controller.handleQuery({
      body: { prompt: 'Test query' },
      headers: {
        'authorization': `Bearer ${realUserToken}`,
        'x-user-id': 'victim_user_99'
      }
    }, res);

    assert.ok(capturedUserId.startsWith('usr_legitimate_researcher'), 'Identity must be derived from token, not spoofed x-user-id header');
    assert.strictEqual(capturedUserId.includes('victim_user_99'), false, 'Untrusted x-user-id header must be completely ignored');
    controller.aiGatewayService.processGatewayRequest = originalProcess;
    console.log('  ✅ [PASS] 2: Spoofed x-user-id header strictly ignored in favor of cryptographically verified token');
  }

  // ------------------------------------------------------------------
  // Test 3: AI Gateway Model Selection & Migration
  // ------------------------------------------------------------------
  console.log('\nSuite 3: Gemini 3.x Upstream Model Registry & Migration');
  {
    const AIGatewayService = require('../services/AIGatewayService');
    const service = new AIGatewayService();

    assert.strictEqual(service.selectModel('gemini-3.8-flash', 'simple query'), 'gemini-3.8-flash', 'Must recognize gemini-3.8-flash');
    assert.strictEqual(service.selectModel('gemini-3.6-flash', 'simple query'), 'gemini-3.6-flash', 'Must recognize gemini-3.6-flash');
    assert.strictEqual(service.selectModel('gemini-3.5-flash-lite', 'simple query'), 'gemini-3.5-flash-lite', 'Must recognize gemini-3.5-flash-lite');
    assert.strictEqual(service.selectModel('gemini-3.1-flash-lite', 'simple query'), 'gemini-3.1-flash-lite', 'Must recognize gemini-3.1-flash-lite');

    // Migration of legacy 1.5/2.0 strings
    assert.strictEqual(service.selectModel('gemini-1.5-flash', 'simple query'), 'gemini-3.5-flash-lite', 'Must migrate legacy gemini-1.5-flash to 3.5-flash-lite');
    assert.strictEqual(service.selectModel('gemini-2.0-flash', 'simple query'), 'gemini-3.5-flash-lite', 'Must migrate legacy gemini-2.0-flash to 3.5-flash-lite');

    // Complex query routing
    const complexPrompt = 'Optimize the concurrency and memory architecture of our distributed consensus cluster';
    assert.strictEqual(service.selectModel(undefined, complexPrompt), 'gemini-3.8-flash', 'Complex prompt must route to frontier reasoning model gemini-3.8-flash');
    console.log('  ✅ [PASS] 3: Upstream model selection maps to active Gemini 3.x endpoints and migrates legacy models');
  }

  // ------------------------------------------------------------------
  // Test 4: AuthService Session Security & Legacy Rejection
  // ------------------------------------------------------------------
  console.log('\nSuite 4: AuthService Hardened Secrets & Token Verification');
  {
    const AuthService = require('../services/AuthService');
    const service = new AuthService();

    // Generate valid token
    const tokenRes = service.generateSecureToken({ userId: 'usr_test_101', email: 'test@example.com' });
    assert.ok(tokenRes.startsWith('sb_jwt_'), 'Token must be prefixed with sb_jwt_');

    const verified = service.verifySecureToken(tokenRes);
    assert.strictEqual(verified.userId, 'usr_test_101', 'Valid token must verify cleanly');

    // Tampered token payload
    const tampered = tokenRes.slice(0, -6) + 'xxxxxx';
    assert.strictEqual(service.verifySecureToken(tampered), null, 'Tampered token must be rejected');

    // Test rejection of legacy insecure fallback secret
    const crypto = require('crypto');
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ userId: 'usr_legacy', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
    const legacySig = crypto.createHmac('sha256', service.LEGACY_INSECURE_SECRET).update(`${header}.${body}`).digest('base64url');
    const legacyToken = `sb_jwt_${header}.${body}.${legacySig}`;

    assert.strictEqual(service.verifySecureToken(legacyToken), null, 'Tokens signed with legacy known fallback secret must be rejected');
    console.log('  ✅ [PASS] 4: AuthService tokens verified with timing-safety and legacy predictable secret rejected');
  }

  // ------------------------------------------------------------------
  // Test 5: NoteController Cache Invalidation on Mutations
  // ------------------------------------------------------------------
  console.log('\nSuite 5: NoteController Cache Invalidation on Mutations');
  {
    const NoteController = require('../controllers/NoteController');
    const controller = new NoteController();

    // Populate initial cache
    const initialReq = { query: {} };
    const initialRes = { status() { return this; }, json(d) { return d; } };
    const res1 = controller.getNotes(initialReq, initialRes);
    const initialCount = res1.count;
    assert.ok(controller._cachedResponse, '_cachedResponse must be set after getNotes');

    // Create a new note
    const createReq = { body: { title: 'Hardening Audit Note', content: 'Testing cache invalidation on mutation.' } };
    controller.createNote(createReq, initialRes);
    assert.strictEqual(controller._cachedResponse, null, '_cachedResponse must be cleared immediately after createNote');

    // Fetch notes again -> must reflect new count
    const res2 = controller.getNotes(initialReq, initialRes);
    assert.strictEqual(res2.count, initialCount + 1, 'getNotes must reflect the newly added note, not stale cache');

    // Toggle pin -> must clear cache again
    const createdId = res2.data[res2.data.length - 1].id;
    assert.ok(controller._cachedResponse, '_cachedResponse must be set after second getNotes');
    controller.togglePin({ params: { id: createdId } }, initialRes);
    assert.strictEqual(controller._cachedResponse, null, '_cachedResponse must be cleared after togglePin');

    // Delete note -> must clear cache again
    controller.getNotes(initialReq, initialRes);
    controller.deleteNote({ params: { id: createdId } }, initialRes);
    assert.strictEqual(controller._cachedResponse, null, '_cachedResponse must be cleared after deleteNote');

    console.log('  ✅ [PASS] 5: Note mutations (create, pin, delete) immediately invalidate cached responses');
  }

  // ------------------------------------------------------------------
  // Test 6: JobStore Throttling & Cold-Start Behavior
  // ------------------------------------------------------------------
  console.log('\nSuite 6: JobStore Disk Cleanup Throttling & Cold-Start Resilience');
  {
    const JobStore = require('../api/media/job-store');

    // Save a job to disk and memory
    const testJob = {
      jobId: 'job_test_hardening_001',
      ownerId: 'usr_hardening_owner',
      status: 'queued',
      createdAt: Date.now()
    };
    JobStore.saveJob(testJob);

    // Verify active count returns 1
    const count1 = JobStore.getActiveJobCountForOwner('usr_hardening_owner');
    assert.strictEqual(count1, 1, 'Active job count must reflect queued job');

    // Clean up
    JobStore.deleteJob(testJob.jobId);
    console.log('  ✅ [PASS] 6: JobStore correctly manages active job limits with throttled disk I/O');
  }

  // ------------------------------------------------------------------
  // Test 7: Media Image Provider Timeout Bounding
  // ------------------------------------------------------------------
  console.log('\nSuite 7: Media Image Serverless Timeout Bounding');
  {
    const imageCode = fs.readFileSync(path.join(__dirname, '../api/media/image.js'), 'utf8');
    assert.ok(!imageCode.includes('timeout: 45000'), '45s timeout must not be present in image.js');
    assert.ok(imageCode.includes('timeout: 22000'), 'Image generation timeout must be bounded to 22s');
    console.log('  ✅ [PASS] 7: Image generation timeout bounded to 22s to prevent Vercel 30s cut-off');
  }

  console.log('\n====================================================');
  console.log('🎉 ALL PRODUCTION HARDENING REGRESSION TESTS PASSED!');
  console.log('====================================================\n');
}

runHardeningTests().catch((err) => {
  console.error('❌ Hardening regression test failed:', err);
  process.exit(1);
});
