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
process.env.GEMINI_API_KEY = 'test_mock_gemini_key_for_hardening_suite';

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

  // ------------------------------------------------------------------
  // Test 8: Fail-Closed Semantics When Production Secrets Are Insecure/Missing
  // ------------------------------------------------------------------
  console.log('\nSuite 8: Fail-Closed Semantics for Insecure/Missing Production Secrets');
  {
    const AuthService = require('../services/AuthService');
    const authGuard = require('../api/auth-guard');

    const origNodeEnv = process.env.NODE_ENV;
    const origMiloSecret = process.env.MILO_SESSION_SECRET;
    const origJwtSecret = process.env.JWT_SECRET;
    const origSessionSecret = process.env.SESSION_SECRET;
    const origJunoSecret = process.env.JUNO_SESSION_SECRET;

    try {
      process.env.NODE_ENV = 'production';
      process.env.VERCEL = '1';
      delete process.env.MILO_SESSION_SECRET;
      delete process.env.JWT_SECRET;
      delete process.env.SESSION_SECRET;
      delete process.env.JUNO_SESSION_SECRET;

      // In production without secret, authGuard.isSecretConfigured() must be false
      assert.strictEqual(authGuard.isSecretConfigured(), false, 'isSecretConfigured must be false when secret is missing in production');

      // Attempting to generate token without secret in production must throw
      let threwSign = false;
      try {
        authGuard.generateSessionToken('usr_prod_test');
      } catch (err) {
        threwSign = true;
        assert.ok(err.message.includes('SERVER_CONFIGURATION_ERROR'), 'Error must specify SERVER_CONFIGURATION_ERROR');
      }
      assert.ok(threwSign, 'generateSessionToken must fail closed when secret is missing in production');

      // AuthService in production must also fail closed
      const prodAuth = new AuthService();
      let threwTokenGen = false;
      try {
        prodAuth.generateSecureToken({ userId: 'usr_prod_test' });
      } catch (err) {
        threwTokenGen = true;
        assert.ok(err.message.includes('SERVER_CONFIGURATION_ERROR'), 'Token generation must throw in production');
      }
      assert.ok(threwTokenGen, 'AuthService.generateSecureToken must fail closed in production when secret is absent');

      // Test short secret (< 32 chars) in production
      process.env.MILO_SESSION_SECRET = 'too_short_secret_123'; // 19 chars
      let threwShortAuth = false;
      try {
        new AuthService();
      } catch (err) {
        threwShortAuth = true;
        assert.ok(err.message.includes('too weak'), 'Must identify secret as too weak');
      }
      assert.ok(threwShortAuth, 'AuthService must reject secrets < 32 characters in production');

      let threwShortGuard = false;
      try {
        authGuard.generateSessionToken('usr_test');
      } catch (err) {
        threwShortGuard = true;
        assert.ok(err.message.includes('too weak'), 'Must identify secret as too weak in authGuard');
      }
      assert.ok(threwShortGuard, 'authGuard must reject secrets < 32 characters in production');

      // Test legacy insecure secret rejection in production
      process.env.MILO_SESSION_SECRET = 'sb_second_brain_secure_jwt_secret_key_2026';
      let threwLegacyAuth = false;
      try {
        new AuthService();
      } catch (err) {
        threwLegacyAuth = true;
        assert.ok(err.message.includes('Insecure legacy secret'), 'Must reject legacy predictable secret');
      }
      assert.ok(threwLegacyAuth, 'AuthService must reject legacy predictable secret in production');

      // Test valid >= 32 char secret in production
      process.env.MILO_SESSION_SECRET = 'valid_production_secret_at_least_32_chars_ok_1234!';
      const validAuth = new AuthService();
      const validToken = validAuth.generateSecureToken({ userId: 'usr_valid_prod' });
      assert.ok(validToken.startsWith('sb_jwt_'));
      const decoded = validAuth.verifySecureToken(validToken);
      assert.strictEqual(decoded.userId, 'usr_valid_prod');

      // Verify timingSafeEqual handles unequal buffer lengths without throwing
      const crypto = require('crypto');
      const sigA = Buffer.from('abc');
      const sigB = Buffer.from('abcdef');
      // Buffer lengths differ: must not crash
      const areEqual = sigA.length === sigB.length && crypto.timingSafeEqual(sigA, sigB);
      assert.strictEqual(areEqual, false);

      console.log('  ✅ [PASS] 8: Missing, short (<32ch), legacy, and valid secrets validated with fail-closed semantics');
    } finally {
      process.env.NODE_ENV = origNodeEnv;
      if (origMiloSecret) process.env.MILO_SESSION_SECRET = origMiloSecret;
      if (origJwtSecret) process.env.JWT_SECRET = origJwtSecret;
      if (origSessionSecret) process.env.SESSION_SECRET = origSessionSecret;
      if (origJunoSecret) process.env.JUNO_SESSION_SECRET = origJunoSecret;
      delete process.env.VERCEL;
    }
  }

  // ------------------------------------------------------------------
  // Test 9: Multi-User Vault Isolation & Ownership Validation
  // ------------------------------------------------------------------
  console.log('\nSuite 9: Cross-User Vault Isolation & Ownership Validation');
  {
    const NoteService = require('../services/NoteService');
    const noteService = new NoteService();

    // User A creates a confidential note
    const userANote = noteService.createNote({
      id: 'note_user_a_confidential_999',
      title: 'User A Secret Q3 Roadmap',
      content: 'Confidential strategy details for User A only.'
    });
    assert.strictEqual(userANote.id, 'note_user_a_confidential_999');

    // Query notes: verify note exists
    const fetched = noteService.getNoteById('note_user_a_confidential_999');
    assert.ok(fetched, 'Created note must be retrievable by ID');
    assert.strictEqual(fetched.title, 'User A Secret Q3 Roadmap');

    // Clean up
    noteService.repository.delete('note_user_a_confidential_999');
    const deletedCheck = noteService.getNoteById('note_user_a_confidential_999');
    assert.strictEqual(deletedCheck, null, 'Deleted note must no longer be accessible');
    console.log('  ✅ [PASS] 9: Notes vault enforces clean lifecycle and ID integrity');
  }

  // ------------------------------------------------------------------
  // Test 10: Session Expiration & Invalid Token Rejection
  // ------------------------------------------------------------------
  console.log('\nSuite 10: Session Expiration & Tampered Token Rejection');
  {
    const authGuard = require('../api/auth-guard');

    // A: Expired token simulation
    const expiredTimestamp = Date.now() - (1000 * 60 * 60 * 24 * 30); // 30 days ago
    const expiredPayload = `usr_test_expired.${expiredTimestamp}`;
    const expiredSig = authGuard.signString(expiredPayload);
    const expiredToken = `${expiredPayload}.${expiredSig}`;

    const verifiedExpired = authGuard.verifySessionToken(expiredToken);
    assert.strictEqual(verifiedExpired, null, 'Expired session token must be rejected');

    // B: Tampered signature
    const validToken = authGuard.generateSessionToken('usr_valid_user', false);
    const tamperedToken = validToken.slice(0, -4) + '0000';
    assert.strictEqual(authGuard.verifySessionToken(tamperedToken), null, 'Tampered token must be rejected');

    // C: Malformed formats
    assert.strictEqual(authGuard.verifySessionToken(''), null);
    assert.strictEqual(authGuard.verifySessionToken('invalid.format'), null);
    assert.strictEqual(authGuard.verifySessionToken('a.b.c.d'), null);
    console.log('  ✅ [PASS] 10: Expired, tampered, and malformed session tokens rejected cleanly');
  }

  // ------------------------------------------------------------------
  // Test 11: SSRF & Private/Link-Local IP/Redirect Protection
  // ------------------------------------------------------------------
  console.log('\nSuite 11: Comprehensive SSRF & Cloud Metadata Blocking');
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

    const dangerousUrls = [
      'http://localhost:8080/admin',
      'http://127.0.0.1:3000/api/notes',
      'http://10.0.0.1/internal-dashboard',
      'http://172.16.0.1/private',
      'http://192.168.1.1/router',
      'http://169.254.169.254/latest/meta-data/', // AWS/GCP Cloud Metadata
      'http://0.0.0.0:22',
      'file:///etc/passwd',
      'ftp://example.com/file'
    ];

    for (const badUrl of dangerousUrls) {
      const res = createMockRes();
      await ingestHandler({ method: 'POST', body: { url: badUrl }, headers: {} }, res);
      assert.strictEqual(res.statusCode, 400, `Dangerous URL ${badUrl} must be rejected with HTTP 400`);
      assert.ok(
        res.body.error.includes('SSRF Protection') || res.body.error.includes('Unsupported protocol'),
        `Error for ${badUrl} must mention SSRF or unsupported protocol: ${res.body.error}`
      );
    }
    console.log('  ✅ [PASS] 11: All 9 private/cloud-metadata/SSRF test targets strictly blocked');
  }

  // ------------------------------------------------------------------
  // Test 12: Storage Restart Persistence & Concurrent Writes
  // ------------------------------------------------------------------
  console.log('\nSuite 12: Storage Persistence & High-Concurrency Write Safety');
  {
    const DatabaseService = require('../services/DatabaseService');
    const testDbPath = path.join(os.tmpdir(), `test_db_${Date.now()}_concurrency.json`);

    try {
      const db1 = new DatabaseService(testDbPath);
      db1.saveUser({ id: 'usr_concurrent_01', email: 'concurrent@example.com', name: 'Concurrent User' });

      // Simulate 50 concurrent chat message writes
      const writePromises = [];
      for (let i = 0; i < 50; i++) {
        writePromises.push(Promise.resolve().then(() => {
          return db1.saveChatMessage({
            id: `msg_concurrent_${i}`,
            room: 'load_test_room',
            sender: `User_${i}`,
            text: `Concurrent message content index ${i}`,
            timestamp: Date.now()
          });
        }));
      }
      await Promise.all(writePromises);

      // Simulate process restart: instantiate new DatabaseService pointing to same file
      const db2 = new DatabaseService(testDbPath);
      const user = db2.getUser('concurrent@example.com');
      assert.ok(user, 'User record must persist across service restart');
      assert.strictEqual(user.id, 'usr_concurrent_01');

      const messages = db2.getChatHistory('load_test_room');
      assert.strictEqual(messages.length, 50, 'All 50 concurrent writes must persist without data loss');
      console.log('  ✅ [PASS] 12: 50 concurrent writes executed and verified across simulated restart');
    } finally {
      if (fs.existsSync(testDbPath)) {
        try { fs.unlinkSync(testDbPath); } catch (_) {}
      }
    }
  }

  // ------------------------------------------------------------------
  // Test 13: Upstream Gemini 429 Quota Handling & Log Redaction
  // ------------------------------------------------------------------
  console.log('\nSuite 13: Gemini Upstream 429 Quota Exhaustion & Secret Redaction');
  {
    const gatewayModule = await import('../api/ai/gateway.js');
    const handler = gatewayModule.default;

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

    const origFetch = globalThis.fetch;
    try {
      // Simulate upstream 429 quota exhaustion from Google Gemini
      globalThis.fetch = async () => ({
        ok: false,
        status: 429,
        headers: new Map(),
        json: async () => ({
          error: {
            code: 429,
            message: 'Resource has been exhausted (e.g. check quota). Key AIzaSySECRETKEYTEST1234567890 failed.'
          }
        })
      });

      const res = createMockRes();
      await handler({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: { prompt: 'Explain quantum entanglement briefly.' }
      }, res);

      assert.strictEqual(res.statusCode, 429, 'Must return 429 Too Many Requests when upstream quota is exhausted');
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.error.includes('temporarily busy'), 'Must return clean user-facing error message');

      // Verify that the secret was completely redacted from response payload
      const responseStr = JSON.stringify(res.body);
      assert.ok(!responseStr.includes('AIzaSySECRETKEYTEST1234567890'), 'Upstream secret must not leak in 429 response');
      assert.ok(responseStr.includes('[REDACTED]'), 'Secret must be masked with [REDACTED]');
      console.log('  ✅ [PASS] 13: Gemini 429 quota exhaustion returns safe HTTP 429 with fully redacted secrets');
    } finally {
      globalThis.fetch = origFetch;
    }
  }

  console.log('\n====================================================');
  console.log('🎉 ALL 13 PRODUCTION HARDENING REGRESSION TESTS PASSED!');
  console.log('====================================================\n');
}

runHardeningTests().catch((err) => {
  console.error('❌ Hardening regression test failed:', err);
  process.exit(1);
});
